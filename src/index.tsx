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

// AI Chat API Endpoint (placeholder for future AI integration)
app.post('/api/ai-chat', async (c) => {
  try {
    const { message, sessionId } = await c.req.json()
    
    if (!message) {
      return c.json({ error: 'Mesaj gerekli' }, 400)
    }
    
    // TODO: Buraya gerçek yapay zeka servisinizi entegre edeceksiniz
    // Örnek: OpenAI, Google Gemini, Azure AI, vb.
    
    // Şimdilik basit cevap sistemini kullanıyoruz
    const responses = {
      'televizyon': 'Televizyon tamiri genellikle 1-2 saat sürer. LED panel sorunu ise parça temininden sonra aynı gün tamamlanabilir. Ücretsiz keşif için hemen talep formu doldurabilirsiniz.',
      'fiyat': 'Fiyatlarımız iş türüne göre değişir. Televizyon tamiri 600-2000₺, çamaşır makinesi 800-1800₺ aralığında. Kesin fiyat ücretsiz keşiften sonra belirlenir.',
      'ödeme': 'Ödeme iş tamamlandıktan ve onayınızdan sonra yapılır. Nakit, kart veya havale seçeneklerimiz var. İş öncesi sadece parça bedeli alınabilir.',
      'garanti': 'Tüm işlerimizde 6 ay işçilik garantisi veriyoruz. Aynı sorun tekrarlarsa ücretsiz çözüm sağlıyoruz.',
      'süre': 'Ortalama yanıt süremiz 15 dakikadır. Acil durumlar için telefon ile direkt ulaşabilirsiniz: 0 500 123 45 67'
    }
    
    const lowerMessage = message.toLowerCase()
    let response = 'Sorununuz için size yardımcı olmak istiyorum.\n\n📞 Hemen arayabilirsiniz: 0 500 123 45 67\n💬 WhatsApp: wa.me/905001234567\n📝 Veya hizmet talep formu doldurabilirsiniz.\n\nBaşka sorularınız varsa çekinmeden sorun!'
    
    for (const [key, resp] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        response = resp
        break
      }
    }
    
    return c.json({
      success: true,
      response,
      sessionId: sessionId || 'session_' + Date.now()
    })
    
  } catch (error) {
    console.error('AI Chat error:', error)
    return c.json({ 
      error: 'Yapay zeka servisi geçici olarak kullanılamıyor' 
    }, 500)
  }
})

// Smart Recommendation API Endpoint
app.post('/api/smart-recommendation', async (c) => {
  try {
    const { problemDescription, urgencyLevel, serviceLocation } = await c.req.json()
    
    if (!problemDescription) {
      return c.json({ error: 'Problem açıklaması gerekli' }, 400)
    }
    
    // Service categories matching (this would be powered by real AI in production)
    const serviceCategories = {
      'ev_elektrigi': {
        keywords: ['elektrik', 'priz', 'sigorta', 'kablo', 'ampul', 'lamba', 'şalter', 'kaçak', 'kesinti', 'voltaj'],
        name: 'Ev Elektriği',
        priceRange: '₺150-800',
        urgency: { emergency: '30dk', urgent: '1-2 saat', normal: '2-4 saat' }
      },
      'beyaz_esya': {
        keywords: ['buzdolabı', 'çamaşır makinesi', 'bulaşık makinesi', 'fırın', 'ocak', 'mikrodalga', 'klima', 'soğutmuyor', 'çalışmıyor'],
        name: 'Beyaz Eşya Tamiri',
        priceRange: '₺200-1200',
        urgency: { emergency: '1 saat', urgent: '2-4 saat', normal: '4-8 saat' }
      },
      'su_tesisati': {
        keywords: ['musluk', 'tıkanıklık', 'su kaçağı', 'boru', 'sifon', 'klozet', 'rezervuar', 'damla', 'akıyor', 'tıkalı'],
        name: 'Su Tesisatı',
        priceRange: '₺100-600',
        urgency: { emergency: '30dk', urgent: '1 saat', normal: '2-3 saat' }
      }
    }
    
    const text = problemDescription.toLowerCase()
    let bestMatch = null
    let bestScore = 0
    
    // Simple keyword matching (in production, use real AI/ML)
    for (const [categoryId, category] of Object.entries(serviceCategories)) {
      let score = 0
      for (const keyword of category.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += keyword.length
        }
      }
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = { id: categoryId, ...category, confidence: Math.min(score * 10, 95) }
      }
    }
    
    return c.json({
      success: true,
      recommendation: bestMatch,
      whatsappMessage: bestMatch ? 
        `Merhaba! ${bestMatch.name} konusunda yardım istiyorum. Problem: ${problemDescription}` :
        `Merhaba! Şu konuda yardım istiyorum: ${problemDescription}`,
      estimatedCost: bestMatch ? bestMatch.priceRange : '₺100-1000',
      responseTime: bestMatch ? bestMatch.urgency[urgencyLevel] : '1-3 saat'
    })
    
  } catch (error) {
    console.error('Smart recommendation error:', error)
    return c.json({ 
      error: 'Öneri sistemi geçici olarak kullanılamıyor' 
    }, 500)
  }
})

