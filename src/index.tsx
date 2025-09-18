import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { generateBayiToken, verifyBayiAuth, hashPassword, comparePassword, generateSessionToken } from './utils/auth'
import { createPayTRPaymentRequest, verifyPayTRCallback, getPayTRConfig, PayTRPaymentRequest } from './utils/paytr'
import { generateAdminToken, verifyAdminToken, hashAdminPassword, verifyAdminPassword, requireAdminAuth, AdminUser } from './utils/adminAuth'
import { SystemLogger, createErrorResponse, createSuccessResponse } from './utils/logger'
import { DatabaseHelper } from './utils/database'
import { errorHandler, BusinessError, AuthenticationError, ValidationError } from './middleware/errorHandler'
import { validateInput, rateLimit, securityHeaders, requestLogger, ValidationRules } from './middleware/validation'
import { PerformanceMonitor, performanceMonitoring } from './utils/monitoring'
import { NotificationService } from './utils/notifications'

// Type definitions for Cloudflare bindings
type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// Global middleware
app.use('*', errorHandler())
app.use('*', securityHeaders())
app.use('*', requestLogger())
app.use('*', performanceMonitoring())

// Enable CORS for API routes
app.use('/api/*', cors())

// Rate limiting for API routes
app.use('/api/*', rateLimit(50, 60000)) // 50 requests per minute

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))

// =============================================================================
// API Routes - TV Servis Yönetim Sistemi
// =============================================================================

// Dashboard ana istatistikler
app.get('/api/dashboard/stats', async (c) => {
  const { DB } = c.env
  
  try {
    // Toplam iş sayıları
    const totalJobs = await DB.prepare('SELECT COUNT(*) as count FROM is_talepleri').first()
    const activeJobs = await DB.prepare('SELECT COUNT(*) as count FROM is_talepleri WHERE durum IN ("yeni", "atandı", "devam_ediyor")').first()
    const completedJobs = await DB.prepare('SELECT COUNT(*) as count FROM is_talepleri WHERE durum = "tamamlandı"').first()
    const totalDealers = await DB.prepare('SELECT COUNT(*) as count FROM bayiler WHERE aktif = 1').first()
    
    // Son 7 günün işleri
    const recentJobs = await DB.prepare(`
      SELECT DATE(created_at) as tarih, COUNT(*) as sayi
      FROM is_talepleri 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY tarih DESC
    `).all()
    
    // İl bazında iş dağılımı
    const jobsByCity = await DB.prepare(`
      SELECT i.il_adi, COUNT(it.id) as sayi
      FROM is_talepleri it
      JOIN musteriler m ON it.musteri_id = m.id
      JOIN iller i ON m.il_id = i.id
      GROUP BY i.il_adi
      ORDER BY sayi DESC
      LIMIT 10
    `).all()
    
    return c.json({
      totalJobs: totalJobs?.count || 0,
      activeJobs: activeJobs?.count || 0,
      completedJobs: completedJobs?.count || 0,
      totalDealers: totalDealers?.count || 0,
      recentJobs: recentJobs.results || [],
      jobsByCity: jobsByCity.results || []
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return c.json({ error: 'Veriler alınamadı' }, 500)
  }
})

// Aktif işleri listele
app.get('/api/jobs/active', async (c) => {
  const { DB } = c.env
  
  try {
    const jobs = await DB.prepare(`
      SELECT 
        it.id, it.talep_kodu, it.aciklama, it.durum, it.oncelik,
        it.tv_marka, it.tv_model, it.created_at,
        m.ad_soyad as musteri_adi, m.telefon, m.adres,
        i.il_adi, ilc.ilce_adi,
        st.tur_adi as servis_turu,
        b.firma_adi as bayi_adi
      FROM is_talepleri it
      JOIN musteriler m ON it.musteri_id = m.id
      JOIN iller i ON m.il_id = i.id
      LEFT JOIN ilceler ilc ON m.ilce_id = ilc.id
      JOIN servis_turleri st ON it.servis_turu_id = st.id
      LEFT JOIN bayiler b ON it.bayi_id = b.id
      WHERE it.durum IN ('yeni', 'atandı', 'devam_ediyor')
      ORDER BY 
        CASE it.oncelik 
          WHEN 'yüksek' THEN 1
          WHEN 'normal' THEN 2 
          WHEN 'düşük' THEN 3
        END,
        it.created_at DESC
    `).all()
    
    return c.json(jobs.results || [])
  } catch (error) {
    console.error('Active jobs error:', error)
    return c.json({ error: 'İşler listelenemedi' }, 500)
  }
})

// Bayileri listele (il bazında)
app.get('/api/dealers', async (c) => {
  const ilId = c.req.query('il_id')
  const { DB } = c.env
  
  try {
    let query = `
      SELECT 
        b.id, b.bayi_kodu, b.firma_adi, b.yetkili_adi, 
        b.telefon, b.email, b.adres, b.uzmanlik_alani,
        b.rating, b.tamamlanan_is_sayisi,
        i.il_adi, ilc.ilce_adi
      FROM bayiler b
      JOIN iller i ON b.il_id = i.id
      LEFT JOIN ilceler ilc ON b.ilce_id = ilc.id
      WHERE b.aktif = 1
    `
    
    const params = []
    if (ilId) {
      query += ' AND b.il_id = ?'
      params.push(ilId)
    }
    
    query += ' ORDER BY b.rating DESC, b.tamamlanan_is_sayisi DESC'
    
    const dealers = await DB.prepare(query).bind(...params).all()
    return c.json(dealers.results || [])
  } catch (error) {
    console.error('Dealers error:', error)
    return c.json({ error: 'Bayiler listelenemedi' }, 500)
  }
})

// İlleri listele
app.get('/api/cities', async (c) => {
  const { DB } = c.env
  
  try {
    const cities = await DB.prepare(`
      SELECT id, il_kodu, il_adi, bolge
      FROM iller 
      WHERE aktif = 1
      ORDER BY il_adi
    `).all()
    
    return c.json(cities.results || [])
  } catch (error) {
    console.error('Cities error:', error)
    return c.json({ error: 'İller listelenemedi' }, 500)
  }
})

// İş ataması yap
app.post('/api/jobs/:id/assign', async (c) => {
  const { DB } = c.env
  const jobId = c.req.param('id')
  const { bayiId, notlar } = await c.req.json()
  
  try {
    // İşi bayiye ata
    await DB.prepare(`
      UPDATE is_talepleri 
      SET bayi_id = ?, durum = 'atandı', atama_tarihi = datetime('now'), notlar = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(bayiId, notlar || '', jobId).run()
    
    // Geçmişe kaydet
    await DB.prepare(`
      INSERT INTO is_gecmisi (is_talep_id, eski_durum, yeni_durum, aciklama, degistiren)
      VALUES (?, 'yeni', 'atandı', ?, 'sistem')
    `).bind(jobId, `Bayi ID ${bayiId} atandı`).run()
    
    return c.json({ success: true, message: 'İş başarıyla atandı' })
  } catch (error) {
    console.error('Job assignment error:', error)
    return c.json({ error: 'İş atanamadı' }, 500)
  }
})

// N8N Webhook endpoint - WhatsApp verileri
app.post('/api/webhook/whatsapp', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    // Webhook verisini logla
    await DB.prepare(`
      INSERT INTO n8n_webhooks (webhook_type, payload, processed)
      VALUES ('whatsapp', ?, 0)
    `).bind(JSON.stringify(data)).run()
    
    // Burada WhatsApp verisini parse edip iş talebi oluşturacaksınız
    // Şimdilik sadece log alıyoruz
    
    return c.json({ 
      success: true, 
      message: 'WhatsApp verisi alındı ve işlenmek üzere kaydedildi' 
    })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return c.json({ error: 'Webhook işlenemedi' }, 500)
  }
})

// N8N Webhook endpoint - Form verileri  
app.post('/api/webhook/form', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()
  
  try {
    // Webhook verisini logla
    await DB.prepare(`
      INSERT INTO n8n_webhooks (webhook_type, payload, processed)
      VALUES ('form', ?, 0)
    `).bind(JSON.stringify(data)).run()
    
    // Form verisini parse edip iş talebi oluştur
    // Bu örnek implementasyon - gerçek form yapınıza göre uyarlayın
    
    return c.json({ 
      success: true, 
      message: 'Form verisi alındı ve işlenmek üzere kaydedildi' 
    })
  } catch (error) {
    console.error('Form webhook error:', error)
    return c.json({ error: 'Webhook işlenemedi' }, 500)
  }
})

// =============================================================================
// Bayi API Routes - Authentication ve İş Yönetimi
// =============================================================================

// Bayi login endpoint
app.post('/api/bayi/login', 
  validateInput(ValidationRules.bayiLogin),
  async (c) => {
    const { DB } = c.env
    const { email, password } = c.get('validatedBody')
    const dbHelper = new DatabaseHelper(DB)
    
    try {
      SystemLogger.info('Auth', 'Bayi login attempt', { email })
    
      // Bayiyi veritabanında ara  
      const bayi = await PerformanceMonitor.monitorDatabaseQuery('getBayiByEmail', async () => {
        return await DB.prepare(`
          SELECT id, login_email, password_hash, firma_adi, yetkili_adi, 
                 telefon, il_id, aktif_login, kredi_bakiye
          FROM bayiler 
          WHERE login_email = ? AND aktif = 1
        `).bind(email.toLowerCase()).first()
      })
      
      if (!bayi) {
        SystemLogger.warn('Auth', 'Bayi not found', { email })
        throw new AuthenticationError('Geçersiz email veya şifre')
      }
      
      if (!bayi.aktif_login) {
        SystemLogger.warn('Auth', 'Bayi account deactivated', { email })
        throw new AuthenticationError('Hesabınız deaktif edilmiş')
      }
    
    // Production bcrypt şifre kontrolü
    const passwordValid = await comparePassword(password, bayi.password_hash)
    if (!passwordValid) {
      SystemLogger.warn('Auth', 'Invalid password', { email })
      throw new AuthenticationError('Geçersiz email veya şifre')
    }
    
    // JWT token oluştur
    const token = generateBayiToken({
      id: bayi.id,
      login_email: bayi.login_email,
      firma_adi: bayi.firma_adi,
      il_id: bayi.il_id
    })
    
    // Session oluştur
    const sessionToken = generateSessionToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)
    
    await DB.prepare(`
      INSERT INTO bayi_sessions (bayi_id, session_token, expires_at, ip_adres)
      VALUES (?, ?, ?, ?)
    `).bind(bayi.id, sessionToken, expiresAt.toISOString(), c.req.header('cf-connecting-ip') || 'unknown').run()
    
    // Son giriş tarihini güncelle
    await DB.prepare(`
      UPDATE bayiler SET son_giris = datetime('now') WHERE id = ?
    `).bind(bayi.id).run()
    
    return c.json({
      success: true,
      token,
      bayi: {
        id: bayi.id,
        email: bayi.login_email,
        firma_adi: bayi.firma_adi,
        yetkili_adi: bayi.yetkili_adi,
        telefon: bayi.telefon,
        il_id: bayi.il_id,
        kredi_bakiye: bayi.kredi_bakiye
      }
    })
  } catch (error) {
    console.error('Bayi login error:', error)
    return c.json({ error: 'Giriş işlemi başarısız' }, 500)
  }
})

// Bayi logout endpoint
app.post('/api/bayi/logout', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Geçersiz token' }, 401)
    }
    
    // Session'ları deaktif et
    await DB.prepare(`
      UPDATE bayi_sessions SET aktif = 0 WHERE bayi_id = ?
    `).bind(bayiAuth.bayiId).run()
    
    return c.json({ success: true, message: 'Başarıyla çıkış yapıldı' })
  } catch (error) {
    console.error('Bayi logout error:', error)
    return c.json({ error: 'Çıkış işlemi başarısız' }, 500)
  }
})

// Bayi profil bilgileri
app.get('/api/bayi/profile', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Geçersiz token' }, 401)
    }
    
    const bayi = await DB.prepare(`
      SELECT id, bayi_kodu, firma_adi, yetkili_adi, telefon, email, 
             login_email, adres, uzmanlik_alani, rating, tamamlanan_is_sayisi,
             kredi_bakiye, il_id, ilce_id, son_giris
      FROM bayiler 
      WHERE id = ? AND aktif = 1
    `).bind(bayiAuth.bayiId).first()
    
    if (!bayi) {
      return c.json({ error: 'Bayi bulunamadı' }, 404)
    }
    
    return c.json(bayi)
  } catch (error) {
    console.error('Bayi profile error:', error)
    return c.json({ error: 'Profil bilgileri alınamadı' }, 500)
  }
})

// Bayi için il bazlı işler (kısıtlı bilgi)
app.get('/api/bayi/jobs', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Geçersiz token' }, 401)
    }
    
    // Sadece bayinin bulunduğu ildeki işleri göster (kısıtlı bilgi)
    const jobs = await DB.prepare(`
      SELECT 
        it.id, it.talep_kodu, it.aciklama, it.durum, it.oncelik,
        it.tv_marka, it.tv_model, it.created_at, it.is_fiyati,
        st.tur_adi as servis_turu,
        i.il_adi, ilc.ilce_adi,
        -- Kısıtlı bilgiler (ödeme yapana kadar tam bilgi yok)
        CASE 
          WHEN it.satin_alan_bayi_id = ? THEN m.ad_soyad
          ELSE 'Müşteri Bilgisi Gizli'
        END as musteri_adi,
        CASE 
          WHEN it.satin_alan_bayi_id = ? THEN m.telefon
          ELSE 'Telefon Bilgisi Gizli'
        END as telefon,
        CASE 
          WHEN it.satin_alan_bayi_id = ? THEN m.adres
          ELSE CONCAT(i.il_adi, ' / ', COALESCE(ilc.ilce_adi, 'İlçe Belirtilmemiş'))
        END as adres_bilgi,
        it.satin_alan_bayi_id,
        it.goruntuleme_durumu
      FROM is_talepleri it
      JOIN musteriler m ON it.musteri_id = m.id
      JOIN iller i ON m.il_id = i.id
      LEFT JOIN ilceler ilc ON m.ilce_id = ilc.id
      JOIN servis_turleri st ON it.servis_turu_id = st.id
      WHERE i.id = ? 
        AND it.durum IN ('yeni', 'atandı', 'devam_ediyor')
        AND (it.satin_alan_bayi_id IS NULL OR it.satin_alan_bayi_id = ?)
      ORDER BY 
        CASE it.oncelik 
          WHEN 'yüksek' THEN 1
          WHEN 'normal' THEN 2 
          WHEN 'düşük' THEN 3
        END,
        it.created_at DESC
    `).bind(bayiAuth.bayiId, bayiAuth.bayiId, bayiAuth.bayiId, bayiAuth.ilId, bayiAuth.bayiId).all()
    
    return c.json(jobs.results || [])
  } catch (error) {
    console.error('Bayi jobs error:', error)
    return c.json({ error: 'İşler listelenemedi' }, 500)
  }
})

// Bayi kredi bakiyesi
app.get('/api/bayi/credits', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Geçersiz token' }, 401)
    }
    
    // Güncel bakiye
    const bayi = await DB.prepare(`
      SELECT kredi_bakiye FROM bayiler WHERE id = ?
    `).bind(bayiAuth.bayiId).first()
    
    // Kredi hareketleri (son 50)
    const hareketler = await DB.prepare(`
      SELECT hareket_turu, tutar, onceki_bakiye, yeni_bakiye, 
             aciklama, created_at
      FROM kredi_hareketleri 
      WHERE bayi_id = ?
      ORDER BY created_at DESC 
      LIMIT 50
    `).bind(bayiAuth.bayiId).all()
    
    return c.json({
      kredi_bakiye: bayi?.kredi_bakiye || 0,
      hareketler: hareketler.results || []
    })
  } catch (error) {
    console.error('Bayi credits error:', error)
    return c.json({ error: 'Kredi bilgileri alınamadı' }, 500)
  }
})

// Bayi satın aldığı işler (tam bilgi)
app.get('/api/bayi/my-jobs', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Geçersiz token' }, 401)
    }
    
    const myJobs = await DB.prepare(`
      SELECT 
        it.id, it.talep_kodu, it.aciklama, it.durum, it.oncelik,
        it.tv_marka, it.tv_model, it.created_at, it.satin_alma_tarihi,
        it.satin_alma_fiyati, it.sorun_aciklama,
        m.ad_soyad as musteri_adi, m.telefon, m.email, m.adres,
        i.il_adi, ilc.ilce_adi,
        st.tur_adi as servis_turu
      FROM is_talepleri it
      JOIN musteriler m ON it.musteri_id = m.id
      JOIN iller i ON m.il_id = i.id
      LEFT JOIN ilceler ilc ON m.ilce_id = ilc.id
      JOIN servis_turleri st ON it.servis_turu_id = st.id
      WHERE it.satin_alan_bayi_id = ?
      ORDER BY it.satin_alma_tarihi DESC
    `).bind(bayiAuth.bayiId).all()
    
    return c.json(myJobs.results || [])
  } catch (error) {
    console.error('Bayi my-jobs error:', error)
    return c.json({ error: 'Satın aldığınız işler listelenemedi' }, 500)
  }
})

// İş satın alma endpoint - Kredi ile ödeme
app.post('/api/bayi/buy-job/:id', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  const jobId = c.req.param('id')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Geçersiz token' }, 401)
    }
    
    // Transaction başlat (SQLite'da manuel transaction yönetimi)
    console.log(`Bayi ${bayiAuth.bayiId} işi ${jobId} satın almaya çalışıyor...`)
    
    // 1. İş mevcut mu ve satın alınmış mı kontrol et
    const job = await DB.prepare(`
      SELECT it.id, it.talep_kodu, it.is_fiyati, it.satin_alan_bayi_id, it.durum,
             m.il_id, m.ad_soyad, m.telefon, m.adres
      FROM is_talepleri it
      JOIN musteriler m ON it.musteri_id = m.id
      WHERE it.id = ? AND it.durum IN ('yeni', 'atandı')
    `).bind(jobId).first()
    
    if (!job) {
      return c.json({ error: 'İş bulunamadı veya artık mevcut değil' }, 404)
    }
    
    // 2. İş zaten satın alınmış mı?
    if (job.satin_alan_bayi_id) {
      return c.json({ error: 'Bu iş başka bir bayi tarafından satın alındı' }, 409)
    }
    
    // 3. İş bayinin ilinde mi?
    if (job.il_id !== bayiAuth.ilId) {
      return c.json({ error: 'Bu iş sizin ilinizde değil' }, 403)
    }
    
    // 4. Bayi kredi bakiyesi yeterli mi?
    const bayi = await DB.prepare(`
      SELECT id, kredi_bakiye FROM bayiler WHERE id = ?
    `).bind(bayiAuth.bayiId).first()
    
    if (!bayi || bayi.kredi_bakiye < job.is_fiyati) {
      return c.json({ 
        error: `Yetersiz kredi bakiyesi. Gerekli: ${job.is_fiyati} ₺, Mevcut: ${bayi.kredi_bakiye || 0} ₺` 
      }, 402)
    }
    
    // 5. Race condition check - Tekrar kontrol et (double-check locking)
    const finalCheck = await DB.prepare(`
      SELECT satin_alan_bayi_id FROM is_talepleri WHERE id = ?
    `).bind(jobId).first()
    
    if (finalCheck?.satin_alan_bayi_id) {
      return c.json({ error: 'İş bu sırada başka bir bayi tarafından satın alındı' }, 409)
    }
    
    // 6. İşi satın al - İlk işi güncelle
    const satinAlmaTarihi = new Date().toISOString()
    await DB.prepare(`
      UPDATE is_talepleri 
      SET satin_alan_bayi_id = ?, 
          satin_alma_tarihi = ?, 
          satin_alma_fiyati = ?,
          durum = 'atandı',
          goruntuleme_durumu = 'tam',
          updated_at = ?
      WHERE id = ? AND satin_alan_bayi_id IS NULL
    `).bind(bayiAuth.bayiId, satinAlmaTarihi, job.is_fiyati, satinAlmaTarihi, jobId).run()
    
    // 7. Kredi bakiyesini güncelle
    const yeniBakiye = bayi.kredi_bakiye - job.is_fiyati
    await DB.prepare(`
      UPDATE bayiler SET kredi_bakiye = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(yeniBakiye, bayiAuth.bayiId).run()
    
    // 8. Ödeme işlemi kaydı oluştur
    const odemeResult = await DB.prepare(`
      INSERT INTO odeme_islemleri (
        bayi_id, is_talep_id, odeme_turu, tutar, durum, created_at, updated_at
      ) VALUES (?, ?, 'kredi_kullanim', ?, 'tamamlandi', ?, ?)
    `).bind(bayiAuth.bayiId, jobId, job.is_fiyati, satinAlmaTarihi, satinAlmaTarihi).run()
    
    // 9. Kredi hareketi kaydet
    await DB.prepare(`
      INSERT INTO kredi_hareketleri (
        bayi_id, hareket_turu, tutar, onceki_bakiye, yeni_bakiye, 
        aciklama, odeme_id, is_talep_id, created_at
      ) VALUES (?, 'harcama', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      bayiAuth.bayiId, 
      job.is_fiyati, 
      bayi.kredi_bakiye, 
      yeniBakiye,
      `İş satın alma: ${job.talep_kodu}`,
      odemeResult.meta.last_row_id,
      jobId,
      satinAlmaTarihi
    ).run()
    
    // 10. İş geçmişi kaydet
    await DB.prepare(`
      INSERT INTO is_gecmisi (is_talep_id, eski_durum, yeni_durum, aciklama, degistiren, created_at)
      VALUES (?, 'yeni', 'atandı', ?, ?, ?)
    `).bind(
      jobId, 
      `Bayi tarafından satın alındı - ${job.is_fiyati} ₺`,
      bayiAuth.firmaAdi,
      satinAlmaTarihi
    ).run()
    
    console.log(`✅ İş ${jobId} başarıyla satın alındı - Bayi: ${bayiAuth.bayiId}, Tutar: ${job.is_fiyati} ₺`)
    
    return c.json({
      success: true,
      message: `İş başarıyla satın alındı! ${job.is_fiyati} ₺ kredi bakiyenizden düşüldü.`,
      job: {
        id: job.id,
        talep_kodu: job.talep_kodu,
        satin_alma_fiyati: job.is_fiyati,
        musteri_bilgileri: {
          ad_soyad: job.ad_soyad,
          telefon: job.telefon,
          adres: job.adres
        }
      },
      yeni_bakiye: yeniBakiye
    })
    
  } catch (error) {
    console.error('İş satın alma hatası:', error)
    return c.json({ 
      error: 'İş satın alma işlemi başarısız', 
      details: error.message 
    }, 500)
  }
})

// =============================================================================
// PayTR Ödeme Sistemi API Routes
// =============================================================================

// PayTR kredi yükleme başlatma
app.post('/api/payment/paytr/init', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  const { amount } = await c.req.json()
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Geçersiz token' }, 401)
    }
    
    // Minimum tutar kontrolü
    const minAmount = 100; // Minimum 100 TL
    if (!amount || amount < minAmount) {
      return c.json({ error: `Minimum kredi yükleme tutarı ${minAmount} TL` }, 400)
    }
    
    if (amount > 10000) {
      return c.json({ error: 'Maksimum kredi yükleme tutarı 10.000 TL' }, 400)
    }
    
    // Bayi bilgilerini al
    const bayi = await DB.prepare(`
      SELECT id, firma_adi, yetkili_adi, telefon, login_email
      FROM bayiler WHERE id = ?
    `).bind(bayiAuth.bayiId).first()
    
    if (!bayi) {
      return c.json({ error: 'Bayi bulunamadı' }, 404)
    }
    
    // PayTR konfigürasyonu al
    const paytrConfig = await getPayTRConfig(DB)
    
    // User IP al
    const userIp = c.req.header('cf-connecting-ip') || 
                   c.req.header('x-forwarded-for') || 
                   c.req.header('x-real-ip') || 
                   '127.0.0.1'
    
    // PayTR payment request oluştur
    const paymentRequest = createPayTRPaymentRequest(paytrConfig, {
      bayiId: bayi.id,
      email: bayi.login_email,
      amount: amount,
      bayiName: bayi.firma_adi,
      bayiPhone: bayi.telefon,
      userIp: userIp
    })
    
    // Ödeme işlemi kaydı oluştur (beklemede durumunda)
    const odemeResult = await DB.prepare(`
      INSERT INTO odeme_islemleri (
        bayi_id, odeme_turu, tutar, durum, paytr_merchant_oid, created_at
      ) VALUES (?, 'kredi_karti', ?, 'beklemede', ?, datetime('now'))
    `).bind(bayi.id, amount, paymentRequest.merchant_oid).run()
    
    console.log(`PayTR ödeme başlatıldı - Bayi: ${bayi.id}, Tutar: ${amount} TL, OID: ${paymentRequest.merchant_oid}`)
    
    return c.json({
      success: true,
      payment_url: 'https://www.paytr.com/odeme/guvenli/' + (paymentRequest.paytr_token || 'test'),
      merchant_oid: paymentRequest.merchant_oid,
      amount: amount,
      paytr_request: paymentRequest, // Test için - production'da kaldırılacak
      message: `${amount} TL kredi yükleme işlemi başlatıldı`
    })
    
  } catch (error) {
    console.error('PayTR init error:', error)
    return c.json({ 
      error: 'Ödeme işlemi başlatılamadı', 
      details: error.message 
    }, 500)
  }
})

// PayTR callback endpoint (POST)
app.post('/api/payment/paytr/callback', async (c) => {
  const { DB } = c.env
  
  try {
    const formData = await c.req.formData()
    const params = {
      merchant_oid: formData.get('merchant_oid') as string,
      status: formData.get('status') as string,
      total_amount: formData.get('total_amount') as string,
      hash: formData.get('hash') as string
    }
    
    console.log('PayTR callback alındı:', params)
    
    if (!params.merchant_oid || !params.status || !params.hash) {
      console.error('PayTR callback eksik parametreler')
      return c.text('ERR', 400)
    }
    
    // PayTR konfigürasyonu al
    const paytrConfig = await getPayTRConfig(DB)
    
    // Hash doğrulama
    const isValidHash = verifyPayTRCallback(paytrConfig, params)
    if (!isValidHash) {
      console.error('PayTR callback hash doğrulanamadı')
      return c.text('ERR', 400)
    }
    
    // Ödeme işlemini bul
    const odeme = await DB.prepare(`
      SELECT id, bayi_id, tutar, durum FROM odeme_islemleri 
      WHERE paytr_merchant_oid = ?
    `).bind(params.merchant_oid).first()
    
    if (!odeme) {
      console.error('PayTR callback - ödeme bulunamadı:', params.merchant_oid)
      return c.text('ERR', 404)
    }
    
    if (odeme.durum !== 'beklemede') {
      console.log('PayTR callback - ödeme zaten işlenmiş:', params.merchant_oid)
      return c.text('OK')
    }
    
    // Ödeme başarılı mı?
    if (params.status === 'success') {
      // Bayi kredi bakiyesini güncelle
      const oncekiBakiye = await DB.prepare(`
        SELECT kredi_bakiye FROM bayiler WHERE id = ?
      `).bind(odeme.bayi_id).first()
      
      const yeniBakiye = (oncekiBakiye?.kredi_bakiye || 0) + odeme.tutar
      
      await DB.prepare(`
        UPDATE bayiler SET kredi_bakiye = ?, updated_at = datetime('now') WHERE id = ?
      `).bind(yeniBakiye, odeme.bayi_id).run()
      
      // Ödeme işlemini tamamlandı olarak işaretle
      await DB.prepare(`
        UPDATE odeme_islemleri SET 
          durum = 'tamamlandi', 
          paytr_payment_id = ?, 
          updated_at = datetime('now') 
        WHERE id = ?
      `).bind(params.total_amount, odeme.id).run()
      
      // Kredi hareketi kaydet
      await DB.prepare(`
        INSERT INTO kredi_hareketleri (
          bayi_id, hareket_turu, tutar, onceki_bakiye, yeni_bakiye, 
          aciklama, odeme_id, created_at
        ) VALUES (?, 'yükleme', ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        odeme.bayi_id,
        odeme.tutar,
        oncekiBakiye?.kredi_bakiye || 0,
        yeniBakiye,
        `PayTR ile kredi yükleme - ${params.merchant_oid}`,
        odeme.id
      ).run()
      
      console.log(`✅ PayTR ödeme başarılı - Bayi: ${odeme.bayi_id}, Tutar: ${odeme.tutar} TL`)
      
      return c.text('OK')
    } else {
      // Ödeme başarısız
      await DB.prepare(`
        UPDATE odeme_islemleri SET 
          durum = 'iptal', 
          updated_at = datetime('now') 
        WHERE id = ?
      `).bind(odeme.id).run()
      
      console.log(`❌ PayTR ödeme başarısız - Bayi: ${odeme.bayi_id}, OID: ${params.merchant_oid}`)
      
      return c.text('OK')
    }
    
  } catch (error) {
    console.error('PayTR callback error:', error)
    return c.text('ERR', 500)
  }
})

// PayTR başarılı ödeme sayfası
app.get('/api/payment/paytr/success', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ödeme Başarılı - TV Servis</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-green-50 min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <div class="text-center">
                <i class="fas fa-check-circle text-green-500 text-6xl mb-4"></i>
                <h1 class="text-2xl font-bold text-gray-800 mb-2">Ödeme Başarılı!</h1>
                <p class="text-gray-600 mb-6">Kredi yükleme işleminiz tamamlandı. Bakiyeniz kısa sürede güncellenecektir.</p>
                <div class="space-y-3">
                    <button onclick="window.close()" class="w-full bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded">
                        <i class="fas fa-times mr-1"></i> Pencereyi Kapat
                    </button>
                    <a href="/bayi/dashboard" class="block w-full bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded text-center">
                        <i class="fas fa-dashboard mr-1"></i> Dashboard'a Dön
                    </a>
                </div>
            </div>
        </div>
        
        <script>
            // 3 saniye sonra otomatik kapat (popup ise)
            setTimeout(() => {
                if (window.opener) {
                    window.close();
                }
            }, 3000);
        </script>
    </body>
    </html>
  `)
})

// PayTR başarısız ödeme sayfası  
app.get('/api/payment/paytr/failed', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ödeme Başarısız - TV Servis</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-red-50 min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <div class="text-center">
                <i class="fas fa-times-circle text-red-500 text-6xl mb-4"></i>
                <h1 class="text-2xl font-bold text-gray-800 mb-2">Ödeme Başarısız</h1>
                <p class="text-gray-600 mb-6">Kredi yükleme işleminiz tamamlanamadı. Lütfen tekrar deneyin.</p>
                <div class="space-y-3">
                    <button onclick="window.close()" class="w-full bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded">
                        <i class="fas fa-times mr-1"></i> Pencereyi Kapat
                    </button>
                    <a href="/bayi/dashboard" class="block w-full bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded text-center">
                        <i class="fas fa-dashboard mr-1"></i> Dashboard'a Dön
                    </a>
                </div>
            </div>
        </div>
        
        <script>
            // 5 saniye sonra otomatik kapat (popup ise)  
            setTimeout(() => {
                if (window.opener) {
                    window.close();
                }
            }, 5000);
        </script>
    </body>
    </html>
  `)
})

// =============================================================================
// Havale Sistemi API Routes
// =============================================================================

// Havale bildirimi yapma
app.post('/api/payment/transfer/notify', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  const { amount, reference, description, transfer_date } = await c.req.json()
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Geçersiz token' }, 401)
    }
    
    // Validations
    if (!amount || amount < 100) {
      return c.json({ error: 'Minimum havale tutarı 100 TL' }, 400)
    }
    
    if (!reference) {
      return c.json({ error: 'Havale referans numarası gerekli' }, 400)
    }
    
    if (!transfer_date) {
      return c.json({ error: 'Havale tarihi gerekli' }, 400)
    }
    
    // Aynı referans ile daha önce bildirim yapılmış mı?
    const existingTransfer = await DB.prepare(`
      SELECT id FROM odeme_islemleri 
      WHERE havale_referans = ? AND bayi_id = ?
    `).bind(reference, bayiAuth.bayiId).first()
    
    if (existingTransfer) {
      return c.json({ error: 'Bu referans numarası ile daha önce havale bildirimi yapılmış' }, 409)
    }
    
    // Havale bildirimi kaydı oluştur
    const odemeResult = await DB.prepare(`
      INSERT INTO odeme_islemleri (
        bayi_id, odeme_turu, tutar, durum, havale_referans, havale_aciklama, 
        admin_onay, created_at, updated_at
      ) VALUES (?, 'havale', ?, 'beklemede', ?, ?, 0, ?, ?)
    `).bind(
      bayiAuth.bayiId, 
      amount, 
      reference, 
      description || `Havale bildirimi - ${amount} TL`,
      new Date().toISOString(),
      new Date().toISOString()
    ).run()
    
    console.log(`Havale bildirimi alındı - Bayi: ${bayiAuth.bayiId}, Tutar: ${amount} TL, Ref: ${reference}`)
    
    return c.json({
      success: true,
      message: 'Havale bildirimi başarıyla alındı. Admin onayından sonra kredi bakiyeniz güncellenecektir.',
      transfer_id: odemeResult.meta.last_row_id,
      reference: reference,
      amount: amount,
      status: 'admin_onayinda'
    })
    
  } catch (error) {
    console.error('Transfer notify error:', error)
    return c.json({ 
      error: 'Havale bildirimi kaydedilemedi', 
      details: error.message 
    }, 500)
  }
})