// Customer Service Request - n8n Webhook Integration
app.post('/api/service-request', async (c) => {
  const { DB } = c.env
  
  try {
    // Form verilerini al
    const requestData = await c.req.json()
    
    // Gerekli alanları kontrol et
    const { customerName, customerPhone, customerCity, serviceCategory, problemDescription } = requestData
    
    if (!customerName || !customerPhone || !serviceCategory || !problemDescription) {
      return c.json({ 
        success: false, 
        error: 'Gerekli alanlar eksik' 
      }, 400)
    }
    
    // Timestamp ve benzersiz talep kodu oluştur
    const timestamp = new Date().toISOString()
    const requestCode = `GRT-${Date.now()}`
    
    // n8n webhook için data hazırla
    const webhookData = {
      requestCode,
      timestamp,
      customer: {
        name: customerName,
        phone: customerPhone,
        city: customerCity || '',
        district: requestData.customerDistrict || ''
      },
      service: {
        category: serviceCategory,
        description: problemDescription,
        urgency: requestData.urgency || 'normal'
      },
      contactPreference: requestData.contactPreference || ['phone'],
      source: 'garantor360_website'
    }
    
    // n8n webhook URL'si (environment variable olarak tanımlanmalı)
    // Production'da gerçek n8n webhook URL'ini buraya ekleyeceksiniz
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || null
    
    if (n8nWebhookUrl) {
      try {
        // n8n'e webhook gönder
        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData)
        })
        
        if (!webhookResponse.ok) {
          throw new Error(`Webhook failed: ${webhookResponse.status}`)
        }
        
        console.log('n8n webhook sent successfully:', requestCode)
      } catch (webhookError) {
        console.error('n8n webhook error:', webhookError)
        // Webhook hatası olsa bile local kaydı yapıp kullanıcıya başarılı dönüş verebiliriz
      }
    } else {
      console.log('n8n webhook URL not configured, skipping webhook call')
    }
    
    // Local database'e de kaydet (opsiyonel, backup için)
    try {
      await DB.prepare(`
        INSERT INTO service_requests (
          request_code, customer_name, customer_phone, customer_city, 
          customer_district, service_category, problem_description, 
          urgency, contact_preference, created_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        requestCode, customerName, customerPhone, customerCity,
        requestData.customerDistrict || '', serviceCategory, problemDescription,
        requestData.urgency || 'normal', JSON.stringify(requestData.contactPreference || ['phone']),
        timestamp, 'received'
      ).run()
    } catch (dbError) {
      console.error('Database save error:', dbError)
      // DB hatası olsa bile webhook çalıştığı için başarılı sayabiliriz
    }
    
    return c.json({
      success: true,
      message: 'Talebiniz başarıyla alındı',
      requestCode,
      data: {
        estimatedResponse: '15 dakika içinde',
        nextSteps: [
          'Uzmanlarımız talebinizi değerlendirecek',
          'Size telefon veya WhatsApp ile ulaşılacak', 
          'Ücretsiz keşif randevusu ayarlanacak'
        ]
      }
    })
    
  } catch (error) {
    console.error('Service request error:', error)
    return c.json({ 
      success: false, 
      error: 'Talep işlenirken hata oluştu' 
    }, 500)
  }
})

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

// Test endpoint - Reset job for testing (geliştirme için)
app.post('/api/test/reset-job/:id', async (c) => {
  const { DB } = c.env
  const jobId = c.req.param('id')
  
  try {
    // İşi reset et
    await DB.prepare(`
      UPDATE is_talepleri 
      SET satin_alan_bayi_id = NULL, 
          satin_alma_tarihi = NULL, 
          satin_alma_fiyati = NULL,
          durum = 'yeni',
          goruntuleme_durumu = 'kısıtlı'
      WHERE id = ?
    `).bind(jobId).run()
    
    return c.json({ success: true, message: `İş ${jobId} reset edildi` })
  } catch (error) {
    console.error('Reset job error:', error)
    return c.json({ error: 'Reset başarısız' }, 500)
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
    
    // Geçici: Hard-coded şifre kontrolü (debug için)
    if (password === '123456') {
      // Başarılı login
      const token = 'test-bayi-token-123'
      return c.json({
        success: true,
        message: 'Giriş başarılı', 
        token,
        bayi: {
          id: bayi.id,
          firma_adi: bayi.firma_adi,
          email: bayi.login_email,
          kredi_bakiye: bayi.kredi_bakiye
        }
      })
    } else {
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
    if (error instanceof AuthenticationError) {
      return c.json({ error: error.message }, 401)
    }
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
      bayiAuth.firma_adi,
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

// Ana sayfa - Removed (Replaced by Dealer Vitrin at end of file)

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
                                <button onclick="showSection('system-monitoring')" 
                                        class="nav-item w-full text-left px-4 py-3 text-white rounded-lg hover:bg-blue-700 flex items-center gap-3">
                                    <i class="fas fa-chart-line"></i>
                                    Sistem İzleme
                                </button>
                            </li>
                            <li>
                                <button onclick="showSection('dealers')" 
                                        class="nav-item w-full text-left px-4 py-3 text-white rounded-lg hover:bg-blue-700 flex items-center gap-3">
                                    <i class="fas fa-users"></i>
                                    Bayiler
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

                    <!-- System Monitoring Section -->
                    <div id="admin-system-monitoring-section" class="admin-section hidden">
                        <h2 class="text-3xl font-bold mb-6 text-gray-800">
                            <i class="fas fa-chart-line mr-2"></i>
                            Sistem İzleme
                        </h2>
                        
                        <!-- System Health Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Sistem Durumu</p>
                                        <p class="text-lg font-bold text-green-600">Çevrimiçi</p>
                                    </div>
                                    <div class="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                            
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Sunucu Yükü</p>
                                        <p class="text-lg font-bold text-blue-600" id="server-load">%12</p>
                                    </div>
                                    <i class="fas fa-server text-blue-500 text-xl"></i>
                                </div>
                            </div>
                            
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Veritabanı</p>
                                        <p class="text-lg font-bold text-green-600">Aktif</p>
                                    </div>
                                    <i class="fas fa-database text-green-500 text-xl"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Real-time Metrics -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div class="bg-white rounded-lg shadow p-6">
                                <h3 class="text-lg font-semibold text-gray-800 mb-4">
                                    <i class="fas fa-chart-area mr-2"></i>
                                    Günlük İş Dağılımı
                                </h3>
                                <canvas id="daily-jobs-chart" width="400" height="200"></canvas>
                            </div>
                            
                            <div class="bg-white rounded-lg shadow p-6">
                                <h3 class="text-lg font-semibold text-gray-800 mb-4">
                                    <i class="fas fa-money-bill-wave mr-2"></i>
                                    Ödeme Durumu
                                </h3>
                                <canvas id="payment-status-chart" width="400" height="200"></canvas>
                            </div>
                        </div>

                        <!-- System Logs -->
                        <div class="bg-gray-900 rounded-lg p-6">
                            <h3 class="text-lg font-semibold text-white mb-4">
                                <i class="fas fa-terminal mr-2"></i>
                                Sistem Logları (Canlı)
                            </h3>
                            <div id="system-logs" class="bg-black rounded p-4 h-64 overflow-y-auto text-green-400 font-mono text-sm">
                                <!-- Logs will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>

                    <!-- Dealers Management Section -->
                    <div id="admin-dealers-section" class="admin-section hidden">
                        <h2 class="text-3xl font-bold mb-6 text-gray-800">
                            <i class="fas fa-users mr-2"></i>
                            Bayi Yönetimi
                        </h2>
                        
                        <!-- Dealer Stats -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Toplam Bayi</p>
                                        <p class="text-3xl font-bold text-blue-600" id="total-dealers">-</p>
                                    </div>
                                    <i class="fas fa-users text-blue-500 text-2xl"></i>
                                </div>
                            </div>
                            
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Aktif Bayiler</p>
                                        <p class="text-3xl font-bold text-green-600" id="active-dealers-count">-</p>
                                    </div>
                                    <i class="fas fa-user-check text-green-500 text-2xl"></i>
                                </div>
                            </div>
                            
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Bu Ay Yeni</p>
                                        <p class="text-3xl font-bold text-purple-600" id="new-dealers">-</p>
                                    </div>
                                    <i class="fas fa-user-plus text-purple-500 text-2xl"></i>
                                </div>
                            </div>
                            
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">En Performanslı</p>
                                        <p class="text-lg font-bold text-orange-600" id="top-dealer">-</p>
                                    </div>
                                    <i class="fas fa-trophy text-orange-500 text-2xl"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Dealer List -->
                        <div class="bg-white rounded-lg shadow">
                            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h3 class="text-lg font-semibold text-gray-800">Bayi Listesi</h3>
                                <div class="flex gap-2">
                                    <input 
                                        type="text" 
                                        id="dealer-search" 
                                        placeholder="Bayi ara..."
                                        class="px-3 py-1 border border-gray-300 rounded text-sm"
                                    >
                                    <button 
                                        onclick="refreshDealers()" 
                                        class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                    >
                                        <i class="fas fa-refresh mr-1"></i>Yenile
                                    </button>
                                </div>
                            </div>
                            <div class="p-6">
                                <div class="overflow-x-auto">
                                    <table class="min-w-full table-auto">
                                        <thead>
                                            <tr class="bg-gray-50">
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Firma</th>
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Şehir</th>
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Durum</th>
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Kredi</th>
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody id="dealers-table-body">
                                            <!-- Dealers will be populated by JavaScript -->
                                        </tbody>
                                    </table>
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

// Dashboard route - Redirect to admin panel system monitoring
app.get('/dashboard', (c) => {
  return c.redirect('/admin#system-monitoring')
})

// Bayi Landing Page - Service Provider Focused
app.get('/bayi', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Garantor360 Bayi Başvuru | Profesyonel İş Ortaklığı ve Garantili Kazanç</title>
        <meta name="description" content="Garantor360 bayi olun! Garantili ödeme, sürekli iş akışı ve profesyonel destek ile gelir artırın. 6 sektörde iş fırsatları. Hemen başvuru yapın!">
        <meta name="keywords" content="bayi başvuru, iş fırsatları, garantili ödeme, hizmet verme, profesyonel ortaklık, gelir artırma">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <style>
            .corporate-gradient { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); }
            .card-corporate { 
              transition: all 0.2s ease; 
              border: 2px solid transparent;
            }
            .card-corporate:hover { 
              transform: translateY(-2px); 
              box-shadow: 0 8px 25px rgba(30, 41, 59, 0.15);
              border-color: #ea580c;
            }
            .pulse-dot { 
              animation: pulseDot 1.5s ease-in-out infinite; 
            }
            @keyframes pulseDot {
              0%, 100% { opacity: 0.8; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.05); }
            }
            .stats-counter { 
              font-weight: 700; 
              color: #1e293b;
            }
            .section-divider {
              height: 2px;
              background: linear-gradient(90deg, transparent, #ea580c, transparent);
            }
            .sharp-corner {
              border-radius: 0;
            }
            .minimal-corner {
              border-radius: 4px;
            }
        </style>
    </head>
    <body class="bg-slate-100">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <!-- Garantor360 Logo -->
                        <div class="flex items-center">
                            <span class="text-3xl font-bold text-blue-900">Garantor</span>
                            <span class="text-3xl font-bold text-orange-500">360°</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <!-- Provider Action Buttons -->
                        <a href="/" class="text-slate-600 hover:text-slate-800 font-medium transition duration-200">
                            Müşteri misiniz?
                        </a>
                        <a href="/bayi/login" class="bg-orange-600 text-white px-6 py-2 sharp-corner font-semibold hover:bg-orange-700 transition duration-200">
                            BAYI GİRİŞİ
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero Section - Professional Team Image -->
        <section class="relative">
            <div class="w-full" style="height: calc(auto + 100px);">
                <img src="https://page.gensparksite.com/v1/base64_upload/9cdd3faa6e096dfc69d232a2cfecf7d2" 
                     alt="Profesyonel Hizmet Ekibi" 
                     class="w-full object-cover" 
                     style="height: calc(100% + 100px); min-height: 400px;">
            </div>
            
            <!-- Content Overlay - More Transparent -->
            <div class="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-blue-800/30 to-transparent flex items-center justify-center">
                <div class="max-w-7xl mx-auto px-6 text-center">
                    <div class="max-w-4xl mx-auto">
                        <h1 class="text-4xl lg:text-5xl font-bold mb-6 text-white drop-shadow-2xl">
                            Profesyonel Servis Sağlayıcı Olun
                        </h1>
                        <p class="text-lg lg:text-xl text-blue-100 mb-8 drop-shadow-lg">
                            Garantor360 platformunda hizmet vererek güvenli ödeme sistemi ve sürekli iş akışı ile gelir elde edin.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onclick="scrollToApplication()" class="bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition duration-200 shadow-2xl">
                                Hemen Başvur
                            </button>
                            <button onclick="scrollToStats()" class="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition duration-200 shadow-2xl backdrop-blur-sm">
                                Fırsatları Keşfet
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Live Statistics for Providers -->
        <section id="stats" class="py-20 bg-white">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Provider Stats Header -->
                <div class="text-center mb-16">
                    <div class="section-divider w-20 mx-auto mb-6"></div>
                    <h2 class="text-4xl font-bold text-slate-800 mb-4 tracking-tight">
                        CANLI İŞ FIRSATLARI
                    </h2>
                    <p class="text-slate-600 text-lg font-medium">Son 24 saatte gerçekleşen iş hacmi</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <div class="bg-blue-900 text-white p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-200 text-sm font-medium mb-2">BUGÜN AÇILAN İŞ</p>
                                <p class="text-4xl font-bold stats-counter text-white" id="daily-jobs">127</p>
                            </div>
                            <div class="w-3 h-3 bg-amber-400 sharp-corner pulse-dot"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-blue-700">
                            <span class="text-amber-300 text-sm font-semibold">
                                ↗ +23% önceki güne göre
                            </span>
                        </div>
                    </div>

                    <div class="bg-white border-2 border-blue-200 p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-600 text-sm font-medium mb-2">GÜNLÜK ORTALAMA KAZANÇ</p>
                                <p class="text-4xl font-bold text-blue-900">₺<span id="daily-earnings">1,250</span></p>
                            </div>
                            <div class="w-3 h-3 bg-amber-500 sharp-corner"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-blue-100">
                            <span class="text-blue-600 text-sm font-semibold">
                                Bayi başına ortalama
                            </span>
                        </div>
                    </div>

                    <div class="bg-white border-2 border-blue-200 p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-600 text-sm font-medium mb-2">AKTİF BAYİLER</p>
                                <p class="text-4xl font-bold text-blue-900" id="active-dealers">589</p>
                            </div>
                            <div class="w-3 h-3 bg-amber-500 sharp-corner"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-blue-100">
                            <span class="text-emerald-600 text-sm font-semibold">
                                ↗ Bu ay %32 artış
                            </span>
                        </div>
                    </div>

                    <div class="bg-amber-500 text-blue-900 p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-amber-800 text-sm font-medium mb-2">ORTALAMA İŞ ÜCRETİ</p>
                                <p class="text-4xl font-bold text-blue-900">₺<span id="avg-price">385</span></p>
                            </div>
                            <div class="w-3 h-3 bg-blue-900 sharp-corner pulse-dot"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-amber-600">
                            <span class="text-blue-800 text-sm font-semibold">
                                ↗ Sürekli yükseliş
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Live Job Feed for Providers -->
                <div class="bg-white border-2 border-blue-200 minimal-corner mt-16">
                    <div class="bg-blue-900 px-8 py-4 border-b-2 border-blue-200">
                        <div class="flex items-center justify-between">
                            <h3 class="text-white text-xl font-bold tracking-tight flex items-center">
                                <span class="inline-block w-3 h-3 bg-amber-400 sharp-corner pulse-dot mr-3"></span>
                                CANLI TALEP AKIŞI - BAYİLER İÇİN
                            </h3>
                            <div class="flex items-center space-x-4 text-sm">
                                <span class="text-blue-200 font-medium">Son 10 dakika:</span>
                                <span class="bg-amber-500 text-blue-900 px-3 py-1 sharp-corner font-bold" id="provider-recent-count">12 İş</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Provider Job Feed Grid -->
                    <div class="p-8">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <!-- Left: Live Provider Job List - Extended to 2 columns -->
                            <div class="flex flex-col lg:col-span-2">
                                <h4 class="text-blue-900 font-bold mb-4 tracking-tight flex items-center">
                                    <i class="fas fa-hammer text-amber-500 mr-2"></i>
                                    YENİ İŞ FIRSATLARI
                                </h4>
                                <div id="provider-job-feed" class="space-y-3 overflow-y-auto bg-blue-50 p-3 minimal-corner border border-blue-200" style="height: 563px;">
                                    <!-- Provider jobs will be populated via JavaScript -->
                                    <!-- Height increased by 163px total - ultra-precise final display -->
                                </div>
                            </div>
                            
                            <!-- Right: Provider Statistics - Single column -->
                            <div class="lg:col-span-1">
                                <h4 class="text-blue-900 font-bold mb-4 tracking-tight flex items-center">
                                    <i class="fas fa-chart-bar text-amber-500 mr-2"></i>
                                    BAYİ İSTATİSTİKLERİ
                                </h4>
                                <div class="space-y-4">
                                    <!-- Earnings Chart -->
                                    <div class="bg-blue-50 p-4 minimal-corner">
                                        <div class="flex justify-between items-center mb-3">
                                            <span class="text-blue-700 font-medium text-sm">SON 6 SAAT KAZANÇ</span>
                                            <span class="text-amber-600 font-bold text-lg" id="provider-hourly-earnings">₺4,280</span>
                                        </div>
                                        <div class="flex items-end space-x-1 h-16">
                                            <div class="bg-blue-600 w-full" style="height: 45%"></div>
                                            <div class="bg-blue-600 w-full" style="height: 60%"></div>
                                            <div class="bg-blue-600 w-full" style="height: 80%"></div>
                                            <div class="bg-amber-500 w-full" style="height: 100%"></div>
                                            <div class="bg-blue-600 w-full" style="height: 75%"></div>
                                            <div class="bg-blue-600 w-full" style="height: 55%"></div>
                                        </div>
                                    </div>
                                    
                                    <!-- Service Category Performance -->
                                    <div class="bg-blue-50 p-4 minimal-corner">
                                        <h5 class="text-blue-700 font-bold text-sm mb-3">POPÜLER KATEGORİLER</h5>
                                        <div class="space-y-2">
                                            <div class="flex justify-between items-center">
                                                <span class="text-blue-600 text-sm">Teknik Onarım</span>
                                                <div class="flex items-center">
                                                    <div class="w-16 h-2 bg-blue-200 mr-2">
                                                        <div class="w-4/5 h-full bg-amber-500"></div>
                                                    </div>
                                                    <span class="text-blue-800 font-bold text-sm">80%</span>
                                                </div>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-blue-600 text-sm">Ev Bakım & Tadilat</span>
                                                <div class="flex items-center">
                                                    <div class="w-16 h-2 bg-blue-200 mr-2">
                                                        <div class="w-3/4 h-full bg-blue-600"></div>
                                                    </div>
                                                    <span class="text-blue-800 font-bold text-sm">75%</span>
                                                </div>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-blue-600 text-sm">Temizlik & Hijyen</span>
                                                <div class="flex items-center">
                                                    <div class="w-16 h-2 bg-blue-200 mr-2">
                                                        <div class="w-3/5 h-full bg-blue-600"></div>
                                                    </div>
                                                    <span class="text-blue-800 font-bold text-sm">60%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Top Earning Cities -->
                                    <div class="bg-blue-50 p-4 minimal-corner">
                                        <h5 class="text-blue-700 font-bold text-sm mb-3">EN KAZANÇLI ŞEHİRLER</h5>
                                        <div class="grid grid-cols-2 gap-2 text-xs">
                                            <div class="flex justify-between">
                                                <span class="text-blue-600">İstanbul</span>
                                                <span class="text-amber-600 font-bold">₺1,850</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-blue-600">Ankara</span>
                                                <span class="text-blue-800 font-bold">₺1,240</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-blue-600">İzmir</span>
                                                <span class="text-blue-800 font-bold">₺980</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-blue-600">Bursa</span>
                                                <span class="text-blue-800 font-bold">₺780</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Live Provider Activity -->
                                    <div class="bg-amber-50 p-4 minimal-corner border border-amber-200">
                                        <h5 class="text-amber-700 font-bold text-sm mb-3 flex items-center">
                                            <i class="fas fa-users text-amber-600 mr-2"></i>
                                            AKTİF BAYİ AKTİVİTESİ
                                        </h5>
                                        <div class="space-y-2 text-xs">
                                            <div class="flex justify-between items-center">
                                                <span class="text-amber-700">Şu anda aktif:</span>
                                                <span class="text-amber-800 font-bold text-sm">247 Bayi</span>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-amber-700">İş arayan:</span>
                                                <span class="text-amber-800 font-bold text-sm">89 Bayi</span>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-amber-700">Son 1 saat kazanan:</span>
                                                <span class="text-amber-800 font-bold text-sm">156 Bayi</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Service Categories for Providers -->
        <section class="py-20 bg-slate-50">
            <div class="max-w-7xl mx-auto px-6">
                <div class="text-center mb-16">
                    <div class="section-divider w-20 mx-auto mb-6"></div>
                    <h2 class="text-4xl font-bold text-blue-900 mb-4 tracking-tight">
                        HİZMET KATEGORİLERİ
                    </h2>
                    <div class="flex flex-wrap items-center justify-center gap-6 text-sm">
                        <div class="flex items-center space-x-2">
                            <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
                            <span class="text-blue-700 font-medium">6 Ana Kategori</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                            <span class="text-green-700 font-medium">150+ Farklı Hizmet</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="w-3 h-3 bg-purple-500 rounded-full"></span>
                            <span class="text-purple-700 font-medium">7/24 Hizmet Talep Edin</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <!-- Teknik Onarım -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-blue-200 p-6 minimal-corner hover:border-blue-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-12 h-12 bg-blue-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-blue-600 transition duration-300">
                                    <i class="fas fa-tools text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-blue-900 mb-2">Teknik Onarım</h3>
                                <p class="text-xs text-blue-600 mb-3">Elektronik & Beyaz Eşya</p>
                                <div class="text-xs text-green-600 font-bold">₺200-3.000</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-blue-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Teknik Onarım Hizmetleri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Beyaz Eşya</span>
                                        <span class="text-yellow-300">₺800-2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>TV/Elektronik</span>
                                        <span class="text-yellow-300">₺400-1.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Klima Servisi</span>
                                        <span class="text-yellow-300">₺600-2.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Kombi Bakımı</span>
                                        <span class="text-yellow-300">₺800-3K</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-blue-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Ev Bakım -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-green-200 p-6 minimal-corner hover:border-green-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-12 h-12 bg-green-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-green-600 transition duration-300">
                                    <i class="fas fa-home text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-green-900 mb-2">Ev Bakım</h3>
                                <p class="text-xs text-green-600 mb-3">Tadilat & Onarım</p>
                                <div class="text-xs text-green-600 font-bold">₺500-8.000</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-green-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Ev Bakım Hizmetleri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Boyama/Badana</span>
                                        <span class="text-yellow-300">₺2K-8K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Elektrik İşleri</span>
                                        <span class="text-yellow-300">₺500-3K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Su Tesisatı</span>
                                        <span class="text-yellow-300">₺800-4K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Kapı/Pencere</span>
                                        <span class="text-yellow-300">₺1K-6K</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-green-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Temizlik -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-purple-200 p-6 minimal-corner hover:border-purple-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-12 h-12 bg-purple-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-purple-600 transition duration-300">
                                    <i class="fas fa-broom text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-purple-900 mb-2">Temizlik</h3>
                                <p class="text-xs text-purple-600 mb-3">Ev & Ofis Temizlik</p>
                                <div class="text-xs text-green-600 font-bold">₺300-2.000</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-purple-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Temizlik Hizmetleri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Ev Temizliği</span>
                                        <span class="text-yellow-300">₺300-800</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Halı Yıkama</span>
                                        <span class="text-yellow-300">₺200-600</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Cam Temizliği</span>
                                        <span class="text-yellow-300">₺400-1K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Dezenfeksiyon</span>
                                        <span class="text-yellow-300">₺600-2K</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-purple-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Nakliye -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-indigo-200 p-6 minimal-corner hover:border-indigo-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-12 h-12 bg-indigo-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-indigo-600 transition duration-300">
                                    <i class="fas fa-truck text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-indigo-900 mb-2">Nakliye</h3>
                                <p class="text-xs text-indigo-600 mb-3">Taşıma & Kargo</p>
                                <div class="text-xs text-green-600 font-bold">₺400-5.000</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-indigo-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Nakliye Hizmetleri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Ev Taşıma</span>
                                        <span class="text-yellow-300">₺1.5K-5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Ofis Taşıma</span>
                                        <span class="text-yellow-300">₺2K-8K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Eşya Taşıma</span>
                                        <span class="text-yellow-300">₺400-1.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Kargo/Kurye</span>
                                        <span class="text-yellow-300">₺50-300</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-indigo-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Kişisel Hizmetler -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-pink-200 p-6 minimal-corner hover:border-pink-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-12 h-12 bg-pink-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-pink-600 transition duration-300">
                                    <i class="fas fa-user-nurse text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-pink-900 mb-2">Kişisel</h3>
                                <p class="text-xs text-pink-600 mb-3">Bakım & Güzellik</p>
                                <div class="text-xs text-green-600 font-bold">₺200-1.500</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-pink-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Kişisel Hizmetler</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Berber/Kuaför</span>
                                        <span class="text-yellow-300">₺100-500</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Masaj</span>
                                        <span class="text-yellow-300">₺300-800</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Hasta Bakımı</span>
                                        <span class="text-yellow-300">₺800-1.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Çocuk Bakımı</span>
                                        <span class="text-yellow-300">₺200-600</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-pink-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Otomotiv -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-red-200 p-6 minimal-corner hover:border-red-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-12 h-12 bg-red-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-red-600 transition duration-300">
                                    <i class="fas fa-car text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-red-900 mb-2">Otomotiv</h3>
                                <p class="text-xs text-red-600 mb-3">Araç Bakım & Servis</p>
                                <div class="text-xs text-green-600 font-bold">₺300-3.000</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-red-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Otomotiv Hizmetleri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Araç Yıkama</span>
                                        <span class="text-yellow-300">₺100-300</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Oto Elektrik</span>
                                        <span class="text-yellow-300">₺400-1.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Lastik Değişim</span>
                                        <span class="text-yellow-300">₺200-800</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Araç Servisi</span>
                                        <span class="text-yellow-300">₺800-3K</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-red-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </section>

        <!-- Mobile App Download Section for Providers -->
        <section class="py-20 bg-white border-t-2 border-blue-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="bg-blue-900 minimal-corner overflow-hidden" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
                        <!-- Left: App Info -->
                        <div class="p-12">
                            <div class="mb-8">
                                <div class="mb-4">
                                    <div class="flex items-center mb-2">
                                        <span class="text-3xl font-bold text-white">Garantor</span>
                                        <span class="text-3xl font-bold text-amber-400">360°</span>
                                    </div>
                                    <p class="text-amber-400 font-medium">Bayi Web Platformu</p>
                                </div>
                                
                                <h4 class="text-3xl font-bold text-white mb-6 leading-tight">
                                    İŞLERİNİZİ HER CİHAZDAN
                                    <span class="block text-amber-400">YÖNETİN!</span>
                                </h4>
                                
                                <p class="text-blue-200 text-lg mb-8 leading-relaxed">
                                    Web tabanlı panelimizle iş takibini, müşteri iletişimini ve ödeme süreçlerini 
                                    her cihazdan kolayca yönetin. Responsive tasarım ile masaüstü ve mobilde mükemmel deneyim.
                                </p>
                            </div>

                            <!-- App Features -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-bell text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">Anında Bildirimler</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-map-marker-alt text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">GPS İş Takibi</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-credit-card text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">Ödeme Takibi</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-comments text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">Müşteri Mesajları</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-camera text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">Fotoğraf Paylaşımı</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-chart-line text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">Kazanç Raporları</span>
                                </div>
                            </div>

                            <!-- Web Access Buttons -->
                            <div class="flex flex-col sm:flex-row gap-4">
                                <a href="/bayi/login" class="flex items-center bg-amber-500 text-white px-8 py-4 sharp-corner hover:bg-amber-600 transition duration-200 font-bold">
                                    <i class="fas fa-globe text-2xl mr-3"></i>
                                    <div class="text-lg">BAYI PANELİNE GİRİŞ</div>
                                </a>
                                <a href="/bayi/demo" class="flex items-center bg-white text-blue-900 px-8 py-4 sharp-corner hover:bg-gray-100 transition duration-200 font-bold">
                                    <i class="fas fa-play text-xl mr-3"></i>
                                    <div class="text-lg">DEMO İZLE</div>
                                </a>
                            </div>
                        </div>

                        <!-- Right: Browser Mockup -->
                        <div class="flex items-center justify-center p-12 bg-gradient-to-br from-blue-800 to-blue-900">
                            <div class="relative">
                                <!-- Browser Frame -->
                                <div class="w-80 h-[520px] bg-gray-900 rounded-lg shadow-2xl relative">
                                    <!-- Browser Top Bar -->
                                    <div class="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center">
                                        <div class="flex space-x-2 mr-4">
                                            <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                                            <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                                        </div>
                                        <div class="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded flex-1">
                                            garantor360.com/bayi
                                        </div>
                                    </div>
                                    
                                    <!-- Web Interface -->
                                    <div class="w-full h-full bg-white overflow-hidden relative rounded-b-lg">
                                        <!-- Web Dashboard Navigation -->
                                        <div class="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
                                            <div class="flex items-center">
                                                <span class="text-lg font-bold text-amber-400">Garantor360°</span>
                                                <span class="text-sm ml-2 text-blue-200">Bayi Paneli</span>
                                            </div>
                                            <div class="flex items-center">
                                                <span class="text-sm mr-3">Ahmet B.</span>
                                                <i class="fas fa-user-circle text-xl"></i>
                                            </div>
                                        </div>

                                        <!-- Dashboard Content -->
                                        <div class="px-4 py-4">
                                            <!-- Dashboard Header -->
                                            <div class="mb-4">
                                                <h5 class="font-bold text-gray-900 text-lg">Dashboard</h5>
                                                <p class="text-gray-600 text-sm">Bugün 3 yeni iş talebi var</p>
                                            </div>

                                            <!-- Stats Cards - Web Style -->
                                            <div class="grid grid-cols-2 gap-3 mb-4">
                                                <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-lg shadow">
                                                    <div class="text-2xl font-bold">₺2,340</div>
                                                    <div class="text-blue-100 text-sm">Bu Hafta Kazanç</div>
                                                </div>
                                                <div class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 rounded-lg shadow">
                                                    <div class="text-2xl font-bold">12</div>
                                                    <div class="text-orange-100 text-sm">Aktif İş</div>
                                                </div>
                                            </div>

                                            <!-- Recent Jobs - Web Table Style -->
                                            <div class="space-y-2">
                                                <h6 class="font-bold text-gray-900 text-sm mb-3">Son İşler</h6>
                                                
                                                <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                                    <div class="flex justify-between items-center">
                                                        <div>
                                                            <div class="font-medium text-gray-900 text-sm">Klima Montajı</div>
                                                            <div class="text-gray-500 text-xs">Kadıköy • 14:30</div>
                                                        </div>
                                                        <div class="text-green-600 font-bold text-sm">₺450</div>
                                                    </div>
                                                </div>

                                                <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                                    <div class="flex justify-between items-center">
                                                        <div>
                                                            <div class="font-medium text-gray-900 text-sm">Beyaz Eşya Tamiri</div>
                                                            <div class="text-gray-500 text-xs">Üsküdar • 16:00</div>
                                                        </div>
                                                        <div class="text-blue-600 font-bold text-sm">₺280</div>
                                                    </div>
                                                </div>

                                                <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                                    <div class="flex justify-between items-center">
                                                        <div>
                                                            <div class="font-medium text-gray-900 text-sm">Ev Temizliği</div>
                                                            <div class="text-gray-500 text-xs">Beşiktaş • 17:30</div>
                                                        </div>
                                                        <div class="text-yellow-600 font-bold text-sm">₺200</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>


                                    </div>
                                </div>

                                <!-- Floating Elements -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Platform Statistics -->
                <div class="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="text-center p-6 bg-blue-50 minimal-corner">
                        <div class="text-3xl font-bold text-blue-900 mb-2">50K+</div>
                        <div class="text-blue-600 font-medium">Aktif Kullanıcı</div>
                        <div class="text-blue-500 text-sm">Web platformunda</div>
                    </div>
                    <div class="text-center p-6 bg-amber-50 minimal-corner">
                        <div class="text-3xl font-bold text-amber-600 mb-2">4.8★</div>
                        <div class="text-amber-700 font-medium">Kullanıcı Puanı</div>
                        <div class="text-amber-600 text-sm">5 yıldız üzerinden</div>
                    </div>
                    <div class="text-center p-6 bg-blue-50 minimal-corner">
                        <div class="text-3xl font-bold text-blue-900 mb-2">24/7</div>
                        <div class="text-blue-600 font-medium">Web Destek</div>
                        <div class="text-blue-500 text-sm">Kesintisiz hizmet</div>
                    </div>
                    <div class="text-center p-6 bg-amber-50 minimal-corner">
                        <div class="text-3xl font-bold text-amber-600 mb-2">%99.9</div>
                        <div class="text-amber-700 font-medium">Uptime</div>
                        <div class="text-amber-600 text-sm">Güvenilir platform</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Provider Benefits - Enhanced with Deep Blue/Amber theme -->
        <section class="py-24 bg-blue-900" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Enhanced Header -->
                <div class="text-center mb-20">
                    <div class="section-divider w-24 mx-auto mb-8" style="background: linear-gradient(90deg, transparent, #f59e0b, transparent);"></div>
                    <h2 class="text-5xl font-bold mb-6 text-white tracking-tight">
                        NEDEN GARANTİR360'DA
                        <span class="block text-amber-400 mt-2">HİZMET VERMELİSİNİZ?</span>
                    </h2>
                    <p class="text-xl text-blue-200 font-medium max-w-3xl mx-auto leading-relaxed">
                        Türkiye'nin en güvenilir platformunda profesyonel iş ortaklığının benzersiz avantajları
                    </p>
                </div>

                <!-- Enhanced Benefits Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    <!-- Guaranteed Payment -->
                    <div class="bg-white p-8 minimal-corner card-corporate group hover:border-amber-400 border-2 border-transparent">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-900 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-amber-500 transition duration-300">
                                <i class="fas fa-hand-holding-usd text-white text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-blue-900 tracking-tight">GARANTİLİ ÖDEME SİSTEMİ</h3>
                            <p class="text-blue-600 mb-6 font-medium leading-relaxed">
                                İş tamamlandığında ödemeniz %100 garantili. Platform escrow sistemi ile para güvencesi.
                            </p>
                            <div class="bg-blue-50 p-3 minimal-corner">
                                <span class="text-amber-600 font-bold text-lg">⚡ Anında Ödeme</span>
                                <p class="text-blue-600 text-sm mt-1">İş onaylandıktan sonra 24 saat içinde</p>
                            </div>
                        </div>
                    </div>

                    <!-- Continuous Work Flow -->
                    <div class="bg-blue-900 text-white p-8 minimal-corner card-corporate group">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-amber-500 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-white group-hover:text-blue-900 transition duration-300">
                                <i class="fas fa-sync-alt text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-white tracking-tight">SÜREKLİ İŞ AKIŞI</h3>
                            <p class="text-blue-200 mb-6 font-medium leading-relaxed">
                                Günde ortalama 127 yeni iş talebi. Hiç iş arayışınız olmayacak.
                            </p>
                            <div class="bg-blue-800 p-3 minimal-corner">
                                <span class="text-amber-400 font-bold text-lg">📊 %97 İş Garantisi</span>
                                <p class="text-blue-200 text-sm mt-1">Aktif bayilerimizin ortalaması</p>
                            </div>
                        </div>
                    </div>

                    <!-- Professional Image -->
                    <div class="bg-white p-8 minimal-corner card-corporate group hover:border-amber-400 border-2 border-transparent">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-900 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-amber-500 transition duration-300">
                                <i class="fas fa-certificate text-white text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-blue-900 tracking-tight">PROFESYONEL İMAJ</h3>
                            <p class="text-blue-600 mb-6 font-medium leading-relaxed">
                                Garantor360 kalite sertifikası ile müşteri güveni ve prestij kazanın.
                            </p>
                            <div class="bg-blue-50 p-3 minimal-corner">
                                <span class="text-amber-600 font-bold text-lg">🏆 Marka Değeri</span>
                                <p class="text-blue-600 text-sm mt-1">Türkiye'nin en güvenilir platformu</p>
                            </div>
                        </div>
                    </div>

                    <!-- Marketing Support -->
                    <div class="bg-white p-8 minimal-corner card-corporate group hover:border-amber-400 border-2 border-transparent">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-900 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-amber-500 transition duration-300">
                                <i class="fas fa-bullhorn text-white text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-blue-900 tracking-tight">PAZARLAMA DESTEĞİ</h3>
                            <p class="text-blue-600 mb-6 font-medium leading-relaxed">
                                Milyonlarca TL'lik reklam yatırımımızdan ücretsiz faydalanın. Müşteri bulma derdi yok.
                            </p>
                            <div class="bg-blue-50 p-3 minimal-corner">
                                <span class="text-amber-600 font-bold text-lg">📈 0 Reklam Masrafı</span>
                                <p class="text-blue-600 text-sm mt-1">Platform tüm pazarlamayı yapıyor</p>
                            </div>
                        </div>
                    </div>

                    <!-- Legal Protection -->
                    <div class="bg-amber-500 text-blue-900 p-8 minimal-corner card-corporate group">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-900 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-white transition duration-300">
                                <i class="fas fa-balance-scale text-white group-hover:text-blue-900 text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-blue-900 tracking-tight">HUKUKİ KORUMA</h3>
                            <p class="text-blue-800 mb-6 font-medium leading-relaxed">
                                Anlaşmazlıklarda profesyonel hukuk ekibimiz yanınızda. Güvende hissedin.
                            </p>
                            <div class="bg-amber-400 p-3 minimal-corner">
                                <span class="text-blue-900 font-bold text-lg">⚖️ Ücretsiz Hukuki Destek</span>
                                <p class="text-blue-800 text-sm mt-1">24/7 danışmanlık hizmeti</p>
                            </div>
                        </div>
                    </div>

                    <!-- Training & Development -->
                    <div class="bg-white p-8 minimal-corner card-corporate group hover:border-amber-400 border-2 border-transparent">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-900 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-amber-500 transition duration-300">
                                <i class="fas fa-graduation-cap text-white text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-blue-900 tracking-tight">EĞİTİM & GELİŞİM</h3>
                            <p class="text-blue-600 mb-6 font-medium leading-relaxed">
                                Sürekli eğitim programları ve sertifikasyonlar ile kendinizi geliştirin.
                            </p>
                            <div class="bg-blue-50 p-3 minimal-corner">
                                <span class="text-amber-600 font-bold text-lg">🎓 Ücretsiz Eğitimler</span>
                                <p class="text-blue-600 text-sm mt-1">Aylık uzman eğitim programları</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Success Metrics Section -->
                <div class="bg-white p-8 minimal-corner">
                    <div class="text-center mb-8">
                        <h3 class="text-3xl font-bold text-blue-900 mb-4 tracking-tight">
                            BAŞARI İSTATİSTİKLERİMİZ
                        </h3>
                        <p class="text-blue-600 text-lg font-medium">Platform performansımızı rakamlarla görün</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="text-center p-6 bg-blue-50 minimal-corner">
                            <div class="text-4xl font-bold text-blue-900 mb-2">%98.7</div>
                            <div class="text-blue-600 font-semibold text-sm">ÖDEME BAŞARI ORANI</div>
                            <div class="text-blue-500 text-xs mt-1">Son 12 ay ortalaması</div>
                        </div>

                        <div class="text-center p-6 bg-amber-50 minimal-corner">
                            <div class="text-4xl font-bold text-amber-600 mb-2">₺2.3M</div>
                            <div class="text-amber-700 font-semibold text-sm">AYLIK ÖDENEN TUTAR</div>
                            <div class="text-amber-600 text-xs mt-1">Bayilerimize ödenen toplam</div>
                        </div>

                        <div class="text-center p-6 bg-blue-50 minimal-corner">
                            <div class="text-4xl font-bold text-blue-900 mb-2">24dk</div>
                            <div class="text-blue-600 font-semibold text-sm">ORTALAMA ÖDEME SÜRESİ</div>
                            <div class="text-blue-500 text-xs mt-1">İş tamamlandıktan sonra</div>
                        </div>

                        <div class="text-center p-6 bg-amber-50 minimal-corner">
                            <div class="text-4xl font-bold text-amber-600 mb-2">4.8★</div>
                            <div class="text-amber-700 font-semibold text-sm">BAYI MEMNUNİYET PUANI</div>
                            <div class="text-amber-600 text-xs mt-1">5 üzerinden ortalama</div>
                        </div>
                    </div>
                </div>

                <!-- Call to Action -->
                <div class="text-center mt-16">
                    <div class="bg-amber-500 text-blue-900 p-8 minimal-corner inline-block max-w-2xl">
                        <h4 class="text-2xl font-bold mb-4 tracking-tight">
                            <i class="fas fa-rocket mr-2"></i>
                            SİZ DE BU BAŞARININ PARÇASI OLUN!
                        </h4>
                        <p class="text-blue-800 font-medium mb-6 leading-relaxed">
                            Bugün başvuru yapın, 24 saat içinde değerlendirme sonucunuzu alın. 
                            Başarılı bayilerimizin %89'u ilk ayında hedeflerini aştı.
                        </p>
                        <button onclick="scrollToApplication()" class="bg-blue-900 text-white px-10 py-4 sharp-corner font-bold text-lg hover:bg-blue-800 transition duration-200 shadow-lg">
                            HEMEN BAŞVUR
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- Call to Action - Provider Application -->
        <section class="py-20 bg-white" id="application">
            <div class="max-w-4xl mx-auto text-center px-6">
                <div class="section-divider w-32 mx-auto mb-8"></div>
                <h2 class="text-5xl font-bold text-slate-800 mb-8 tracking-tight">
                    PROFESYONEL ORTAKLIK
                </h2>
                <p class="text-xl text-slate-600 mb-12 font-medium max-w-2xl mx-auto">
                    5 dakikada başvuru yapın ve profesyonel iş ağımızın bir parçası olun. 
                    Sıfır yatırım, garantili kazanç.
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                    <a href="/bayi/login" class="bg-orange-600 text-white px-12 py-4 sharp-corner font-bold text-lg hover:bg-orange-700 transition duration-200 shadow-lg">
                        BAŞVURU YAP
                    </a>
                    <a href="tel:+905001234567" class="border-2 border-orange-600 text-orange-600 px-12 py-4 sharp-corner font-bold text-lg hover:bg-orange-600 hover:text-white transition duration-200">
                        0 500 123 45 67
                    </a>
                </div>
                <p class="text-sm text-slate-600 font-semibold">
                    <span class="inline-block w-2 h-2 bg-orange-600 sharp-corner mr-2"></span>
                    Başvuru ücretsiz • Ön ödeme yok • Anında değerlendirme
                </p>
            </div>
        </section>

        <!-- Enhanced Footer -->
        <footer class="bg-blue-900 text-white" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);">
            <!-- Main Footer Content -->
            <div class="py-16">
                <div class="max-w-7xl mx-auto px-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                        <!-- Company Info -->
                        <div class="lg:col-span-1">
                            <div class="mb-6">
                                <div class="flex items-center">
                                    <span class="text-4xl font-bold text-white">Garantor</span>
                                    <span class="text-4xl font-bold text-orange-400">360°</span>
                                </div>
                            </div>
                            <p class="text-blue-200 font-medium mb-6 leading-relaxed">
                                Türkiye'nin ilk tam güvenceli hizmet platformu. Bayi odaklı yaklaşımla 
                                sürdürülebilir iş ortaklığı kuran dijital ekosistem.
                            </p>
                            
                            <!-- Trust Indicators -->
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="text-center">
                                    <div class="text-amber-400 font-bold text-2xl">589</div>
                                    <div class="text-blue-300 text-xs">Aktif Bayi</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-amber-400 font-bold text-2xl">₺2.3M</div>
                                    <div class="text-blue-300 text-xs">Aylık Ödeme</div>
                                </div>
                            </div>

                            <!-- Certifications -->
                            <div class="flex flex-wrap gap-2">
                                <div class="bg-blue-800 px-3 py-1 sharp-corner">
                                    <span class="text-xs font-bold text-amber-400">ISO 9001</span>
                                </div>
                                <div class="bg-blue-800 px-3 py-1 sharp-corner">
                                    <span class="text-xs font-bold text-amber-400">6 AY GARANTİ</span>
                                </div>
                                <div class="bg-blue-800 px-3 py-1 sharp-corner">
                                    <span class="text-xs font-bold text-amber-400">7/24 DESTEK</span>
                                </div>
                            </div>
                        </div>

                        <!-- Service Categories -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">HİZMET ALANLARI</h4>
                            <ul class="space-y-3">
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-tools mr-2 text-amber-500 text-sm"></i>Teknik Onarım
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-home mr-2 text-amber-500 text-sm"></i>Ev Bakım & Tadilat
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-broom mr-2 text-amber-500 text-sm"></i>Temizlik & Hijyen
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-wrench mr-2 text-amber-500 text-sm"></i>Kombi & Klima
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-paint-roller mr-2 text-amber-500 text-sm"></i>Boyama & Badana
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-bolt mr-2 text-amber-500 text-sm"></i>Elektrik İşleri
                                </a></li>
                            </ul>
                        </div>

                        <!-- Dealer Resources -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">BAYİ KAYNAKLARI</h4>
                            <ul class="space-y-3">
                                <li><a href="/bayi/login" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-sign-in-alt mr-2 text-amber-500 text-sm"></i>Bayi Giriş
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-graduation-cap mr-2 text-amber-500 text-sm"></i>Eğitim Merkezi
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-file-alt mr-2 text-amber-500 text-sm"></i>Başvuru Formu
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-calculator mr-2 text-amber-500 text-sm"></i>Kazanç Hesaplama
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-question-circle mr-2 text-amber-500 text-sm"></i>SSS
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-book mr-2 text-amber-500 text-sm"></i>Bayi Rehberi
                                </a></li>
                            </ul>
                        </div>

                        <!-- Contact & Support -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">İLETİŞİM & DESTEK</h4>
                            
                            <!-- Contact Methods -->
                            <div class="space-y-4 mb-6">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-phone text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <a href="tel:+905001234567" class="text-white font-medium hover:text-amber-400 transition duration-200">0 500 123 45 67</a>
                                        <p class="text-blue-300 text-xs">Bayi Destek Hattı</p>
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-envelope text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <a href="mailto:bayi@garantor360.com" class="text-white font-medium hover:text-amber-400 transition duration-200">bayi@garantor360.com</a>
                                        <p class="text-blue-300 text-xs">Bayi İletişim</p>
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-comments text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <span class="text-white font-medium">Canlı Destek</span>
                                        <p class="text-blue-300 text-xs">7/24 Aktif</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Working Hours -->
                            <div class="mb-6">
                                <h5 class="font-bold text-sm mb-3 text-amber-400 flex items-center">
                                    <i class="fas fa-clock mr-2"></i>ÇALIŞMA SAATLERİ
                                </h5>
                                <div class="text-blue-200 text-sm space-y-1">
                                    <div class="flex justify-between">
                                        <span>Pazartesi - Cuma:</span>
                                        <span class="text-white">08:00 - 18:00</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Cumartesi:</span>
                                        <span class="text-white">09:00 - 17:00</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-amber-400 font-medium">Acil Destek:</span>
                                        <span class="text-amber-400 font-bold">7/24</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Social Media -->
                            <div>
                                <h5 class="font-bold text-sm mb-3 text-amber-400">SOSYAL MEDYA</h5>
                                <div class="flex space-x-2">
                                    <!-- Facebook - Brand Blue -->
                                    <a href="#" class="w-9 h-9 bg-[#1877f2] rounded-lg flex items-center justify-center text-white hover:bg-[#166fe5] hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg">
                                        <i class="fab fa-facebook-f text-sm"></i>
                                    </a>
                                    <!-- Twitter/X - Brand Blue -->
                                    <a href="#" class="w-9 h-9 bg-[#1d9bf0] rounded-lg flex items-center justify-center text-white hover:bg-[#1a8cd8] hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg">
                                        <i class="fab fa-twitter text-sm"></i>
                                    </a>
                                    <!-- Instagram - Gradient Pink/Orange -->
                                    <a href="#" class="w-9 h-9 bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] rounded-lg flex items-center justify-center text-white hover:from-[#7530a1] hover:via-[#e41a1a] hover:to-[#e39e3e] hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg">
                                        <i class="fab fa-instagram text-sm"></i>
                                    </a>
                                    <!-- LinkedIn - Brand Blue -->
                                    <a href="#" class="w-9 h-9 bg-[#0077b5] rounded-lg flex items-center justify-center text-white hover:bg-[#006ba1] hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg">
                                        <i class="fab fa-linkedin text-sm"></i>
                                    </a>
                                    <!-- YouTube - Brand Red -->
                                    <a href="#" class="w-9 h-9 bg-[#ff0000] rounded-lg flex items-center justify-center text-white hover:bg-[#e60000] hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg">
                                        <i class="fab fa-youtube text-sm"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Action Bar -->
            <div class="bg-amber-500 py-4">
                <div class="max-w-7xl mx-auto px-6">
                    <div class="flex flex-col lg:flex-row items-center justify-between">
                        <div class="flex items-center mb-4 lg:mb-0">
                            <i class="fas fa-rocket text-blue-900 text-xl mr-3"></i>
                            <div>
                                <h5 class="text-blue-900 font-bold">HEMEN BAŞVURU YAPIN</h5>
                                <p class="text-blue-800 text-sm">24 saat içinde değerlendirme sonucu</p>
                            </div>
                        </div>
                        <div class="flex space-x-4">
                            <button onclick="scrollToApplication()" class="bg-blue-900 text-white px-6 py-3 sharp-corner font-bold hover:bg-blue-800 transition duration-200">
                                BAŞVUR
                            </button>
                            <a href="tel:+905001234567" class="border-2 border-blue-900 text-blue-900 px-6 py-3 sharp-corner font-bold hover:bg-blue-900 hover:text-white transition duration-200">
                                ARA
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Footer -->
            <div class="bg-blue-950 py-6">
                <div class="max-w-7xl mx-auto px-6">
                    <div class="flex flex-col lg:flex-row justify-between items-center">
                        <!-- Copyright -->
                        <div class="text-blue-300 text-sm mb-4 lg:mb-0">
                            &copy; 2024 Garantor360. Tüm hakları saklıdır. | Bayi Partner Ağı
                        </div>

                        <!-- Legal Links -->
                        <div class="flex items-center space-x-6 text-sm mb-4 lg:mb-0">
                            <a href="#" class="text-blue-300 hover:text-amber-400 transition duration-200">Bayi Sözleşmesi</a>
                            <a href="#" class="text-blue-300 hover:text-amber-400 transition duration-200">Gizlilik Politikası</a>
                            <a href="#" class="text-blue-300 hover:text-amber-400 transition duration-200">Kullanım Şartları</a>
                            <a href="/" class="text-amber-400 hover:text-amber-300 font-medium transition duration-200">Müşteri Sayfası</a>
                        </div>

                        <!-- Security Badges -->
                        <div class="flex items-center space-x-3">
                            <span class="text-blue-400 text-xs">Güvenli Platform</span>
                            <div class="flex space-x-2">
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">SSL</div>
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">256BIT</div>
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">GÜVEN</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>

        <script>
        // Provider page scroll functions
        function scrollToStats() {
            document.getElementById('stats').scrollIntoView({ behavior: 'smooth' });
        }
        
        function scrollToApplication() {
            document.getElementById('application').scrollIntoView({ behavior: 'smooth' });
        }

        // Stats update for provider page
        function updateProviderStats() {
            // Daily jobs counter
            const dailyJobsEl = document.getElementById('daily-jobs');
            if (dailyJobsEl) {
                const current = parseInt(dailyJobsEl.textContent) || 127;
                const newValue = current + Math.floor(Math.random() * 3);
                dailyJobsEl.textContent = newValue;
            }

            // Daily earnings for providers
            const earningsEl = document.getElementById('daily-earnings');
            if (earningsEl) {
                const earnings = [750, 820, 890, 740, 920, 680, 950, 780, 860, 810];
                earningsEl.textContent = earnings[Math.floor(Math.random() * earnings.length)];
            }

            // Active dealers
            const dealersEl = document.getElementById('active-dealers');
            if (dealersEl) {
                const current = parseInt(dealersEl.textContent) || 412;
                const change = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
                dealersEl.textContent = current + change;
            }

            // Average price
            const avgPriceEl = document.getElementById('avg-price');
            if (avgPriceEl) {
                const prices = [245, 267, 289, 234, 312, 198, 356, 276, 234, 287];
                avgPriceEl.textContent = prices[Math.floor(Math.random() * prices.length)];
            }
        }

        // Provider job feed simulation
        function addProviderJobToFeed() {
            const feed = document.getElementById('provider-job-feed');
            if (!feed) return;

            const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Gaziantep', 'Konya'];
            const districts = ['Kadıköy', 'Beşiktaş', 'Çankaya', 'Nilüfer', 'Muratpaşa', 'Seyhan', 'Şehitkamil', 'Selçuklu'];
            const providerJobs = [
                { name: 'Klima Montajı', category: 'Teknik Onarım', price: '₺450', priority: 'YÜKSEK', urgent: true, commission: '₺67' },
                { name: 'Mutfak Tadilatı', category: 'Ev Bakım', price: '₺1,200', priority: 'ORTA', urgent: false, commission: '₺180' },
                { name: 'Beyaz Eşya Tamiri', category: 'Teknik Onarım', price: '₺280', priority: 'ORTA', urgent: false, commission: '₺42' },
                { name: 'Ev Temizliği', category: 'Temizlik', price: '₺200', priority: 'DÜŞÜK', urgent: false, commission: '₺30' },
                { name: 'Kombi Bakımı', category: 'Teknik Onarım', price: '₺350', priority: 'YÜKSEK', urgent: true, commission: '₺52' },
                { name: 'Halı Yıkama', category: 'Temizlik', price: '₺150', priority: 'DÜŞÜK', urgent: false, commission: '₺22' },
                { name: 'Boyama İşi', category: 'Ev Bakım', price: '₺800', priority: 'ORTA', urgent: false, commission: '₺120' },
                { name: 'Elektrik Tesisatı', category: 'Ev Bakım', price: '₺600', priority: 'YÜKSEK', urgent: true, commission: '₺90' }
            ];

            const city = cities[Math.floor(Math.random() * cities.length)];
            const district = districts[Math.floor(Math.random() * districts.length)];
            const job = providerJobs[Math.floor(Math.random() * providerJobs.length)];
            const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const jobId = 'P' + Math.floor(Math.random() * 9000 + 1000);

            const priorityColor = job.priority === 'YÜKSEK' ? 'bg-amber-500' : 
                                job.priority === 'ORTA' ? 'bg-blue-600' : 'bg-blue-400';

            const categoryIcon = job.category === 'Teknik Onarım' ? 'fas fa-tools' :
                               job.category === 'Ev Bakım' ? 'fas fa-home' : 'fas fa-broom';

            const jobElement = document.createElement('div');
            jobElement.className = \`bg-white border border-blue-200 minimal-corner p-4 hover:border-amber-500 transition-all duration-200 \${job.urgent ? 'border-l-4 border-l-amber-500' : ''}\`;
            jobElement.innerHTML = \`
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-blue-900 sharp-corner flex items-center justify-center">
                            <i class="\${categoryIcon} text-white text-sm"></i>
                        </div>
                        <div class="flex flex-col">
                            <div class="flex items-center space-x-2 mb-1">
                                <span class="\${priorityColor} text-white px-2 py-1 sharp-corner text-xs font-bold">\${job.priority}</span>
                                <span class="text-blue-500 text-xs font-medium">#\${jobId}</span>
                                \${job.urgent ? '<span class="text-amber-600 text-xs font-bold pulse-dot">ACİL</span>' : ''}
                            </div>
                            <div>
                                <span class="text-blue-800 font-bold text-sm">\${job.name}</span>
                                <span class="text-blue-600 text-xs ml-2">• \${job.category}</span>
                            </div>
                            <div class="text-blue-500 text-xs mt-1">
                                \${city} / \${district} • \${time}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-blue-800 font-bold text-lg">\${job.price}</div>
                        <div class="text-amber-600 font-bold text-sm">Komisyon: \${job.commission}</div>
                        <div class="text-blue-500 text-xs">Müşteri ödemesi</div>
                    </div>
                </div>
            \`;

            // Add slide-in animation
            jobElement.style.opacity = '0';
            jobElement.style.transform = 'translateX(-20px)';
            
            feed.insertBefore(jobElement, feed.firstChild);

            // Animate in
            setTimeout(() => {
                jobElement.style.opacity = '1';
                jobElement.style.transform = 'translateX(0)';
                jobElement.style.transition = 'all 0.3s ease-out';
            }, 50);

            // Keep only last 15 jobs (allows scrolling)
            while (feed.children.length > 15) {
                feed.removeChild(feed.lastChild);
            }

            // Update recent count
            const recentCountEl = document.getElementById('provider-recent-count');
            if (recentCountEl) {
                const currentCount = parseInt(recentCountEl.textContent) || 12;
                const newCount = Math.min(currentCount + 1, 18);
                recentCountEl.textContent = newCount + ' İş';
            }
        }

        // Update provider live stats
        function updateProviderLiveStats() {
            // Update hourly earnings
            const earningsEl = document.getElementById('provider-hourly-earnings');
            if (earningsEl) {
                const earnings = ['₺3,840', '₺4,120', '₺4,380', '₺3,960', '₺4,560', '₺4,280', '₺4,750'];
                earningsEl.textContent = earnings[Math.floor(Math.random() * earnings.length)];
            }

            // Simulate chart updates (bars animation)
            const bars = document.querySelectorAll('[style*="height"]');
            bars.forEach((bar, index) => {
                // Skip if it's not in the provider earnings chart
                if (bar.classList.contains('bg-blue-600') || bar.classList.contains('bg-amber-500')) {
                    const randomHeight = Math.floor(Math.random() * 60 + 40) + '%';
                    bar.style.height = randomHeight;
                }
            });
        }

        // Initialize provider job feed
        function initializeProviderJobFeed() {
            // Add initial 8 jobs with varying delays (more than visible for scroll demo)
            for (let i = 0; i < 8; i++) {
                setTimeout(() => addProviderJobToFeed(), i * 600);
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize provider job feed
            initializeProviderJobFeed();
            
            // Update provider stats every 12 seconds
            setInterval(updateProviderStats, 12000);
            
            // Update provider live stats every 18 seconds
            setInterval(updateProviderLiveStats, 18000);
            
            // Add new provider job every 10 seconds
            setInterval(addProviderJobToFeed, 10000);
        });
        </script>
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

// Default route - Customer Landing Page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Garantor360 - Güvenli Hizmet Alın | Ödeme Güvencesi ve İşçilik Garantisi</title>
        <meta name="description" content="Garantor360 ile ev tamiri, temizlik, nakliye ve tüm hizmetlerde ödeme güvenliği, 6 ay işçilik garantisi ve sigorta koruması. Güvenli hizmet almanın en kolay yolu!">
        <meta name="keywords" content="güvenli hizmet, ödeme güvencesi, işçilik garantisi, ev tamiri, temizlik hizmeti, nakliye, sigorta koruması">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <style>
            .corporate-gradient { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); }
            .card-corporate { 
              transition: all 0.3s ease; 
              border: 2px solid transparent;
            }
            .card-corporate:hover { 
              transform: translateY(-4px); 
              box-shadow: 0 12px 32px rgba(30, 58, 138, 0.2);
              border-color: #f59e0b;
            }
            .pulse-dot { 
              animation: pulseDot 2s ease-in-out infinite; 
            }
            @keyframes pulseDot {
              0%, 100% { opacity: 0.7; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.1); }
            }
            .stats-counter { 
              font-weight: 700; 
              color: #1e3a8a;
            }
            .section-divider {
              height: 3px;
              background: linear-gradient(90deg, transparent, #f59e0b, transparent);
            }
            .sharp-corner {
              border-radius: 0;
            }
            .minimal-corner {
              border-radius: 2px;
            }
            .hero-overlay {
              background: rgba(30, 58, 138, 0.4);
            }
        </style>
    </head>
    <body class="bg-slate-50">
        <!-- Navigation -->
        <nav class="bg-white shadow-lg sticky top-0 z-50 border-b-2 border-blue-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex justify-between items-center h-18">
                    <div class="flex items-center">
                        <!-- Garantor360 Logo -->
                        <div class="flex items-center">
                            <span class="text-4xl font-bold text-blue-900">Garantor</span>
                            <span class="text-4xl font-bold text-amber-500">360°</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-6">
                        <!-- Customer Action Buttons -->
                        <a href="/bayi" class="text-blue-600 hover:text-blue-800 font-semibold transition duration-200 flex items-center">
                            <i class="fas fa-user-tie mr-2"></i>
                            Hizmet Veren misiniz?
                        </a>
                        <a href="#hizmet-al" class="bg-amber-500 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-amber-600 transition duration-200 shadow-lg hover:shadow-xl">
                            HİZMET AL
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Hero Section - Customer Focused -->
        <section class="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white py-28 overflow-hidden">
            <!-- Background Pattern -->
            <div class="absolute inset-0 opacity-10">
                <div class="absolute top-0 left-0 w-full h-full" style="background-image: radial-gradient(circle at 25% 25%, #f59e0b 2px, transparent 2px); background-size: 60px 60px;"></div>
            </div>
            
            <div class="max-w-7xl mx-auto px-6 relative z-10">

                
                <div class="text-center max-w-4xl mx-auto">
                    <!-- Hero Content -->
                    <div class="text-center">
                        <h1 class="text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-tight">
                            GÜVENLİ HİZMET ALMAK
                            <span class="block text-amber-400">BU KADAR KOLAY!</span>
                        </h1>
                        <p class="text-2xl mb-10 opacity-90 max-w-2xl font-light leading-relaxed text-center mx-auto">
                            Güvenli hizmet almanın <span class="text-amber-400 font-semibold">en kolay yolu</span>
                        </p>
                        <div class="flex flex-row gap-4 justify-center items-center mt-12">
                            <!-- Web Uygulaması Butonu -->
                            <a href="#hizmet-al" class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                <i class="fas fa-globe text-base"></i>
                                <div>
                                    <div class="text-base font-bold">WEB UYGULAMASI</div>
                                    <div class="text-xs opacity-90">Hemen Kullan</div>
                                </div>
                            </a>
                            
                            <!-- Tarayıcıdan Erişim Butonu -->
                            <a href="#services" class="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-3 rounded-lg font-bold text-base transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                <i class="fas fa-browser text-base"></i>
                                <div>
                                    <div class="text-base font-bold">TARAYICIDAN ERİŞ</div>
                                    <div class="text-xs opacity-90">Anında Erişin</div>
                                </div>
                            </a>
                        </div>

                    </div>
                </div>
            </div>
        </section>

        <!-- Garantor360 Güvence Sistemi - Minimal & Clean Design -->
        <section id="guarantee" class="py-20 bg-slate-50">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Security and Trust Section -->
                <div class="text-center mb-16">
                    <div class="section-divider w-20 mx-auto mb-6"></div>
                    <div class="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 minimal-corner mb-4">
                        <i class="fas fa-shield-check text-blue-600 mr-2"></i>
                        <span class="font-medium text-sm">GÜVENLİK VE GÜVEN</span>
                    </div>
                    <h2 class="text-4xl lg:text-5xl font-bold mb-6 tracking-tight leading-tight text-blue-900">
                        GÜVENLİ HİZMET ALMAK
                        <span class="block text-amber-600">ARTIK ÇOK KOLAY</span>
                    </h2>
                    <p class="text-lg text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                        Piyasadaki güvenlik endişelerinize son veren kapsamlı güvence sistemiyle 
                        <span class="text-blue-700 font-semibold">tamamen risk-free hizmet alın</span>
                    </p>
                </div>

                <!-- Dolandırıcılık vs Güvenlik Karşılaştırması -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    <!-- Sol: Genel Piyasa Sorunları -->
                    <div class="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 p-6 minimal-corner">
                        <div class="text-center mb-6">
                            <div class="w-16 h-16 bg-slate-400 minimal-corner mx-auto mb-4 flex items-center justify-center">
                                <i class="fas fa-question-circle text-white text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-slate-800 mb-2">GENEL PİYASA SORUNLARI</h3>
                            <p class="text-slate-600 text-sm font-medium">Bu endişeleri yaşıyor musunuz?</p>
                        </div>
                        <div class="space-y-3">
                            <div class="flex items-start p-3 bg-white border-l-4 border-slate-400 minimal-corner shadow-sm">
                                <i class="fas fa-search text-slate-500 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-slate-800 text-sm">Güvenilir Usta Bulamama</div>
                                    <div class="text-slate-600 text-xs mt-1">Hangi ustanın güvenilir olduğu belirsiz</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white border-l-4 border-slate-400 minimal-corner shadow-sm">
                                <i class="fas fa-question text-slate-500 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-slate-800 text-sm">Fiyat Belirsizliği</div>
                                    <div class="text-slate-600 text-xs mt-1">Ne kadar ödeyeceğiniz önceden bilinmiyor</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white border-l-4 border-slate-400 minimal-corner shadow-sm">
                                <i class="fas fa-tools text-slate-500 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-slate-800 text-sm">İşçilik Garantisi Eksikliği</div>
                                    <div class="text-slate-600 text-xs mt-1">Yapılan işin garantisi belirsiz veya yok</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white border-l-4 border-slate-400 minimal-corner shadow-sm">
                                <i class="fas fa-lock text-slate-500 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-slate-800 text-sm">Ödeme Güvensizliği</div>
                                    <div class="text-slate-600 text-xs mt-1">Para iade garantisi ve güvenli ödeme yok</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white border-l-4 border-slate-400 minimal-corner shadow-sm">
                                <i class="fas fa-phone-slash text-slate-500 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-slate-800 text-sm">İletişim Sorunu</div>
                                    <div class="text-slate-600 text-xs mt-1">Sonradan ulaşamama ve destek alamama</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white border-l-4 border-slate-400 minimal-corner shadow-sm">
                                <i class="fas fa-shield-alt text-slate-500 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-slate-800 text-sm">Sigorta ve Koruma Eksikliği</div>
                                    <div class="text-slate-600 text-xs mt-1">Hasar durumunda koruma ve tazminat yok</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white border-l-4 border-amber-400 minimal-corner shadow-sm">
                                <i class="fas fa-user-times text-amber-600 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-amber-800 text-sm">Dolandırıcılık Riski</div>
                                    <div class="text-amber-600 text-xs mt-1">Güvensiz platformlarda dolandırılma ihtimali</div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Sağ: Garantor360 Güvenlik -->
                    <div class="bg-gradient-to-br from-blue-900 to-blue-800 text-white p-6 minimal-corner border-2 border-blue-300">
                        <div class="text-center mb-6">
                            <div class="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 minimal-corner mx-auto mb-4 flex items-center justify-center shadow-lg">
                                <i class="fas fa-shield-virus text-blue-900 text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-white mb-2">GARANTOR360 KORUMA</h3>
                            <p class="text-blue-200 text-sm font-medium">Artık kimse sizi dolandıramaz!</p>
                        </div>
                        <div class="space-y-3">
                            <div class="flex items-start p-3 bg-white/10 border-l-4 border-amber-400 minimal-corner backdrop-blur-sm">
                                <i class="fas fa-user-shield text-amber-400 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-white text-sm">Doğrulanmış Uzmanlar</div>
                                    <div class="text-blue-200 text-xs mt-1">Kimlik, adres, referans kontrollü</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white/10 border-l-4 border-amber-400 minimal-corner backdrop-blur-sm">
                                <i class="fas fa-search text-amber-400 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-white text-sm">Sabıka Kaydı Sorgulama</div>
                                    <div class="text-blue-200 text-xs mt-1">Adli sicil kontrolü ve geçmiş sorgulaması</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white/10 border-l-4 border-amber-400 minimal-corner backdrop-blur-sm">
                                <i class="fas fa-lock text-amber-400 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-white text-sm">Para İade Garantisi</div>
                                    <div class="text-blue-200 text-xs mt-1">Memnun kalmazsan tüm paran geri</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white/10 border-l-4 border-amber-400 minimal-corner backdrop-blur-sm">
                                <i class="fas fa-umbrella text-amber-400 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-white text-sm">Sigorta Koruması</div>
                                    <div class="text-blue-200 text-xs mt-1">Hasar ve sorun durumunda sigorta tazminatı</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white/10 border-l-4 border-amber-400 minimal-corner backdrop-blur-sm">
                                <i class="fas fa-headset text-amber-400 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-white text-sm">7/24 İzleme Sistemi</div>
                                    <div class="text-blue-200 text-xs mt-1">Sürekli takip, anında müdahale</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white/10 border-l-4 border-amber-400 minimal-corner backdrop-blur-sm">
                                <i class="fas fa-comments text-amber-400 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-white text-sm">Danışmanlık Hizmeti</div>
                                    <div class="text-blue-200 text-xs mt-1">Uzman danışmanlardan ücretsiz rehberlik</div>
                                </div>
                            </div>
                            <div class="flex items-start p-3 bg-white/10 border-l-4 border-amber-400 minimal-corner backdrop-blur-sm">
                                <i class="fas fa-gavel text-amber-400 text-lg mt-0.5 mr-3 flex-shrink-0"></i>
                                <div>
                                    <div class="font-semibold text-white text-sm">Hukuki Koruma</div>
                                    <div class="text-blue-200 text-xs mt-1">Sorun çıkarsa avukat devreye girer</div>
                                </div>
                            </div>
                        </div>



                    </div>
                </div>



                <!-- Anti-Fraud Security Features -->
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-8 minimal-corner mb-16">
                    <div class="text-center mb-8">
                        <div class="inline-flex items-center bg-blue-900 text-white px-6 py-3 minimal-corner mb-4">
                            <i class="fas fa-shield-virus text-amber-400 mr-3 text-xl"></i>
                            <span class="font-bold">DOLANDIRICILIK KARŞITI KORUMA</span>
                        </div>
                        <h3 class="text-2xl font-bold text-blue-900 mb-4">
                            4 KATMANLI GÜVENLİK SİSTEMİ
                        </h3>
                        <p class="text-slate-600 text-lg">Her katman sizi farklı dolandırıcılık türlerinden koruyor</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <!-- Katman 1: Para Koruması -->
                        <div class="bg-white p-6 minimal-corner text-center border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 group hover:shadow-lg">
                            <div class="w-16 h-16 bg-gradient-to-br from-green-400 to-green-500 minimal-corner mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <i class="fas fa-piggy-bank text-white text-2xl"></i>
                            </div>
                            <h4 class="font-bold text-blue-900 mb-3 text-sm">PARA KORUNMASI</h4>
                            <p class="text-slate-600 text-xs leading-relaxed mb-3">İş bitmeden ödeme yapılmaz, dolandırıcılar para alamaz</p>
                            <div class="text-xs bg-green-100 text-green-700 px-2 py-1 minimal-corner font-semibold">
                                Para İade Garantili
                            </div>
                        </div>

                        <!-- Katman 2: Kimlik Doğrulama -->
                        <div class="bg-white p-6 minimal-corner text-center border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 group hover:shadow-lg">
                            <div class="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-500 minimal-corner mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <i class="fas fa-id-card text-white text-2xl"></i>
                            </div>
                            <h4 class="font-bold text-blue-900 mb-3 text-sm">KİMLİK DOĞRULAMA</h4>
                            <p class="text-slate-600 text-xs leading-relaxed mb-3">Sahte ustalar engellenip, sadece gerçek uzmanlar kabul edilir</p>
                            <div class="text-xs bg-blue-100 text-blue-700 px-2 py-1 minimal-corner font-semibold">
                                %100 Doğrulanmış
                            </div>
                        </div>

                        <!-- Katman 3: İş Takibi -->
                        <div class="bg-white p-6 minimal-corner text-center border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 group hover:shadow-lg">
                            <div class="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-500 minimal-corner mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <i class="fas fa-eye text-white text-2xl"></i>
                            </div>
                            <h4 class="font-bold text-blue-900 mb-3 text-sm">SÜREKLI TAKİP</h4>
                            <p class="text-slate-600 text-xs leading-relaxed mb-3">İş süresince 7/24 izleme, sorun anında müdahale</p>
                            <div class="text-xs bg-purple-100 text-purple-700 px-2 py-1 minimal-corner font-semibold">
                                Canlı İzleme
                            </div>
                        </div>

                        <!-- Katman 4: Hukuki Koruma -->
                        <div class="bg-white p-6 minimal-corner text-center border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 group hover:shadow-lg">
                            <div class="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 minimal-corner mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                                <i class="fas fa-balance-scale text-white text-2xl"></i>
                            </div>
                            <h4 class="font-bold text-blue-900 mb-3 text-sm">HUKUKİ KORUMA</h4>
                            <p class="text-slate-600 text-xs leading-relaxed mb-3">Dolandırıcılık durumunda avukat devreye girer</p>
                            <div class="text-xs bg-amber-100 text-amber-700 px-2 py-1 minimal-corner font-semibold">
                                Avukat Desteği
                            </div>
                        </div>
                    </div>

                    <!-- Güven İstatistikleri -->
                    <div class="mt-8 bg-white/80 p-6 minimal-corner border border-blue-200">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <div class="text-2xl font-bold text-red-600 mb-1">0</div>
                                <div class="text-slate-600 text-xs">Dolandırıcılık Vakası</div>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-green-600 mb-1">98.9%</div>
                                <div class="text-slate-600 text-xs">Güvenlik Oranı</div>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-blue-600 mb-1">24/7</div>
                                <div class="text-slate-600 text-xs">Koruma Aktif</div>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-purple-600 mb-1">15dk</div>
                                <div class="text-slate-600 text-xs">Müdahale Süresi</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Minimal Call to Action -->
                <div class="text-center">
                    <div class="bg-blue-900 text-white p-6 minimal-corner">
                        <h3 class="text-2xl font-bold mb-4 text-white">
                            Güvenli Hizmet Almaya Başlayın
                        </h3>
                        <p class="text-blue-200 mb-6">Tüm güvencelerimizle korumalı, risk-free hizmet deneyimi</p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onclick="scrollToServices()" class="bg-amber-500 text-blue-900 px-6 py-2 minimal-corner font-medium text-sm hover:bg-amber-400 transition duration-200">
                                <i class="fas fa-arrow-right mr-2"></i>Hizmet Talep Et
                                <span class="text-xs opacity-80 ml-2">| 0850 360 0360</span>
                            </button>
                        </div>
                    </div>
                    <p class="text-slate-500 text-xs mt-4">
                        <i class="fas fa-shield-alt mr-1"></i>
                        Tüm güvenceler yasal olarak garanti edilir
                    </p>
                </div>
            </div>
        </section>

        <!-- Live Statistics -->
        <section id="stats" class="py-20 bg-slate-50">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Customer Stats Header -->
                <div class="text-center mb-16">
                    <div class="section-divider w-20 mx-auto mb-6"></div>
                    <h2 class="text-4xl font-bold text-blue-900 mb-4 tracking-tight">
                        PLATFORM İSTATİSTİKLERİ
                    </h2>
                    <p class="text-blue-600 text-lg font-medium">Güvenilir hizmet verileri ve başarı oranları</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <div class="bg-blue-900 text-white p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-200 text-sm font-medium mb-2">BUGÜN TAMAMLANAN İŞ</p>
                                <p class="text-4xl font-bold stats-counter text-white" id="daily-jobs">347</p>
                            </div>
                            <div class="w-3 h-3 bg-amber-400 sharp-corner pulse-dot"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-blue-700">
                            <span class="text-amber-400 text-sm font-semibold">
                                <i class="fas fa-arrow-up mr-1"></i>+34% önceki güne göre
                            </span>
                        </div>
                    </div>

                    <div class="bg-white border-2 border-blue-200 p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-600 text-sm font-medium mb-2">MÜŞTERI MEMNUNİYET</p>
                                <p class="text-4xl font-bold stats-counter text-blue-900">98.7<span class="text-2xl">%</span></p>
                            </div>
                            <div class="w-3 h-3 bg-amber-400 sharp-corner"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-blue-100">
                            <span class="text-blue-600 text-sm font-semibold">
                                <i class="fas fa-star mr-1"></i>5 yıldız ortalama
                            </span>
                        </div>
                    </div>

                    <div class="bg-white border-2 border-blue-200 p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-600 text-sm font-medium mb-2">AKTİF HİZMET VEREN</p>
                                <p class="text-4xl font-bold stats-counter text-blue-900" id="active-dealers">1,247</p>
                            </div>
                            <div class="w-3 h-3 bg-amber-400 sharp-corner"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-blue-100">
                            <span class="text-blue-600 text-sm font-semibold">
                                <i class="fas fa-users mr-1"></i>Doğrulanmış uzmanlar
                            </span>
                        </div>
                    </div>

                    <div class="bg-amber-500 text-white p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-amber-100 text-sm font-medium mb-2">ORTALAMA YANIT SÜRESİ</p>
                                <p class="text-4xl font-bold stats-counter text-white"><span id="avg-response">12</span><span class="text-2xl">dk</span></p>
                            </div>
                            <div class="w-3 h-3 bg-white sharp-corner pulse-dot"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-amber-600">
                            <span class="text-amber-100 text-sm font-semibold">
                                <i class="fas fa-clock mr-1"></i>Hızlı çözüm
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Real-time Job Feed -->
                <div class="bg-white border-2 border-slate-200 minimal-corner">
                    <div class="bg-slate-100 px-8 py-4 border-b-2 border-slate-200">
                        <div class="flex items-center justify-between">
                            <h3 class="text-slate-800 text-xl font-bold tracking-tight flex items-center">
                                <span class="inline-block w-3 h-3 bg-orange-600 sharp-corner pulse-dot mr-3"></span>
                                CANLI TALEP AKIŞI
                            </h3>
                            <div class="flex items-center space-x-4 text-sm">
                                <span class="text-slate-600 font-medium">Son 10 dakika:</span>
                                <span class="bg-orange-600 text-white px-3 py-1 sharp-corner font-bold" id="recent-count">8 Talep</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Job Feed Grid -->
                    <div class="p-8">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Left: Live Customer Requests -->
                            <div>
                                <h4 class="text-slate-800 font-bold mb-4 tracking-tight">CANLI TALEPLER</h4>
                                <div id="job-feed" class="space-y-3 max-h-80 overflow-y-auto">
                                    <!-- Customer requests will be populated via JavaScript -->
                                </div>
                            </div>
                            
                            <!-- Right: Job Statistics -->
                            <div>
                                <h4 class="text-slate-800 font-bold mb-4 tracking-tight">CANLI İSTATİSTİKLER</h4>
                                <div class="space-y-4">
                                    <!-- Hourly Customer Requests -->
                                    <div class="bg-slate-50 p-4 minimal-corner">
                                        <div class="flex justify-between items-center mb-3">
                                            <span class="text-slate-700 font-medium text-sm">SON 6 SAAT</span>
                                            <span class="text-orange-600 font-bold text-lg" id="hourly-total">47 Talep</span>
                                        </div>
                                        <div class="flex items-end space-x-1 h-16">
                                            <div class="bg-orange-600 w-full" style="height: 30%"></div>
                                            <div class="bg-orange-600 w-full" style="height: 45%"></div>
                                            <div class="bg-orange-600 w-full" style="height: 60%"></div>
                                            <div class="bg-orange-600 w-full" style="height: 80%"></div>
                                            <div class="bg-orange-600 w-full" style="height: 100%"></div>
                                            <div class="bg-orange-600 w-full" style="height: 75%"></div>
                                        </div>
                                    </div>
                                    
                                    <!-- Popular Service Categories -->
                                    <div class="bg-slate-50 p-4 minimal-corner">
                                        <h5 class="text-slate-700 font-bold text-sm mb-3">POPÜLER KATEGORİLER</h5>
                                        <div class="space-y-2">
                                            <div class="flex justify-between items-center">
                                                <span class="text-slate-600 text-sm">Televizyon Tamiri</span>
                                                <div class="flex items-center">
                                                    <div class="w-16 h-2 bg-slate-200 mr-2">
                                                        <div class="w-3/4 h-full bg-orange-600"></div>
                                                    </div>
                                                    <span class="text-slate-800 font-bold text-sm">34%</span>
                                                </div>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-slate-600 text-sm">Çamaşır Makinesi</span>
                                                <div class="flex items-center">
                                                    <div class="w-16 h-2 bg-slate-200 mr-2">
                                                        <div class="w-1/2 h-full bg-slate-600"></div>
                                                    </div>
                                                    <span class="text-slate-800 font-bold text-sm">28%</span>
                                                </div>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-slate-600 text-sm">Klima Servisi</span>
                                                <div class="flex items-center">
                                                    <div class="w-16 h-2 bg-slate-200 mr-2">
                                                        <div class="w-2/5 h-full bg-slate-600"></div>
                                                    </div>
                                                    <span class="text-slate-800 font-bold text-sm">22%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Top Cities -->
                                    <div class="bg-slate-50 p-4 minimal-corner">
                                        <h5 class="text-slate-700 font-bold text-sm mb-3">AKTİF ŞEHİRLER</h5>
                                        <div class="grid grid-cols-2 gap-2 text-xs">
                                            <div class="flex justify-between">
                                                <span class="text-slate-600">İstanbul</span>
                                                <span class="text-orange-600 font-bold">23</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-slate-600">Ankara</span>
                                                <span class="text-slate-800 font-bold">12</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-slate-600">İzmir</span>
                                                <span class="text-slate-800 font-bold">8</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-slate-600">Bursa</span>
                                                <span class="text-slate-800 font-bold">5</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- City Opportunities -->
        <section class="py-20 bg-slate-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="text-center mb-16">
                    <div class="section-divider w-20 mx-auto mb-6"></div>
                    <h2 class="text-4xl font-bold text-slate-800 mb-4 tracking-tight">
                        ŞEHİR BAZINDA HİZMET İMKANLARI
                    </h2>
                    <p class="text-slate-600 text-lg font-medium">81 ilde güncel hizmet fiyatları ve müşteri memnuniyeti</p>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" id="city-opportunities">
                    <!-- Cities will be populated via JavaScript -->
                </div>

                <!-- "Tüm Şehirleri Gör" Button -->
                <div class="text-center mt-12">
                    <button onclick="showAllCities()" class="bg-blue-900 text-white px-8 py-4 minimal-corner font-bold text-lg hover:bg-orange-600 transition duration-200 shadow-lg">
                        <i class="fas fa-map-marked-alt mr-2"></i>
                        TÜM 81 İLİ GÖR
                    </button>
                    <p class="text-slate-500 text-sm mt-2">Türkiye genelinde hizmet veriyoruz</p>
                </div>
            </div>
        </section>

        <!-- Service Categories -->
        <section class="py-20 bg-white">
            <div class="max-w-7xl mx-auto px-6">
                <div class="text-center mb-16">
                    <div class="section-divider w-20 mx-auto mb-6"></div>
                    <h2 class="text-4xl font-bold text-slate-800 mb-4 tracking-tight">
                        HİZMET KATEGORİLERİ
                    </h2>
                    <p class="text-slate-600 text-lg font-medium">Güvenli hizmet almanın kapsamlı çözümleri</p>
                    <div class="flex justify-center items-center space-x-6 mt-6">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-900">6</div>
                            <div class="text-slate-600 text-sm">Ana Kategori</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-orange-600">50+</div>
                            <div class="text-slate-600 text-sm">Alt Hizmet</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">%98.7</div>
                            <div class="text-slate-600 text-sm">Başarı Oranı</div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <!-- Teknik Onarım -->
                    <div class="bg-white border-2 border-blue-200 p-4 minimal-corner group hover:border-orange-500 hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden">
                        <div class="text-center relative z-10">
                            <div class="w-12 h-12 bg-blue-900 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-orange-600 transition-colors duration-300">
                                <i class="fas fa-tv text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold text-slate-800 mb-2 text-sm">TEKNİK ONARIM</h3>
                            <div class="text-xs text-slate-600 mb-3">TV•PC•Beyaz Eşya</div>
                            <div class="text-center">
                                <div class="text-orange-600 font-bold text-sm">₺280-2.5K</div>
                                <div class="text-slate-500 text-xs">Ortalama Fiyat</div>
                            </div>
                        </div>
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-blue-900 bg-opacity-95 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col justify-center text-white">
                            <div class="text-center">
                                <h4 class="font-bold text-white text-sm mb-3">TEKNİK ONARIM</h4>
                                <div class="space-y-2 text-xs">
                                    <div class="flex justify-between">
                                        <span>TV Tamiri</span>
                                        <span class="font-bold">₺400-1.2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Çamaşır Makinesi</span>
                                        <span class="font-bold">₺350-800</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Klima Servisi</span>
                                        <span class="font-bold">₺200-600</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-orange-600 text-white py-2 sharp-corner text-xs font-bold hover:bg-orange-700 transition duration-200 mt-3">
                                    HİZMET AL
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Ev Bakım & Tadilat -->
                    <div class="bg-white border-2 border-green-200 p-4 minimal-corner group hover:border-green-500 hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden">
                        <div class="text-center relative z-10">
                            <div class="w-12 h-12 bg-green-700 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-green-600 transition-colors duration-300">
                                <i class="fas fa-home text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold text-slate-800 mb-2 text-sm">EV BAKIM</h3>
                            <div class="text-xs text-slate-600 mb-3">Boyama•Elektrik•Tesisat</div>
                            <div class="text-center">
                                <div class="text-green-600 font-bold text-sm">₺500-5K</div>
                                <div class="text-slate-500 text-xs">Ortalama Fiyat</div>
                            </div>
                        </div>
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-green-700 bg-opacity-95 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col justify-center text-white">
                            <div class="text-center">
                                <h4 class="font-bold text-white text-sm mb-3">EV BAKIM & TADİLAT</h4>
                                <div class="space-y-2 text-xs">
                                    <div class="flex justify-between">
                                        <span>Boyama & Badana</span>
                                        <span class="font-bold">₺1.5K-4K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Elektrik İşleri</span>
                                        <span class="font-bold">₺300-1.2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Su Tesisatı</span>
                                        <span class="font-bold">₺400-1.5K</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-green-600 text-white py-2 sharp-corner text-xs font-bold hover:bg-green-700 transition duration-200 mt-3">
                                    HİZMET AL
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Temizlik Hizmetleri -->
                    <div class="bg-white border-2 border-purple-200 p-4 minimal-corner group hover:border-purple-500 hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden">
                        <div class="text-center relative z-10">
                            <div class="w-12 h-12 bg-purple-700 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-purple-600 transition-colors duration-300">
                                <i class="fas fa-broom text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold text-slate-800 mb-2 text-sm">TEMİZLİK</h3>
                            <div class="text-xs text-slate-600 mb-3">Ev•Halı•Derin Temizlik</div>
                            <div class="text-center">
                                <div class="text-purple-600 font-bold text-sm">₺200-1.5K</div>
                                <div class="text-slate-500 text-xs">Ortalama Fiyat</div>
                            </div>
                        </div>
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-purple-700 bg-opacity-95 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col justify-center text-white">
                            <div class="text-center">
                                <h4 class="font-bold text-white text-sm mb-3">TEMİZLİK HİZMETLERİ</h4>
                                <div class="space-y-2 text-xs">
                                    <div class="flex justify-between">
                                        <span>Ev Temizliği</span>
                                        <span class="font-bold">₺150-400</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Halı Yıkama</span>
                                        <span class="font-bold">₺200-600</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Derin Temizlik</span>
                                        <span class="font-bold">₺350-800</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-purple-600 text-white py-2 sharp-corner text-xs font-bold hover:bg-purple-700 transition duration-200 mt-3">
                                    HİZMET AL
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Nakliye & Taşımacılık -->
                    <div class="bg-white border-2 border-indigo-200 p-4 minimal-corner group hover:border-indigo-500 hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden">
                        <div class="text-center relative z-10">
                            <div class="w-12 h-12 bg-indigo-700 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                                <i class="fas fa-truck text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold text-slate-800 mb-2 text-sm">NAKLİYE</h3>
                            <div class="text-xs text-slate-600 mb-3">Ev Taşıma•Eşya Nakli</div>
                            <div class="text-center">
                                <div class="text-indigo-600 font-bold text-sm">₺800-4K</div>
                                <div class="text-slate-500 text-xs">Ortalama Fiyat</div>
                            </div>
                        </div>
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-indigo-700 bg-opacity-95 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col justify-center text-white">
                            <div class="text-center">
                                <h4 class="font-bold text-white text-sm mb-3">NAKLİYE & TAŞIMA</h4>
                                <div class="space-y-2 text-xs">
                                    <div class="flex justify-between">
                                        <span>Ev Taşıma</span>
                                        <span class="font-bold">₺1.2K-3K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Eşya Nakli</span>
                                        <span class="font-bold">₺300-800</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Ofis Taşıma</span>
                                        <span class="font-bold">₺800-2K</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-indigo-600 text-white py-2 sharp-corner text-xs font-bold hover:bg-indigo-700 transition duration-200 mt-3">
                                    HİZMET AL
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Kişisel Hizmetler -->
                    <div class="bg-white border-2 border-pink-200 p-4 minimal-corner group hover:border-pink-500 hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden">
                        <div class="text-center relative z-10">
                            <div class="w-12 h-12 bg-pink-700 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-pink-600 transition-colors duration-300">
                                <i class="fas fa-user text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold text-slate-800 mb-2 text-sm">KİŞİSEL</h3>
                            <div class="text-xs text-slate-600 mb-3">Kuaför•Masaj•Özel Ders</div>
                            <div class="text-center">
                                <div class="text-pink-600 font-bold text-sm">₺150-800</div>
                                <div class="text-slate-500 text-xs">Ortalama Fiyat</div>
                            </div>
                        </div>
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-pink-700 bg-opacity-95 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col justify-center text-white">
                            <div class="text-center">
                                <h4 class="font-bold text-white text-sm mb-3">KİŞİSEL HİZMETLER</h4>
                                <div class="space-y-2 text-xs">
                                    <div class="flex justify-between">
                                        <span>Kuaför Hizmeti</span>
                                        <span class="font-bold">₺100-300</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Masaj Terapi</span>
                                        <span class="font-bold">₺200-500</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Özel Ders</span>
                                        <span class="font-bold">₺150-400</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-pink-600 text-white py-2 sharp-corner text-xs font-bold hover:bg-pink-700 transition duration-200 mt-3">
                                    HİZMET AL
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Otomotiv & Araç -->
                    <div class="bg-white border-2 border-red-200 p-4 minimal-corner group hover:border-red-500 hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden">
                        <div class="text-center relative z-10">
                            <div class="w-12 h-12 bg-red-700 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-red-600 transition-colors duration-300">
                                <i class="fas fa-car text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold text-slate-800 mb-2 text-sm">OTOMOTİV</h3>
                            <div class="text-xs text-slate-600 mb-3">Tamir•Yıkama•Bakım</div>
                            <div class="text-center">
                                <div class="text-red-600 font-bold text-sm">₺200-2K</div>
                                <div class="text-slate-500 text-xs">Ortalama Fiyat</div>
                            </div>
                        </div>
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-red-700 bg-opacity-95 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col justify-center text-white">
                            <div class="text-center">
                                <h4 class="font-bold text-white text-sm mb-3">OTOMOTİV HİZMETLER</h4>
                                <div class="space-y-2 text-xs">
                                    <div class="flex justify-between">
                                        <span>Araç Tamiri</span>
                                        <span class="font-bold">₺500-1.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Detaylı Yıkama</span>
                                        <span class="font-bold">₺80-200</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Periyodik Bakım</span>
                                        <span class="font-bold">₺300-800</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-red-600 text-white py-2 sharp-corner text-xs font-bold hover:bg-red-700 transition duration-200 mt-3">
                                    HİZMET AL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Benefits Section -->

        <!-- Customer Testimonials Section -->
        <section class="py-20 bg-gray-50">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Customer Testimonials -->
                <div class="mb-16">
                    <div class="text-center mb-12">
                        <div class="section-divider w-32 mx-auto mb-8"></div>
                        <h2 class="text-4xl font-bold text-gray-800 mb-4">MÜŞTERİ DENEYİMLERİ</h2>
                        <p class="text-xl text-gray-600">Gerçek müşterilerimizin bizimle yaşadığı deneyimler</p>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <!-- Testimonial 1 -->
                        <div class="bg-white p-8 minimal-corner shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                            <div class="flex items-center mb-6">
                                <img src="https://images.unsplash.com/photo-1494790108755-2616b612b3bb?w=64&h=64&fit=crop&crop=face&auto=format&q=80" 
                                     alt="Ayşe Kaya" 
                                     class="w-16 h-16 rounded-full mr-4 border-2 border-blue-200">
                                <div>
                                    <h4 class="font-bold text-gray-800">Ayşe Kaya</h4>
                                    <p class="text-sm text-gray-600">İstanbul, Beşiktaş</p>
                                    <div class="flex items-center mt-1">
                                        <div class="flex text-yellow-400">
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                        </div>
                                        <span class="text-sm text-gray-600 ml-2">5.0</span>
                                    </div>
                                </div>
                            </div>
                            <p class="text-gray-700 leading-relaxed mb-4">
                                "Çamaşır makinem bozulmuştu, Garantor360'dan hizmet aldım. Usta 2 saatte geldi, 
                                1 saatte tamir etti. Para iade garantisi olması çok güven verici. Kesinlikle tavsiye ederim!"
                            </p>
                            <div class="flex items-center justify-between text-sm">
                                <div class="bg-blue-50 text-blue-700 px-3 py-1 minimal-corner font-medium">
                                    Beyaz Eşya Tamiri
                                </div>
                                <div class="text-gray-500">15 Eylül 2025</div>
                            </div>
                        </div>

                        <!-- Testimonial 2 -->
                        <div class="bg-white p-8 minimal-corner shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                            <div class="flex items-center mb-6">
                                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face&auto=format&q=80" 
                                     alt="Mehmet Özkan" 
                                     class="w-16 h-16 rounded-full mr-4 border-2 border-green-200">
                                <div>
                                    <h4 class="font-bold text-gray-800">Mehmet Özkan</h4>
                                    <p class="text-sm text-gray-600">Ankara, Çankaya</p>
                                    <div class="flex items-center mt-1">
                                        <div class="flex text-yellow-400">
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                        </div>
                                        <span class="text-sm text-gray-600 ml-2">5.0</span>
                                    </div>
                                </div>
                            </div>
                            <p class="text-gray-700 leading-relaxed mb-4">
                                "Evimin elektriği gitmişti, gece vakti acil durum. 45 dakikada elektrikçi geldi, 
                                sorunu çözdü. 6 ay garanti verildi. Profesyonel hizmet, makul fiyat. Teşekkürler!"
                            </p>
                            <div class="flex items-center justify-between text-sm">
                                <div class="bg-yellow-50 text-yellow-700 px-3 py-1 minimal-corner font-medium">
                                    Elektrik İşleri
                                </div>
                                <div class="text-gray-500">18 Eylül 2025</div>
                            </div>
                        </div>

                        <!-- Testimonial 3 -->
                        <div class="bg-white p-8 minimal-corner shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                            <div class="flex items-center mb-6">
                                <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face&auto=format&q=80" 
                                     alt="Zeynep Demir" 
                                     class="w-16 h-16 rounded-full mr-4 border-2 border-purple-200">
                                <div>
                                    <h4 class="font-bold text-gray-800">Zeynep Demir</h4>
                                    <p class="text-sm text-gray-600">İzmir, Karşıyaka</p>
                                    <div class="flex items-center mt-1">
                                        <div class="flex text-yellow-400">
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                        </div>
                                        <span class="text-sm text-gray-600 ml-2">5.0</span>
                                    </div>
                                </div>
                            </div>
                            <p class="text-gray-700 leading-relaxed mb-4">
                                "Kombim arızalandı, kış ortasında. Garantor360 sayesinde 1 saatte teknisyen buldum. 
                                İş kalitesi mükemmel, fiyatlar makul. Sigorta koruması çok güven verici."
                            </p>
                            <div class="flex items-center justify-between text-sm">
                                <div class="bg-orange-50 text-orange-700 px-3 py-1 minimal-corner font-medium">
                                    Kombi Servisi
                                </div>
                                <div class="text-gray-500">14 Eylül 2025</div>
                            </div>
                        </div>

                        <!-- Testimonial 4 -->
                        <div class="bg-white p-8 minimal-corner shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                            <div class="flex items-center mb-6">
                                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face&auto=format&q=80" 
                                     alt="Ali Yılmaz" 
                                     class="w-16 h-16 rounded-full mr-4 border-2 border-red-200">
                                <div>
                                    <h4 class="font-bold text-gray-800">Ali Yılmaz</h4>
                                    <p class="text-sm text-gray-600">Bursa, Nilüfer</p>
                                    <div class="flex items-center mt-1">
                                        <div class="flex text-yellow-400">
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                        </div>
                                        <span class="text-sm text-gray-600 ml-2">5.0</span>
                                    </div>
                                </div>
                            </div>
                            <p class="text-gray-700 leading-relaxed mb-4">
                                "TV'min ekranı gitmişti, tamir masrafından korkuyordum. Garantor360 ile hem uygun 
                                fiyata hem de garantili şekilde halledildi. WhatsApp desteği çok pratik!"
                            </p>
                            <div class="flex items-center justify-between text-sm">
                                <div class="bg-purple-50 text-purple-700 px-3 py-1 minimal-corner font-medium">
                                    TV Tamiri
                                </div>
                                <div class="text-gray-500">16 Eylül 2025</div>
                            </div>
                        </div>

                        <!-- Testimonial 5 -->
                        <div class="bg-white p-8 minimal-corner shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                            <div class="flex items-center mb-6">
                                <img src="https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=64&h=64&fit=crop&crop=face&auto=format&q=80" 
                                     alt="Fatma Şahin" 
                                     class="w-16 h-16 rounded-full mr-4 border-2 border-green-200">
                                <div>
                                    <h4 class="font-bold text-gray-800">Fatma Şahin</h4>
                                    <p class="text-sm text-gray-600">Antalya, Konyaaltı</p>
                                    <div class="flex items-center mt-1">
                                        <div class="flex text-yellow-400">
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                        </div>
                                        <span class="text-sm text-gray-600 ml-2">5.0</span>
                                    </div>
                                </div>
                            </div>
                            <p class="text-gray-700 leading-relaxed mb-4">
                                "Su tesisatım akıyordu, banyo sular altındaydı. Acil servis çağırdım, 30 dakikada 
                                geldi. İş kalitesi ve güler yüzü için teşekkür ederim. Herkese tavsiye ederim."
                            </p>
                            <div class="flex items-center justify-between text-sm">
                                <div class="bg-blue-50 text-blue-700 px-3 py-1 minimal-corner font-medium">
                                    Su Tesisatı
                                </div>
                                <div class="text-gray-500">17 Eylül 2025</div>
                            </div>
                        </div>

                        <!-- Testimonial 6 -->
                        <div class="bg-white p-8 minimal-corner shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                            <div class="flex items-center mb-6">
                                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face&auto=format&q=80" 
                                     alt="Osman Kara" 
                                     class="w-16 h-16 rounded-full mr-4 border-2 border-indigo-200">
                                <div>
                                    <h4 class="font-bold text-gray-800">Osman Kara</h4>
                                    <p class="text-sm text-gray-600">Adana, Seyhan</p>
                                    <div class="flex items-center mt-1">
                                        <div class="flex text-yellow-400">
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                            <i class="fas fa-star"></i>
                                        </div>
                                        <span class="text-sm text-gray-600 ml-2">5.0</span>
                                    </div>
                                </div>
                            </div>
                            <p class="text-gray-700 leading-relaxed mb-4">
                                "Klimam soğutmuyordu, yazın ortasında çok zor durumda kaldık. Garantor360 ekibi 
                                2 saatte geldi, sorunu çözdü. Fiyat da çok makul, ailecek memnun kaldık."
                            </p>
                            <div class="flex items-center justify-between text-sm">
                                <div class="bg-cyan-50 text-cyan-700 px-3 py-1 minimal-corner font-medium">
                                    Klima Servisi
                                </div>
                                <div class="text-gray-500">13 Eylül 2025</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Customer Benefits Section -->
        <section class="py-20 bg-white">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Customer Benefits moved after testimonials -->
                <div class="mb-16">
                    <div class="text-center mb-12">
                        <div class="section-divider w-20 mx-auto mb-6"></div>
                        <h2 class="text-3xl font-bold mb-4 tracking-tight text-blue-900">MÜŞTERİ GÜVENCELERİ</h2>
                        <p class="text-blue-600 font-medium">Garantor360 ile hizmet almanın avantajları</p>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <!-- Ödeme Güvencesi -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-12 h-12 bg-amber-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-piggy-bank text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-amber-600">ÖDEME GÜVENCESİ</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">Para iade garantisi</p>
                        </div>

                        <!-- İşçilik Garantisi -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-12 h-12 bg-green-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-tools text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-green-600">İŞÇİLİK GARANTİSİ</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">6 ay garanti</p>
                        </div>

                        <!-- Doğrulanmış Ustalar -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-12 h-12 bg-blue-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-user-shield text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-blue-600">DOĞRULANMIŞ USTALAR</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">Kimlik kontrolü</p>
                        </div>

                        <!-- Sigorta Koruması -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-12 h-12 bg-purple-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-umbrella text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-purple-600">SİGORTA KORUMASI</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">Hasar tazminatı</p>
                        </div>

                        <!-- Hukuki Destek -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-12 h-12 bg-orange-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-gavel text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-orange-600">HUKUKİ DESTEK</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">Avukat desteği</p>
                        </div>

                        <!-- 7/24 Destek -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-12 h-12 bg-pink-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-headset text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-pink-600">7/24 DESTEK</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">Sürekli destek</p>
                        </div>
                    </div>
                </div>


            </div>
        </section>

        <!-- City Based Services Section -->
        <section class="py-20 bg-blue-50">
            <div class="max-w-7xl mx-auto px-6">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-bold text-blue-900 mb-4">ŞEHİR BAZINDA HİZMET İMKANLARI</h2>
                    <p class="text-xl text-blue-700 font-medium">81 ilde güncel hizmet fiyatları ve müşteri memnuniyeti</p>
                </div>

                <!-- Top Cities Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <!-- İstanbul -->
                    <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas fa-city text-white text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-800">İSTANBUL</h3>
                                <p class="text-sm text-gray-600">2.847 aktif uzman</p>
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Ortalama fiyat:</span>
                                <span class="font-semibold text-green-600">₺350-600</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Memnuniyet:</span>
                                <div class="flex items-center">
                                    <span class="font-semibold text-yellow-500 mr-1">4.8</span>
                                    <div class="flex text-yellow-400 text-xs">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Ankara -->
                    <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas fa-landmark text-white text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-800">ANKARA</h3>
                                <p class="text-sm text-gray-600">1.542 aktif uzman</p>
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Ortalama fiyat:</span>
                                <span class="font-semibold text-green-600">₺280-500</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Memnuniyet:</span>
                                <div class="flex items-center">
                                    <span class="font-semibold text-yellow-500 mr-1">4.7</span>
                                    <div class="flex text-yellow-400 text-xs">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- İzmir -->
                    <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas fa-anchor text-white text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-800">İZMİR</h3>
                                <p class="text-sm text-gray-600">928 aktif uzman</p>
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Ortalama fiyat:</span>
                                <span class="font-semibold text-green-600">₺260-480</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Memnuniyet:</span>
                                <div class="flex items-center">
                                    <span class="font-semibold text-yellow-500 mr-1">4.9</span>
                                    <div class="flex text-yellow-400 text-xs">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bursa -->
                    <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas fa-mountain text-white text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-800">BURSA</h3>
                                <p class="text-sm text-gray-600">634 aktif uzman</p>
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Ortalama fiyat:</span>
                                <span class="font-semibold text-green-600">₺240-420</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Memnuniyet:</span>
                                <div class="flex items-center">
                                    <span class="font-semibold text-yellow-500 mr-1">4.6</span>
                                    <div class="flex text-yellow-400 text-xs">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="far fa-star"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Antalya -->
                    <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas fa-sun text-white text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-800">ANTALYA</h3>
                                <p class="text-sm text-gray-600">487 aktif uzman</p>
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Ortalama fiyat:</span>
                                <span class="font-semibold text-green-600">₺220-380</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Memnuniyet:</span>
                                <div class="flex items-center">
                                    <span class="font-semibold text-yellow-500 mr-1">4.7</span>
                                    <div class="flex text-yellow-400 text-xs">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Adana -->
                    <div class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                        <div class="flex items-center mb-4">
                            <div class="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                                <i class="fas fa-seedling text-white text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-800">ADANA</h3>
                                <p class="text-sm text-gray-600">312 aktif uzman</p>
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Ortalama fiyat:</span>
                                <span class="font-semibold text-green-600">₺200-350</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Memnuniyet:</span>
                                <div class="flex items-center">
                                    <span class="font-semibold text-yellow-500 mr-1">4.5</span>
                                    <div class="flex text-yellow-400 text-xs">
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="fas fa-star"></i>
                                        <i class="far fa-star"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- All Cities Button -->
                <div class="text-center">
                    <button class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105">
                        <i class="fas fa-map-marker-alt mr-2"></i>
                        TÜM 81 İLİ GÖR
                    </button>
                    <p class="text-blue-600 font-medium mt-4">Türkiye genelinde hizmet veriyoruz</p>
                </div>
            </div>
        </section>

        <!-- Service Request Form -->
        <section class="py-20 bg-slate-50" id="hizmet-al">
            <div class="max-w-6xl mx-auto px-6">
                <div class="text-center mb-12">
                    <div class="section-divider w-32 mx-auto mb-8"></div>
                    <div class="inline-flex items-center bg-green-100 text-green-800 px-6 py-3 minimal-corner mb-4">
                        <i class="fas fa-shield-check text-green-600 mr-3"></i>
                        <span class="font-bold">%100 GÜVENLİ HİZMET BAŞVURUSU</span>
                    </div>
                    <h2 class="text-5xl font-bold text-blue-900 mb-6 tracking-tight">
                        GÜVENLİ HİZMET ALMAK İÇİN
                        <span class="block text-green-700">TALEBİNİZİ BİLDİRİN</span>
                    </h2>

                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Service Request Form -->
                    <div class="lg:col-span-2 bg-white p-8 minimal-corner shadow-lg border-2 border-blue-100">
                        




                        <form id="serviceRequestForm" class="space-y-6">


                            <!-- Location Information -->
                            <div data-step="1" class="form-step">
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="text-lg font-bold text-blue-900">1️⃣ Konum Bilgileri</h4>
                                    <div id="step1Reward" class="hidden bg-blue-100 text-blue-800 px-3 py-1 minimal-corner text-sm font-bold">
                                        <i class="fas fa-map-marker-alt mr-1"></i>En yakın ustalar bulunuyor...
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-bold text-blue-900 mb-2">
                                            <i class="fas fa-map-marker-alt mr-2"></i>Şehir *
                                        </label>
                                        <select id="customerCity" required 
                                                class="w-full p-4 border-2 border-blue-200 sharp-corner focus:border-amber-400 focus:outline-none transition duration-200"
                                                onchange="updateFormProgress(); validateStep(1); showNearbyExperts();">
                                            <option value="">Şehir Seçin</option>
                                            <option value="İstanbul">İstanbul</option>
                                            <option value="Ankara">Ankara</option>
                                            <option value="İzmir">İzmir</option>
                                            <option value="Bursa">Bursa</option>
                                            <option value="Antalya">Antalya</option>
                                            <option value="Adana">Adana</option>
                                            <option value="Gaziantep">Gaziantep</option>
                                            <option value="Konya">Konya</option>
                                            <option value="Diğer">Diğer</option>
                                        </select>
                                        <div id="cityValidation" class="text-xs mt-1 hidden">
                                            <span class="text-blue-600"><i class="fas fa-search mr-1"></i>Şehrinizde uzman aranıyor...</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-blue-900 mb-2">
                                            <i class="fas fa-building mr-2"></i>İlçe
                                        </label>
                                        <input type="text" id="customerDistrict" 
                                               class="w-full p-4 border-2 border-blue-200 sharp-corner focus:border-amber-400 focus:outline-none transition duration-200"
                                               placeholder="Örn: Kadıköy"
                                               onchange="updateFormProgress();">
                                    </div>
                                </div>
                            </div>

                            <!-- Service Category -->
                            <div data-step="2" class="form-step">
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="text-lg font-bold text-blue-900">2️⃣ Hizmet Kategorisi</h4>
                                    <div id="step2Reward" class="hidden bg-purple-100 text-purple-800 px-3 py-1 minimal-corner text-sm font-bold">
                                        <i class="fas fa-tools mr-1"></i>Fiyat hesaplanıyor...
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-bold text-blue-900 mb-2">
                                        <i class="fas fa-tools mr-2"></i>Hizmet Kategorisi *
                                    </label>
                                    <select id="serviceCategory" required 
                                            class="w-full p-4 border-2 border-blue-200 sharp-corner focus:border-amber-400 focus:outline-none transition duration-200"
                                            onchange="updateFormProgress(); validateStep(2); showEstimatedPrice();">
                                        <option value="">Kategori Seçin</option>
                                    
                                    <!-- TEKNİK ONARIM - Detaylandırılmış -->
                                    <optgroup label="📺 TEKNİK ONARIM HİZMETLERİ">
                                        <option value="Televizyon Tamiri">Televizyon Tamiri (LED, LCD, OLED, Smart TV)</option>
                                        <option value="Bilgisayar Tamiri">Bilgisayar Tamiri (Masaüstü, Laptop)</option>
                                        <option value="Çamaşır Makinesi">Çamaşır Makinesi Tamiri</option>
                                        <option value="Bulaşık Makinesi">Bulaşık Makinesi Tamiri</option>
                                        <option value="Klima Servisi">Klima Servisi & Tamiri</option>
                                        <option value="Kombi Servisi">Kombi Servisi & Tamiri</option>
                                        <option value="Buzdolabı Tamiri">Buzdolabı & Derin Dondurucu Tamiri</option>
                                        <option value="Fırın Ocak">Fırın & Ocak Tamiri</option>
                                        <option value="Mikrodalga">Mikrodalga & Küçük Ev Aletleri</option>
                                        <option value="Telefon Tablet">Telefon & Tablet Tamiri</option>
                                    </optgroup>
                                    
                                    <!-- EV BAKIM & TADİLAT -->
                                    <optgroup label="🏠 EV BAKIM & TADİLAT">
                                        <option value="Boyama Badana">Boyama & Badana İşleri</option>
                                        <option value="Elektrik İşleri">Elektrik Tesisatı & Onarım</option>
                                        <option value="Su Tesisatı">Su Tesisatı & Sıhhi Tesisat</option>
                                        <option value="Döşeme Parke">Döşeme, Parke & Laminat</option>
                                        <option value="Cam Ayna">Cam & Ayna İşleri</option>
                                        <option value="Kapı Pencere">Kapı & Pencere Tamiri</option>
                                    </optgroup>
                                    
                                    <!-- TEMİZLİK HİZMETLERİ -->
                                    <optgroup label="🧹 TEMİZLİK HİZMETLERİ">
                                        <option value="Ev Temizliği">Genel Ev Temizliği</option>
                                        <option value="Derin Temizlik">Derin Temizlik & Dezenfeksiyon</option>
                                        <option value="Halı Yıkama">Halı & Koltuk Yıkama</option>
                                        <option value="Cam Temizliği">Cam Temizliği (İç & Dış)</option>
                                        <option value="Taşınma Temizlik">Taşınma Sonrası Temizlik</option>
                                    </optgroup>
                                    
                                    <!-- DİĞER HİZMETLER -->
                                    <optgroup label="🔧 DİĞER HİZMETLER">
                                        <option value="Mobilya Montaj">Mobilya Montaj & Kurulum</option>
                                        <option value="Asma Tavan">Asma Tavan & Alçıpan</option>
                                        <option value="Bahçe Peyzaj">Bahçe & Peyzaj İşleri</option>
                                        <option value="Nakliye">Nakliye & Taşıma</option>
                                        <option value="Diğer">Diğer (Açıklama kısmında belirtiniz)</option>
                                    </optgroup>
                                    </select>
                                    <div id="categoryValidation" class="text-xs mt-1 hidden">
                                        <span class="text-purple-600"><i class="fas fa-calculator mr-1"></i>Tahmini fiyat hesaplanıyor...</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Problem Description -->
                            <div data-step="3" class="form-step">
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="text-lg font-bold text-blue-900">3️⃣ Sorun Detayı</h4>
                                    <div id="step3Reward" class="hidden bg-orange-100 text-orange-800 px-3 py-1 minimal-corner text-sm font-bold">
                                        <i class="fas fa-brain mr-1"></i>AI analiz ediliyor...
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-bold text-blue-900 mb-2">
                                        <i class="fas fa-edit mr-2"></i>Sorun Detayı *
                                    </label>
                                    <textarea id="problemDescription" required rows="4" 
                                              class="w-full p-4 border-2 border-blue-200 sharp-corner focus:border-amber-400 focus:outline-none transition duration-200"
                                              placeholder="Sorununuzu detaylı şekilde açıklayın. Örn: Çamaşır makinesi çalışıyor ama su almıyor, sesli çalışıyor..."
                                              onchange="updateFormProgress(); validateStep(3); analyzeDescription();"></textarea>
                                    <div id="descriptionValidation" class="text-xs mt-1 hidden">
                                        <span class="text-orange-600"><i class="fas fa-robot mr-1"></i>Açıklama AI ile analiz ediliyor...</span>
                                    </div>
                                    <div class="text-xs text-blue-600 mt-2">
                                        <span id="charCount">0</span>/500 karakter - Daha detaylı açıklama daha hızlı çözüm!
                                    </div>
                                </div>
                            </div>

                            <!-- Urgency Level -->
                            <div>
                                <label class="block text-sm font-bold text-blue-900 mb-2">
                                    <i class="fas fa-clock mr-2"></i>Aciliyet Durumu
                                </label>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label class="flex items-center p-3 border-2 border-blue-200 sharp-corner cursor-pointer hover:border-amber-400 transition duration-200">
                                        <input type="radio" name="urgency" value="normal" checked class="mr-3">
                                        <span class="text-blue-900 font-medium">Normal</span>
                                    </label>
                                    <label class="flex items-center p-3 border-2 border-blue-200 sharp-corner cursor-pointer hover:border-amber-400 transition duration-200">
                                        <input type="radio" name="urgency" value="urgent" class="mr-3">
                                        <span class="text-blue-900 font-medium">Acil</span>
                                    </label>
                                    <label class="flex items-center p-3 border-2 border-blue-200 sharp-corner cursor-pointer hover:border-amber-400 transition duration-200">
                                        <input type="radio" name="urgency" value="emergency" class="mr-3">
                                        <span class="text-blue-900 font-medium">Çok Acil</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Contact Preference -->
                            <!-- Submit Button -->
                            <div class="text-center pt-6">
                                <button type="submit" 
                                        class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 minimal-corner font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                                    <i class="fas fa-paper-plane mr-3"></i>
                                    TALEBİ GÖNDER
                                </button>

                            </div>


                        </form>

                        <!-- Form Status Messages -->
                        <div id="formMessages" class="mt-6 hidden">
                            <div id="successMessage" class="bg-emerald-50 border-2 border-emerald-200 p-4 minimal-corner text-emerald-800 hidden">
                                <i class="fas fa-check-circle mr-2"></i>
                                <strong>Başarılı!</strong> Talebiniz alındı. En kısa sürede size dönüş yapılacak.
                            </div>
                            <div id="errorMessage" class="bg-red-50 border-2 border-red-200 p-4 minimal-corner text-red-800 hidden">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                <strong>Hata!</strong> Talep gönderilirken bir sorun oluştu. Lütfen tekrar deneyin.
                            </div>
                        </div>
                        
                        <!-- Response Time Info -->
                        <div class="mt-6 p-4 bg-amber-50 border border-amber-200 minimal-corner text-center">
                            <p class="text-amber-800 font-medium">
                                <i class="fas fa-clock mr-2 text-amber-600"></i>
                                <strong>Ortalama geri dönüş süresi: 12 dk</strong>
                            </p>
                        </div>
                        

                    </div>

                    <!-- Contact Options Sidebar -->
                    <div class="space-y-6">
                        <!-- AI Live Chat -->
                        <div class="bg-gradient-to-br from-purple-600 to-blue-600 text-white p-6 minimal-corner relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
                            <h3 class="text-xl font-bold text-amber-400 mb-4 relative z-10">
                                <i class="fas fa-robot mr-2"></i>
                                YAPAY ZEKA DESTEK
                            </h3>
                            <p class="text-sm mb-4 opacity-90 relative z-10">
                                Sorularınızı anında cevaplayalım! 7/24 aktif yapay zeka asistanımız ile konuşun.
                            </p>
                            <button onclick="toggleAIChat()" 
                                    class="w-full flex items-center justify-center p-3 bg-white/20 sharp-corner hover:bg-white/30 transition duration-200 relative z-10">
                                <i class="fas fa-comments mr-3"></i>
                                <div>
                                    <div class="font-bold">Canlı Sohbet Başlat</div>
                                    <div class="text-xs opacity-90">Ücretsiz & Anında</div>
                                </div>
                            </button>
                        </div>

                        <!-- Quick Contact -->
                        <div class="bg-blue-900 text-white p-6 minimal-corner">
                            <h3 class="text-xl font-bold text-amber-400 mb-4">
                                <i class="fas fa-phone-alt mr-2"></i>
                                HIZLI İLETİŞİM
                            </h3>
                            <div class="space-y-4">
                                <a href="tel:+905001234567" 
                                   class="flex items-center p-3 bg-blue-800 sharp-corner hover:bg-amber-500 hover:text-blue-900 transition duration-200">
                                    <i class="fas fa-phone mr-3"></i>
                                    <div>
                                        <div class="font-bold">0 500 123 45 67</div>
                                        <div class="text-sm opacity-90">Anında Destek</div>
                                    </div>
                                </a>
                                <a href="https://wa.me/905001234567?text=Merhaba, Garantor360 hizmet talebi için yazmıştım..." 
                                   target="_blank"
                                   class="flex items-center p-3 bg-[#25D366] sharp-corner hover:bg-[#20BA5A] transition duration-200">
                                    <i class="fab fa-whatsapp mr-3 text-xl"></i>
                                    <div>
                                        <div class="font-bold">WhatsApp</div>
                                        <div class="text-sm opacity-90">Mesajla İletişim</div>
                                    </div>
                                </a>
                            </div>
                        </div>

                        <!-- Clean Security Guarantee -->
                        <div class="bg-white border-2 border-blue-200 p-6 minimal-corner">
                            <div class="text-center mb-4">
                                <div class="w-12 h-12 bg-blue-100 minimal-corner mx-auto mb-3 flex items-center justify-center">
                                    <i class="fas fa-shield-alt text-blue-600 text-lg"></i>
                                </div>
                                <h4 class="text-lg font-bold text-blue-900 mb-2">
                                    GÜVENLİK GARANTİLERİ
                                </h4>
                                <p class="text-xs text-blue-600 font-medium">Tamamen korumalı hizmet</p>
                            </div>
                            <div class="space-y-3">
                                <div class="flex items-center p-3 bg-blue-50 minimal-corner">
                                    <i class="fas fa-check-circle text-blue-600 mr-3"></i>
                                    <div>
                                        <div class="text-sm font-semibold text-blue-900">Para İade Garantisi</div>
                                        <div class="text-xs text-blue-600">Memnun kalmazsan iade</div>
                                    </div>
                                </div>
                                <div class="flex items-center p-3 bg-blue-50 minimal-corner">
                                    <i class="fas fa-check-circle text-blue-600 mr-3"></i>
                                    <div>
                                        <div class="text-sm font-semibold text-blue-900">Doğrulanmış Ustalar</div>
                                        <div class="text-xs text-blue-600">Kimlik kontrollü uzmanlar</div>
                                    </div>
                                </div>
                                <div class="flex items-center p-3 bg-blue-50 minimal-corner">
                                    <i class="fas fa-check-circle text-blue-600 mr-3"></i>
                                    <div>
                                        <div class="text-sm font-semibold text-blue-900">6 Ay Garanti</div>
                                        <div class="text-xs text-blue-600">İşçilik garantisi</div>
                                    </div>
                                </div>
                                <div class="flex items-center p-3 bg-blue-50 minimal-corner">
                                    <i class="fas fa-check-circle text-blue-600 mr-3"></i>
                                    <div>
                                        <div class="text-sm font-semibold text-blue-900">Hukuki Destek</div>
                                        <div class="text-xs text-blue-600">Avukat desteği</div>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-4 p-3 bg-amber-50 border border-amber-200 minimal-corner text-center">
                                <p class="text-xs font-semibold text-amber-800">
                                    <i class="fas fa-shield-alt mr-1"></i>
                                    %100 Risk-Free Hizmet
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>



        <!-- AI Chat Modal/Widget -->
        <div id="aiChatWidget" class="fixed bottom-6 right-6 z-50 hidden">
            <div class="bg-white border-2 border-blue-200 minimal-corner shadow-2xl w-96 max-w-full">
                <!-- Chat Header -->
                <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-amber-400 sharp-corner flex items-center justify-center mr-3">
                            <i class="fas fa-robot text-blue-900 text-sm"></i>
                        </div>
                        <div>
                            <div class="font-bold text-sm">Garantor AI Asistan</div>
                            <div class="text-xs opacity-90">
                                <span class="inline-block w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                                Çevrimiçi
                            </div>
                        </div>
                    </div>
                    <button onclick="toggleAIChat()" class="text-white/80 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Chat Messages -->
                <div id="chatMessages" class="h-80 overflow-y-auto p-4 bg-slate-50">
                    <!-- Welcome Message -->
                    <div class="flex items-start mb-4">
                        <div class="w-8 h-8 bg-purple-600 sharp-corner flex items-center justify-center mr-3 mt-1">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="bg-white p-3 minimal-corner shadow-sm max-w-xs">
                            <div class="text-sm text-slate-800">
                                Merhaba! Ben Garantor360 yapay zeka asistanıyım. 🤖
                                <br><br>
                                Size nasıl yardımcı olabilirim? Hizmet kategorileri, fiyatlar veya süreçler hakkında sorularınızı yanıtlayabilirim.
                            </div>
                            <div class="text-xs text-slate-500 mt-2">Az önce</div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="mb-4">
                        <div class="text-xs text-slate-500 mb-2 text-center">Hızlı Sorular:</div>
                        <div class="flex flex-wrap gap-2">
                            <button onclick="sendQuickMessage('Televizyon tamiri ne kadar sürer?')" 
                                    class="bg-blue-100 text-blue-700 px-3 py-1 sharp-corner text-xs hover:bg-blue-200 transition duration-200">
                                TV tamiri süresi?
                            </button>
                            <button onclick="sendQuickMessage('Fiyatlar nasıl belirleniyor?')" 
                                    class="bg-blue-100 text-blue-700 px-3 py-1 sharp-corner text-xs hover:bg-blue-200 transition duration-200">
                                Fiyat hesaplama?
                            </button>
                            <button onclick="sendQuickMessage('Ödeme nasıl yapılıyor?')" 
                                    class="bg-blue-100 text-blue-700 px-3 py-1 sharp-corner text-xs hover:bg-blue-200 transition duration-200">
                                Ödeme sistemi?
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Chat Input -->
                <div class="border-t border-slate-200 p-4">
                    <form id="chatForm" class="flex space-x-2">
                        <input type="text" id="chatInput" 
                               placeholder="Mesajınızı yazın..." 
                               class="flex-1 p-2 border border-slate-300 sharp-corner text-sm focus:border-blue-500 focus:outline-none">
                        <button type="submit" 
                                class="bg-blue-600 text-white px-4 py-2 sharp-corner hover:bg-blue-700 transition duration-200">
                            <i class="fas fa-paper-plane text-sm"></i>
                        </button>
                    </form>
                    <div class="text-xs text-slate-500 mt-2 text-center">
                        <i class="fas fa-shield-alt mr-1"></i>
                        Yapay zeka destekli güvenli sohbet
                    </div>
                </div>
            </div>
        </div>

        <!-- AI Chat Float Button (when chat closed) -->
        <div id="aiChatButton" class="fixed bottom-6 right-6 z-40">
            <button onclick="toggleAIChat()" 
                    class="bg-gradient-to-br from-purple-600 to-blue-600 text-white w-16 h-16 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 group">
                <i class="fas fa-robot text-xl group-hover:animate-pulse"></i>
                <div class="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
            </button>
        </div>

        <!-- Minimalist Mobile App Section for Customers -->
        <section class="py-16 bg-gradient-to-r from-blue-50 to-slate-50">
            <div class="max-w-6xl mx-auto px-6">
                <div class="bg-white minimal-corner border-2 border-blue-200 overflow-hidden shadow-xl">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-0">
                        <!-- Left: App Info (Minimalist) -->
                        <div class="lg:col-span-2 p-8">
                            <div class="mb-6">
                                <div class="flex items-center mb-1">
                                    <span class="text-2xl font-bold text-blue-900">Garantor</span>
                                    <span class="text-2xl font-bold text-amber-500">360°</span>
                                </div>
                                <p class="text-slate-600 font-medium">Müşteri Mobil Uygulaması</p>
                            </div>
                            
                            <h3 class="text-2xl font-bold text-slate-800 mb-4">
                                HİZMET TAKİBİNİ CEBİNİZDEN YAPIN
                            </h3>
                            
                            <p class="text-slate-600 mb-6 leading-relaxed">
                                Mobil uygulamamızla hizmet talebinizi kolayca oluşturun, uzman ustalarla iletişim kurun 
                                ve işin ilerleyişini anlık takip edin.
                            </p>

                            <!-- Minimal Features -->
                            <div class="grid grid-cols-2 gap-3 mb-6">
                                <div class="flex items-center">
                                    <i class="fas fa-bell text-amber-500 mr-3"></i>
                                    <span class="text-slate-700 text-sm">Anlık Bildirimler</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-map-marker-alt text-amber-500 mr-3"></i>
                                    <span class="text-slate-700 text-sm">Konum Takibi</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-credit-card text-amber-500 mr-3"></i>
                                    <span class="text-slate-700 text-sm">Güvenli Ödeme</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-star text-amber-500 mr-3"></i>
                                    <span class="text-slate-700 text-sm">Usta Değerlendirme</span>
                                </div>
                            </div>

                            <!-- Web App Access Buttons -->
                            <div class="flex flex-row gap-3 justify-start items-start">
                                <!-- Web Uygulaması Butonu -->
                                <a href="#hizmet-al" class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                    <i class="fas fa-globe text-sm"></i>
                                    <div>
                                        <div class="text-sm font-bold">WEB UYGULAMASI</div>
                                        <div class="text-xs opacity-90">Hemen Başla</div>
                                    </div>
                                </a>
                                
                                <!-- PWA Kurulum Rehberi -->
                                <button onclick="showPWAGuide()" class="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                    <i class="fas fa-mobile-alt text-sm"></i>
                                    <div>
                                        <div class="text-sm font-bold">ANA EKRANA EKLE</div>
                                        <div class="text-xs opacity-90">Nasıl Yapılır?</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <!-- Right: Phone Mockup (Minimal) -->
                        <div class="p-8 bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
                            <div class="relative">
                                <!-- Phone Frame -->
                                <div class="w-52 h-96 bg-gray-900 rounded-3xl p-2 shadow-2xl">
                                    <div class="w-full h-full bg-white rounded-2xl overflow-hidden relative">
                                        <!-- Status Bar -->
                                        <div class="bg-blue-900 text-white text-xs p-2 flex justify-between items-center">
                                            <span class="font-medium">Garantor360</span>
                                            <span>•••</span>
                                        </div>
                                        
                                        <!-- App Content -->
                                        <div class="p-3">
                                            <div class="text-center mb-3">
                                                <div class="w-12 h-12 bg-amber-400 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                                    <i class="fas fa-tools text-white"></i>
                                                </div>
                                                <h6 class="font-bold text-gray-900 text-sm">TV Tamiri</h6>
                                                <p class="text-gray-600 text-xs">İstanbul, Kadıköy</p>
                                            </div>
                                            
                                            <!-- Status -->
                                            <div class="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                                                <div class="flex items-center">
                                                    <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                                    <span class="text-green-700 text-xs font-medium">Usta yolda</span>
                                                </div>
                                                <p class="text-green-600 text-xs mt-1">Tahmini varış: 15 dk</p>
                                            </div>
                                            
                                            <!-- Actions -->
                                            <div class="space-y-2">
                                                <button class="w-full bg-blue-900 text-white py-2 rounded text-xs font-medium">
                                                    Ustayı Ara
                                                </button>
                                                <button class="w-full border border-gray-300 text-gray-700 py-2 rounded text-xs">
                                                    Mesaj Gönder
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Enhanced Footer -->
        <footer class="bg-blue-900 text-white" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);">
            <!-- Main Footer Content -->
            <div class="py-16">
                <div class="max-w-7xl mx-auto px-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                        <!-- Company Info -->
                        <div class="lg:col-span-1">
                            <div class="mb-6">
                                <div class="flex items-center">
                                    <span class="text-4xl font-bold text-white">Garantor</span>
                                    <span class="text-4xl font-bold text-amber-400">360°</span>
                                </div>
                            </div>
                            <p class="text-blue-200 font-medium mb-6 leading-relaxed">
                                Türkiye'nin ilk tam güvenceli hizmet platformu. Müşteri odaklı yaklaşımla 
                                güvenli hizmet alma deneyimi sunan dijital ekosistem.
                            </p>
                            
                            <!-- Trust Indicators -->
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="text-center">
                                    <div class="text-amber-400 font-bold text-2xl">1,247</div>
                                    <div class="text-blue-300 text-xs">Aktif Uzman</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-amber-400 font-bold text-2xl">98.7%</div>
                                    <div class="text-blue-300 text-xs">Memnuniyet</div>
                                </div>
                            </div>

                            <!-- Certifications -->
                            <div class="flex flex-wrap gap-2">
                                <div class="bg-blue-800 px-3 py-1 sharp-corner">
                                    <span class="text-xs font-bold text-amber-400">ISO 9001</span>
                                </div>
                                <div class="bg-blue-800 px-3 py-1 sharp-corner">
                                    <span class="text-xs font-bold text-amber-400">6 AY GARANTİ</span>
                                </div>
                                <div class="bg-blue-800 px-3 py-1 sharp-corner">
                                    <span class="text-xs font-bold text-amber-400">7/24 DESTEK</span>
                                </div>
                            </div>
                        </div>

                        <!-- Service Categories -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">HİZMET ALANLARI</h4>
                            <ul class="space-y-3">
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-tools mr-2 text-amber-500 text-sm"></i>Teknik Onarım
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-home mr-2 text-amber-500 text-sm"></i>Ev Bakım & Tadilat
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-broom mr-2 text-amber-500 text-sm"></i>Temizlik & Hijyen
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-wrench mr-2 text-amber-500 text-sm"></i>Kombi & Klima
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-paint-roller mr-2 text-amber-500 text-sm"></i>Boyama & Badana
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-bolt mr-2 text-amber-500 text-sm"></i>Elektrik İşleri
                                </a></li>
                            </ul>
                        </div>

                        <!-- Customer Resources -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">MÜŞTERİ KAYNAKLARI</h4>
                            <ul class="space-y-3">
                                <li><a href="#hizmet-al" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-search mr-2 text-amber-500 text-sm"></i>Hizmet Talebi
                                </a></li>
                                <li><a href="/bayi" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-user-tie mr-2 text-amber-500 text-sm"></i>Hizmet Veren Ol
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-shield-alt mr-2 text-amber-500 text-sm"></i>Güvence Sistemi
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-calculator mr-2 text-amber-500 text-sm"></i>Fiyat Hesaplama
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-question-circle mr-2 text-amber-500 text-sm"></i>SSS
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-book mr-2 text-amber-500 text-sm"></i>Müşteri Rehberi
                                </a></li>
                            </ul>
                        </div>

                        <!-- Contact & Support -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">İLETİŞİM & DESTEK</h4>
                            
                            <!-- Contact Methods -->
                            <div class="space-y-4 mb-6">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-phone text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <a href="tel:+905001234567" class="text-white font-medium hover:text-amber-400 transition duration-200">0 500 123 45 67</a>
                                        <p class="text-blue-300 text-xs">Müşteri Destek Hattı</p>
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-envelope text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <a href="mailto:destek@garantor360.com" class="text-white font-medium hover:text-amber-400 transition duration-200">destek@garantor360.com</a>
                                        <p class="text-blue-300 text-xs">Müşteri İletişim</p>
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-comments text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <span class="text-white font-medium">Canlı Destek</span>
                                        <p class="text-blue-300 text-xs">7/24 Aktif</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Working Hours -->
                            <div class="mb-6">
                                <h5 class="font-bold text-sm mb-3 text-amber-400 flex items-center">
                                    <i class="fas fa-clock mr-2"></i>ÇALIŞMA SAATLERİ
                                </h5>
                                <div class="text-blue-200 text-sm space-y-1">
                                    <div class="flex justify-between">
                                        <span>Pazartesi - Cuma:</span>
                                        <span class="text-white">08:00 - 18:00</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Cumartesi:</span>
                                        <span class="text-white">09:00 - 17:00</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-amber-400 font-medium">Acil Destek:</span>
                                        <span class="text-amber-400 font-bold">7/24</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Social Media -->
                            <div>
                                <h5 class="font-bold text-sm mb-3 text-amber-400">SOSYAL MEDYA</h5>
                                <div class="flex space-x-2">
                                    <!-- Facebook - Brand Blue -->
                                    <a href="#" class="w-9 h-9 bg-[#1877f2] rounded-lg flex items-center justify-center text-white hover:bg-[#166fe5] hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg">
                                        <i class="fab fa-facebook-f text-sm"></i>
                                    </a>
                                    <!-- Twitter/X - Brand Blue -->
                                    <a href="#" class="w-9 h-9 bg-[#1d9bf0] rounded-lg flex items-center justify-center text-white hover:bg-[#1a8cd8] hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg">
                                        <i class="fab fa-twitter text-sm"></i>
                                    </a>
                                    <!-- Instagram - Gradient Pink/Orange -->
                                    <a href="#" class="w-9 h-9 bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] rounded-lg flex items-center justify-center text-white hover:from-[#7530a1] hover:via-[#e41a1a] hover:to-[#e39e3e] hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg">
                                        <i class="fab fa-instagram text-sm"></i>
                                    </a>
                                    <!-- LinkedIn - Brand Blue -->
                                    <a href="#" class="w-9 h-9 bg-[#0077b5] rounded-lg flex items-center justify-center text-white hover:bg-[#006ba1] hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg">
                                        <i class="fab fa-linkedin text-sm"></i>
                                    </a>
                                    <!-- YouTube - Brand Red -->
                                    <a href="#" class="w-9 h-9 bg-[#ff0000] rounded-lg flex items-center justify-center text-white hover:bg-[#e60000] hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg">
                                        <i class="fab fa-youtube text-sm"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Action Bar -->
            <div class="bg-amber-500 py-4">
                <div class="max-w-7xl mx-auto px-6">
                    <div class="flex flex-col lg:flex-row items-center justify-between">
                        <div class="flex items-center mb-4 lg:mb-0">
                            <i class="fas fa-search text-blue-900 text-xl mr-3"></i>
                            <div>
                                <h5 class="text-blue-900 font-bold">HEMEN HİZMET ALIN</h5>
                                <p class="text-blue-800 text-sm">Güvenli ödeme, 6 ay garanti</p>
                            </div>
                        </div>
                        <div class="flex space-x-4">
                            <button onclick="scrollToServices()" class="bg-blue-900 text-white px-6 py-3 sharp-corner font-bold hover:bg-blue-800 transition duration-200">
                                HİZMET AL
                            </button>
                            <a href="tel:+905001234567" class="border-2 border-blue-900 text-blue-900 px-6 py-3 sharp-corner font-bold hover:bg-blue-900 hover:text-white transition duration-200">
                                ARA
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Footer -->
            <div class="bg-blue-950 py-6">
                <div class="max-w-7xl mx-auto px-6">
                    <div class="flex flex-col lg:flex-row justify-between items-center">
                        <!-- Copyright -->
                        <div class="text-blue-300 text-sm mb-4 lg:mb-0">
                            &copy; 2024 Garantor360. Tüm hakları saklıdır. | Güvenli Hizmet Platformu
                        </div>

                        <!-- WhatsApp Support Info -->
                        <div class="text-center mb-4 lg:mb-0">
                            <div class="flex items-center justify-center space-x-4 text-sm">
                                <a href="https://wa.me/905001234567?text=Merhaba%20Garantor360%21%20Hizmet%20durumumu%20%C3%B6%C4%9Frenmek%20istiyorum." 
                                   target="_blank"
                                   class="flex items-center text-green-400 hover:text-green-300 transition duration-200 font-medium">
                                    <i class="fab fa-whatsapp mr-2"></i>
                                    WhatsApp Takip
                                </a>
                                <span class="text-blue-400">•</span>
                                <a href="#" class="text-blue-300 hover:text-amber-400 transition duration-200">Gizlilik</a>
                                <span class="text-blue-400">•</span>
                                <a href="/bayi" class="text-amber-400 hover:text-amber-300 font-medium transition duration-200">Bayi Ol</a>
                            </div>
                            <p class="text-blue-400 text-xs mt-1">
                                <i class="fas fa-clock mr-1"></i>
                                WhatsApp üzerinden 7/24 hizmet takibi
                            </p>
                        </div>

                        <!-- Security Badges -->
                        <div class="flex items-center space-x-3">
                            <span class="text-blue-400 text-xs">Güvenli Platform</span>
                            <div class="flex space-x-2">
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">SSL</div>
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">256BIT</div>
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">GÜVEN</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>



        <script>
        // Hero Image Slider System
        let currentHeroSlide = 0;
        let heroSlideInterval;
        
        function initHeroSlider() {
            // Start auto-slide
            heroSlideInterval = setInterval(nextHeroSlide, 3000); // 3 seconds
            
            // Add CSS for active dots
            const style = document.createElement('style');
            style.textContent = '.hero-dot.active { background: white !important; } ' +
                               '.hero-slide.active { opacity: 1 !important; } ' +
                               '.mobile-hero-slide.active { opacity: 1 !important; }';
            document.head.appendChild(style);
        }
        
        function nextHeroSlide() {
            const totalSlides = 4;
            currentHeroSlide = (currentHeroSlide + 1) % totalSlides;
            showHeroSlide(currentHeroSlide);
        }
        
        function setHeroSlide(index) {
            currentHeroSlide = index;
            showHeroSlide(currentHeroSlide);
            
            // Reset auto-slide timer
            clearInterval(heroSlideInterval);
            heroSlideInterval = setInterval(nextHeroSlide, 3000);
        }
        
        // Make setHeroSlide globally accessible
        window.setHeroSlide = setHeroSlide;
        
        function showHeroSlide(index) {
            // Desktop slider
            const desktopSlides = document.querySelectorAll('.hero-slide');
            const desktopDots = document.querySelectorAll('.hero-dot');
            
            desktopSlides.forEach((slide, i) => {
                if (i === index) {
                    slide.classList.add('active');
                    slide.style.opacity = '1';
                } else {
                    slide.classList.remove('active');
                    slide.style.opacity = '0';
                }
            });
            
            desktopDots.forEach((dot, i) => {
                if (i === index) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
            
            // Mobile slider
            const mobileSlides = document.querySelectorAll('.mobile-hero-slide');
            mobileSlides.forEach((slide, i) => {
                if (i === index) {
                    slide.classList.add('active');
                    slide.style.opacity = '1';
                } else {
                    slide.classList.remove('active');
                    slide.style.opacity = '0';
                }
            });
        }

        // Customer page scroll functions
        function scrollToStats() {
            document.getElementById('stats').scrollIntoView({ behavior: 'smooth' });
        }
        
        function scrollToServices() {
            const servicesSection = document.querySelector('section:has(h2:contains("HİZMET KATEGORİLERİ"))') || 
                                  document.querySelector('[id*="service"]');
            if (servicesSection) {
                servicesSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        function scrollToGuarantee() {
            const guaranteeSection = document.querySelector('section:has(h2:contains("MÜŞTERİ GÜVENCELERİ"))');
            if (guaranteeSection) {
                guaranteeSection.scrollIntoView({ behavior: 'smooth' });
            }
        }

        // Service Request Form Handling
        async function handleServiceRequest(event) {
            event.preventDefault();
            
            const form = document.getElementById('serviceRequestForm');
            const submitButton = form.querySelector('button[type="submit"]');
            const messagesContainer = document.getElementById('formMessages');
            const successMessage = document.getElementById('successMessage');
            const errorMessage = document.getElementById('errorMessage');
            
            // Hide previous messages
            successMessage.classList.add('hidden');
            errorMessage.classList.add('hidden');
            messagesContainer.classList.add('hidden');
            
            // Show loading state
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>GÖNDERİLİYOR...';
            submitButton.disabled = true;
            
            try {
                // Collect form data
                const formData = {
                    customerName: document.getElementById('customerName').value.trim(),
                    customerPhone: document.getElementById('customerPhone').value.trim(),
                    customerCity: document.getElementById('customerCity').value,
                    customerDistrict: document.getElementById('customerDistrict').value.trim(),
                    serviceCategory: document.getElementById('serviceCategory').value,
                    problemDescription: document.getElementById('problemDescription').value.trim(),
                    urgency: document.querySelector('input[name="urgency"]:checked')?.value || 'normal'
                };
                
                // Get contact preferences
                const contactPreferences = [];
                document.querySelectorAll('input[name="contactPreference"]:checked').forEach(input => {
                    contactPreferences.push(input.value);
                });
                formData.contactPreference = contactPreferences;
                
                // Client-side validation
                if (!formData.customerName || !formData.customerPhone || !formData.serviceCategory || !formData.problemDescription) {
                    throw new Error('Lütfen gerekli alanları doldurun');
                }
                
                // Phone validation (basic)
                const phoneRegex = /^[0-9\s\+\(\)\-]{10,}$/;
                if (!phoneRegex.test(formData.customerPhone)) {
                    throw new Error('Lütfen geçerli bir telefon numarası girin');
                }
                
                // Send to API
                const response = await fetch('/api/service-request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Show success message
                    successMessage.innerHTML = \`
                        <i class="fas fa-check-circle mr-2"></i>
                        <strong>Başarılı!</strong> Talebiniz alındı. Talep kodu: \${result.requestCode}
                        <br><small class="block mt-2">En kısa sürede size dönüş yapılacak.</small>
                    \`;
                    successMessage.classList.remove('hidden');
                    messagesContainer.classList.remove('hidden');
                    
                    // Reset form
                    form.reset();
                    
                    // Auto-scroll to success message
                    setTimeout(() => {
                        messagesContainer.scrollIntoView({ behavior: 'smooth' });
                    }, 500);
                    
                } else {
                    throw new Error(result.error || 'Talep gönderilirken hata oluştu');
                }
                
            } catch (error) {
                console.error('Form submission error:', error);
                errorMessage.innerHTML = \`
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    <strong>Hata!</strong> \${error.message}
                \`;
                errorMessage.classList.remove('hidden');
                messagesContainer.classList.remove('hidden');
            } finally {
                // Reset button state
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }
        }

        // Phone number formatting
        function formatPhoneNumber(input) {
            let value = input.value.replace(/\D/g, '');
            if (value.startsWith('90')) {
                value = value.substring(2);
            }
            if (value.startsWith('0')) {
                value = value.substring(1);
            }
            
            // Format as 0 5xx xxx xx xx
            if (value.length >= 10) {
                const formatted = \`0 \${value.substring(0, 3)} \${value.substring(3, 6)} \${value.substring(6, 8)} \${value.substring(8, 10)}\`;
                input.value = formatted;
            } else if (value.length > 0) {
                input.value = '0 ' + value;
            }
        }

        // Initialize form handling when page loads
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize Hero Slider
            initHeroSlider();
            const form = document.getElementById('serviceRequestForm');
            if (form) {
                form.addEventListener('submit', handleServiceRequest);
                
                // Phone number formatting
                const phoneInput = document.getElementById('customerPhone');
                if (phoneInput) {
                    phoneInput.addEventListener('input', function() {
                        formatPhoneNumber(this);
                    });
                }
            }
            
            // AI Chat form handling
            const chatForm = document.getElementById('chatForm');
            if (chatForm) {
                chatForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    sendAIMessage();
                });
            }
            
            // AI Chat input enter key
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendAIMessage();
                    }
                });
            }
        });

        // Simulated real-time data updates
        function updateStats() {
            // Daily jobs counter
            const dailyJobsEl = document.getElementById('daily-jobs');
            if (dailyJobsEl) {
                const current = parseInt(dailyJobsEl.textContent) || 127;
                const newValue = current + Math.floor(Math.random() * 3);
                dailyJobsEl.textContent = newValue;
            }

            // Daily earnings
            const earningsEl = document.getElementById('daily-earnings');
            if (earningsEl) {
                const current = parseInt(earningsEl.textContent.replace(',', '')) || 34520;
                const newValue = current + Math.floor(Math.random() * 500) + 100;
                earningsEl.textContent = newValue.toLocaleString('tr-TR');
            }

            // Active dealers
            const dealersEl = document.getElementById('active-dealers');
            if (dealersEl) {
                const current = parseInt(dealersEl.textContent) || 412;
                const change = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
                dealersEl.textContent = current + change;
            }

            // Average price
            const avgPriceEl = document.getElementById('avg-price');
            if (avgPriceEl) {
                const prices = [245, 267, 289, 234, 312, 198, 356, 276, 234, 287];
                avgPriceEl.textContent = prices[Math.floor(Math.random() * prices.length)];
            }
        }

        // Enhanced customer request feed simulation
        function addJobToFeed() {
            const feed = document.getElementById('job-feed');
            if (!feed) return;

            const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Gaziantep', 'Konya', 'Kayseri', 'Mersin'];
            const districts = ['Kadıköy', 'Beşiktaş', 'Çankaya', 'Nilüfer', 'Muratpaşa', 'Seyhan', 'Şehitkamil', 'Selçuklu', 'Melikgazi', 'Yenişehir'];
            const requests = [
                { category: 'Televizyon Tamiri', description: 'Ekran yanmıyor, ses geliyor', priority: 'NORMAL', urgent: false },
                { category: 'Çamaşır Makinesi', description: 'Su almıyor, çalışmıyor', priority: 'ACIL', urgent: true },
                { category: 'Bulaşık Makinesi', description: 'Suyu boşaltmıyor', priority: 'NORMAL', urgent: false },
                { category: 'Klima Servisi', description: 'Soğutmuyor, gürültü var', priority: 'ACİL', urgent: true },
                { category: 'Bilgisayar Tamiri', description: 'Açılmıyor, fan sesi var', priority: 'NORMAL', urgent: false },
                { category: 'Kombi Servisi', description: 'Sıcak su vermiyor', priority: 'YÜKSEK', urgent: true },
                { category: 'Buzdolabı Tamiri', description: 'Dondurucu bölümü çalışmıyor', priority: 'NORMAL', urgent: false },
                { category: 'Fırın Tamiri', description: 'Isınmıyor, termostat sorunu', priority: 'NORMAL', urgent: false }
            ];

            const customerNames = ['Ahmet Y.', 'Zeynep K.', 'Mehmet S.', 'Fatma D.', 'Ali R.', 'Ayşe T.', 'Mustafa G.', 'Elif B.'];

            const city = cities[Math.floor(Math.random() * cities.length)];
            const district = districts[Math.floor(Math.random() * districts.length)];
            const request = requests[Math.floor(Math.random() * requests.length)];
            const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
            const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const requestId = 'T' + Math.floor(Math.random() * 9000 + 1000);

            const priorityColor = request.priority === 'ACİL' ? 'bg-red-600' : 
                                request.priority === 'YÜKSEK' ? 'bg-orange-600' : 'bg-slate-600';

            const requestElement = document.createElement('div');
            requestElement.className = \`bg-white border border-slate-200 minimal-corner p-4 hover:border-orange-600 transition-all duration-200 \${request.urgent ? 'border-l-4 border-l-red-500' : ''}\`;
            requestElement.innerHTML = \`
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="flex flex-col">
                            <div class="flex items-center space-x-2">
                                <span class="\${priorityColor} text-white px-2 py-1 sharp-corner text-xs font-bold">\${request.priority}</span>
                                <span class="text-slate-500 text-xs font-medium">#\${requestId}</span>
                                \${request.urgent ? '<span class="text-red-600 text-xs font-bold pulse-dot">ACİL</span>' : ''}
                            </div>
                            <div class="mt-1">
                                <span class="text-slate-800 font-bold text-sm">\${request.category}</span>
                                <span class="text-slate-600 text-sm ml-2">• \${customerName}</span>
                            </div>
                            <div class="text-slate-600 text-xs mt-1">
                                \${request.description}
                            </div>
                            <div class="text-slate-500 text-xs mt-1">
                                \${city} / \${district} • \${time}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-green-600 font-bold text-sm">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="text-slate-500 text-xs">Uzman Aranıyor</div>
                    </div>
                </div>
            \`;

            // Add slide-in animation
            requestElement.style.opacity = '0';
            requestElement.style.transform = 'translateX(-20px)';
            
            feed.insertBefore(requestElement, feed.firstChild);

            // Animate in
            setTimeout(() => {
                requestElement.style.opacity = '1';
                requestElement.style.transform = 'translateX(0)';
                requestElement.style.transition = 'all 0.3s ease-out';
            }, 50);

            // Keep only last 12 requests
            while (feed.children.length > 12) {
                feed.removeChild(feed.lastChild);
            }

            // Update recent count
            const recentCountEl = document.getElementById('recent-count');
            if (recentCountEl) {
                const currentCount = parseInt(recentCountEl.textContent) || 8;
                const newCount = Math.min(currentCount + 1, 15);
                recentCountEl.textContent = newCount + ' Talep';
            }
        }

        // Smart compact city service display with hover effects
        function populateCityOpportunities() {
            const container = document.getElementById('city-opportunities');
            if (!container) return;

            // Top 6 cities for main display - others will be in modal
            const cities = [
                // Top 6 Major Cities Only
                { name: 'İstanbul', price: '₺280-450', time: '2-4h', rating: '4.8', requests: 127, popular: 'TV•Klima•Elektrik', tier: 'major' },
                { name: 'Ankara', price: '₺240-380', time: '1-3h', rating: '4.7', requests: 89, popular: 'Kombi•PC•Su Tesisatı', tier: 'major' },
                { name: 'İzmir', price: '₺250-400', time: '2-4h', rating: '4.9', requests: 76, popular: 'Çamaşır•Klima•Temizlik', tier: 'major' },
                { name: 'Bursa', price: '₺220-350', time: '1-2h', rating: '4.8', requests: 64, popular: 'Bulaşık•Elektrik•Boyama', tier: 'regional' },
                { name: 'Antalya', price: '₺260-420', time: '2-3h', rating: '4.6', requests: 58, popular: 'Klima•TV•Su Tesisatı', tier: 'regional' },
                { name: 'Adana', price: '₺210-340', time: '1-3h', rating: '4.7', requests: 45, popular: 'Kombi•Çamaşır•Elektrik', tier: 'regional' }
            ];

            cities.forEach(city => {
                const cityCard = document.createElement('div');
                
                // Tier-based styling
                const tierColors = {
                    major: 'border-blue-300 hover:border-blue-500 hover:shadow-lg',
                    regional: 'border-orange-300 hover:border-orange-500 hover:shadow-md', 
                    emerging: 'border-green-300 hover:border-green-500 hover:shadow-md',
                    secondary: 'border-slate-300 hover:border-slate-500 hover:shadow-sm'
                };
                
                cityCard.className = \`bg-white border-2 \${tierColors[city.tier]} minimal-corner p-3 cursor-pointer group transition-all duration-300 hover:scale-105 relative overflow-hidden\`;
                
                cityCard.innerHTML = \`
                    <!-- Main Content (Always Visible) -->
                    <div class="relative z-10">
                        <!-- Header -->
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center space-x-2">
                                <div class="w-5 h-5 bg-blue-900 sharp-corner flex items-center justify-center group-hover:bg-orange-600 transition-colors duration-300">
                                    <i class="fas fa-map-marker-alt text-white text-xs"></i>
                                </div>
                                <h3 class="font-bold text-slate-800 text-sm truncate">\${city.name}</h3>
                            </div>
                            <div class="flex items-center space-x-1 text-amber-500">
                                <i class="fas fa-star text-xs"></i>
                                <span class="text-slate-700 text-xs font-medium">\${city.rating}</span>
                            </div>
                        </div>
                        
                        <!-- Price & Time Grid -->
                        <div class="grid grid-cols-2 gap-1 mb-2 text-xs">
                            <div class="bg-slate-50 p-1.5 sharp-corner text-center">
                                <div class="text-slate-500 font-medium text-xs">Fiyat</div>
                                <div class="text-orange-600 font-bold text-xs">\${city.price}</div>
                            </div>
                            <div class="bg-slate-50 p-1.5 sharp-corner text-center">
                                <div class="text-slate-500 font-medium text-xs">Süre</div>
                                <div class="text-green-600 font-bold text-xs">\${city.time}</div>
                            </div>
                        </div>

                        <!-- Quick Info -->
                        <div class="text-slate-400 text-xs text-center">
                            \${city.requests} günlük talep
                        </div>
                    </div>

                    <!-- Hover Overlay (Hidden by default) -->
                    <div class="absolute inset-0 bg-white bg-opacity-95 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col justify-center">
                        <div class="text-center">
                            <h4 class="font-bold text-slate-800 text-sm mb-2">\${city.name}</h4>
                            <div class="border-t border-slate-200 pt-2 mb-2">
                                <div class="text-slate-600 text-xs font-medium mb-1">Popüler Hizmetler:</div>
                                <div class="text-slate-700 text-xs leading-tight font-medium">\${city.popular}</div>
                            </div>
                            <div class="flex justify-between text-xs mb-2">
                                <span class="text-slate-600">Fiyat:</span>
                                <span class="font-bold text-orange-600">\${city.price}</span>
                            </div>
                            <div class="flex justify-between text-xs mb-3">
                                <span class="text-slate-600">Yanıt:</span>
                                <span class="font-bold text-green-600">\${city.time}</span>
                            </div>
                            <button onclick="scrollToServices()" class="w-full bg-orange-600 text-white py-2 sharp-corner text-xs font-bold hover:bg-orange-700 transition duration-200">
                                HİZMET AL
                            </button>
                        </div>
                    </div>
                \`;
                
                container.appendChild(cityCard);
            });
        }

        // Initialize job feed with sample data
        function initializeJobFeed() {
            // Add initial jobs with varying delays for realistic effect
            for (let i = 0; i < 8; i++) {
                setTimeout(() => addJobToFeed(), i * 800);
            }
        }

        // Update live statistics
        function updateLiveStats() {
            // Update hourly total
            const hourlyEl = document.getElementById('hourly-total');
            if (hourlyEl) {
                const current = parseInt(hourlyEl.textContent) || 47;
                const change = Math.floor(Math.random() * 3);
                hourlyEl.textContent = (current + change) + ' Talep';
            }

            // Simulate chart updates (bars animation)
            const bars = document.querySelectorAll('[style*="height"]');
            bars.forEach(bar => {
                const randomHeight = Math.floor(Math.random() * 70 + 30) + '%';
                bar.style.height = randomHeight;
            });
        }

        // Scroll to services function
        function scrollToServices() {
            const servicesSection = document.getElementById('hizmet-al');
            if (servicesSection) {
                servicesSection.scrollIntoView({ behavior: 'smooth' });
            }
        }

        function scrollToGuarantee() {
            const guaranteeSection = document.getElementById('guarantee');
            if (guaranteeSection) {
                guaranteeSection.scrollIntoView({ behavior: 'smooth' });
            }
        }

        // AI Chat Functions
        let isChatOpen = false;

        function toggleAIChat() {
            const chatWidget = document.getElementById('aiChatWidget');
            const chatButton = document.getElementById('aiChatButton');
            
            if (isChatOpen) {
                // Close chat
                chatWidget.classList.add('hidden');
                chatButton.classList.remove('hidden');
                isChatOpen = false;
            } else {
                // Open chat
                chatWidget.classList.remove('hidden');
                chatButton.classList.add('hidden');
                isChatOpen = true;
                
                // Focus on input
                setTimeout(() => {
                    const chatInput = document.getElementById('chatInput');
                    if (chatInput) chatInput.focus();
                }, 100);
            }
        }

        function sendQuickMessage(message) {
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.value = message;
                sendAIMessage();
            }
        }

        async function sendAIMessage() {
            const chatInput = document.getElementById('chatInput');
            const chatMessages = document.getElementById('chatMessages');
            const message = chatInput.value.trim();
            
            if (!message) return;
            
            // Clear input
            chatInput.value = '';
            
            // Add user message
            addChatMessage(message, 'user');
            
            // Show typing indicator
            addTypingIndicator();
            
            try {
                // Simulate AI response (you'll connect this to your AI service)
                const response = await getAIResponse(message);
                
                // Remove typing indicator
                removeTypingIndicator();
                
                // Add AI response
                addChatMessage(response, 'ai');
                
            } catch (error) {
                // Remove typing indicator
                removeTypingIndicator();
                
                // Add error message
                addChatMessage('Üzgünüm, şu anda bir teknik sorun yaşıyorum. Lütfen daha sonra tekrar deneyin veya telefon ile iletişime geçin.', 'ai');
            }
        }

        function addChatMessage(message, sender) {
            const chatMessages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            const timestamp = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            
            if (sender === 'user') {
                messageDiv.innerHTML = \`
                    <div class="flex items-start mb-4 justify-end">
                        <div class="bg-blue-600 text-white p-3 minimal-corner max-w-xs mr-3">
                            <div class="text-sm">\${message}</div>
                            <div class="text-xs opacity-80 mt-2">\${timestamp}</div>
                        </div>
                        <div class="w-8 h-8 bg-blue-600 sharp-corner flex items-center justify-center mt-1">
                            <i class="fas fa-user text-white text-sm"></i>
                        </div>
                    </div>
                \`;
            } else {
                messageDiv.innerHTML = \`
                    <div class="flex items-start mb-4">
                        <div class="w-8 h-8 bg-purple-600 sharp-corner flex items-center justify-center mr-3 mt-1">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="bg-white p-3 minimal-corner shadow-sm max-w-xs">
                            <div class="text-sm text-slate-800">\${message}</div>
                            <div class="text-xs text-slate-500 mt-2">\${timestamp}</div>
                        </div>
                    </div>
                \`;
            }
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function addTypingIndicator() {
            const chatMessages = document.getElementById('chatMessages');
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typingIndicator';
            typingDiv.innerHTML = \`
                <div class="flex items-start mb-4">
                    <div class="w-8 h-8 bg-purple-600 sharp-corner flex items-center justify-center mr-3 mt-1">
                        <i class="fas fa-robot text-white text-sm"></i>
                    </div>
                    <div class="bg-white p-3 minimal-corner shadow-sm">
                        <div class="flex space-x-1">
                            <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.1s;"></div>
                            <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
                        </div>
                    </div>
                </div>
            \`;
            
            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function removeTypingIndicator() {
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        // AI Response Generator - API Integration
        async function getAIResponse(message) {
            try {
                const response = await fetch('/api/ai-chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message,
                        sessionId: 'web_session_' + Date.now()
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    return data.response;
                } else {
                    throw new Error(data.error || 'API hatası');
                }
                
            } catch (error) {
                console.error('AI API error:', error);
                throw error;
            }
        }

        // =============================================================================
        // AI-POWERED SMART RECOMMENDATION ENGINE
        // =============================================================================

        // Service categories with their keywords and details
        const serviceCategories = {
            'ev_elektrigi': {
                name: 'Ev Elektriği',
                icon: 'fas fa-bolt',
                color: 'yellow',
                priceRange: '₺150-800',
                keywords: ['elektrik', 'priz', 'sigorta', 'kablo', 'ampul', 'lamba', 'şalter', 'kaçak', 'kesinti', 'voltaj'],
                description: 'Elektrik tesisatı, priz takma, sigorta değiştirme',
                whatsappMessage: 'Merhaba! Elektrik işi için destek istiyorum.',
                urgency: { emergency: '30dk', urgent: '1-2 saat', normal: '2-4 saat' }
            },
            'beyaz_esya': {
                name: 'Beyaz Eşya Tamiri',
                icon: 'fas fa-home',
                color: 'blue',
                priceRange: '₺200-1200',
                keywords: ['buzdolabı', 'çamaşır makinesi', 'bulaşık makinesi', 'fırın', 'ocak', 'mikrodalga', 'klima', 'soğutmuyor', 'çalışmıyor'],
                description: 'Buzdolabı, çamaşır makinesi, bulaşık makinesi tamiri',
                whatsappMessage: 'Merhaba! Beyaz eşya tamiri için yardım istiyorum.',
                urgency: { emergency: '1 saat', urgent: '2-4 saat', normal: '4-8 saat' }
            },
            'su_tesisati': {
                name: 'Su Tesisatı',
                icon: 'fas fa-tint',
                color: 'blue',
                priceRange: '₺100-600',
                keywords: ['musluk', 'tıkanıklık', 'su kaçağı', 'boru', 'sifon', 'klozet', 'rezervuar', 'damla', 'akıyor', 'tıkalı'],
                description: 'Musluk tamiri, tıkanıklık açma, su kaçağı',
                whatsappMessage: 'Merhaba! Su tesisatı sorunu için yardım istiyorum.',
                urgency: { emergency: '30dk', urgent: '1 saat', normal: '2-3 saat' }
            },
            'kombi_kalorifer': {
                name: 'Kombi & Kalorifer',
                icon: 'fas fa-fire',
                color: 'orange',
                priceRange: '₺200-800',
                keywords: ['kombi', 'kalorifer', 'radyatör', 'ısınmıyor', 'sıcak su', 'doğalgaz', 'petek', 'termostat'],
                description: 'Kombi tamiri, kalorifer bakımı, termostat ayarı',
                whatsappMessage: 'Merhaba! Kombi/kalorifer sorunu için destek istiyorum.',
                urgency: { emergency: '1 saat', urgent: '2-3 saat', normal: '4-6 saat' }
            },
            'elektronik': {
                name: 'Elektronik Tamiri',
                icon: 'fas fa-tv',
                color: 'purple',
                priceRange: '₺150-1000',
                keywords: ['televizyon', 'tv', 'bilgisayar', 'pc', 'laptop', 'tablet', 'ses sistemi', 'görüntü yok', 'açılmıyor'],
                description: 'TV tamiri, bilgisayar tamiri, ses sistemi',
                whatsappMessage: 'Merhaba! Elektronik cihaz tamiri için yardım istiyorum.',
                urgency: { emergency: '2 saat', urgent: '4-6 saat', normal: '1-2 gün' }
            },
            'temizlik': {
                name: 'Temizlik Hizmetleri',
                icon: 'fas fa-broom',
                color: 'green',
                priceRange: '₺120-500',
                keywords: ['temizlik', 'ev temizliği', 'ofis temizliği', 'derin temizlik', 'cam silme', 'halı yıkama'],
                description: 'Ev temizliği, ofis temizliği, derin temizlik',
                whatsappMessage: 'Merhaba! Temizlik hizmeti için randevu istiyorum.',
                urgency: { emergency: '3 saat', urgent: '6-8 saat', normal: '1-2 gün' }
            },
            'boyama': {
                name: 'Boyama & Badana',
                icon: 'fas fa-paint-roller',
                color: 'indigo',
                priceRange: '₺300-1500',
                keywords: ['boya', 'badana', 'duvar boyama', 'iç boyama', 'dış boyama', 'alçıpan', 'macun'],
                description: 'Duvar boyama, badana, alçıpan işleri',
                whatsappMessage: 'Merhaba! Boyama işi için teklif istiyorum.',
                urgency: { emergency: '1-2 gün', urgent: '2-3 gün', normal: '3-5 gün' }
            },
            'kapi_pencere': {
                name: 'Kapı & Pencere',
                icon: 'fas fa-door-open',
                color: 'red',
                priceRange: '₺150-800',
                keywords: ['kapı', 'pencere', 'kilit', 'kol', 'menteşe', 'cam', 'açılmıyor', 'kapanmıyor', 'sıkışıyor'],
                description: 'Kapı tamiri, kilit değiştirme, pencere tamiri',
                whatsappMessage: 'Merhaba! Kapı/pencere tamiri için yardım istiyorum.',
                urgency: { emergency: '1 saat', urgent: '2-4 saat', normal: '4-8 saat' }
            }
        };

        // AI-powered problem analysis function
        async function analyzeWithAI() {
            const problemText = document.getElementById('problemDescription').value.trim();
            const urgencyLevel = document.getElementById('urgencyLevel').value;
            const serviceLocation = document.getElementById('serviceLocation').value;

            if (!problemText) {
                alert('Lütfen probleminizi detaylı bir şekilde anlatın.');
                return;
            }

            // Show loading state
            showAIState('loading');

            try {
                // Simulate AI analysis delay
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Analyze problem text and match to service categories
                const analysisResult = analyzeUserProblem(problemText, urgencyLevel, serviceLocation);

                // Show results
                displayAIResults(analysisResult);

            } catch (error) {
                console.error('AI Analysis error:', error);
                alert('Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.');
                showAIState('default');
            }
        }

        // Smart text analysis algorithm
        function analyzeUserProblem(problemText, urgencyLevel, serviceLocation) {
            const text = problemText.toLowerCase();
            let categoryScores = {};
            let matches = [];

            // Score each category based on keyword matches
            for (const [categoryId, category] of Object.entries(serviceCategories)) {
                let score = 0;
                let matchedKeywords = [];

                // Check keyword matches
                for (const keyword of category.keywords) {
                    if (text.includes(keyword.toLowerCase())) {
                        score += keyword.length; // Longer keywords get higher scores
                        matchedKeywords.push(keyword);
                    }
                }

                if (score > 0) {
                    categoryScores[categoryId] = {
                        category: category,
                        score: score,
                        matchedKeywords: matchedKeywords,
                        confidence: Math.min(score * 10, 95) // Convert to percentage
                    };
                }
            }

            // Sort categories by score
            const sortedCategories = Object.entries(categoryScores)
                .sort(([,a], [,b]) => b.score - a.score);

            // Get top recommendation and alternatives
            const topRecommendation = sortedCategories[0];
            const alternatives = sortedCategories.slice(1, 3);

            // Generate AI insights
            const insights = generateAIInsights(problemText, topRecommendation, urgencyLevel);

            return {
                recommendation: topRecommendation ? topRecommendation[1] : null,
                alternatives: alternatives.map(([id, data]) => ({ id, ...data })),
                insights: insights,
                urgencyLevel: urgencyLevel,
                serviceLocation: serviceLocation,
                originalText: problemText
            };
        }

        // Generate contextual insights
        function generateAIInsights(problemText, topRecommendation, urgencyLevel) {
            const insights = [];

            if (!topRecommendation) {
                insights.push({
                    type: 'warning',
                    title: 'Kategori Belirlenemedi',
                    message: 'Probleminizi daha detaylı anlatırsanız size daha iyi yardımcı olabilirim.'
                });
                return insights;
            }

            const category = topRecommendation[1].category;
            const confidence = topRecommendation[1].confidence;

            // Confidence-based insights
            if (confidence >= 80) {
                insights.push({
                    type: 'success',
                    title: 'Yüksek Eşleşme',
                    message: \`Problem tanımınız \\"\${category.name}\\" kategorisiyle %\${confidence} uyumlu.\`
                });
            } else if (confidence >= 60) {
                insights.push({
                    type: 'info',
                    title: 'Olası Eşleşme',
                    message: \`Problem tanımınız büyük ihtimalle \\"\${category.name}\\" kategorisinde.\`
                });
            }

            // Urgency-based insights
            if (urgencyLevel === 'emergency') {
                insights.push({
                    type: 'urgent',
                    title: 'Acil Durum',
                    message: \`Acil durumunuz için \${category.urgency.emergency} içinde uzman desteği sağlanabilir.\`
                });
            }

            // Price insights
            insights.push({
                type: 'price',
                title: 'Tahmini Maliyet',
                message: \`Bu kategori için ortalama hizmet bedeli \${category.priceRange} arasındadır.\`
            });

            return insights;
        }

        // Display AI analysis results
        function displayAIResults(result) {
            showAIState('results');

            const recommendedCategory = document.getElementById('recommendedCategory');
            const alternativeOptions = document.getElementById('alternativeOptions');

            if (result.recommendation) {
                const category = result.recommendation.category;
                const confidence = result.recommendation.confidence;

                recommendedCategory.innerHTML = \`
                    <div class="flex items-center mb-3">
                        <div class="w-12 h-12 bg-\${category.color}-500 minimal-corner flex items-center justify-center mr-4">
                            <i class="\${category.icon} text-white text-xl"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-white text-lg">\${category.name}</h4>
                            <p class="text-green-200 text-sm">%\${confidence} Eşleşme</p>
                        </div>
                    </div>
                    <p class="text-white text-sm mb-3">\${category.description}</p>
                    <div class="grid grid-cols-2 gap-3 text-xs">
                        <div class="bg-white/20 p-2 minimal-corner text-center">
                            <div class="text-white/80">Fiyat Aralığı</div>
                            <div class="text-white font-bold">\${category.priceRange}</div>
                        </div>
                        <div class="bg-white/20 p-2 minimal-corner text-center">
                            <div class="text-white/80">Yanıt Süresi</div>
                            <div class="text-white font-bold">\${category.urgency[result.urgencyLevel]}</div>
                        </div>
                    </div>
                \`;

                // Store recommendation for later use
                window.currentRecommendation = {
                    category: category,
                    details: result
                };
            } else {
                recommendedCategory.innerHTML = \`
                    <div class="text-center">
                        <i class="fas fa-question-circle text-white text-3xl mb-3"></i>
                        <h4 class="font-bold text-white text-lg mb-2">Kategori Belirlenemedi</h4>
                        <p class="text-white text-sm">
                            Probleminizi daha detaylı anlatırsanız size daha iyi yardımcı olabilirim.
                            Örneğin hangi cihaz, nerede, nasıl bir sorun yaşıyorsunuz?
                        </p>
                    </div>
                \`;
            }

            // Display alternatives
            if (result.alternatives && result.alternatives.length > 0) {
                alternativeOptions.innerHTML = result.alternatives.map(alt => \`
                    <div class="flex items-center justify-between p-2 bg-white/10 minimal-corner hover:bg-white/20 transition-colors duration-200 cursor-pointer"
                         onclick="selectAlternative('\${alt.id}')">
                        <div class="flex items-center">
                            <i class="\${alt.category.icon} text-blue-200 mr-2"></i>
                            <span class="text-blue-200 text-sm">\${alt.category.name}</span>
                        </div>
                        <span class="text-blue-300 text-xs">%\${alt.confidence}</span>
                    </div>
                \`).join('');
            } else {
                alternativeOptions.innerHTML = \`
                    <p class="text-blue-200 text-sm text-center">Başka kategori önerisi bulunamadı.</p>
                \`;
            }

            // Display insights
            if (result.insights && result.insights.length > 0) {
                const insightsHtml = result.insights.map(insight => \`
                    <div class="bg-white/10 p-3 minimal-corner mb-2">
                        <div class="font-bold text-white text-sm mb-1">\${insight.title}</div>
                        <div class="text-blue-100 text-xs">\${insight.message}</div>
                    </div>
                \`).join('');

                // Add insights below alternatives
                alternativeOptions.insertAdjacentHTML('afterend', \`
                    <div class="mt-4">
                        <h5 class="font-bold text-blue-300 text-sm mb-2">
                            <i class="fas fa-lightbulb mr-1"></i>AI Analiz Sonuçları
                        </h5>
                        \${insightsHtml}
                    </div>
                \`);
            }
        }

        // Proceed with recommended service
        function proceedWithRecommendation() {
            if (window.currentRecommendation) {
                const category = window.currentRecommendation.category;
                const details = window.currentRecommendation.details;
                
                // Show service options modal
                showServiceOptionsModal(category, details);
            }
        }

        // Show service options modal (Form vs WhatsApp)
        function showServiceOptionsModal(category, details) {
            // Create modal if not exists
            let modal = document.getElementById('serviceOptionsModal');
            if (modal) {
                modal.remove();
            }

            modal = document.createElement('div');
            modal.id = 'serviceOptionsModal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = \`
                <div class="bg-white minimal-corner max-w-lg mx-4 p-8">
                    <div class="text-center mb-6">
                        <div class="w-16 h-16 bg-\${category.color}-500 minimal-corner mx-auto mb-4 flex items-center justify-center">
                            <i class="\${category.icon} text-white text-2xl"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800 mb-2">\${category.name}</h3>
                        <p class="text-gray-600">\${category.description}</p>
                        <div class="mt-4 p-4 bg-gray-50 minimal-corner">
                            <div class="text-sm text-gray-600 mb-2">Tahmini Maliyet</div>
                            <div class="text-xl font-bold text-\${category.color}-600">\${category.priceRange}</div>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <h4 class="text-lg font-bold text-gray-800 text-center mb-4">Nasıl devam etmek istiyorsunuz?</h4>
                        
                        <!-- WhatsApp Option -->
                        <button 
                            onclick="proceedWithWhatsApp('\${category.whatsappMessage}', '\${details.originalText || ''}')"
                            class="w-full bg-green-500 hover:bg-green-600 text-white p-4 minimal-corner transition duration-200 flex items-center justify-center group"
                        >
                            <i class="fab fa-whatsapp text-2xl mr-3 group-hover:animate-pulse"></i>
                            <div class="text-left">
                                <div class="font-bold">WhatsApp ile Hızlı Teklif</div>
                                <div class="text-sm opacity-90">5 dakikada teklif alın</div>
                            </div>
                        </button>

                        <!-- Form Option -->
                        <button 
                            onclick="proceedWithForm('\${JSON.stringify({category, details}).replace(/"/g, '&quot;')}')"
                            class="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 minimal-corner transition duration-200 flex items-center justify-center"
                        >
                            <i class="fas fa-file-alt text-xl mr-3"></i>
                            <div class="text-left">
                                <div class="font-bold">Detaylı Form Doldur</div>
                                <div class="text-sm opacity-90">Kapsamlı teklif için</div>
                            </div>
                        </button>

                        <!-- Cancel Option -->
                        <button 
                            onclick="closeServiceOptionsModal()"
                            class="w-full border-2 border-gray-300 text-gray-600 hover:bg-gray-50 p-3 minimal-corner transition duration-200"
                        >
                            İptal Et
                        </button>
                    </div>
                </div>
            \`;
            
            document.body.appendChild(modal);

            // Close on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeServiceOptionsModal();
                }
            });
        }

        // Proceed with WhatsApp
        function proceedWithWhatsApp(baseMessage, problemDescription) {
            const enhancedMessage = baseMessage + (problemDescription ? \`\n\nProbleminiz: \${problemDescription}\` : '');
            const encodedMessage = encodeURIComponent(enhancedMessage);
            const whatsappUrl = \`https://wa.me/905001234567?text=\${encodedMessage}\`;
            
            // Open WhatsApp
            window.open(whatsappUrl, '_blank');
            
            // Close modal
            closeServiceOptionsModal();
            
            // Show success notification
            showNotification('WhatsApp üzerinden size ulaşacağız! 5 dakika içinde uzmanımız sizinle iletişime geçecek.', 'success');
        }

        // Proceed with form
        function proceedWithForm(dataStr) {
            try {
                const data = JSON.parse(dataStr.replace(/&quot;/g, '"'));
                const category = data.category;
                const details = data.details;
                
                // Pre-fill the service form with AI recommendation
                fillServiceForm(category, details);
                
                // Close modal
                closeServiceOptionsModal();
                
                // Scroll to service form
                document.getElementById('hizmet-al').scrollIntoView({ behavior: 'smooth' });
                
                // Show success notification
                showNotification('AI önerisi form alanlarına aktarıldı! Kişisel bilgilerinizi tamamlayıp talebinizi gönderebilirsiniz.', 'success');
            } catch (error) {
                console.error('Form proceed error:', error);
                closeServiceOptionsModal();
                scrollToServices();
            }
        }

        // Close service options modal
        function closeServiceOptionsModal() {
            const modal = document.getElementById('serviceOptionsModal');
            if (modal) {
                modal.remove();
            }
        }

        // Try different analysis
        function tryDifferentAnalysis() {
            showAIState('default');
            document.getElementById('problemDescription').focus();
        }

        // Select alternative category
        function selectAlternative(categoryId) {
            const category = serviceCategories[categoryId];
            if (category) {
                window.currentRecommendation = {
                    category: category,
                    details: { serviceLocation: document.getElementById('serviceLocation').value }
                };
                proceedWithRecommendation();
            }
        }

        // Fill service form with AI recommendation
        function fillServiceForm(category, details) {
            // Fill service category
            const serviceSelect = document.querySelector('select[name="serviceCategory"]');
            if (serviceSelect) {
                // Try to match category name to select options
                for (let option of serviceSelect.options) {
                    if (option.text.toLowerCase().includes(category.name.toLowerCase().split(' ')[0])) {
                        serviceSelect.value = option.value;
                        break;
                    }
                }
            }

            // Fill problem description
            const problemDesc = document.querySelector('textarea[name="problemDescription"]');
            if (problemDesc && details.originalText) {
                problemDesc.value = details.originalText;
            }

            // Show success message
            showNotification('AI önerisi form alanlarına aktarıldı! Kişisel bilgilerinizi tamamlayıp talebinizi gönderebilirsiniz.', 'success');
        }

        // AI state management
        function showAIState(state) {
            const states = ['default', 'loading', 'results'];
            states.forEach(s => {
                const element = document.getElementById(\`ai\${s.charAt(0).toUpperCase() + s.slice(1)}State\`);
                if (element) {
                    element.classList.toggle('hidden', s !== state);
                }
            });
        }

        // Notification system
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = \`fixed top-4 right-4 p-4 minimal-corner z-50 max-w-sm \${
                type === 'success' ? 'bg-green-500 text-white' : 
                type === 'error' ? 'bg-red-500 text-white' : 
                'bg-blue-500 text-white'
            }\`;
            notification.innerHTML = \`
                <div class="flex items-center justify-between">
                    <span class="text-sm">\${message}</span>
                    <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white/80 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            \`;
            
            document.body.appendChild(notification);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 5000);
        }

        // =============================================================================
        // SOCIAL PROOF ENHANCEMENT SYSTEM
        // =============================================================================

        // Live service completion notifications data
        const serviceCompletions = [
            {
                customerName: 'Mehmet A.',
                location: 'İstanbul, Kadıköy',
                service: 'Çamaşır Makinesi Tamiri',
                rating: 5,
                price: '₺450',
                duration: '2 saat',
                technician: 'Ahmet Usta',
                category: 'beyaz-esya'
            },
            {
                customerName: 'Ayşe K.',
                location: 'Ankara, Çankaya',
                service: 'Elektrik Tesisatı',
                rating: 5,
                price: '₺280',
                duration: '1.5 saat',
                technician: 'Osman Usta',
                category: 'elektrik'
            },
            {
                customerName: 'Fatma D.',
                location: 'İzmir, Bornova',
                service: 'Su Tesisatı Tamiri',
                rating: 5,
                price: '₺320',
                duration: '45 dakika',
                technician: 'Mustafa Usta',
                category: 'su-tesisati'
            },
            {
                customerName: 'Ali S.',
                location: 'Bursa, Osmangazi',
                service: 'Kombi Servisi',
                rating: 5,
                price: '₺680',
                duration: '3 saat',
                technician: 'Hasan Usta',
                category: 'kombi'
            },
            {
                customerName: 'Zeynep T.',
                location: 'Antalya, Muratpaşa',
                service: 'Klima Temizliği',
                rating: 5,
                price: '₺200',
                duration: '1 saat',
                technician: 'Emre Usta',
                category: 'klima'
            },
            {
                customerName: 'Okan Y.',
                location: 'Adana, Seyhan',
                service: 'TV Tamiri',
                rating: 5,
                price: '₺520',
                duration: '2.5 saat',
                technician: 'Kemal Usta',
                category: 'elektronik'
            },
            {
                customerName: 'Elif M.',
                location: 'Konya, Selçuklu',
                service: 'Bulaşık Makinesi',
                rating: 5,
                price: '₺390',
                duration: '1.5 saat',
                technician: 'Serkan Usta',
                category: 'beyaz-esya'
            },
            {
                customerName: 'Hüseyin B.',
                location: 'Gaziantep, Şahinbey',
                service: 'Kapı Kilidi Değişimi',
                rating: 5,
                price: '₺180',
                duration: '30 dakika',
                technician: 'Yasin Usta',
                category: 'kapi-pencere'
            }
        ];

        // Add live service completion
        function addServiceCompletion() {
            const feed = document.getElementById('completionsFeed');
            if (!feed) return;

            // Select random completion
            const completion = serviceCompletions[Math.floor(Math.random() * serviceCompletions.length)];
            
            // Create completion element
            const completionElement = document.createElement('div');
            completionElement.className = 'p-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer';
            
            // Get current time
            const now = new Date();
            const timeString = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            
            completionElement.innerHTML = \`
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <!-- Completion Status -->
                        <div class="w-10 h-10 bg-green-500 minimal-corner flex items-center justify-center">
                            <i class="fas fa-check text-white text-sm"></i>
                        </div>
                        
                        <!-- Service Details -->
                        <div>
                            <div class="flex items-center space-x-2 mb-1">
                                <span class="font-bold text-gray-800 text-sm">\${completion.customerName}</span>
                                <span class="text-gray-500 text-xs">•</span>
                                <span class="text-gray-600 text-xs">\${completion.location}</span>
                            </div>
                            <div class="text-gray-700 text-sm font-medium mb-1">\${completion.service}</div>
                            <div class="flex items-center space-x-4 text-xs text-gray-500">
                                <span><i class="fas fa-clock mr-1"></i>\${completion.duration}</span>
                                <span><i class="fas fa-user mr-1"></i>\${completion.technician}</span>
                                <span><i class="fas fa-money-bill-wave mr-1"></i>\${completion.price}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Rating and Time -->
                    <div class="text-right">
                        <div class="flex items-center justify-end mb-1">
                            <div class="flex text-yellow-400 text-xs mr-1">
                                \${'<i class="fas fa-star"></i>'.repeat(completion.rating)}
                            </div>
                            <span class="text-gray-600 text-xs">\${completion.rating}.0</span>
                        </div>
                        <div class="text-xs text-green-600 font-medium">
                            <i class="fas fa-clock mr-1"></i>\${timeString}
                        </div>
                        <div class="text-xs text-gray-500">Tamamlandı</div>
                    </div>
                </div>
            \`;

            // Add slide-in animation
            completionElement.style.opacity = '0';
            completionElement.style.transform = 'translateY(-10px)';
            
            feed.insertBefore(completionElement, feed.firstChild);

            // Animate in
            setTimeout(() => {
                completionElement.style.opacity = '1';
                completionElement.style.transform = 'translateY(0)';
                completionElement.style.transition = 'all 0.3s ease-out';
            }, 50);

            // Keep only last 8 completions
            while (feed.children.length > 8) {
                feed.removeChild(feed.lastChild);
            }

            // Update live user count
            updateLiveStats();
        }

        // Update live statistics
        function updateLiveStats() {
            // Update live user count (fluctuate between 35-55)
            const liveUserCountEl = document.getElementById('liveUserCount');
            if (liveUserCountEl) {
                const currentCount = parseInt(liveUserCountEl.textContent) || 47;
                const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                const newCount = Math.max(35, Math.min(55, currentCount + change));
                liveUserCountEl.textContent = newCount;
            }

            // Update today's services (gradually increase)
            const todayServicesEl = document.getElementById('todayServices');
            if (todayServicesEl) {
                const currentCount = parseInt(todayServicesEl.textContent) || 284;
                if (Math.random() < 0.3) { // 30% chance to increase
                    todayServicesEl.textContent = currentCount + 1;
                }
            }

            // Update average rating (stay around 4.9)
            const avgRatingEl = document.getElementById('avgRating');
            if (avgRatingEl) {
                const ratings = [4.8, 4.9, 5.0];
                const randomRating = ratings[Math.floor(Math.random() * ratings.length)];
                avgRatingEl.textContent = randomRating;
            }

            // Update response time (vary between 8-15 minutes)
            const responseTimeEl = document.getElementById('responseTime');
            if (responseTimeEl) {
                const times = ['8dk', '10dk', '12dk', '15dk'];
                const randomTime = times[Math.floor(Math.random() * times.length)];
                responseTimeEl.textContent = randomTime;
            }

            // Update monthly services (gradual increase)
            const monthlyServicesEl = document.getElementById('monthlyServices');
            if (monthlyServicesEl) {
                const currentCount = parseFloat(monthlyServicesEl.textContent.replace('K', '')) || 8.4;
                if (Math.random() < 0.1) { // 10% chance to increase
                    const newCount = (currentCount + 0.1).toFixed(1);
                    monthlyServicesEl.textContent = newCount + 'K';
                }
            }
        }

        // Initialize social proof system
        function initializeSocialProof() {
            // Add initial service completions with varying delays
            for (let i = 0; i < 6; i++) {
                setTimeout(() => addServiceCompletion(), i * 800);
            }
        }

        // Real-time social proof notifications (floating notifications)
        function showSocialProofNotification() {
            const notifications = [
                {
                    icon: 'fas fa-user-check',
                    color: 'bg-green-500',
                    message: 'Ahmet K.방금 전 Elektrik hizmeti aldı',
                    location: 'İstanbul'
                },
                {
                    icon: 'fas fa-star',
                    color: 'bg-yellow-500',
                    message: 'Ayşe D. 5⭐ puan verdi',
                    location: 'Ankara'
                },
                {
                    icon: 'fas fa-check-circle',
                    color: 'bg-blue-500',
                    message: 'Mehmet S. hizmetini tamamladı',
                    location: 'İzmir'
                },
                {
                    icon: 'fas fa-handshake',
                    color: 'bg-purple-500',
                    message: 'Fatma A. uzman ile eşleşti',
                    location: 'Bursa'
                }
            ];

            // Remove existing notification
            const existingNotification = document.getElementById('socialProofNotification');
            if (existingNotification) {
                existingNotification.remove();
            }

            // Select random notification
            const notification = notifications[Math.floor(Math.random() * notifications.length)];

            // Create notification element
            const notificationEl = document.createElement('div');
            notificationEl.id = 'socialProofNotification';
            notificationEl.className = \`fixed bottom-20 left-4 \${notification.color} text-white p-4 minimal-corner z-40 max-w-xs shadow-lg transform -translate-x-full transition-transform duration-500\`;
            
            notificationEl.innerHTML = \`
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-white/20 minimal-corner flex items-center justify-center">
                        <i class="\${notification.icon} text-sm"></i>
                    </div>
                    <div>
                        <div class="text-sm font-medium">\${notification.message}</div>
                        <div class="text-xs opacity-80">\${notification.location} • Şimdi</div>
                    </div>
                </div>
            \`;

            document.body.appendChild(notificationEl);

            // Animate in
            setTimeout(() => {
                notificationEl.style.transform = 'translateX(0)';
            }, 100);

            // Auto remove after 4 seconds
            setTimeout(() => {
                notificationEl.style.transform = 'translateX(-100%)';
                setTimeout(() => {
                    if (notificationEl.parentElement) {
                        notificationEl.remove();
                    }
                }, 500);
            }, 4000);
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            populateCityOpportunities();
            initializeJobFeed();
            initializeSocialProof();
            
            // Update stats every 10 seconds
            setInterval(updateStats, 10000);
            
            // Update live stats every 15 seconds (original + social proof)
            setInterval(updateLiveStats, 15000);
            
            // Add new job every 8 seconds for more activity
            setInterval(addJobToFeed, 8000);
            
            // Add service completions every 12 seconds
            setInterval(addServiceCompletion, 12000);
            
            // Show social proof notifications every 20 seconds
            setInterval(showSocialProofNotification, 20000);
            
            // Show first social proof notification after 5 seconds
            setTimeout(showSocialProofNotification, 5000);
        });

        // Show all 81 cities modal
        function showAllCities() {
            // Create modal if not exists
            let modal = document.getElementById('citiesModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'citiesModal';
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
                modal.innerHTML = \`
                    <div class="bg-white minimal-corner max-w-6xl max-h-[90vh] overflow-y-auto m-4 relative">
                        <div class="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
                            <div>
                                <h2 class="text-2xl font-bold text-slate-800">TÜRKİYE GENELİ HİZMET FİYATLARI</h2>
                                <p class="text-slate-600 mt-1">81 ilde güncel fiyatlar ve hizmet kalitesi</p>
                            </div>
                            <button onclick="closeAllCities()" class="text-slate-400 hover:text-slate-600 text-2xl">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="p-6" id="allCitiesContainer">
                            <!-- All cities will be populated here -->
                        </div>
                    </div>
                \`;
                document.body.appendChild(modal);
            }

            // Populate all 81 cities
            const allCitiesContainer = document.getElementById('allCitiesContainer');
            const allCities = [
                // Major cities
                { name: 'İstanbul', avgPrice: '₺280-450', responseTime: '2-4 saat', satisfaction: '4.8', region: 'Marmara' },
                { name: 'Ankara', avgPrice: '₺240-380', responseTime: '1-3 saat', satisfaction: '4.7', region: 'İç Anadolu' },
                { name: 'İzmir', avgPrice: '₺250-400', responseTime: '2-4 saat', satisfaction: '4.9', region: 'Ege' },
                { name: 'Bursa', avgPrice: '₺220-350', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Marmara' },
                { name: 'Antalya', avgPrice: '₺260-420', responseTime: '2-3 saat', satisfaction: '4.6', region: 'Akdeniz' },
                { name: 'Adana', avgPrice: '₺210-340', responseTime: '1-3 saat', satisfaction: '4.7', region: 'Akdeniz' },
                
                // Additional cities (75 more cities)
                { name: 'Konya', avgPrice: '₺200-320', responseTime: '1-2 saat', satisfaction: '4.9', region: 'İç Anadolu' },
                { name: 'Gaziantep', avgPrice: '₺190-310', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Güneydoğu Anadolu' },
                { name: 'Şanlıurfa', avgPrice: '₺160-270', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Güneydoğu Anadolu' },
                { name: 'Kocaeli', avgPrice: '₺230-360', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Marmara' },
                { name: 'Mersin', avgPrice: '₺220-340', responseTime: '1-3 saat', satisfaction: '4.7', region: 'Akdeniz' },
                { name: 'Diyarbakır', avgPrice: '₺170-280', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Güneydoğu Anadolu' },
                { name: 'Kayseri', avgPrice: '₺180-290', responseTime: '30dk-2 saat', satisfaction: '4.9', region: 'İç Anadolu' },
                { name: 'Eskişehir', avgPrice: '₺200-320', responseTime: '45dk-2 saat', satisfaction: '4.8', region: 'İç Anadolu' },
                { name: 'Erzurum', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Doğu Anadolu' },
                { name: 'Elazığ', avgPrice: '₺160-260', responseTime: '45dk-2 saat', satisfaction: '4.7', region: 'Doğu Anadolu' },
                { name: 'Malatya', avgPrice: '₺170-280', responseTime: '45dk-2 saat', satisfaction: '4.8', region: 'Doğu Anadolu' },
                { name: 'Manisa', avgPrice: '₺190-300', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ege' },
                { name: 'Samsun', avgPrice: '₺190-310', responseTime: '1-3 saat', satisfaction: '4.6', region: 'Karadeniz' },
                { name: 'Van', avgPrice: '₺140-240', responseTime: '1-3 saat', satisfaction: '4.6', region: 'Doğu Anadolu' },
                { name: 'Aydın', avgPrice: '₺180-290', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Ege' },
                { name: 'Balıkesir', avgPrice: '₺170-280', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Marmara' },
                { name: 'Denizli', avgPrice: '₺180-300', responseTime: '30dk-2 saat', satisfaction: '4.9', region: 'Ege' },
                { name: 'Trabzon', avgPrice: '₺180-290', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Ordu', avgPrice: '₺160-270', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Karadeniz' },
                { name: 'Muğla', avgPrice: '₺210-340', responseTime: '1-3 saat', satisfaction: '4.6', region: 'Ege' },
                { name: 'Tekirdağ', avgPrice: '₺200-320', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Marmara' },
                { name: 'Sakarya', avgPrice: '₺210-330', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Marmara' },
                { name: 'Afyonkarahisar', avgPrice: '₺160-260', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Ege' },
                { name: 'Mardin', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Güneydoğu Anadolu' },
                { name: 'Kahramanmaraş', avgPrice: '₺170-280', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Akdeniz' },
                { name: 'Zonguldak', avgPrice: '₺170-280', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Karadeniz' },
                { name: 'Batman', avgPrice: '₺140-240', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Güneydoğu Anadolu' },
                { name: 'Uşak', avgPrice: '₺160-260', responseTime: '45dk-2 saat', satisfaction: '4.8', region: 'Ege' },
                { name: 'Düzce', avgPrice: '₺180-290', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Bolu', avgPrice: '₺170-280', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Karadeniz' },
                { name: 'Isparta', avgPrice: '₺160-270', responseTime: '45dk-2 saat', satisfaction: '4.8', region: 'Akdeniz' },
                { name: 'Çorum', avgPrice: '₺160-260', responseTime: '1-2 saat', satisfaction: '4.7', region: 'İç Anadolu' },
                { name: 'Tokat', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Kırklareli', avgPrice: '₺180-290', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Marmara' },
                { name: 'Rize', avgPrice: '₺170-280', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Karadeniz' },
                { name: 'Edirne', avgPrice: '₺180-290', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Marmara' },
                
                // Complete the remaining cities to reach 81
                { name: 'Aksaray', avgPrice: '₺140-240', responseTime: '1-2 saat', satisfaction: '4.7', region: 'İç Anadolu' },
                { name: 'Amasya', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Karadeniz' },
                { name: 'Artvin', avgPrice: '₺150-250', responseTime: '1-3 saat', satisfaction: '4.6', region: 'Karadeniz' },
                { name: 'Bilecik', avgPrice: '₺170-280', responseTime: '45dk-2 saat', satisfaction: '4.7', region: 'Marmara' },
                { name: 'Bingöl', avgPrice: '₺130-230', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Doğu Anadolu' },
                { name: 'Bitlis', avgPrice: '₺130-230', responseTime: '1-2 saat', satisfaction: '4.5', region: 'Doğu Anadolu' },
                { name: 'Burdur', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Akdeniz' },
                { name: 'Çanakkale', avgPrice: '₺170-280', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Marmara' },
                { name: 'Çankırı', avgPrice: '₺140-240', responseTime: '1-2 saat', satisfaction: '4.7', region: 'İç Anadolu' },
                { name: 'Giresun', avgPrice: '₺160-260', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Gümüşhane', avgPrice: '₺140-240', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Karadeniz' },
                { name: 'Hakkari', avgPrice: '₺120-220', responseTime: '2-4 saat', satisfaction: '4.4', region: 'Doğu Anadolu' },
                { name: 'Hatay', avgPrice: '₺190-310', responseTime: '1-3 saat', satisfaction: '4.6', region: 'Akdeniz' },
                { name: 'Iğdır', avgPrice: '₺130-230', responseTime: '1-3 saat', satisfaction: '4.5', region: 'Doğu Anadolu' },
                { name: 'Karaman', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'İç Anadolu' },
                { name: 'Kars', avgPrice: '₺130-230', responseTime: '1-3 saat', satisfaction: '4.5', region: 'Doğu Anadolu' },
                { name: 'Kastamonu', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Kırıkkale', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.6', region: 'İç Anadolu' },
                { name: 'Kırşehir', avgPrice: '₺140-240', responseTime: '1-2 saat', satisfaction: '4.7', region: 'İç Anadolu' },
                { name: 'Kütahya', avgPrice: '₺160-260', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ege' },
                { name: 'Nevşehir', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.8', region: 'İç Anadolu' },
                { name: 'Niğde', avgPrice: '₺140-240', responseTime: '1-2 saat', satisfaction: '4.7', region: 'İç Anadolu' },
                { name: 'Siirt', avgPrice: '₺130-230', responseTime: '1-2 saat', satisfaction: '4.5', region: 'Güneydoğu Anadolu' },
                { name: 'Sinop', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Sivas', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'İç Anadolu' },
                { name: 'Şırnak', avgPrice: '₺120-220', responseTime: '1-3 saat', satisfaction: '4.4', region: 'Güneydoğu Anadolu' },
                { name: 'Tunceli', avgPrice: '₺130-230', responseTime: '1-3 saat', satisfaction: '4.5', region: 'Doğu Anadolu' },
                { name: 'Yalova', avgPrice: '₺200-320', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Marmara' },
                { name: 'Yozgat', avgPrice: '₺140-240', responseTime: '1-2 saat', satisfaction: '4.6', region: 'İç Anadolu' },
                { name: 'Karabük', avgPrice: '₺160-260', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Kilis', avgPrice: '₺140-240', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Güneydoğu Anadolu' },
                { name: 'Osmaniye', avgPrice: '₺160-270', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Akdeniz' },
                { name: 'Bartın', avgPrice: '₺150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Ardahan', avgPrice: '₺120-220', responseTime: '1-3 saat', satisfaction: '4.4', region: 'Doğu Anadolu' },
                { name: 'Bayburt', avgPrice: '₺130-230', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Karadeniz' }
            ];

            // Group cities by region
            const regions = {};
            allCities.forEach(city => {
                if (!regions[city.region]) {
                    regions[city.region] = [];
                }
                regions[city.region].push(city);
            });

            // Create HTML content
            let html = '';
            Object.keys(regions).forEach(region => {
                html += \`
                    <div class="mb-8">
                        <h3 class="text-xl font-bold text-blue-900 mb-4 border-b-2 border-blue-200 pb-2">
                            <i class="fas fa-map-marker-alt mr-2"></i>\${region}
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                \`;
                
                regions[region].forEach(city => {
                    html += \`
                        <div class="bg-slate-50 border border-slate-200 minimal-corner p-4 hover:border-orange-600 transition duration-200">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-bold text-slate-800">\${city.name}</h4>
                                <div class="flex items-center space-x-1 text-amber-500">
                                    <i class="fas fa-star text-xs"></i>
                                    <span class="text-slate-700 text-sm">\${city.satisfaction}</span>
                                </div>
                            </div>
                            <div class="space-y-1 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-slate-600">Fiyat:</span>
                                    <span class="font-medium text-orange-600">\${city.avgPrice}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-600">Süre:</span>
                                    <span class="font-medium text-green-600">\${city.responseTime}</span>
                                </div>
                            </div>
                        </div>
                    \`;
                });
                
                html += \`
                        </div>
                    </div>
                \`;
            });

            allCitiesContainer.innerHTML = html;
            
            // Show modal
            modal.classList.remove('hidden');
        }

        function closeAllCities() {
            const modal = document.getElementById('citiesModal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }

        // Quick Price Comparison System Functions
        const priceData = {
            elektrik: {
                name: 'Elektrik İşleri',
                basePrice: { min: 150, max: 500 },
                cityMultiplier: { istanbul: 1.3, ankara: 1.1, izmir: 1.2, bursa: 1.0, antalya: 1.1, adana: 0.9, konya: 0.9, gaziantep: 0.8 },
                complexityMultiplier: { 1: 0.8, 2: 1.0, 3: 1.4 }
            },
            'beyaz-esya': {
                name: 'Beyaz Eşya Tamiri',
                basePrice: { min: 200, max: 600 },
                cityMultiplier: { istanbul: 1.4, ankara: 1.2, izmir: 1.3, bursa: 1.1, antalya: 1.2, adana: 1.0, konya: 0.9, gaziantep: 0.8 },
                complexityMultiplier: { 1: 0.7, 2: 1.0, 3: 1.5 }
            },
            'su-tesisati': {
                name: 'Su Tesisatı',
                basePrice: { min: 180, max: 450 },
                cityMultiplier: { istanbul: 1.2, ankara: 1.0, izmir: 1.1, bursa: 0.9, antalya: 1.0, adana: 0.8, konya: 0.8, gaziantep: 0.7 },
                complexityMultiplier: { 1: 0.8, 2: 1.0, 3: 1.3 }
            },
            kombi: {
                name: 'Kombi & Kalorifer',
                basePrice: { min: 250, max: 800 },
                cityMultiplier: { istanbul: 1.3, ankara: 1.1, izmir: 1.2, bursa: 1.0, antalya: 1.1, adana: 0.9, konya: 0.9, gaziantep: 0.8 },
                complexityMultiplier: { 1: 0.7, 2: 1.0, 3: 1.6 }
            },
            elektronik: {
                name: 'Elektronik Tamiri',
                basePrice: { min: 150, max: 1000 },
                cityMultiplier: { istanbul: 1.4, ankara: 1.2, izmir: 1.3, bursa: 1.1, antalya: 1.2, adana: 1.0, konya: 0.9, gaziantep: 0.8 },
                complexityMultiplier: { 1: 0.6, 2: 1.0, 3: 1.8 }
            },
            temizlik: {
                name: 'Temizlik Hizmetleri',
                basePrice: { min: 120, max: 500 },
                cityMultiplier: { istanbul: 1.3, ankara: 1.1, izmir: 1.2, bursa: 1.0, antalya: 1.1, adana: 0.9, konya: 0.8, gaziantep: 0.7 },
                complexityMultiplier: { 1: 0.8, 2: 1.0, 3: 1.2 }
            },
            boyama: {
                name: 'Boyama & Badana',
                basePrice: { min: 300, max: 1500 },
                cityMultiplier: { istanbul: 1.2, ankara: 1.0, izmir: 1.1, bursa: 0.9, antalya: 1.0, adana: 0.8, konya: 0.8, gaziantep: 0.7 },
                complexityMultiplier: { 1: 0.7, 2: 1.0, 3: 1.4 }
            },
            'kapi-pencere': {
                name: 'Kapı & Pencere',
                basePrice: { min: 150, max: 800 },
                cityMultiplier: { istanbul: 1.3, ankara: 1.1, izmir: 1.2, bursa: 1.0, antalya: 1.1, adana: 0.9, konya: 0.9, gaziantep: 0.8 },
                complexityMultiplier: { 1: 0.8, 2: 1.0, 3: 1.3 }
            }
        };

        function updateComplexityDisplay() {
            const slider = document.getElementById('complexitySlider');
            const display = document.getElementById('complexityDisplay');
            const description = document.getElementById('complexityDescription');
            
            const value = parseInt(slider.value);
            const complexityLabels = {
                1: { label: 'Basit', desc: 'Hızlı çözüm, standart malzeme' },
                2: { label: 'Orta', desc: 'Standart işlem süresi ve malzeme' },
                3: { label: 'Karmaşık', desc: 'Uzun süre, özel malzeme gerekebilir' }
            };
            
            display.textContent = complexityLabels[value].label;
            description.textContent = complexityLabels[value].desc;
            
            updatePriceCalculation();
        }

        function updatePriceCalculation() {
            const serviceCategory = document.getElementById('priceServiceCategory').value;
            const city = document.getElementById('priceCity').value;
            const urgencyLevel = document.querySelector('input[name="priceUrgency"]:checked')?.value || 'normal';
            const complexity = parseInt(document.getElementById('complexitySlider').value);

            if (!serviceCategory || !city) {
                // Reset to default display
                document.getElementById('priceRange').textContent = '₺200-600';
                document.getElementById('priceCity_display').textContent = city ? 
                    city.charAt(0).toUpperCase() + city.slice(1) : 'Şehir seçiniz';
                document.getElementById('basePrice').textContent = '₺200-400';
                document.getElementById('urgencyFee').textContent = '₺0';
                document.getElementById('complexityFee').textContent = 'Standart';
                document.getElementById('totalPriceRange').textContent = '₺200-600';
                return;
            }

            const data = priceData[serviceCategory];
            if (!data) return;

            // Calculate base price with city multiplier
            const cityMultiplier = data.cityMultiplier[city] || 1.0;
            const baseMin = Math.round(data.basePrice.min * cityMultiplier);
            const baseMax = Math.round(data.basePrice.max * cityMultiplier);

            // Apply complexity multiplier
            const complexityMultiplier = data.complexityMultiplier[complexity];
            const complexityMin = Math.round(baseMin * complexityMultiplier);
            const complexityMax = Math.round(baseMax * complexityMultiplier);

            // Apply urgency multiplier
            const urgencyMultipliers = { normal: 1.0, urgent: 1.25, emergency: 1.5 };
            const urgencyMultiplier = urgencyMultipliers[urgencyLevel];
            const finalMin = Math.round(complexityMin * urgencyMultiplier);
            const finalMax = Math.round(complexityMax * urgencyMultiplier);

            // Calculate urgency fee
            const urgencyFeeMin = Math.round(complexityMin * (urgencyMultiplier - 1));
            const urgencyFeeMax = Math.round(complexityMax * (urgencyMultiplier - 1));

            // Update display
            document.getElementById('priceRange').textContent = '₺' + finalMin + '-' + finalMax;
            document.getElementById('priceCity_display').textContent = 
                city.charAt(0).toUpperCase() + city.slice(1) + ' - ' + data.name;
            document.getElementById('basePrice').textContent = '₺' + baseMin + '-' + baseMax;
            
            if (urgencyFeeMin > 0) {
                document.getElementById('urgencyFee').textContent = '₺' + urgencyFeeMin + '-' + urgencyFeeMax;
            } else {
                document.getElementById('urgencyFee').textContent = '₺0';
            }
            
            const complexityLabels = { 1: 'Basit (-20%)', 2: 'Standart', 3: 'Karmaşık (+40%)' };
            document.getElementById('complexityFee').textContent = complexityLabels[complexity] || 'Standart';
            document.getElementById('totalPriceRange').textContent = '₺' + finalMin + '-' + finalMax;

            // Store current calculation for later use
            window.currentPriceCalculation = {
                serviceCategory: serviceCategory,
                serviceName: data.name,
                city: city,
                urgencyLevel: urgencyLevel,
                complexity: complexity,
                priceRange: '₺' + finalMin + '-' + finalMax,
                breakdown: {
                    base: '₺' + baseMin + '-' + baseMax,
                    urgency: urgencyFeeMin > 0 ? ('₺' + urgencyFeeMin + '-' + urgencyFeeMax) : '₺0',
                    complexity: complexityLabels[complexity],
                    total: '₺' + finalMin + '-' + finalMax
                }
            };
        }

        function proceedWithPriceCalculation() {
            const calc = window.currentPriceCalculation;
            if (!calc) {
                alert('Lütfen önce tüm seçimleri yapınız.');
                return;
            }

            // Fill form with calculated information
            const serviceRequestForm = document.getElementById('serviceRequestForm');
            if (serviceRequestForm) {
                // Pre-fill service category if available
                const categorySelect = document.getElementById('serviceCategory');
                if (categorySelect) {
                    // Try to match the selected category with form options
                    const categoryMap = {
                        'elektrik': 'elektrik',
                        'beyaz-esya': 'beyaz_esya',
                        'su-tesisati': 'su_tesisati',
                        'kombi': 'kombi_kalorifer',
                        'elektronik': 'elektronik',
                        'temizlik': 'temizlik',
                        'boyama': 'boyama_badana',
                        'kapi-pencere': 'kapi_pencere'
                    };
                    const formCategory = categoryMap[calc.serviceCategory];
                    if (formCategory) {
                        categorySelect.value = formCategory;
                    }
                }

                // Pre-fill location
                const locationInput = document.getElementById('serviceLocation');
                if (locationInput) {
                    locationInput.value = calc.city.charAt(0).toUpperCase() + calc.city.slice(1);
                }

                // Pre-fill problem description with price information
                const problemInput = document.getElementById('problemDescription');
                if (problemInput) {
                    const urgencyText = {
                        normal: 'Normal (1-2 gün içinde)',
                        urgent: 'Acil (Aynı gün)',
                        emergency: 'Çok Acil (1-2 saat içinde)'
                    };
                    
                    problemInput.value = calc.serviceName + ' hizmeti için tahmini maliyet: ' + calc.priceRange + '\n\n' +
                        'Aciliyet: ' + urgencyText[calc.urgencyLevel] + '\n' +
                        'Karmaşıklık: ' + calc.breakdown.complexity + '\n\n' +
                        'Detayları aşağıya yazabilirsiniz:';
                }

                // Scroll to form
                serviceRequestForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        function sharePrice() {
            const calc = window.currentPriceCalculation;
            if (!calc) {
                alert('Lütfen önce fiyat hesaplaması yapınız.');
                return;
            }

            const urgencyText = {
                normal: 'Normal (1-2 gün içinde)',
                urgent: 'Acil (Aynı gün)', 
                emergency: 'Çok Acil (1-2 saat içinde)'
            };

            const message = '🏠 *Garantör360 - Hizmet Talebi*\n\n' +
                '📋 *Hizmet:* ' + calc.serviceName + '\n' +
                '📍 *Şehir:* ' + (calc.city.charAt(0).toUpperCase() + calc.city.slice(1)) + '\n' +
                '⏰ *Aciliyet:* ' + urgencyText[calc.urgencyLevel] + '\n' +
                '🔧 *Karmaşıklık:* ' + calc.breakdown.complexity + '\n\n' +
                '💰 *Tahmini Maliyet:* ' + calc.priceRange + '\n\n' +
                '📞 *Hemen teklif almak için:* https://wa.me/905301234567\n\n' +
                '✅ Şeffaf fiyatlandırma\n' +
                '✅ 7/24 müşteri desteği\n' +
                '✅ Garantili hizmet';

            const whatsappUrl = 'https://wa.me/905301234567?text=' + encodeURIComponent(message);
            
            // Mobile check
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // On mobile, try to open WhatsApp app
                window.location.href = whatsappUrl;
            } else {
                // On desktop, open in new tab
                window.open(whatsappUrl, '_blank');
            }

            // Show confirmation
            const shareButton = event.target;
            const originalText = shareButton.innerHTML;
            shareButton.innerHTML = '<i class="fas fa-check mr-2"></i>PAYLAŞILDI!';
            shareButton.classList.add('bg-green-700');
            
            setTimeout(() => {
                shareButton.innerHTML = originalText;
                shareButton.classList.remove('bg-green-700');
            }, 2000);
        }

        // Initialize price calculator on page load
        document.addEventListener('DOMContentLoaded', function() {
            updatePriceCalculation();
        });

        // Instant Expert Matching System Functions
        let searchInProgress = false;
        let foundExperts = [];

        // Expert database simulation
        const expertDatabase = {
            elektrik: [
                { 
                    name: 'Ahmet Usta', 
                    rating: 4.9, 
                    distance: 0.8, 
                    experience: '12 yıl', 
                    price: '₺200-500',
                    specialties: ['Ev elektriği', 'Sigorta kutuları', 'LED montajı'],
                    responseTime: '15 dakika',
                    availability: 'Şu an müsait'
                },
                { 
                    name: 'Mehmet Usta', 
                    rating: 4.8, 
                    distance: 1.2, 
                    experience: '8 yıl', 
                    price: '₺180-450',
                    specialties: ['Priz montajı', 'Kablo döşeme', 'Elektrik arızaları'],
                    responseTime: '25 dakika',
                    availability: 'Bu akşam müsait'
                },
                { 
                    name: 'Ali Usta', 
                    rating: 4.7, 
                    distance: 2.1, 
                    experience: '15 yıl', 
                    price: '₺250-550',
                    specialties: ['Elektrik panosu', 'Aydınlatma', 'Güvenlik sistemleri'],
                    responseTime: '35 dakika',
                    availability: 'Yarın sabah müsait'
                }
            ],
            'beyaz-esya': [
                {
                    name: 'Osman Usta',
                    rating: 4.9,
                    distance: 0.5,
                    experience: '10 yıl',
                    price: '₺300-800',
                    specialties: ['Çamaşır makinesi', 'Bulaşık makinesi', 'Buzdolabı'],
                    responseTime: '20 dakika',
                    availability: 'Şu an müsait'
                },
                {
                    name: 'Hasan Usta',
                    rating: 4.8,
                    distance: 1.5,
                    experience: '14 yıl',
                    price: '₺280-750',
                    specialties: ['Beyaz eşya tamiri', 'Motor değişimi', 'Elektronik kart'],
                    responseTime: '30 dakika',
                    availability: 'Bu akşam müsait'
                },
                {
                    name: 'İbrahim Usta',
                    rating: 4.6,
                    distance: 2.3,
                    experience: '9 yıl',
                    price: '₺250-700',
                    specialties: ['Klima servisi', 'Fırın tamiri', 'Mikrodalga'],
                    responseTime: '45 dakika',
                    availability: 'Yarın müsait'
                }
            ]
        };

        function getCurrentLocation() {
            const locationInput = document.getElementById('quickLocation');
            
            if (navigator.geolocation) {
                locationInput.value = 'Konum alınıyor...';
                
                navigator.geolocation.getCurrentPosition(function(position) {
                    // Simulated address from coordinates
                    const mockAddresses = [
                        'Kadıköy, İstanbul',
                        'Çankaya, Ankara', 
                        'Bornova, İzmir',
                        'Nilüfer, Bursa',
                        'Muratpaşa, Antalya'
                    ];
                    
                    const address = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
                    locationInput.value = address;
                    
                    startExpertSearch();
                }, function(error) {
                    locationInput.value = '';
                    alert('Konum alınamadı. Manuel olarak girebilirsiniz.');
                });
            } else {
                alert('Tarayıcınız konum özelliğini desteklemiyor.');
            }
        }

        function startExpertSearch() {
            const serviceType = document.getElementById('quickServiceType').value;
            const location = document.getElementById('quickLocation').value;
            const urgency = document.querySelector('input[name="quickUrgency"]:checked')?.value;

            if (!serviceType || !location) {
                return; // Don't start search if required fields are empty
            }

            if (searchInProgress) {
                return; // Prevent multiple searches
            }

            searchInProgress = true;
            showSearchProgress();
        }

        function showSearchProgress() {
            // Hide previous results
            document.getElementById('foundExpertsList').classList.add('hidden');
            document.getElementById('liveChatSystem').classList.add('hidden');
            
            // Show matching status
            const statusDiv = document.getElementById('matchingStatus');
            statusDiv.classList.remove('hidden');
            
            // Reset progress
            document.getElementById('searchProgress').style.width = '0%';
            
            // Simulate search progress
            let progress = 0;
            const messages = [
                'Lokasyonunuza göre uzmanlar taranıyor...',
                'Uygun uzmanlar filtreleniyor...',  
                'Müsaitlik durumları kontrol ediliyor...',
                'En iyi eşleşmeler bulunuyor...',
                'Sonuçlar hazırlanıyor...'
            ];
            
            const progressInterval = setInterval(() => {
                progress += 20;
                document.getElementById('searchProgress').style.width = progress + '%';
                
                const messageIndex = Math.floor((progress - 20) / 20);
                if (messageIndex >= 0 && messageIndex < messages.length) {
                    document.getElementById('statusMessage').textContent = messages[messageIndex];
                }
                
                if (progress >= 100) {
                    clearInterval(progressInterval);
                    setTimeout(() => {
                        showFoundExperts();
                    }, 500);
                }
            }, 800);
        }

        function showFoundExperts() {
            const serviceType = document.getElementById('quickServiceType').value;
            const urgency = document.querySelector('input[name="quickUrgency"]:checked')?.value;
            
            // Hide search progress
            document.getElementById('matchingStatus').classList.add('hidden');
            
            // Get experts for this service type
            const experts = expertDatabase[serviceType] || expertDatabase['elektrik'];
            foundExperts = experts;
            
            // Show results
            const resultsDiv = document.getElementById('foundExpertsList');
            const container = document.getElementById('expertsContainer');
            
            container.innerHTML = '';
            
            experts.forEach((expert, index) => {
                // Apply urgency multiplier to price
                let priceMultiplier = 1;
                if (urgency === 'urgent') priceMultiplier = 1.25;
                if (urgency === 'emergency') priceMultiplier = 1.5;
                
                // Parse price range and apply multiplier
                const priceMatch = expert.price.match(/₺(\d+)-(\d+)/);
                const minPrice = Math.round(parseInt(priceMatch[1]) * priceMultiplier);
                const maxPrice = Math.round(parseInt(priceMatch[2]) * priceMultiplier);
                const adjustedPrice = '₺' + minPrice + '-' + maxPrice;
                
                const expertCard = document.createElement('div');
                expertCard.className = 'bg-white/90 backdrop-blur p-4 minimal-corner border-2 border-white/50 hover:border-yellow-300 transition-all duration-300 cursor-pointer transform hover:scale-105';
                const stars = '★'.repeat(Math.floor(expert.rating));
                const specialtyTags = expert.specialties.map(specialty => 
                    '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 text-xs minimal-corner">' + specialty + '</span>'
                ).join('');
                
                expertCard.innerHTML = 
                    '<div class="flex items-start justify-between">' +
                        '<div class="flex items-center">' +
                            '<div class="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 minimal-corner flex items-center justify-center mr-4">' +
                                '<i class="fas fa-user text-white text-lg"></i>' +
                            '</div>' +
                            '<div>' +
                                '<h4 class="font-bold text-gray-800 text-lg">' + expert.name + '</h4>' +
                                '<div class="flex items-center text-sm text-gray-600 mb-1">' +
                                    '<div class="flex text-yellow-400 mr-2">' + stars + '</div>' +
                                    '<span class="font-bold">' + expert.rating + '</span>' +
                                    '<span class="mx-2">•</span>' +
                                    '<i class="fas fa-map-marker-alt text-emerald-600 mr-1"></i>' +
                                    '<span>' + expert.distance + 'km uzakta</span>' +
                                '</div>' +
                                '<div class="text-xs text-gray-500">' +
                                    expert.experience + ' deneyim • ' + expert.responseTime + ' içinde yanıt' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="text-right">' +
                            '<div class="font-bold text-emerald-600 text-lg">' + adjustedPrice + '</div>' +
                            '<div class="text-xs text-gray-600">' + expert.availability + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="mt-3 pt-3 border-t border-gray-200">' +
                        '<div class="text-xs text-gray-600 mb-2">Uzmanlık Alanları:</div>' +
                        '<div class="flex flex-wrap gap-1">' + specialtyTags + '</div>' +
                    '</div>' +
                    '<div class="mt-4 flex gap-2">' +
                        '<button onclick="callExpert(\'' + expert.name + '\')" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 minimal-corner text-sm transition duration-200">' +
                            '<i class="fas fa-phone mr-1"></i>Ara' +
                        '</button>' +
                        '<button onclick="messageExpert(\'' + expert.name + '\')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 minimal-corner text-sm transition duration-200">' +
                            '<i class="fas fa-message mr-1"></i>Mesaj' +
                        '</button>' +
                        '<button onclick="getQuote(\'' + expert.name + '\')" class="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 minimal-corner text-sm transition duration-200">' +
                            '<i class="fas fa-file-invoice mr-1"></i>Teklif' +
                        '</button>' +
                    '</div>';
                
                container.appendChild(expertCard);
            });
            
            resultsDiv.classList.remove('hidden');
            searchInProgress = false;
            
            // Scroll to results
            resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        function proceedToChat() {
            const chatSystem = document.getElementById('liveChatSystem');
            chatSystem.classList.remove('hidden');
            chatSystem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Simulate incoming messages after a delay
            setTimeout(() => {
                addChatMessage(1, 'Ahmet Usta', 'Merhaba! Size nasıl yardımcı olabilirim?');
            }, 2000);
            
            setTimeout(() => {
                addChatMessage(2, 'Mehmet Usta', 'Probleminizi anlattınız mı? Fotoğraf gönderebilir misiniz?');
            }, 4000);
            
            setTimeout(() => {
                addChatMessage(3, 'Osman Usta', 'Teklif verebilirim, ne zaman müsaitsiniz?');
            }, 6000);
        }

        function addChatMessage(chatIndex, expertName, message) {
            const chatDiv = document.getElementById('chat' + chatIndex);
            const messageDiv = document.createElement('div');
            messageDiv.className = 'bg-blue-500 text-white p-2 minimal-corner max-w-xs ml-auto';
            messageDiv.textContent = message;
            
            chatDiv.appendChild(messageDiv);
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }

        function closeLiveChat() {
            document.getElementById('liveChatSystem').classList.add('hidden');
        }

        function callExpert(expertName) {
            alert('📞 ' + expertName + ' aranıyor...\\n\\nGerçek uygulamada telefon araması başlatılacak.');
        }

        function messageExpert(expertName) {
            alert('💬 ' + expertName + ' ile mesajlaşma başlıyor...\\n\\nCanlı sohbet sistemi açılıyor.');
            proceedToChat();
        }

        function getQuote(expertName) {
            const serviceType = document.getElementById('quickServiceType').value;
            const location = document.getElementById('quickLocation').value;
            
            const message = '💼 *Garantor360 - Teklif Talebi*\n\n' +
                '👨‍🔧 *Uzman:* ' + expertName + '\n' +
                '🔧 *Hizmet:* ' + serviceType + '\n' +
                '📍 *Lokasyon:* ' + location + '\n\n' +
                '📞 *Hemen teklif almak için:* https://wa.me/905301234567\n\n' +
                '✅ Anında teklif\n' +
                '✅ Garantili hizmet\n' +
                '✅ Güvenli ödeme';

            const whatsappUrl = 'https://wa.me/905301234567?text=' + encodeURIComponent(message);
            
            // Mobile check
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                window.location.href = whatsappUrl;
            } else {
                window.open(whatsappUrl, '_blank');
            }
        }

        // Guarantee & Security Showcase System Functions
        function scrollToService() {
            const serviceSection = document.getElementById('hizmet-al') || document.querySelector('section:has(h2:contains("TALEBİNİZİ BİLDİRİN"))');
            if (serviceSection) {
                serviceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                // Fallback: scroll to bottom of page if service section not found
                window.scrollTo({ 
                    top: document.body.scrollHeight, 
                    behavior: 'smooth' 
                });
            }
        }

        </script>

        <!-- Smart Alert & Motivation System -->
        <!-- Floating Scarcity Notifications -->
        <div id="scarcityNotifications" class="fixed top-20 right-6 z-50 space-y-3 max-w-sm">
            <!-- Dynamic scarcity alerts will be added here -->
        </div>

        <!-- Floating Discount Banner -->
        <div id="discountBanner" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 hidden">
            <div class="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 minimal-corner shadow-2xl border-2 border-white animate-pulse">
                <div class="flex items-center space-x-4">
                    <div class="flex items-center">
                        <i class="fas fa-fire text-yellow-300 mr-2 animate-bounce"></i>
                        <span class="font-bold text-sm">🔥 ÖZEL İNDİRİM!</span>
                    </div>
                    <div class="text-sm">
                        <span class="font-bold">%15 İNDİRİM</span> - Sadece bu sayfada geçerli!
                    </div>
                    <div id="discountTimer" class="bg-white/20 px-3 py-1 minimal-corner text-xs font-bold">
                        02:47:33
                    </div>
                    <button onclick="closeDiscountBanner()" class="text-white/80 hover:text-white">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Exit Intent Popup -->
        <div id="exitIntentModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center hidden">
            <div class="bg-white max-w-md mx-4 minimal-corner shadow-2xl border-4 border-orange-300 transform scale-95 transition-all duration-300" id="exitModalContent">
                <div class="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 text-center">
                    <div class="w-16 h-16 bg-white/20 minimal-corner mx-auto mb-4 flex items-center justify-center">
                        <i class="fas fa-exclamation-triangle text-white text-2xl animate-bounce"></i>
                    </div>
                    <h3 class="text-2xl font-bold mb-2">BEKLE!</h3>
                    <p class="text-orange-100 text-sm">Gitmeden önce bu özel teklifi kaçırma!</p>
                </div>
                
                <div class="p-8 text-center">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">
                        🎁 SIZE ÖZEL %20 İNDİRİM!
                    </h4>
                    <p class="text-gray-600 mb-6">
                        Bu sayfadan ayrılmadan önce size özel hazırladığımız 
                        <strong>%20 indirim fırsatını</strong> değerlendirin!
                    </p>
                    
                    <div class="bg-gradient-to-r from-green-50 to-blue-50 p-4 minimal-corner mb-6 border-2 border-green-200">
                        <div class="flex items-center justify-center mb-3">
                            <i class="fas fa-gift text-green-600 text-xl mr-3"></i>
                            <span class="font-bold text-green-800">BONUS AVANTAJLAR:</span>
                        </div>
                        <div class="text-sm space-y-1 text-left">
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-600 mr-2"></i>
                                <span>%20 İndirim (Tüm hizmetlerde geçerli)</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-600 mr-2"></i>
                                <span>Ücretsiz keşif (Normalde 50₺)</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-600 mr-2"></i>
                                <span>7/24 öncelikli destek</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-600 mr-2"></i>
                                <span>1 yıl ek garanti</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <button 
                            onclick="acceptExitOffer()"
                            class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 minimal-corner transition duration-200 transform hover:scale-105 shadow-lg"
                        >
                            <i class="fas fa-rocket mr-2"></i>
                            %20 İNDİRİM İLE HİZMET AL
                        </button>
                        <button 
                            onclick="closeExitModal()"
                            class="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-6 minimal-corner transition duration-200"
                        >
                            Hayır, indirim istemiyorum
                        </button>
                    </div>
                    
                    <p class="text-xs text-gray-500 mt-4">
                        Bu teklif sadece bu sayfaya özeldir ve tekrar edilmeyecektir.
                    </p>
                </div>
            </div>
        </div>

        <!-- Urgency Timer Popup -->
        <div id="urgencyTimerPopup" class="fixed bottom-6 left-6 z-50 max-w-sm hidden">
            <div class="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 minimal-corner shadow-2xl border-2 border-white transform hover:scale-105 transition-all duration-300">
                <div class="flex items-center mb-3">
                    <i class="fas fa-clock text-yellow-300 mr-3 animate-pulse text-lg"></i>
                    <div class="font-bold text-sm">⏰ SÜRE DOLUYOR!</div>
                </div>
                <p class="text-xs mb-3 text-purple-100">
                    Bu özel fiyatlar <strong>sadece bugün</strong> geçerli!
                </p>
                <div class="bg-white/20 p-3 minimal-corner text-center mb-3">
                    <div class="text-xs text-purple-200 mb-1">Kalan Süre:</div>
                    <div id="urgencyTimerDisplay" class="text-lg font-bold text-yellow-300">
                        05:42:17
                    </div>
                </div>
                <button 
                    onclick="scrollToService(); closeUrgencyTimer();"
                    class="w-full bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold py-2 px-4 minimal-corner transition duration-200 text-sm"
                >
                    HEMEN BAŞVUR
                </button>
                <button 
                    onclick="closeUrgencyTimer()"
                    class="absolute top-2 right-2 text-white/80 hover:text-white text-xs"
                >
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>

        <!-- Smart Conversion Notifications -->
        <div id="conversionNotifications" class="fixed bottom-20 right-6 z-40 space-y-3 max-w-xs">
            <!-- Dynamic conversion alerts will be added here -->
        </div>

        <script>
        // Smart Alert & Motivation System Functions
        let exitIntentTriggered = false;
        let discountTimerActive = false;
        let urgencyTimerActive = false;
        
        // Scarcity notifications data
        const scarcityMessages = [
            {
                icon: 'fas fa-users',
                color: 'orange',
                title: 'Son 3 Uzman Kaldı!',
                message: 'Elektrik kategorisinde sadece 3 uzman müsait',
                type: 'warning'
            },
            {
                icon: 'fas fa-clock',
                color: 'red', 
                title: 'Bu Fiyat 2 Saatte Bitiyor!',
                message: 'Özel indirimli fiyat son 2 saatte',
                type: 'urgent'
            },
            {
                icon: 'fas fa-fire',
                color: 'purple',
                title: '12 Kişi Bu Sayfada!',
                message: 'Şu anda 12 kişi aynı hizmete bakıyor',
                type: 'social'
            },
            {
                icon: 'fas fa-star',
                color: 'green',
                title: 'Bu Ayın En Popüler Hizmeti!',
                message: 'Bu kategoride 847 kişi hizmet aldı',
                type: 'social'
            },
            {
                icon: 'fas fa-bolt',
                color: 'blue',
                title: 'Hızla Doluyoruz!',
                message: 'Yarın için sadece 5 randevu kaldı',
                type: 'urgency'
            }
        ];

        // Initialize smart alert system
        function initSmartAlertSystem() {
            // Show initial discount banner after 3 seconds
            setTimeout(() => {
                showDiscountBanner();
            }, 3000);
            
            // Start scarcity notifications after 5 seconds
            setTimeout(() => {
                startScarcityNotifications();
            }, 5000);
            
            // Show urgency timer after 30 seconds
            setTimeout(() => {
                showUrgencyTimer();
            }, 30000);
            
            // Setup exit intent detection
            setupExitIntentDetection();
            
            // Start conversion notifications
            setTimeout(() => {
                startConversionNotifications();
            }, 10000);
        }

        // Scarcity notifications system
        function startScarcityNotifications() {
            let currentIndex = 0;
            
            function showNextScarcity() {
                if (currentIndex >= scarcityMessages.length) {
                    currentIndex = 0;
                }
                
                const message = scarcityMessages[currentIndex];
                showScarcityNotification(message);
                currentIndex++;
                
                // Show next notification after 15-25 seconds
                setTimeout(showNextScarcity, 15000 + Math.random() * 10000);
            }
            
            showNextScarcity();
        }

        function showScarcityNotification(messageData) {
            const container = document.getElementById('scarcityNotifications');
            const notification = document.createElement('div');
            const notificationId = 'scarcity-' + Date.now();
            
            notification.id = notificationId;
            notification.className = 'bg-white border-l-4 border-' + messageData.color + '-500 shadow-lg minimal-corner p-4 transform translate-x-full transition-all duration-500';
            
            notification.innerHTML = 
                '<div class="flex items-start">' +
                    '<div class="w-8 h-8 bg-' + messageData.color + '-500 minimal-corner flex items-center justify-center mr-3 mt-1">' +
                        '<i class="' + messageData.icon + ' text-white text-sm"></i>' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<h4 class="font-bold text-' + messageData.color + '-800 text-sm">' + messageData.title + '</h4>' +
                        '<p class="text-gray-600 text-xs mt-1">' + messageData.message + '</p>' +
                    '</div>' +
                    '<button onclick="closeScarcityNotification(\'' + notificationId + '\')" class="text-gray-400 hover:text-gray-600 ml-2">' +
                        '<i class="fas fa-times text-xs"></i>' +
                    '</button>' +
                '</div>';
            
            container.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.classList.remove('translate-x-full');
            }, 100);
            
            // Auto remove after 8 seconds
            setTimeout(() => {
                closeScarcityNotification(notificationId);
            }, 8000);
        }

        function closeScarcityNotification(notificationId) {
            const notification = document.getElementById(notificationId);
            if (notification) {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    notification.remove();
                }, 500);
            }
        }

        // Discount banner system
        function showDiscountBanner() {
            if (discountTimerActive) return;
            
            discountTimerActive = true;
            const banner = document.getElementById('discountBanner');
            banner.classList.remove('hidden');
            
            // Start countdown timer (3 hours)
            let timeLeft = 3 * 60 * 60; // 3 hours in seconds
            
            function updateDiscountTimer() {
                const hours = Math.floor(timeLeft / 3600);
                const minutes = Math.floor((timeLeft % 3600) / 60);
                const seconds = timeLeft % 60;
                
                const display = hours.toString().padStart(2, '0') + ':' + 
                              minutes.toString().padStart(2, '0') + ':' + 
                              seconds.toString().padStart(2, '0');
                
                const timerElement = document.getElementById('discountTimer');
                if (timerElement) {
                    timerElement.textContent = display;
                }
                
                if (timeLeft > 0) {
                    timeLeft--;
                    setTimeout(updateDiscountTimer, 1000);
                } else {
                    closeDiscountBanner();
                }
            }
            
            updateDiscountTimer();
        }

        function closeDiscountBanner() {
            const banner = document.getElementById('discountBanner');
            banner.classList.add('hidden');
            discountTimerActive = false;
        }

        // Exit intent detection
        function setupExitIntentDetection() {
            let exitIntentTimeout;
            
            document.addEventListener('mouseleave', function(e) {
                if (e.clientY <= 0 && !exitIntentTriggered) {
                    exitIntentTimeout = setTimeout(() => {
                        showExitIntentModal();
                    }, 500);
                }
            });
            
            document.addEventListener('mouseenter', function() {
                clearTimeout(exitIntentTimeout);
            });
        }

        function showExitIntentModal() {
            if (exitIntentTriggered) return;
            
            exitIntentTriggered = true;
            const modal = document.getElementById('exitIntentModal');
            const content = document.getElementById('exitModalContent');
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.add('scale-100');
                content.classList.remove('scale-95');
            }, 100);
        }

        function closeExitModal() {
            const modal = document.getElementById('exitIntentModal');
            const content = document.getElementById('exitModalContent');
            
            content.classList.add('scale-95');
            content.classList.remove('scale-100');
            
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }

        function acceptExitOffer() {
            // Close modal
            closeExitModal();
            
            // Apply discount code (in real app, this would set a cookie or session variable)
            localStorage.setItem('specialDiscount', '20');
            
            // Scroll to service form
            scrollToService();
            
            // Show success notification
            showConversionNotification({
                icon: 'fas fa-gift',
                color: 'green',
                title: '%20 İndirim Uygulandı!',
                message: 'Özel indirimınız form doldururken otomatik uygulanacak',
                type: 'success'
            });
        }

        // Urgency timer popup
        function showUrgencyTimer() {
            if (urgencyTimerActive) return;
            
            urgencyTimerActive = true;
            const popup = document.getElementById('urgencyTimerPopup');
            popup.classList.remove('hidden');
            
            // Start countdown (6 hours)
            let timeLeft = 6 * 60 * 60;
            
            function updateUrgencyTimer() {
                const hours = Math.floor(timeLeft / 3600);
                const minutes = Math.floor((timeLeft % 3600) / 60);
                const seconds = timeLeft % 60;
                
                const display = hours.toString().padStart(2, '0') + ':' + 
                              minutes.toString().padStart(2, '0') + ':' + 
                              seconds.toString().padStart(2, '0');
                
                const timerElement = document.getElementById('urgencyTimerDisplay');
                if (timerElement) {
                    timerElement.textContent = display;
                }
                
                if (timeLeft > 0) {
                    timeLeft--;
                    setTimeout(updateUrgencyTimer, 1000);
                } else {
                    closeUrgencyTimer();
                }
            }
            
            updateUrgencyTimer();
        }

        function closeUrgencyTimer() {
            const popup = document.getElementById('urgencyTimerPopup');
            popup.classList.add('hidden');
            urgencyTimerActive = false;
        }

        // Conversion notifications
        function startConversionNotifications() {
            const conversionMessages = [
                { icon: 'fas fa-handshake', color: 'blue', title: 'Ahmet K. hizmeti aldı!', message: '5 dakika önce - Elektrik işleri' },
                { icon: 'fas fa-star', color: 'yellow', title: 'Mükemmel puan aldık!', message: 'Zeynep H. - 5/5 yıldız verdi' },
                { icon: 'fas fa-phone', color: 'green', title: 'Yeni teklif geldi!', message: 'Su tesisatı - 15 dakika içinde yanıt' },
                { icon: 'fas fa-medal', color: 'purple', title: 'Bu ay 1.250 mutlu müşteri!', message: 'Hedefimizi %145 aştık' }
            ];
            
            let index = 0;
            
            function showConversionNotification(messageData) {
                const container = document.getElementById('conversionNotifications');
                const notification = document.createElement('div');
                const notificationId = 'conversion-' + Date.now();
                
                notification.id = notificationId;
                notification.className = 'bg-white border border-gray-200 shadow-lg minimal-corner p-3 transform translate-y-full transition-all duration-500 hover:shadow-xl';
                
                notification.innerHTML = 
                    '<div class="flex items-center">' +
                        '<div class="w-6 h-6 bg-' + messageData.color + '-500 minimal-corner flex items-center justify-center mr-3">' +
                            '<i class="' + messageData.icon + ' text-white text-xs"></i>' +
                        '</div>' +
                        '<div class="flex-1">' +
                            '<h4 class="font-bold text-gray-800 text-xs">' + messageData.title + '</h4>' +
                            '<p class="text-gray-600 text-xs">' + messageData.message + '</p>' +
                        '</div>' +
                    '</div>';
                
                container.appendChild(notification);
                
                // Animate in
                setTimeout(() => {
                    notification.classList.remove('translate-y-full');
                }, 100);
                
                // Auto remove after 5 seconds
                setTimeout(() => {
                    notification.classList.add('translate-y-full');
                    setTimeout(() => {
                        notification.remove();
                    }, 500);
                }, 5000);
            }
            
            function showNextConversion() {
                if (index >= conversionMessages.length) {
                    index = 0;
                }
                showConversionNotification(conversionMessages[index]);
                index++;
                
                // Show next after 12-20 seconds
                setTimeout(showNextConversion, 12000 + Math.random() * 8000);
            }
            
            showNextConversion();
        }

        // Smart Form Optimization & Conversion Boost System Functions
        let formProgress = 0;
        let completedSteps = new Set();

        // Form progress tracking
        function updateFormProgress() {
            const requiredFields = [
                { id: 'customerName', step: 1 },
                { id: 'customerPhone', step: 1 },
                { id: 'customerCity', step: 2 },
                { id: 'serviceCategory', step: 3 },
                { id: 'problemDescription', step: 4 }
            ];

            let filledFields = 0;
            let currentStep = 1;

            requiredFields.forEach(field => {
                const element = document.getElementById(field.id);
                if (element && element.value.trim()) {
                    filledFields++;
                    currentStep = Math.max(currentStep, field.step);
                }
            });

            const progress = Math.round((filledFields / requiredFields.length) * 100);
            formProgress = progress;

            // Update progress bar
            const progressBar = document.getElementById('smartProgressBar');
            const progressPercent = document.getElementById('formCompletionPercent');
            
            if (progressBar) {
                progressBar.style.width = progress + '%';
            }
            if (progressPercent) {
                progressPercent.textContent = progress + '%';
            }

            // Update step indicators
            updateStepIndicators(currentStep);

            // Show completion reward at 100%
            if (progress === 100) {
                showCompletionReward();
            }
        }

        function updateStepIndicators(currentStep) {
            for (let i = 1; i <= 5; i++) {
                const stepElement = document.getElementById('step' + i);
                const circle = stepElement.querySelector('.w-6');
                const text = stepElement.querySelector('div:last-child');

                if (i <= currentStep) {
                    circle.classList.remove('bg-gray-300');
                    circle.classList.add('bg-green-500');
                    text.classList.remove('text-gray-500');
                    text.classList.add('text-green-700');
                } else {
                    circle.classList.remove('bg-green-500');
                    circle.classList.add('bg-gray-300');
                    text.classList.remove('text-green-700');
                    text.classList.add('text-gray-500');
                }
            }
        }

        function validateStep(stepNumber) {
            if (completedSteps.has(stepNumber)) return;

            let isValid = false;
            let rewardElement;

            switch(stepNumber) {
                case 1:
                    const name = document.getElementById('customerName').value.trim();
                    const phone = document.getElementById('customerPhone').value.trim();
                    isValid = name && phone;
                    rewardElement = document.getElementById('step1Reward');
                    
                    if (name) {
                        document.getElementById('nameValidation').classList.remove('hidden');
                    }
                    if (phone) {
                        document.getElementById('phoneValidation').classList.remove('hidden');
                    }
                    break;

                case 2:
                    const city = document.getElementById('customerCity').value;
                    isValid = city;
                    rewardElement = document.getElementById('step2Reward');
                    
                    if (city) {
                        document.getElementById('cityValidation').classList.remove('hidden');
                    }
                    break;

                case 3:
                    const category = document.getElementById('serviceCategory').value;
                    isValid = category;
                    rewardElement = document.getElementById('step3Reward');
                    
                    if (category) {
                        document.getElementById('categoryValidation').classList.remove('hidden');
                    }
                    break;

                case 4:
                    const description = document.getElementById('problemDescription').value.trim();
                    isValid = description.length > 10;
                    rewardElement = document.getElementById('step4Reward');
                    
                    if (description.length > 10) {
                        document.getElementById('descriptionValidation').classList.remove('hidden');
                    }
                    break;
            }

            if (isValid && !completedSteps.has(stepNumber)) {
                completedSteps.add(stepNumber);
                showStepReward(rewardElement);
            }
        }

        function showStepReward(rewardElement) {
            if (rewardElement) {
                rewardElement.classList.remove('hidden');
                rewardElement.classList.add('animate-bounce');
                
                setTimeout(() => {
                    rewardElement.classList.remove('animate-bounce');
                }, 1000);
                
                setTimeout(() => {
                    rewardElement.classList.add('hidden');
                }, 3000);
            }
        }

        function showCompletionReward() {
            const step5Reward = document.getElementById('step5Reward');
            if (step5Reward && !step5Reward.classList.contains('animate-bounce')) {
                step5Reward.classList.remove('hidden');
                step5Reward.classList.add('animate-bounce');
                
                // Update submit button
                const submitBtn = document.getElementById('smartSubmitBtn');
                const btnText = document.getElementById('submitBtnText');
                
                submitBtn.classList.remove('animate-pulse');
                submitBtn.classList.add('animate-bounce');
                btnText.textContent = '🎉 TAMAMLA & UZMAN EŞLEŞTIR!';
            }
        }

        // One-Click Modal
        function showOneClickModal() {
            let modal = document.getElementById('oneClickModal');
            if (modal) {
                modal.remove();
            }

            modal = document.createElement('div');
            modal.id = 'oneClickModal';
            modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center';
            modal.innerHTML = 
                '<div class="bg-white max-w-md mx-4 minimal-corner shadow-2xl border-4 border-orange-300 transform scale-95 transition-all duration-300">' +
                    '<div class="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 text-center">' +
                        '<div class="w-16 h-16 bg-white/20 minimal-corner mx-auto mb-4 flex items-center justify-center">' +
                            '<i class="fas fa-rocket text-white text-2xl animate-bounce"></i>' +
                        '</div>' +
                        '<h3 class="text-2xl font-bold mb-2">TEK TIKLA BAŞVUR</h3>' +
                        '<p class="text-orange-100 text-sm">Sadece 2 bilgi - Hemen uzman eşleştirme!</p>' +
                    '</div>' +
                    '<div class="p-8">' +
                        '<div class="space-y-4">' +
                            '<div>' +
                                '<label class="block text-sm font-bold text-gray-800 mb-2">Telefon Numaranız</label>' +
                                '<input type="tel" id="quickPhone" class="w-full p-3 border-2 border-gray-200 minimal-corner focus:border-orange-500" placeholder="0 5xx xxx xx xx">' +
                            '</div>' +
                            '<div>' +
                                '<label class="block text-sm font-bold text-gray-800 mb-2">Hangi Hizmet?</label>' +
                                '<select id="quickService" class="w-full p-3 border-2 border-gray-200 minimal-corner focus:border-orange-500">' +
                                    '<option value="">Seçiniz...</option>' +
                                    '<option value="Elektrik">Elektrik İşleri</option>' +
                                    '<option value="Beyaz Eşya">Beyaz Eşya Tamiri</option>' +
                                    '<option value="Su Tesisatı">Su Tesisatı</option>' +
                                    '<option value="Kombi">Kombi & Kalorifer</option>' +
                                    '<option value="Temizlik">Temizlik Hizmetleri</option>' +
                                '</select>' +
                            '</div>' +
                        '</div>' +
                        '<div class="mt-6 space-y-3">' +
                            '<button onclick="submitOneClick()" class="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 minimal-corner transition duration-200">' +
                                '<i class="fas fa-rocket mr-2"></i>HEMEN UZMAN EŞLEŞTIR' +
                            '</button>' +
                            '<button onclick="closeOneClickModal()" class="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-6 minimal-corner transition duration-200">' +
                                'İptal' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            
            document.body.appendChild(modal);
            
            setTimeout(() => {
                modal.querySelector('.bg-white').classList.add('scale-100');
                modal.querySelector('.bg-white').classList.remove('scale-95');
            }, 100);
        }

        function closeOneClickModal() {
            const modal = document.getElementById('oneClickModal');
            if (modal) {
                const content = modal.querySelector('.bg-white');
                content.classList.add('scale-95');
                content.classList.remove('scale-100');
                
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
        }

        function submitOneClick() {
            const phone = document.getElementById('quickPhone').value.trim();
            const service = document.getElementById('quickService').value;
            
            if (!phone || !service) {
                alert('Lütfen telefon numarası ve hizmet türü seçiniz.');
                return;
            }
            
            // Simulate quick submit
            const submitBtn = event.target;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Eşleştiriliyor...';
            submitBtn.disabled = true;
            
            setTimeout(() => {
                closeOneClickModal();
                showSuccessCelebration('Harika! 3 uzman telefon numaranıza WhatsApp mesajı gönderecek. 5 dakika içinde teklifler gelecek!');
            }, 2000);
        }

        // Instant Callback
        function requestInstantCallback() {
            const phone = prompt('Telefon numaranız (0 5xx xxx xx xx):');
            
            if (!phone) return;
            
            if (phone.length < 10) {
                alert('Lütfen geçerli bir telefon numarası girin.');
                return;
            }
            
            // Simulate callback request
            showCallbackConfirmation(phone);
        }

        function showCallbackConfirmation(phone) {
            let modal = document.getElementById('callbackModal');
            if (modal) {
                modal.remove();
            }

            modal = document.createElement('div');
            modal.id = 'callbackModal';
            modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center';
            modal.innerHTML = 
                '<div class="bg-white max-w-md mx-4 minimal-corner shadow-2xl border-4 border-green-300">' +
                    '<div class="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 text-center">' +
                        '<div class="w-16 h-16 bg-white/20 minimal-corner mx-auto mb-4 flex items-center justify-center">' +
                            '<i class="fas fa-phone text-white text-2xl animate-pulse"></i>' +
                        '</div>' +
                        '<h3 class="text-2xl font-bold mb-2">TELEFON GELİYOR!</h3>' +
                        '<p class="text-green-100 text-sm">30 saniye içinde ' + phone + ' aranacak</p>' +
                    '</div>' +
                    '<div class="p-8 text-center">' +
                        '<div class="mb-6">' +
                            '<div class="text-3xl font-bold text-green-600 mb-2" id="callbackCountdown">30</div>' +
                            '<div class="text-sm text-gray-600">saniye sonra telefon çalacak</div>' +
                        '</div>' +
                        '<button onclick="closeCallbackModal()" class="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-6 minimal-corner transition duration-200">' +
                            'İptal Et' +
                        '</button>' +
                    '</div>' +
                '</div>';
            
            document.body.appendChild(modal);
            
            // Countdown timer
            let countdown = 30;
            const countdownElement = document.getElementById('callbackCountdown');
            
            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdownElement) {
                    countdownElement.textContent = countdown;
                }
                
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    closeCallbackModal();
                    showSuccessCelebration('Telefon çalıyor! Lütfen açın. Uzmanımız size hizmet detaylarını soracak.');
                }
            }, 1000);
        }

        function closeCallbackModal() {
            const modal = document.getElementById('callbackModal');
            if (modal) {
                modal.remove();
            }
        }

        // Helper functions for form enhancement
        function showNearbyExperts() {
            const city = document.getElementById('customerCity').value;
            if (city) {
                const expertsCount = Math.floor(Math.random() * 10) + 15; // 15-25 uzman
                showTemporaryMessage('step2Reward', expertsCount + ' uzman ' + city + ' için bulundu!', 3000);
            }
        }

        function showEstimatedPrice() {
            const category = document.getElementById('serviceCategory').value;
            if (category) {
                const prices = {
                    'Elektrik İşleri': '₺180-500',
                    'Beyaz Eşya': '₺250-800',
                    'Su Tesisatı': '₺200-600'
                };
                const price = prices[category] || '₺200-700';
                showTemporaryMessage('step3Reward', 'Tahmini maliyet: ' + price, 3000);
            }
        }

        function analyzeDescription() {
            const description = document.getElementById('problemDescription').value;
            const charCountElement = document.getElementById('charCount');
            
            if (charCountElement) {
                charCountElement.textContent = description.length;
            }
            
            if (description.length > 20) {
                showTemporaryMessage('step4Reward', 'Detaylı açıklama - Daha hızlı çözüm!', 3000);
            }
        }

        function showTemporaryMessage(elementId, message, duration) {
            const element = document.getElementById(elementId);
            if (element) {
                const originalContent = element.innerHTML;
                element.innerHTML = '<i class="fas fa-info-circle mr-1"></i>' + message;
                element.classList.remove('hidden');
                
                setTimeout(() => {
                    element.innerHTML = originalContent;
                    element.classList.add('hidden');
                }, duration);
            }
        }

        // Enhanced form submit
        function handleSmartSubmit(event) {
            event.preventDefault();
            
            // Enhanced success celebration
            showSuccessCelebration(
                'MÜKEMMEL! 🎉 Talebiniz alındı.\n\n' +
                '✅ 3-5 uzman size ulaşacak\n' +
                '⏰ İlk teklif 5 dakika içinde\n' +
                '🏆 %100 garanti ile güvende\n\n' +
                'WhatsApp mesajları geliyor...'
            );
        }

        function showSuccessCelebration(message) {
            let modal = document.getElementById('successCelebrationModal');
            if (modal) {
                modal.remove();
            }

            modal = document.createElement('div');
            modal.id = 'successCelebrationModal';
            modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center';
            modal.innerHTML = 
                '<div class="bg-white max-w-lg mx-4 minimal-corner shadow-2xl border-4 border-green-300 transform scale-95 transition-all duration-500">' +
                    '<div class="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 text-white p-8 text-center">' +
                        '<div class="w-20 h-20 bg-white/20 minimal-corner mx-auto mb-6 flex items-center justify-center animate-bounce">' +
                            '<i class="fas fa-trophy text-yellow-300 text-3xl"></i>' +
                        '</div>' +
                        '<h3 class="text-3xl font-bold mb-4">BAŞARILI! 🎉</h3>' +
                        '<p class="text-green-100">' + message.replace(/\n/g, '<br>') + '</p>' +
                    '</div>' +
                    '<div class="p-8 text-center">' +
                        '<button onclick="closeSuccessCelebration()" class="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-4 px-8 minimal-corner transition duration-200 shadow-lg">' +
                            '<i class="fas fa-check mr-2"></i>HARIKA!' +
                        '</button>' +
                    '</div>' +
                '</div>';
            
            document.body.appendChild(modal);
            
            setTimeout(() => {
                modal.querySelector('.bg-white').classList.add('scale-100');
                modal.querySelector('.bg-white').classList.remove('scale-95');
            }, 100);
            
            // Add confetti animation
            createConfetti();
        }

        function closeSuccessCelebration() {
            const modal = document.getElementById('successCelebrationModal');
            if (modal) {
                modal.remove();
            }
        }

        function createConfetti() {
            // Simple confetti animation
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
            
            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.style.cssText = 'position:fixed;width:10px;height:10px;background:' + colors[Math.floor(Math.random() * colors.length)] + ';z-index:9999;pointer-events:none;';
                    confetti.style.left = Math.random() * 100 + '%';
                    confetti.style.top = '-10px';
                    
                    document.body.appendChild(confetti);
                    
                    const animation = confetti.animate([
                        { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                        { transform: 'translateY(100vh) rotate(360deg)', opacity: 0 }
                    ], {
                        duration: 3000,
                        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    });
                    
                    animation.onfinish = () => confetti.remove();
                }, i * 50);
            }
        }

        // Initialize smart form system
        document.addEventListener('DOMContentLoaded', function() {
            // Add character counter to description
            const descriptionField = document.getElementById('problemDescription');
            if (descriptionField) {
                descriptionField.addEventListener('input', function() {
                    const charCount = document.getElementById('charCount');
                    if (charCount) {
                        charCount.textContent = this.value.length;
                    }
                });
            }
            
            // Initialize progress tracking
            updateFormProgress();
        });

        // Initialize system on page load
        document.addEventListener('DOMContentLoaded', function() {
            // Delay initialization to not interfere with main page load
            setTimeout(() => {
                initSmartAlertSystem();
            }, 2000);
        });
        </script>

    </body>
    </html>
  `);
})

export default app