// Havale durumu sorgulama
app.get('/api/payment/transfer/status/:reference', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  const reference = c.req.param('reference')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Geçersiz token' }, 401)
    }
    
    const transfer = await DB.prepare(`
      SELECT id, tutar, durum, havale_aciklama, admin_onay, created_at, updated_at
      FROM odeme_islemleri 
      WHERE havale_referans = ? AND bayi_id = ? AND odeme_turu = 'havale'
    `).bind(reference, bayiAuth.bayiId).first()
    
    if (!transfer) {
      return c.json({ error: 'Havale kaydı bulunamadı' }, 404)
    }
    
    const statusMap = {
      'beklemede': 'Admin onayı bekleniyor',
      'tamamlandi': 'Onaylandı ve kredi yüklendi',
      'iptal': 'Reddedildi'
    };
    
    return c.json({
      reference: reference,
      amount: transfer.tutar,
      status: transfer.durum,
      status_text: statusMap[transfer.durum] || transfer.durum,
      admin_approved: transfer.admin_onay === 1,
      description: transfer.havale_aciklama,
      created_at: transfer.created_at,
      updated_at: transfer.updated_at
    })
    
  } catch (error) {
    console.error('Transfer status error:', error)
    return c.json({ 
      error: 'Havale durumu sorgulanamadı' 
    }, 500)
  }
})

// =============================================================================
// Admin API Routes - Payment Management & System Administration
// =============================================================================

// Admin login test endpoint
app.get('/api/admin/test', (c) => {
  return c.json({ message: 'Admin endpoint çalışıyor!' })
})

// Admin test endpoint
app.get('/api/admin/test', (c) => {
  return c.json({ message: 'Admin endpoint çalışıyor!' })
})

// Admin login endpoint - Minimal Test Version  
app.post('/api/admin/login', async (c) => {
  return c.json({
    success: true,
    message: 'Hard coded admin login',
    token: 'test-token-123',
    admin: { kullanici_adi: 'admin', yetki_seviyesi: 2 }
  })
})

// Admin dashboard istatistikleri
app.get('/api/admin/dashboard', requireAdminAuth(), async (c) => {
  const { DB } = c.env
  
  try {
    // Bekleyen ödemeler
    const pendingPayments = await DB.prepare(`
      SELECT COUNT(*) as count FROM odeme_islemleri 
      WHERE durum = 'beklemede'
    `).first()
    
    // Toplam kredi işlemleri (ekleme türündeki hareketler)
    const totalCredits = await DB.prepare(`
      SELECT SUM(tutar) as total FROM kredi_hareketleri 
      WHERE hareket_turu = 'ekleme'
    `).first()
    
    // Aktif bayiler
    const activeDealers = await DB.prepare(`
      SELECT COUNT(*) as count FROM bayiler WHERE aktif = 1
    `).first()
    
    // Bu ayki ödemeler
    const monthlyPayments = await DB.prepare(`
      SELECT COUNT(*) as count, SUM(tutar) as total 
      FROM odeme_islemleri 
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      AND durum = 'tamamlandi'
    `).first()
    
    return c.json({
      success: true,
      stats: {
        bekleyen_odemeler: pendingPayments?.count || 0,
        toplam_kredi: totalCredits?.total || 0,
        aktif_bayiler: activeDealers?.count || 0,
        aylik_odemeler: {
          sayi: monthlyPayments?.count || 0,
          tutar: monthlyPayments?.total || 0
        }
      }
    })
    
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return c.json({ error: 'Dashboard verileri alınamadı' }, 500)
  }
})

// Bekleyen bank transferlerini listele
app.get('/api/admin/payments/pending', requireAdminAuth(), async (c) => {
  const { DB } = c.env
  
  try {
    const pendingTransfers = await DB.prepare(`
      SELECT 
        o.id,
        o.bayi_id,
        o.tutar,
        o.havale_referans as referans_no,
        o.havale_aciklama as aciklama,
        o.created_at,
        b.firma_adi,
        (SELECT i.il_adi FROM iller i WHERE i.id = b.il_id) as il_adi,
        b.email,
        b.telefon
      FROM odeme_islemleri o
      JOIN bayiler b ON o.bayi_id = b.id
      WHERE o.durum = 'beklemede' AND o.odeme_turu = 'havale'
      ORDER BY o.created_at DESC
    `).all()
    
    return c.json({
      success: true,
      transfers: pendingTransfers.results || []
    })
    
  } catch (error) {
    console.error('Pending payments error:', error)
    return c.json({ error: 'Bekleyen ödemeler listelenemedi' }, 500)
  }
})

// Transfer onaylama/reddetme
app.post('/api/admin/payments/:id/approve', requireAdminAuth(), async (c) => {
  const { DB } = c.env
  const paymentId = c.req.param('id')
  const { action, aciklama } = await c.req.json() // action: 'approve' veya 'reject'
  const adminInfo = c.get('admin')
  
  try {
    // Ödeme işlemini bul
    const payment = await DB.prepare(`
      SELECT * FROM odeme_islemleri WHERE id = ? AND durum = 'beklemede'
    `).bind(paymentId).first()
    
    if (!payment) {
      return c.json({ error: 'Ödeme işlemi bulunamadı' }, 404)
    }
    
    let newStatus: string
    let logDescription: string
    
    if (action === 'approve') {
      newStatus = 'tamamlandi'
      logDescription = `Transfer onaylandı${aciklama ? ': ' + aciklama : ''}`
      
      // Mevcut bakiyeyi al
      const bayi = await DB.prepare(`
        SELECT kredi_bakiye FROM bayiler WHERE id = ?
      `).bind(payment.bayi_id).first()
      
      const oncekiBakiye = bayi?.kredi_bakiye || 0
      const yeniBakiye = oncekiBakiye + payment.tutar
      
      // Bayinin kredi bakiyesini güncelle
      await DB.prepare(`
        UPDATE bayiler 
        SET kredi_bakiye = ?
        WHERE id = ?
      `).bind(yeniBakiye, payment.bayi_id).run()
      
      // Kredi hareketi kaydet
      await DB.prepare(`
        INSERT INTO kredi_hareketleri (bayi_id, hareket_turu, tutar, onceki_bakiye, yeni_bakiye, aciklama, odeme_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        payment.bayi_id, 
        'ekleme',
        payment.tutar,
        oncekiBakiye,
        yeniBakiye,
        `Admin onayı: ${payment.havale_referans || 'No ref'}`,
        payment.id
      ).run()
      
    } else if (action === 'reject') {
      newStatus = 'iptal_edildi'
      logDescription = `Transfer reddedildi${aciklama ? ': ' + aciklama : ''}`
    } else {
      return c.json({ error: 'Geçersiz işlem' }, 400)
    }
    
    // Ödeme durumunu güncelle
    await DB.prepare(`
      UPDATE odeme_islemleri 
      SET durum = ?, admin_onay = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newStatus, action === 'approve' ? 1 : 0, paymentId).run()
    
    // Log kaydı oluştur
    await DB.prepare(`
      INSERT INTO odeme_onay_loglari (odeme_id, admin_id, onceki_durum, yeni_durum, aciklama)
      VALUES (?, ?, 'beklemede', ?, ?)
    `).bind(paymentId, adminInfo.adminId, newStatus, logDescription).run()
    
    // Send email notification
    try {
      const bayi = await DB.prepare(`SELECT * FROM bayiler WHERE id = ?`).bind(payment.bayi_id).first()
      
      if (action === 'approve') {
        await NotificationService.notifyPaymentApproval(bayi, payment, aciklama)
        SystemLogger.info('Notification', 'Payment approval notification sent', { paymentId, bayiId: payment.bayi_id })
      } else {
        await NotificationService.notifyPaymentRejection(bayi, payment, aciklama || 'Red nedeni belirtilmedi')
        SystemLogger.info('Notification', 'Payment rejection notification sent', { paymentId, bayiId: payment.bayi_id })
      }
    } catch (notificationError) {
      SystemLogger.error('Notification', 'Failed to send notification', { error: notificationError.message })
      // Don't fail the approval process if notification fails
    }
    
    return c.json(createSuccessResponse({
      paymentId: paymentId,
      action: action,
      amount: payment.tutar,
      newStatus: newStatus
    }, action === 'approve' ? 'Transfer başarıyla onaylandı' : 'Transfer başarıyla reddedildi'))
    
  } catch (error) {
    console.error('Payment approval error:', error)
    return c.json({ error: 'İşlem gerçekleştirilemedi' }, 500)
  }
})

// Ödeme geçmişi ve raporlama
app.get('/api/admin/payments/history', requireAdminAuth(), async (c) => {
  const { DB } = c.env
  const { page = '1', limit = '20', durum = 'all', bayi_id = '' } = c.req.query()
  
  try {
    let whereClause = '1=1'
    const bindings: any[] = []
    
    if (durum !== 'all') {
      whereClause += ' AND o.durum = ?'
      bindings.push(durum)
    }
    
    if (bayi_id) {
      whereClause += ' AND o.bayi_id = ?'
      bindings.push(parseInt(bayi_id))
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit)
    bindings.push(parseInt(limit), offset)
    
    const payments = await DB.prepare(`
      SELECT 
        o.id,
        o.bayi_id,
        o.tutar,
        o.odeme_turu as odeme_yontemi,
        o.durum,
        o.havale_referans as referans_no,
        o.havale_aciklama as aciklama,
        o.admin_onay,
        o.created_at,
        o.updated_at as islem_tarihi,
        b.firma_adi,
        (SELECT i.il_adi FROM iller i WHERE i.id = b.il_id) as il_adi
      FROM odeme_islemleri o
      JOIN bayiler b ON o.bayi_id = b.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings).all()
    
    // Toplam kayıt sayısı
    const totalCount = await DB.prepare(`
      SELECT COUNT(*) as count FROM odeme_islemleri o WHERE ${whereClause}
    `).bind(...bindings.slice(0, -2)).first()
    
    return c.json({
      success: true,
      payments: payments.results || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / parseInt(limit))
      }
    })
    
  } catch (error) {
    console.error('Payment history error:', error)
    return c.json({ error: 'Ödeme geçmişi alınamadı' }, 500)
  }
})

// =============================================================================
// System Monitoring & Health Check Routes
// =============================================================================

// System health check endpoint
app.get('/health', async (c) => {
  try {
    const { DB } = c.env
    
    // Database connectivity check
    const dbCheck = await PerformanceMonitor.monitorDatabaseQuery('healthCheck', async () => {
      return await DB.prepare('SELECT 1 as test').first()
    })
    
    // Performance metrics
    const healthData = await PerformanceMonitor.healthCheck()
    
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbCheck ? 'connected' : 'disconnected',
      performance: healthData,
      uptime: 'workers_env'
    }
    
    SystemLogger.info('Health', 'Health check completed', response)
    return c.json(response)
    
  } catch (error) {
    SystemLogger.error('Health', 'Health check failed', { error: error.message })
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }, 503)
  }
})

// Performance metrics endpoint (admin only)
app.get('/api/admin/metrics', requireAdminAuth(), async (c) => {
  try {
    const since = parseInt(c.req.query('since') || '0') || (Date.now() - 3600000) // Last hour
    
    const metrics = {
      summary: PerformanceMonitor.getSummary(since),
      recent: PerformanceMonitor.getMetrics(undefined, since),
      health: await PerformanceMonitor.healthCheck()
    }
    
    return c.json(createSuccessResponse(metrics, 'Performans metrikleri alındı'))
    
  } catch (error) {
    SystemLogger.error('Metrics', 'Failed to get metrics', { error: error.message })
    throw new BusinessError('Metrikler alınamadı')
  }
})

// Clean up old metrics (internal endpoint)
app.post('/api/admin/cleanup', requireAdminAuth(), async (c) => {
  try {
    PerformanceMonitor.cleanup()
    SystemLogger.info('Cleanup', 'Metrics cleanup triggered')
    
    return c.json(createSuccessResponse({}, 'Temizlik işlemi tamamlandı'))
    
  } catch (error) {
    SystemLogger.error('Cleanup', 'Cleanup failed', { error: error.message })
    throw new BusinessError('Temizlik işlemi başarısız')
  }
})

// =============================================================================
// Frontend Routes
// =============================================================================

// Ana sayfa - Dashboard
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TV Servis Yönetim Sistemi</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100 min-h-screen">
        <!-- Navigation -->
        <nav class="bg-blue-600 text-white p-4">
            <div class="container mx-auto flex justify-between items-center">
                <h1 class="text-2xl font-bold">
                    <i class="fas fa-tv mr-2"></i>
                    TV Servis Yönetim Sistemi
                </h1>
                <div class="space-x-4">
                    <button onclick="showSection('dashboard')" class="nav-btn bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded">
                        <i class="fas fa-dashboard mr-1"></i> Dashboard
                    </button>
                    <button onclick="showSection('jobs')" class="nav-btn bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded">
                        <i class="fas fa-tasks mr-1"></i> İşler
                    </button>
                    <button onclick="showSection('dealers')" class="nav-btn bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded">
                        <i class="fas fa-users mr-1"></i> Bayiler
                    </button>
                    <a href="/dashboard" class="nav-btn bg-purple-500 hover:bg-purple-700 px-4 py-2 rounded inline-block">
                        <i class="fas fa-chart-line mr-1"></i> Sistem İzleme
                    </a>
                    <a href="/bayi/login" class="nav-btn bg-green-500 hover:bg-green-700 px-4 py-2 rounded inline-block">
                        <i class="fas fa-user mr-1"></i> Bayi Girişi
                    </a>
                    <a href="/admin" class="nav-btn bg-red-500 hover:bg-red-700 px-4 py-2 rounded inline-block">
                        <i class="fas fa-user-shield mr-1"></i> Admin
                    </a>
                </div>
            </div>
        </nav>

        <div class="container mx-auto p-6">
            <!-- Dashboard Section -->
            <div id="dashboard-section" class="section">
                <h2 class="text-3xl font-bold mb-6 text-gray-800">
                    <i class="fas fa-chart-line mr-2"></i>
                    Dashboard - Genel Durum
                </h2>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" id="stats-cards">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Toplam İş</p>
                                <p class="text-3xl font-bold text-blue-600" id="total-jobs">-</p>
                            </div>
                            <i class="fas fa-briefcase text-blue-500 text-2xl"></i>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Aktif İş</p>
                                <p class="text-3xl font-bold text-orange-600" id="active-jobs">-</p>
                            </div>
                            <i class="fas fa-clock text-orange-500 text-2xl"></i>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Tamamlanan</p>
                                <p class="text-3xl font-bold text-green-600" id="completed-jobs">-</p>
                            </div>
                            <i class="fas fa-check-circle text-green-500 text-2xl"></i>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Toplam Bayi</p>
                                <p class="text-3xl font-bold text-purple-600" id="total-dealers">-</p>
                            </div>
                            <i class="fas fa-store text-purple-500 text-2xl"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Charts -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-xl font-semibold mb-4">Son 7 Gün İş Grafiği</h3>
                        <div id="recent-jobs-chart" class="h-64 flex items-center justify-center text-gray-500">
                            Veriler yükleniyor...
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-xl font-semibold mb-4">İl Bazında İş Dağılımı (Top 10)</h3>
                        <div id="jobs-by-city" class="space-y-2">
                            Veriler yükleniyor...
                        </div>
                    </div>
                </div>
            </div>

            <!-- Jobs Section -->
            <div id="jobs-section" class="section hidden">
                <h2 class="text-3xl font-bold mb-6 text-gray-800">
                    <i class="fas fa-tasks mr-2"></i>
                    Aktif İşler
                </h2>
                
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="p-4 bg-gray-50 border-b">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold">İş Listesi</h3>
                            <button onclick="loadActiveJobs()" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded">
                                <i class="fas fa-refresh mr-1"></i> Yenile
                            </button>
                        </div>
                    </div>
                    
                    <div id="jobs-list" class="p-4">
                        Veriler yükleniyor...
                    </div>
                </div>
            </div>

            <!-- Dealers Section -->
            <div id="dealers-section" class="section hidden">
                <h2 class="text-3xl font-bold mb-6 text-gray-800">
                    <i class="fas fa-users mr-2"></i>
                    Bayiler
                </h2>
                
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="p-4 bg-gray-50 border-b">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold">Bayi Listesi</h3>
                            <select id="city-filter" onchange="loadDealers()" class="px-3 py-2 border rounded">
                                <option value="">Tüm İller</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="dealers-list" class="p-4">
                        Veriler yükleniyor...
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// Admin paneli
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Paneli - TV Servis Yönetim Sistemi</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- Login Screen -->
        <div id="admin-login" class="hidden">
            <div class="min-h-screen flex items-center justify-center">
                <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                    <div class="text-center mb-6">
                        <i class="fas fa-user-shield text-4xl text-blue-600 mb-4"></i>
                        <h1 class="text-2xl font-bold text-gray-800">Admin Paneli</h1>
                        <p class="text-gray-600">TV Servis Yönetim Sistemi</p>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Adı</label>
                            <input type="text" id="username" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Kullanıcı adınızı girin">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
                            <input type="password" id="password"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Şifrenizi girin">
                        </div>
                        
                        <button onclick="adminLogin()" 
                                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            Giriş Yap
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Admin Dashboard -->
        <div id="admin-dashboard" class="hidden">
            <!-- Header -->
            <header class="bg-white shadow">
                <div class="flex justify-between items-center px-6 py-4">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-user-shield text-2xl text-blue-600"></i>
                        <h1 class="text-xl font-semibold text-gray-800">Admin Paneli</h1>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="text-right">
                            <p class="text-sm text-gray-600">Hoş geldiniz,</p>
                            <p class="font-semibold text-gray-800" id="admin-name">Admin</p>
                        </div>
                        <button onclick="adminLogout()" 
                                class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-sign-out-alt mr-2"></i>
                            Çıkış
                        </button>
                    </div>
                </div>
            </header>

            <!-- Main Layout -->
            <div class="flex">
                <!-- Sidebar -->
                <div class="w-64 bg-blue-600 min-h-screen">
                    <nav class="p-4">
                        <ul class="space-y-2">
                            <li>
                                <button onclick="showSection('dashboard')" 
                                        class="nav-item w-full text-left px-4 py-3 text-white rounded-lg hover:bg-blue-700 flex items-center gap-3 bg-blue-700">
                                    <i class="fas fa-tachometer-alt"></i>
                                    Ana Sayfa
                                </button>
                            </li>
                            <li>
                                <button onclick="showSection('payments')" 
                                        class="nav-item w-full text-left px-4 py-3 text-white rounded-lg hover:bg-blue-700 flex items-center gap-3">
                                    <i class="fas fa-credit-card"></i>
                                    Ödeme Geçmişi
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>

                <!-- Main Content -->
                <div class="flex-1 p-6">
                    <!-- Dashboard Section -->
                    <div id="admin-dashboard-section" class="admin-section">
                        <h2 class="text-3xl font-bold mb-6 text-gray-800">
                            <i class="fas fa-tachometer-alt mr-2"></i>
                            Yönetim Paneli
                        </h2>
                        
                        <!-- Stats Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Bekleyen Ödemeler</p>
                                        <p class="text-3xl font-bold text-yellow-600" id="pending-payments-count">-</p>
                                    </div>
                                    <i class="fas fa-hourglass-half text-yellow-500 text-2xl"></i>
                                </div>
                            </div>
                            
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Toplam Kredi</p>
                                        <p class="text-3xl font-bold text-green-600" id="total-credits">-</p>
                                    </div>
                                    <i class="fas fa-coins text-green-500 text-2xl"></i>
                                </div>
                            </div>
                            
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Aktif Bayiler</p>
                                        <p class="text-3xl font-bold text-blue-600" id="active-dealers">-</p>
                                    </div>
                                    <i class="fas fa-users text-blue-500 text-2xl"></i>
                                </div>
                            </div>
                            
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Bu Ay Ödemeler</p>
                                        <p class="text-3xl font-bold text-purple-600" id="monthly-payments">-</p>
                                    </div>
                                    <i class="fas fa-calendar text-purple-500 text-2xl"></i>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Pending Payments -->
                        <div class="bg-white rounded-lg shadow">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-semibold text-gray-800">
                                    <i class="fas fa-clock mr-2"></i>
                                    Onay Bekleyen Transferler
                                </h3>
                            </div>
                            <div class="p-6">
                                <div id="pending-payments-list" class="space-y-4">
                                    Veriler yükleniyor...
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Payment History Section -->
                    <div id="admin-payments-section" class="admin-section hidden">
                        <h2 class="text-3xl font-bold mb-6 text-gray-800">
                            <i class="fas fa-credit-card mr-2"></i>
                            Ödeme Geçmişi
                        </h2>
                        
                        <div class="bg-white rounded-lg shadow">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-semibold text-gray-800">Tüm Ödeme İşlemleri</h3>
                            </div>
                            <div class="p-6">
                                <div id="payment-history-list">
                                    Veriler yükleniyor...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/admin.js"></script>
    </body>
    </html>
  `)
})

// Health Dashboard sayfası
app.get('/dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🖥️ Sistem Dashboard - TV Servis Yönetim</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            .metric-card {
                transition: all 0.3s ease;
                border: 1px solid #374151;
            }
            .metric-card:hover {
                border-color: #3B82F6;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            }
            .alert-item {
                animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            .status-indicator {
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
            
            /* Dark scrollbar */
            ::-webkit-scrollbar {
                width: 8px;
            }
            ::-webkit-scrollbar-track {
                background: #1F2937;
            }
            ::-webkit-scrollbar-thumb {
                background: #4B5563;
                border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: #6B7280;
            }
        </style>
    </head>
    <body class="bg-gray-900">
        <!-- Dashboard content will be generated by JavaScript -->
        
        <script src="/static/health-dashboard.js"></script>
    </body>
    </html>
  `)
})

// Bayi login sayfası
app.get('/bayi/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bayi Girişi - TV Servis Yönetim</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
            <div class="text-center mb-8">
                <i class="fas fa-tv text-4xl text-blue-500 mb-4"></i>
                <h1 class="text-2xl font-bold text-gray-800">Bayi Paneli</h1>
                <p class="text-gray-600">TV Servis Yönetim Sistemi</p>
            </div>
            
            <form id="loginForm" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-envelope mr-1"></i> Email
                    </label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="bayi@tvservis.com"
                    />
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-lock mr-1"></i> Şifre
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                    />
                </div>
                
                <button 
                    type="submit" 
                    class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                    id="loginBtn"
                >
                    <i class="fas fa-sign-in-alt mr-1"></i> Giriş Yap
                </button>
            </form>
            
            <div id="errorMessage" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded hidden">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                <span id="errorText"></span>
            </div>
            
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-600">Test Bayileri:</p>
                <div class="text-xs text-gray-500 space-y-1 mt-2">
                    <div>teknolojitv@tvservis.com (İstanbul)</div>
                    <div>baskentelektronik@tvservis.com (Ankara)</div>
                    <div>egetv@tvservis.com (İzmir)</div>
                    <div class="font-semibold">Şifre: 123456</div>
                </div>
            </div>
            
            <div class="mt-6 text-center">
                <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-arrow-left mr-1"></i> Admin Paneline Dön
                </a>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const loginBtn = document.getElementById('loginBtn');
                const errorDiv = document.getElementById('errorMessage');
                
                // Loading state
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Giriş yapılıyor...';
                loginBtn.disabled = true;
                errorDiv.classList.add('hidden');
                
                try {
                    const response = await axios.post('/api/bayi/login', {
                        email: email,
                        password: password
                    });
                    
                    if (response.data.success) {
                        // Token'ı localStorage'a kaydet
                        localStorage.setItem('bayiToken', response.data.token);
                        localStorage.setItem('bayiInfo', JSON.stringify(response.data.bayi));
                        
                        // Dashboard'a yönlendir
                        window.location.href = '/bayi/dashboard';
                    }
                } catch (error) {
                    const errorMessage = error.response?.data?.error || 'Giriş işlemi başarısız';
                    document.getElementById('errorText').textContent = errorMessage;
                    errorDiv.classList.remove('hidden');
                } finally {
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-1"></i> Giriş Yap';
                    loginBtn.disabled = false;
                }
            });
        </script>
    </body>
    </html>
  `)
})

// Bayi dashboard sayfası
app.get('/bayi/dashboard', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bayi Dashboard - TV Servis</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100 min-h-screen">
        <!-- Navigation -->
        <nav class="bg-green-600 text-white p-4">
            <div class="container mx-auto flex justify-between items-center">
                <h1 class="text-2xl font-bold">
                    <i class="fas fa-store mr-2"></i>
                    Bayi Paneli
                </h1>
                <div class="flex items-center space-x-4">
                    <span id="bayiInfo" class="text-sm">Yükleniyor...</span>
                    <div class="space-x-2">
                        <button onclick="showBayiSection('dashboard')" class="nav-btn bg-green-500 hover:bg-green-700 px-4 py-2 rounded">
                            <i class="fas fa-dashboard mr-1"></i> Dashboard
                        </button>
                        <button onclick="showBayiSection('jobs')" class="nav-btn bg-green-500 hover:bg-green-700 px-4 py-2 rounded">
                            <i class="fas fa-tasks mr-1"></i> Mevcut İşler
                        </button>
                        <button onclick="showBayiSection('my-jobs')" class="nav-btn bg-green-500 hover:bg-green-700 px-4 py-2 rounded">
                            <i class="fas fa-check mr-1"></i> Aldığım İşler
                        </button>
                        <button onclick="showBayiSection('credits')" class="nav-btn bg-green-500 hover:bg-green-700 px-4 py-2 rounded">
                            <i class="fas fa-coins mr-1"></i> Kredi
                        </button>
                        <button onclick="logout()" class="bg-red-500 hover:bg-red-700 px-4 py-2 rounded">
                            <i class="fas fa-sign-out-alt mr-1"></i> Çıkış
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="container mx-auto p-6">
            <!-- Dashboard Section -->
            <div id="bayi-dashboard-section" class="section">
                <h2 class="text-3xl font-bold mb-6 text-gray-800">
                    <i class="fas fa-chart-line mr-2"></i>
                    Bayi Dashboard
                </h2>
                
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Kredi Bakiye</p>
                                <p class="text-3xl font-bold text-green-600" id="kredi-bakiye">-</p>
                            </div>
                            <i class="fas fa-coins text-green-500 text-2xl"></i>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Mevcut İşler</p>
                                <p class="text-3xl font-bold text-blue-600" id="mevcut-isler">-</p>
                            </div>
                            <i class="fas fa-tasks text-blue-500 text-2xl"></i>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Aldığım İşler</p>
                                <p class="text-3xl font-bold text-orange-600" id="aldigim-isler">-</p>
                            </div>
                            <i class="fas fa-handshake text-orange-500 text-2xl"></i>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Rating</p>
                                <p class="text-3xl font-bold text-purple-600" id="bayi-rating">-</p>
                            </div>
                            <i class="fas fa-star text-purple-500 text-2xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Jobs Section -->
            <div id="bayi-jobs-section" class="section hidden">
                <h2 class="text-3xl font-bold mb-6 text-gray-800">
                    <i class="fas fa-tasks mr-2"></i>
                    Mevcut İşler
                </h2>
                <div id="bayi-jobs-list" class="space-y-4">
                    Veriler yükleniyor...
                </div>
            </div>

            <!-- My Jobs Section -->
            <div id="bayi-my-jobs-section" class="section hidden">
                <h2 class="text-3xl font-bold mb-6 text-gray-800">
                    <i class="fas fa-check mr-2"></i>
                    Aldığım İşler
                </h2>
                <div id="bayi-my-jobs-list" class="space-y-4">
                    Veriler yükleniyor...
                </div>
            </div>

            <!-- Credits Section -->
            <div id="bayi-credits-section" class="section hidden">
                <h2 class="text-3xl font-bold mb-6 text-gray-800">
                    <i class="fas fa-coins mr-2"></i>
                    Kredi Yönetimi
                </h2>
                <div id="bayi-credits-content" class="space-y-4">
                    Veriler yükleniyor...
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/bayi.js"></script>
    </body>
    </html>
  `)
})

// Default route - Ana sayfa
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TV Servis Yönetim Sistemi</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <div class="min-h-screen flex items-center justify-center">
            <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-tv mr-2 text-blue-600"></i>
                        TV Servis Yönetim
                    </h1>
                    <p class="text-gray-600">Türkiye geneli TV ekran servisi yönetim sistemi</p>
                </div>
                
                <div class="space-y-4">
                    <a href="/bayi" class="block w-full bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 transition duration-300">
                        <i class="fas fa-user-tie mr-2"></i>
                        Bayi Girişi
                    </a>
                    
                    <a href="/admin" class="block w-full bg-red-600 text-white text-center py-3 rounded-lg hover:bg-red-700 transition duration-300">
                        <i class="fas fa-user-shield mr-2"></i>
                        Admin Girişi
                    </a>
                    
                    <a href="/dashboard" class="block w-full bg-green-600 text-white text-center py-3 rounded-lg hover:bg-green-700 transition duration-300">
                        <i class="fas fa-chart-line mr-2"></i>
                        Sistem Durumu
                    </a>
                    
                    <div class="border-t pt-4 mt-6">
                        <p class="text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-book mr-2"></i>Kullanım Kılavuzları
                        </p>
                        
                        <div class="space-y-2">
                            <a href="/static/TV-Servis-Kullanici-Kilavuzu.pdf" target="_blank" class="block w-full bg-purple-600 text-white text-center py-2 rounded-lg hover:bg-purple-700 transition duration-300 text-sm">
                                <i class="fas fa-file-pdf mr-2"></i>
                                Kullanıcı Kılavuzu (PDF)
                            </a>
                            
                            <a href="/static/TV-Servis-Teknik-Kilavuz.pdf" target="_blank" class="block w-full bg-orange-600 text-white text-center py-2 rounded-lg hover:bg-orange-700 transition duration-300 text-sm">
                                <i class="fas fa-code mr-2"></i>
                                Teknik Kılavuz (PDF)
                            </a>
                        </div>
                    </div>
                </div>
                
                <div class="mt-8 text-center text-sm text-gray-500">
                    <p>Güvenli ve hızlı servis yönetimi</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `);
})

export default app
