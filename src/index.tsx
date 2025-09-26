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
// API Routes - TV Servis Yonetim Sistemi
// =============================================================================

// AI Chat API Endpoint (placeholder for future AI integration)
app.post('/api/ai-chat', async (c) => {
  try {
    const { message, sessionId } = await c.req.json()
    
    if (!message) {
      return c.json({ error: 'Mesaj gerekli' }, 400)
    }
    
    // TODO: Buraya gercek yapay zeka servisinizi entegre edeceksiniz
    // Ornek: OpenAI, Google Gemini, Azure AI, vb.
    
    // Simdilik basit cevap sistemini kullaniyoruz
    const responses = {
      'televizyon': 'Televizyon tamiri genellikle 1-2 saat surer. LED panel sorunu ise parca temininden sonra ayni gun tamamlanabilir. Ucretsiz kesif icin hemen talep formu doldurabilirsiniz.',
      'fiyat': 'Fiyatlarimiz is turune gore degisir. Televizyon tamiri 600-2000TL, camasir makinesi 800-1800TL araliginda. Kesin fiyat ucretsiz kesiften sonra belirlenir.',
      'odeme': 'Odeme is tamamlandiktan ve onayinizdan sonra yapilir. Nakit, kart veya havale seceneklerimiz var. Is oncesi sadece parca bedeli alinabilir.',
      'garanti': 'Tum islerimizde 6 ay iscilik garantisi veriyoruz. Ayni sorun tekrarlarsa ucretsiz cozum sagliyoruz.',
      'sure': 'Ortalama yanit suremiz 15 dakikadir. Acil durumlar icin telefon ile direkt ulasabilirsiniz: 0 500 123 45 67'
    }
    
    const lowerMessage = message.toLowerCase()
    let response = 'Sorununuz icin size yardimci olmak istiyorum.\n\n📞 Hemen arayabilirsiniz: 0 500 123 45 67\n💬 WhatsApp: wa.me/905001234567\n📝 Veya hizmet talep formu doldurabilirsiniz.\n\nBaska sorulariniz varsa cekinmeden sorun!'
    
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
      error: 'Yapay zeka servisi gecici olarak kullanilamiyor' 
    }, 500)
  }
})

// Smart Recommendation API Endpoint
app.post('/api/smart-recommendation', async (c) => {
  try {
    const { problemDescription, urgencyLevel, serviceLocation } = await c.req.json()
    
    if (!problemDescription) {
      return c.json({ error: 'Problem aciklamasi gerekli' }, 400)
    }
    
    // Service categories matching (this would be powered by real AI in production)
    const serviceCategories = {
      'ev_elektrigi': {
        keywords: ['elektrik', 'priz', 'sigorta', 'kablo', 'ampul', 'lamba', 'salter', 'kacak', 'kesinti', 'voltaj'],
        name: 'Ev Elektrigi',
        priceRange: 'TL150-800',
        urgency: { emergency: '30dk', urgent: '1-2 saat', normal: '2-4 saat' }
      },
      'beyaz_esya': {
        keywords: ['buzdolabi', 'camasir makinesi', 'bulasik makinesi', 'firin', 'ocak', 'mikrodalga', 'klima', 'sogutmuyor', 'calismiyor'],
        name: 'Beyaz Esya Tamiri',
        priceRange: 'TL200-1200',
        urgency: { emergency: '1 saat', urgent: '2-4 saat', normal: '4-8 saat' }
      },
      'su_tesisati': {
        keywords: ['musluk', 'tikaniklik', 'su kacagi', 'boru', 'sifon', 'klozet', 'rezervuar', 'damla', 'akiyor', 'tikali'],
        name: 'Su Tesisati',
        priceRange: 'TL100-600',
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
        `Merhaba! ${bestMatch.name} konusunda yardim istiyorum. Problem: ${problemDescription}` :
        `Merhaba! Su konuda yardim istiyorum: ${problemDescription}`,
      estimatedCost: bestMatch ? bestMatch.priceRange : 'TL100-1000',
      responseTime: bestMatch ? bestMatch.urgency[urgencyLevel] : '1-3 saat'
    })
    
  } catch (error) {
    console.error('Smart recommendation error:', error)
    return c.json({ 
      error: 'Oneri sistemi gecici olarak kullanilamiyor' 
    }, 500)
  }
})

// Customer Service Request - n8n Webhook Integration
app.post('/api/service-request', async (c) => {
  const { DB } = c.env
  
  try {
    // Form verilerini al
    const requestData = await c.req.json()
    
    // Gerekli alanlari kontrol et
    const { customerName, customerPhone, customerCity, serviceCategory, problemDescription } = requestData
    
    if (!customerName || !customerPhone || !serviceCategory || !problemDescription) {
      return c.json({ 
        success: false, 
        error: 'Gerekli alanlar eksik' 
      }, 400)
    }
    
    // Timestamp ve benzersiz talep kodu olustur
    const timestamp = new Date().toISOString()
    const requestCode = `GRT-${Date.now()}`
    
    // n8n webhook icin data hazirla
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
    
    // n8n webhook URL'si (environment variable olarak tanimlanmali)
    // Production'da gercek n8n webhook URL'ini buraya ekleyeceksiniz
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || null
    
    if (n8nWebhookUrl) {
      try {
        // n8n'e webhook gonder
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
        // Webhook hatasi olsa bile local kaydi yapip kullaniciya basarili donus verebiliriz
      }
    } else {
      console.log('n8n webhook URL not configured, skipping webhook call')
    }
    
    // Local database'e de kaydet (opsiyonel, backup icin)
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
      // DB hatasi olsa bile webhook calistigi icin basarili sayabiliriz
    }
    
    return c.json({
      success: true,
      message: 'Talebiniz basariyla alindi',
      requestCode,
      data: {
        estimatedResponse: '15 dakika icinde',
        nextSteps: [
          'Uzmanlarimiz talebinizi degerlendirecek',
          'Size telefon veya WhatsApp ile ulasilacak', 
          'Ucretsiz kesif randevusu ayarlanacak'
        ]
      }
    })
    
  } catch (error) {
    console.error('Service request error:', error)
    return c.json({ 
      success: false, 
      error: 'Talep islenirken hata olustu' 
    }, 500)
  }
})

// Dashboard ana istatistikler
app.get('/api/dashboard/stats', async (c) => {
  const { DB } = c.env
  
  try {
    // Toplam is sayilari
    const totalJobs = await DB.prepare('SELECT COUNT(*) as count FROM is_talepleri').first()
    const activeJobs = await DB.prepare('SELECT COUNT(*) as count FROM is_talepleri WHERE durum IN ("yeni", "atandi", "devam_ediyor")').first()
    const completedJobs = await DB.prepare('SELECT COUNT(*) as count FROM is_talepleri WHERE durum = "tamamlandi"').first()
    const totalDealers = await DB.prepare('SELECT COUNT(*) as count FROM bayiler WHERE aktif = 1').first()
    
    // Son 7 gunun isleri
    const recentJobs = await DB.prepare(`
      SELECT DATE(created_at) as tarih, COUNT(*) as sayi
      FROM is_talepleri 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY tarih DESC
    `).all()
    
    // Il bazinda is dagilimi
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
    return c.json({ error: 'Veriler alinamadi' }, 500)
  }
})

// Aktif isleri listele
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
      WHERE it.durum IN ('yeni', 'atandi', 'devam_ediyor')
      ORDER BY 
        CASE it.oncelik 
          WHEN 'yuksek' THEN 1
          WHEN 'normal' THEN 2 
          WHEN 'dusuk' THEN 3
        END,
        it.created_at DESC
    `).all()
    
    return c.json(jobs.results || [])
  } catch (error) {
    console.error('Active jobs error:', error)
    return c.json({ error: 'Isler listelenemedi' }, 500)
  }
})

// Bayileri listele (il bazinda)
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

// Illeri listele
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
    return c.json({ error: 'Iller listelenemedi' }, 500)
  }
})

// Is atamasi yap
app.post('/api/jobs/:id/assign', async (c) => {
  const { DB } = c.env
  const jobId = c.req.param('id')
  const { bayiId, notlar } = await c.req.json()
  
  try {
    // Isi bayiye ata
    await DB.prepare(`
      UPDATE is_talepleri 
      SET bayi_id = ?, durum = 'atandi', atama_tarihi = datetime('now'), notlar = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(bayiId, notlar || '', jobId).run()
    
    // Gecmise kaydet
    await DB.prepare(`
      INSERT INTO is_gecmisi (is_talep_id, eski_durum, yeni_durum, aciklama, degistiren)
      VALUES (?, 'yeni', 'atandi', ?, 'sistem')
    `).bind(jobId, `Bayi ID ${bayiId} atandi`).run()
    
    return c.json({ success: true, message: 'Is basariyla atandi' })
  } catch (error) {
    console.error('Job assignment error:', error)
    return c.json({ error: 'Is atanamadi' }, 500)
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
    
    // Burada WhatsApp verisini parse edip is talebi olusturacaksiniz
    // Simdilik sadece log aliyoruz
    
    return c.json({ 
      success: true, 
      message: 'WhatsApp verisi alindi ve islenmek uzere kaydedildi' 
    })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return c.json({ error: 'Webhook islenemedi' }, 500)
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
    
    // Form verisini parse edip is talebi olustur
    // Bu ornek implementasyon - gercek form yapiniza gore uyarlayin
    
    return c.json({ 
      success: true, 
      message: 'Form verisi alindi ve islenmek uzere kaydedildi' 
    })
  } catch (error) {
    console.error('Form webhook error:', error)
    return c.json({ error: 'Webhook islenemedi' }, 500)
  }
})

// Test endpoint - Reset job for testing (gelistirme icin)
app.post('/api/test/reset-job/:id', async (c) => {
  const { DB } = c.env
  const jobId = c.req.param('id')
  
  try {
    // Isi reset et
    await DB.prepare(`
      UPDATE is_talepleri 
      SET satin_alan_bayi_id = NULL, 
          satin_alma_tarihi = NULL, 
          satin_alma_fiyati = NULL,
          durum = 'yeni',
          goruntuleme_durumu = 'kisitli'
      WHERE id = ?
    `).bind(jobId).run()
    
    return c.json({ success: true, message: `Is ${jobId} reset edildi` })
  } catch (error) {
    console.error('Reset job error:', error)
    return c.json({ error: 'Reset basarisiz' }, 500)
  }
})

// =============================================================================
// Bayi API Routes - Authentication ve Is Yonetimi
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
    
      // Bayiyi veritabaninda ara  
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
        throw new AuthenticationError('Gecersiz email veya sifre')
      }
      
      if (!bayi.aktif_login) {
        SystemLogger.warn('Auth', 'Bayi account deactivated', { email })
        throw new AuthenticationError('Hesabiniz deaktif edilmis')
      }
    
    // Gecici: Hard-coded sifre kontrolu (debug icin)
    if (password === '123456') {
      // Basarili login
      const token = 'test-bayi-token-123'
      return c.json({
        success: true,
        message: 'Giris basarili', 
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
      throw new AuthenticationError('Gecersiz email veya sifre')
    }
    
    // JWT token olustur
    const token = generateBayiToken({
      id: bayi.id,
      login_email: bayi.login_email,
      firma_adi: bayi.firma_adi,
      il_id: bayi.il_id
    })
    
    // Session olustur
    const sessionToken = generateSessionToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)
    
    await DB.prepare(`
      INSERT INTO bayi_sessions (bayi_id, session_token, expires_at, ip_adres)
      VALUES (?, ?, ?, ?)
    `).bind(bayi.id, sessionToken, expiresAt.toISOString(), c.req.header('cf-connecting-ip') || 'unknown').run()
    
    // Son giris tarihini guncelle
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
    return c.json({ error: 'Giris islemi basarisiz' }, 500)
  }
})

// Bayi logout endpoint
app.post('/api/bayi/logout', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Gecersiz token' }, 401)
    }
    
    // Session'lari deaktif et
    await DB.prepare(`
      UPDATE bayi_sessions SET aktif = 0 WHERE bayi_id = ?
    `).bind(bayiAuth.bayiId).run()
    
    return c.json({ success: true, message: 'Basariyla cikis yapildi' })
  } catch (error) {
    console.error('Bayi logout error:', error)
    return c.json({ error: 'Cikis islemi basarisiz' }, 500)
  }
})

// Bayi profil bilgileri
app.get('/api/bayi/profile', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Gecersiz token' }, 401)
    }
    
    const bayi = await DB.prepare(`
      SELECT id, bayi_kodu, firma_adi, yetkili_adi, telefon, email, 
             login_email, adres, uzmanlik_alani, rating, tamamlanan_is_sayisi,
             kredi_bakiye, il_id, ilce_id, son_giris
      FROM bayiler 
      WHERE id = ? AND aktif = 1
    `).bind(bayiAuth.bayiId).first()
    
    if (!bayi) {
      return c.json({ error: 'Bayi bulunamadi' }, 404)
    }
    
    return c.json(bayi)
  } catch (error) {
    console.error('Bayi profile error:', error)
    return c.json({ error: 'Profil bilgileri alinamadi' }, 500)
  }
})

// Bayi icin il bazli isler (kisitli bilgi)
app.get('/api/bayi/jobs', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Gecersiz token' }, 401)
    }
    
    // Sadece bayinin bulundugu ildeki isleri goster (kisitli bilgi)
    const jobs = await DB.prepare(`
      SELECT 
        it.id, it.talep_kodu, it.aciklama, it.durum, it.oncelik,
        it.tv_marka, it.tv_model, it.created_at, it.is_fiyati,
        st.tur_adi as servis_turu,
        i.il_adi, ilc.ilce_adi,
        -- Kisitli bilgiler (odeme yapana kadar tam bilgi yok)
        CASE 
          WHEN it.satin_alan_bayi_id = ? THEN m.ad_soyad
          ELSE 'Musteri Bilgisi Gizli'
        END as musteri_adi,
        CASE 
          WHEN it.satin_alan_bayi_id = ? THEN m.telefon
          ELSE 'Telefon Bilgisi Gizli'
        END as telefon,
        CASE 
          WHEN it.satin_alan_bayi_id = ? THEN m.adres
          ELSE CONCAT(i.il_adi, ' / ', COALESCE(ilc.ilce_adi, 'Ilce Belirtilmemis'))
        END as adres_bilgi,
        it.satin_alan_bayi_id,
        it.goruntuleme_durumu
      FROM is_talepleri it
      JOIN musteriler m ON it.musteri_id = m.id
      JOIN iller i ON m.il_id = i.id
      LEFT JOIN ilceler ilc ON m.ilce_id = ilc.id
      JOIN servis_turleri st ON it.servis_turu_id = st.id
      WHERE i.id = ? 
        AND it.durum IN ('yeni', 'atandi', 'devam_ediyor')
        AND (it.satin_alan_bayi_id IS NULL OR it.satin_alan_bayi_id = ?)
      ORDER BY 
        CASE it.oncelik 
          WHEN 'yuksek' THEN 1
          WHEN 'normal' THEN 2 
          WHEN 'dusuk' THEN 3
        END,
        it.created_at DESC
    `).bind(bayiAuth.bayiId, bayiAuth.bayiId, bayiAuth.bayiId, bayiAuth.ilId, bayiAuth.bayiId).all()
    
    return c.json(jobs.results || [])
  } catch (error) {
    console.error('Bayi jobs error:', error)
    return c.json({ error: 'Isler listelenemedi' }, 500)
  }
})

// Bayi kredi bakiyesi
app.get('/api/bayi/credits', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Gecersiz token' }, 401)
    }
    
    // Guncel bakiye
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
    return c.json({ error: 'Kredi bilgileri alinamadi' }, 500)
  }
})

// Bayi satin aldigi isler (tam bilgi)
app.get('/api/bayi/my-jobs', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Gecersiz token' }, 401)
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
    return c.json({ error: 'Satin aldiginiz isler listelenemedi' }, 500)
  }
})

// Is satin alma endpoint - Kredi ile odeme
app.post('/api/bayi/buy-job/:id', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  const jobId = c.req.param('id')
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Gecersiz token' }, 401)
    }
    
    // Transaction baslat (SQLite'da manuel transaction yonetimi)
    console.log(`Bayi ${bayiAuth.bayiId} isi ${jobId} satin almaya calisiyor...`)
    
    // 1. Is mevcut mu ve satin alinmis mi kontrol et
    const job = await DB.prepare(`
      SELECT it.id, it.talep_kodu, it.is_fiyati, it.satin_alan_bayi_id, it.durum,
             m.il_id, m.ad_soyad, m.telefon, m.adres
      FROM is_talepleri it
      JOIN musteriler m ON it.musteri_id = m.id
      WHERE it.id = ? AND it.durum IN ('yeni', 'atandi')
    `).bind(jobId).first()
    
    if (!job) {
      return c.json({ error: 'Is bulunamadi veya artik mevcut degil' }, 404)
    }
    
    // 2. Is zaten satin alinmis mi?
    if (job.satin_alan_bayi_id) {
      return c.json({ error: 'Bu is baska bir bayi tarafindan satin alindi' }, 409)
    }
    
    // 3. Is bayinin ilinde mi?
    if (job.il_id !== bayiAuth.ilId) {
      return c.json({ error: 'Bu is sizin ilinizde degil' }, 403)
    }
    
    // 4. Bayi kredi bakiyesi yeterli mi?
    const bayi = await DB.prepare(`
      SELECT id, kredi_bakiye FROM bayiler WHERE id = ?
    `).bind(bayiAuth.bayiId).first()
    
    if (!bayi || bayi.kredi_bakiye < job.is_fiyati) {
      return c.json({ 
        error: `Yetersiz kredi bakiyesi. Gerekli: ${job.is_fiyati} TL, Mevcut: ${bayi.kredi_bakiye || 0} TL` 
      }, 402)
    }
    
    // 5. Race condition check - Tekrar kontrol et (double-check locking)
    const finalCheck = await DB.prepare(`
      SELECT satin_alan_bayi_id FROM is_talepleri WHERE id = ?
    `).bind(jobId).first()
    
    if (finalCheck?.satin_alan_bayi_id) {
      return c.json({ error: 'Is bu sirada baska bir bayi tarafindan satin alindi' }, 409)
    }
    
    // 6. Isi satin al - Ilk isi guncelle
    const satinAlmaTarihi = new Date().toISOString()
    await DB.prepare(`
      UPDATE is_talepleri 
      SET satin_alan_bayi_id = ?, 
          satin_alma_tarihi = ?, 
          satin_alma_fiyati = ?,
          durum = 'atandi',
          goruntuleme_durumu = 'tam',
          updated_at = ?
      WHERE id = ? AND satin_alan_bayi_id IS NULL
    `).bind(bayiAuth.bayiId, satinAlmaTarihi, job.is_fiyati, satinAlmaTarihi, jobId).run()
    
    // 7. Kredi bakiyesini guncelle
    const yeniBakiye = bayi.kredi_bakiye - job.is_fiyati
    await DB.prepare(`
      UPDATE bayiler SET kredi_bakiye = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(yeniBakiye, bayiAuth.bayiId).run()
    
    // 8. Odeme islemi kaydi olustur
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
      `Is satin alma: ${job.talep_kodu}`,
      odemeResult.meta.last_row_id,
      jobId,
      satinAlmaTarihi
    ).run()
    
    // 10. Is gecmisi kaydet
    await DB.prepare(`
      INSERT INTO is_gecmisi (is_talep_id, eski_durum, yeni_durum, aciklama, degistiren, created_at)
      VALUES (?, 'yeni', 'atandi', ?, ?, ?)
    `).bind(
      jobId, 
      `Bayi tarafindan satin alindi - ${job.is_fiyati} TL`,
      bayiAuth.firma_adi,
      satinAlmaTarihi
    ).run()
    
    console.log(`✅ Is ${jobId} basariyla satin alindi - Bayi: ${bayiAuth.bayiId}, Tutar: ${job.is_fiyati} TL`)
    
    return c.json({
      success: true,
      message: `Is basariyla satin alindi! ${job.is_fiyati} TL kredi bakiyenizden dusuldu.`,
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
    console.error('Is satin alma hatasi:', error)
    return c.json({ 
      error: 'Is satin alma islemi basarisiz', 
      details: error.message 
    }, 500)
  }
})

// =============================================================================
// PayTR Odeme Sistemi API Routes
// =============================================================================

// PayTR kredi yukleme baslatma
app.post('/api/payment/paytr/init', async (c) => {
  const { DB } = c.env
  const authHeader = c.req.header('Authorization')
  const { amount } = await c.req.json()
  
  try {
    const bayiAuth = await verifyBayiAuth(authHeader, DB)
    if (!bayiAuth) {
      return c.json({ error: 'Gecersiz token' }, 401)
    }
    
    // Minimum tutar kontrolu
    const minAmount = 100; // Minimum 100 TL
    if (!amount || amount < minAmount) {
      return c.json({ error: `Minimum kredi yukleme tutari ${minAmount} TL` }, 400)
    }
    
    if (amount > 10000) {
      return c.json({ error: 'Maksimum kredi yukleme tutari 10.000 TL' }, 400)
    }
    
    // Bayi bilgilerini al
    const bayi = await DB.prepare(`
      SELECT id, firma_adi, yetkili_adi, telefon, login_email
      FROM bayiler WHERE id = ?
    `).bind(bayiAuth.bayiId).first()
    
    if (!bayi) {
      return c.json({ error: 'Bayi bulunamadi' }, 404)
    }
    
    // PayTR konfigurasyonu al
    const paytrConfig = await getPayTRConfig(DB)
    
    // User IP al
    const userIp = c.req.header('cf-connecting-ip') || 
                   c.req.header('x-forwarded-for') || 
                   c.req.header('x-real-ip') || 
                   '127.0.0.1'
    
    // PayTR payment request olustur
    const paymentRequest = createPayTRPaymentRequest(paytrConfig, {
      bayiId: bayi.id,
      email: bayi.login_email,
      amount: amount,
      bayiName: bayi.firma_adi,
      bayiPhone: bayi.telefon,
      userIp: userIp
    })
    
    // Odeme islemi kaydi olustur (beklemede durumunda)
    const odemeResult = await DB.prepare(`
      INSERT INTO odeme_islemleri (
        bayi_id, odeme_turu, tutar, durum, paytr_merchant_oid, created_at
      ) VALUES (?, 'kredi_karti', ?, 'beklemede', ?, datetime('now'))
    `).bind(bayi.id, amount, paymentRequest.merchant_oid).run()
    
    console.log(`PayTR odeme baslatildi - Bayi: ${bayi.id}, Tutar: ${amount} TL, OID: ${paymentRequest.merchant_oid}`)
    
    return c.json({
      success: true,
      payment_url: 'https://www.paytr.com/odeme/guvenli/' + (paymentRequest.paytr_token || 'test'),
      merchant_oid: paymentRequest.merchant_oid,
      amount: amount,
      paytr_request: paymentRequest, // Test icin - production'da kaldirilacak
      message: `${amount} TL kredi yukleme islemi baslatildi`
    })
    
  } catch (error) {
    console.error('PayTR init error:', error)
    return c.json({ 
      error: 'Odeme islemi baslatilamadi', 
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
    
    console.log('PayTR callback alindi:', params)
    
    if (!params.merchant_oid || !params.status || !params.hash) {
      console.error('PayTR callback eksik parametreler')
      return c.text('ERR', 400)
    }
    
    // PayTR konfigurasyonu al
    const paytrConfig = await getPayTRConfig(DB)
    
    // Hash dogrulama
    const isValidHash = verifyPayTRCallback(paytrConfig, params)
    if (!isValidHash) {
      console.error('PayTR callback hash dogrulanamadi')
      return c.text('ERR', 400)
    }
    
    // Odeme islemini bul
    const odeme = await DB.prepare(`
      SELECT id, bayi_id, tutar, durum FROM odeme_islemleri 
      WHERE paytr_merchant_oid = ?
    `).bind(params.merchant_oid).first()
    
    if (!odeme) {
      console.error('PayTR callback - odeme bulunamadi:', params.merchant_oid)
      return c.text('ERR', 404)
    }
    
    if (odeme.durum !== 'beklemede') {
      console.log('PayTR callback - odeme zaten islenmis:', params.merchant_oid)
      return c.text('OK')
    }
    
    // Odeme basarili mi?
    if (params.status === 'success') {
      // Bayi kredi bakiyesini guncelle
      const oncekiBakiye = await DB.prepare(`
        SELECT kredi_bakiye FROM bayiler WHERE id = ?
      `).bind(odeme.bayi_id).first()
      
      const yeniBakiye = (oncekiBakiye?.kredi_bakiye || 0) + odeme.tutar
      
      await DB.prepare(`
        UPDATE bayiler SET kredi_bakiye = ?, updated_at = datetime('now') WHERE id = ?
      `).bind(yeniBakiye, odeme.bayi_id).run()
      
      // Odeme islemini tamamlandi olarak isaretle
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
        ) VALUES (?, 'yukleme', ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        odeme.bayi_id,
        odeme.tutar,
        oncekiBakiye?.kredi_bakiye || 0,
        yeniBakiye,
        `PayTR ile kredi yukleme - ${params.merchant_oid}`,
        odeme.id
      ).run()
      
      console.log(`✅ PayTR odeme basarili - Bayi: ${odeme.bayi_id}, Tutar: ${odeme.tutar} TL`)
      
      return c.text('OK')
    } else {
      // Odeme basarisiz
      await DB.prepare(`
        UPDATE odeme_islemleri SET 
          durum = 'iptal', 
          updated_at = datetime('now') 
        WHERE id = ?
      `).bind(odeme.id).run()
      
      console.log(`❌ PayTR odeme basarisiz - Bayi: ${odeme.bayi_id}, OID: ${params.merchant_oid}`)
      
      return c.text('OK')
    }
    
  } catch (error) {
    console.error('PayTR callback error:', error)
    return c.text('ERR', 500)
  }
})

// PayTR basarili odeme sayfasi
app.get('/api/payment/paytr/success', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Odeme Basarili - TV Servis</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-green-50 min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <div class="text-center">
                <i class="fas fa-check-circle text-green-500 text-6xl mb-4"></i>
                <h1 class="text-2xl font-bold text-gray-800 mb-2">Odeme Basarili!</h1>
                <p class="text-gray-600 mb-6">Kredi yukleme isleminiz tamamlandi. Bakiyeniz kisa surede guncellenecektir.</p>
                <div class="space-y-3">
                    <button onclick="window.close()" class="w-full bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded">
                        <i class="fas fa-times mr-1"></i> Pencereyi Kapat
                    </button>
                    <a href="/bayi/dashboard" class="block w-full bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded text-center">
                        <i class="fas fa-dashboard mr-1"></i> Dashboard'a Don
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

// PayTR basarisiz odeme sayfasi  
app.get('/api/payment/paytr/failed', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Odeme Basarisiz - TV Servis</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-red-50 min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
            <div class="text-center">
                <i class="fas fa-times-circle text-red-500 text-6xl mb-4"></i>
                <h1 class="text-2xl font-bold text-gray-800 mb-2">Odeme Basarisiz</h1>
                <p class="text-gray-600 mb-6">Kredi yukleme isleminiz tamamlanamadi. Lutfen tekrar deneyin.</p>
                <div class="space-y-3">
                    <button onclick="window.close()" class="w-full bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded">
                        <i class="fas fa-times mr-1"></i> Pencereyi Kapat
                    </button>
                    <a href="/bayi/dashboard" class="block w-full bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded text-center">
                        <i class="fas fa-dashboard mr-1"></i> Dashboard'a Don
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
      return c.json({ error: 'Gecersiz token' }, 401)
    }
    
    // Validations
    if (!amount || amount < 100) {
      return c.json({ error: 'Minimum havale tutari 100 TL' }, 400)
    }
    
    if (!reference) {
      return c.json({ error: 'Havale referans numarasi gerekli' }, 400)
    }
    
    if (!transfer_date) {
      return c.json({ error: 'Havale tarihi gerekli' }, 400)
    }
    
    // Ayni referans ile daha once bildirim yapilmis mi?
    const existingTransfer = await DB.prepare(`
      SELECT id FROM odeme_islemleri 
      WHERE havale_referans = ? AND bayi_id = ?
    `).bind(reference, bayiAuth.bayiId).first()
    
    if (existingTransfer) {
      return c.json({ error: 'Bu referans numarasi ile daha once havale bildirimi yapilmis' }, 409)
    }
    
    // Havale bildirimi kaydi olustur
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
    
    console.log(`Havale bildirimi alindi - Bayi: ${bayiAuth.bayiId}, Tutar: ${amount} TL, Ref: ${reference}`)
    
    return c.json({
      success: true,
      message: 'Havale bildirimi basariyla alindi. Admin onayindan sonra kredi bakiyeniz guncellenecektir.',
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
      return c.json({ error: 'Gecersiz token' }, 401)
    }
    
    const transfer = await DB.prepare(`
      SELECT id, tutar, durum, havale_aciklama, admin_onay, created_at, updated_at
      FROM odeme_islemleri 
      WHERE havale_referans = ? AND bayi_id = ? AND odeme_turu = 'havale'
    `).bind(reference, bayiAuth.bayiId).first()
    
    if (!transfer) {
      return c.json({ error: 'Havale kaydi bulunamadi' }, 404)
    }
    
    const statusMap = {
      'beklemede': 'Admin onayi bekleniyor',
      'tamamlandi': 'Onaylandi ve kredi yuklendi',
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
      error: 'Havale durumu sorgulanamadi' 
    }, 500)
  }
})

// =============================================================================
// Admin API Routes - Payment Management & System Administration
// =============================================================================

// Admin login test endpoint
app.get('/api/admin/test', (c) => {
  return c.json({ message: 'Admin endpoint calisiyor!' })
})

// Admin test endpoint
app.get('/api/admin/test', (c) => {
  return c.json({ message: 'Admin endpoint calisiyor!' })
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
    // Bekleyen odemeler
    const pendingPayments = await DB.prepare(`
      SELECT COUNT(*) as count FROM odeme_islemleri 
      WHERE durum = 'beklemede'
    `).first()
    
    // Toplam kredi islemleri (ekleme turundeki hareketler)
    const totalCredits = await DB.prepare(`
      SELECT SUM(tutar) as total FROM kredi_hareketleri 
      WHERE hareket_turu = 'ekleme'
    `).first()
    
    // Aktif bayiler
    const activeDealers = await DB.prepare(`
      SELECT COUNT(*) as count FROM bayiler WHERE aktif = 1
    `).first()
    
    // Bu ayki odemeler
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
    return c.json({ error: 'Dashboard verileri alinamadi' }, 500)
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
    return c.json({ error: 'Bekleyen odemeler listelenemedi' }, 500)
  }
})

// Transfer onaylama/reddetme
app.post('/api/admin/payments/:id/approve', requireAdminAuth(), async (c) => {
  const { DB } = c.env
  const paymentId = c.req.param('id')
  const { action, aciklama } = await c.req.json() // action: 'approve' veya 'reject'
  const adminInfo = c.get('admin')
  
  try {
    // Odeme islemini bul
    const payment = await DB.prepare(`
      SELECT * FROM odeme_islemleri WHERE id = ? AND durum = 'beklemede'
    `).bind(paymentId).first()
    
    if (!payment) {
      return c.json({ error: 'Odeme islemi bulunamadi' }, 404)
    }
    
    let newStatus: string
    let logDescription: string
    
    if (action === 'approve') {
      newStatus = 'tamamlandi'
      logDescription = `Transfer onaylandi${aciklama ? ': ' + aciklama : ''}`
      
      // Mevcut bakiyeyi al
      const bayi = await DB.prepare(`
        SELECT kredi_bakiye FROM bayiler WHERE id = ?
      `).bind(payment.bayi_id).first()
      
      const oncekiBakiye = bayi?.kredi_bakiye || 0
      const yeniBakiye = oncekiBakiye + payment.tutar
      
      // Bayinin kredi bakiyesini guncelle
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
        `Admin onayi: ${payment.havale_referans || 'No ref'}`,
        payment.id
      ).run()
      
    } else if (action === 'reject') {
      newStatus = 'iptal_edildi'
      logDescription = `Transfer reddedildi${aciklama ? ': ' + aciklama : ''}`
    } else {
      return c.json({ error: 'Gecersiz islem' }, 400)
    }
    
    // Odeme durumunu guncelle
    await DB.prepare(`
      UPDATE odeme_islemleri 
      SET durum = ?, admin_onay = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newStatus, action === 'approve' ? 1 : 0, paymentId).run()
    
    // Log kaydi olustur
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
    }, action === 'approve' ? 'Transfer basariyla onaylandi' : 'Transfer basariyla reddedildi'))
    
  } catch (error) {
    console.error('Payment approval error:', error)
    return c.json({ error: 'Islem gerceklestirilemedi' }, 500)
  }
})

// Odeme gecmisi ve raporlama
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
    
    // Toplam kayit sayisi
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
    return c.json({ error: 'Odeme gecmisi alinamadi' }, 500)
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
    
    return c.json(createSuccessResponse(metrics, 'Performans metrikleri alindi'))
    
  } catch (error) {
    SystemLogger.error('Metrics', 'Failed to get metrics', { error: error.message })
    throw new BusinessError('Metrikler alinamadi')
  }
})

// Clean up old metrics (internal endpoint)
app.post('/api/admin/cleanup', requireAdminAuth(), async (c) => {
  try {
    PerformanceMonitor.cleanup()
    SystemLogger.info('Cleanup', 'Metrics cleanup triggered')
    
    return c.json(createSuccessResponse({}, 'Temizlik islemi tamamlandi'))
    
  } catch (error) {
    SystemLogger.error('Cleanup', 'Cleanup failed', { error: error.message })
    throw new BusinessError('Temizlik islemi basarisiz')
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
        <title>Admin Paneli - TV Servis Yonetim Sistemi</title>
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
                        <p class="text-gray-600">TV Servis Yonetim Sistemi</p>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Kullanici Adi</label>
                            <input type="text" id="username" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Kullanici adinizi girin">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Sifre</label>
                            <input type="password" id="password"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Sifrenizi girin">
                        </div>
                        
                        <button onclick="adminLogin()" 
                                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            Giris Yap
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
                            <p class="text-sm text-gray-600">Hos geldiniz,</p>
                            <p class="font-semibold text-gray-800" id="admin-name">Admin</p>
                        </div>
                        <button onclick="adminLogout()" 
                                class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-sign-out-alt mr-2"></i>
                            Cikis
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
                                    Sistem Izleme
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
                                    Odeme Gecmisi
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
                            Yonetim Paneli
                        </h2>
                        
                        <!-- Stats Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Bekleyen Odemeler</p>
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
                                        <p class="text-sm font-medium text-gray-600">Bu Ay Odemeler</p>
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
                                    Veriler yukleniyor...
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- System Monitoring Section -->
                    <div id="admin-system-monitoring-section" class="admin-section hidden">
                        <h2 class="text-3xl font-bold mb-6 text-gray-800">
                            <i class="fas fa-chart-line mr-2"></i>
                            Sistem Izleme
                        </h2>
                        
                        <!-- System Health Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Sistem Durumu</p>
                                        <p class="text-lg font-bold text-green-600">Cevrimici</p>
                                    </div>
                                    <div class="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                            
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Sunucu Yuku</p>
                                        <p class="text-lg font-bold text-blue-600" id="server-load">%12</p>
                                    </div>
                                    <i class="fas fa-server text-blue-500 text-xl"></i>
                                </div>
                            </div>
                            
                            <div class="bg-white p-6 rounded-lg shadow">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Veritabani</p>
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
                                    Gunluk Is Dagilimi
                                </h3>
                                <canvas id="daily-jobs-chart" width="400" height="200"></canvas>
                            </div>
                            
                            <div class="bg-white rounded-lg shadow p-6">
                                <h3 class="text-lg font-semibold text-gray-800 mb-4">
                                    <i class="fas fa-money-bill-wave mr-2"></i>
                                    Odeme Durumu
                                </h3>
                                <canvas id="payment-status-chart" width="400" height="200"></canvas>
                            </div>
                        </div>

                        <!-- System Logs -->
                        <div class="bg-gray-900 rounded-lg p-6">
                            <h3 class="text-lg font-semibold text-white mb-4">
                                <i class="fas fa-terminal mr-2"></i>
                                Sistem Loglari (Canli)
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
                            Bayi Yonetimi
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
                                        <p class="text-sm font-medium text-gray-600">En Performansli</p>
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
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Sehir</th>
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Durum</th>
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Kredi</th>
                                                <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Islemler</th>
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
                            Odeme Gecmisi
                        </h2>
                        
                        <div class="bg-white rounded-lg shadow">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-semibold text-gray-800">Tum Odeme Islemleri</h3>
                            </div>
                            <div class="p-6">
                                <div id="payment-history-list">
                                    Veriler yukleniyor...
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
        <title>Garantor360 Bayi Basvuru | Profesyonel Is Ortakligi ve Garantili Kazanc</title>
        <meta name="description" content="Garantor360 bayi olun! Garantili odeme, surekli is akisi ve profesyonel destek ile gelir artirin. 6 sektorde is firsatlari. Hemen basvuru yapin!">
        <meta name="keywords" content="bayi basvuru, is firsatlari, garantili odeme, hizmet verme, profesyonel ortaklik, gelir artirma">
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
            @keyframes electricPowerOn {
              0% { 
                opacity: 0.1; 
                filter: drop-shadow(0 0 2px rgba(128, 128, 128, 0.3)) brightness(0.3);
                transform: scale(0.95);
              }
              15% { 
                opacity: 0.9; 
                filter: drop-shadow(0 0 12px rgba(255, 255, 0, 0.8)) brightness(1.2);
                transform: scale(1.1);
              }
              25% { 
                opacity: 0.3; 
                filter: drop-shadow(0 0 4px rgba(255, 255, 0, 0.4)) brightness(0.5);
                transform: scale(0.98);
              }
              35% { 
                opacity: 1; 
                filter: drop-shadow(0 0 15px rgba(255, 255, 0, 1)) brightness(1.5);
                transform: scale(1.05);
              }
              50% { 
                opacity: 0.8; 
                filter: drop-shadow(0 0 8px rgba(255, 255, 0, 0.7)) brightness(1);
                transform: scale(1);
              }
              100% { 
                opacity: 0.9; 
                filter: drop-shadow(0 0 10px rgba(255, 255, 0, 0.8)) brightness(1.1);
                transform: scale(1.02);
              }
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
                            <img src="https://cdn1.genspark.ai/user-upload-image/rmbg_generated/0_a592278a-b85c-4292-adc2-ddfd0a7dd6db" alt="Garantor360" class="h-16">
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <!-- Provider Action Buttons -->
                        <a href="/" class="text-slate-600 hover:text-slate-800 font-medium transition duration-200">
                            Musteri misiniz?
                        </a>
                        <a href="/bayi/login" class="bg-orange-600 text-white px-6 py-2 sharp-corner font-semibold hover:bg-orange-700 transition duration-200">
                            BAYI GIRISI
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
                            Profesyonel Servis Saglayici Olun
                        </h1>
                        <p class="text-lg lg:text-xl text-blue-100 mb-8 drop-shadow-lg">
                            Garantor360 platformunda hizmet vererek guvenli odeme sistemi ve surekli is akisi ile gelir elde edin.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onclick="scrollToApplication()" class="bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition duration-200 shadow-2xl">
                                Hemen Basvur
                            </button>
                            <button onclick="scrollToStats()" class="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition duration-200 shadow-2xl backdrop-blur-sm">
                                Firsatlari Kesfet
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
                        CANLI IS FIRSATLARI
                    </h2>
                    <p class="text-slate-600 text-lg font-medium">Son 24 saatte gerceklesen is hacmi</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <div class="bg-blue-900 text-white p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-200 text-sm font-medium mb-2">BUGUN ACILAN IS</p>
                                <p class="text-4xl font-bold stats-counter text-white" id="daily-jobs">127</p>
                            </div>
                            <div class="w-3 h-3 bg-amber-400 sharp-corner pulse-dot"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-blue-700">
                            <span class="text-amber-300 text-sm font-semibold">
                                ↗ +23% onceki gune gore
                            </span>
                        </div>
                    </div>

                    <div class="bg-white border-2 border-blue-200 p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-600 text-sm font-medium mb-2">GUNLUK ORTALAMA KAZANC</p>
                                <p class="text-4xl font-bold text-blue-900">TL<span id="daily-earnings">1,250</span></p>
                            </div>
                            <div class="w-3 h-3 bg-amber-500 sharp-corner"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-blue-100">
                            <span class="text-blue-600 text-sm font-semibold">
                                Bayi basina ortalama
                            </span>
                        </div>
                    </div>

                    <div class="bg-white border-2 border-blue-200 p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-600 text-sm font-medium mb-2">AKTIF BAYILER</p>
                                <p class="text-4xl font-bold text-blue-900" id="active-dealers">589</p>
                            </div>
                            <div class="w-3 h-3 bg-amber-500 sharp-corner"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-blue-100">
                            <span class="text-emerald-600 text-sm font-semibold">
                                ↗ Bu ay %32 artis
                            </span>
                        </div>
                    </div>

                    <div class="bg-amber-500 text-blue-900 p-8 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-amber-800 text-sm font-medium mb-2">ORTALAMA IS UCRETI</p>
                                <p class="text-4xl font-bold text-blue-900">TL<span id="avg-price">385</span></p>
                            </div>
                            <div class="w-3 h-3 bg-blue-900 sharp-corner pulse-dot"></div>
                        </div>
                        <div class="mt-6 pt-4 border-t border-amber-600">
                            <span class="text-blue-800 text-sm font-semibold">
                                ↗ Surekli yukselis
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
                                CANLI TALEP AKISI - BAYILER ICIN
                            </h3>
                            <div class="flex items-center space-x-4 text-sm">
                                <span class="text-blue-200 font-medium">Son 10 dakika:</span>
                                <span class="bg-amber-500 text-blue-900 px-3 py-1 sharp-corner font-bold" id="provider-recent-count">12 Is</span>
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
                                    YENI IS FIRSATLARI
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
                                    BAYI ISTATISTIKLERI
                                </h4>
                                <div class="space-y-4">
                                    <!-- Earnings Chart -->
                                    <div class="bg-blue-50 p-4 minimal-corner">
                                        <div class="flex justify-between items-center mb-3">
                                            <span class="text-blue-700 font-medium text-sm">SON 6 SAAT KAZANC</span>
                                            <span class="text-amber-600 font-bold text-lg" id="provider-hourly-earnings">TL4,280</span>
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
                                        <h5 class="text-blue-700 font-bold text-sm mb-3">POPULER KATEGORILER</h5>
                                        <div class="space-y-2">
                                            <div class="flex justify-between items-center">
                                                <span class="text-blue-600 text-sm">Teknik Onarim</span>
                                                <div class="flex items-center">
                                                    <div class="w-16 h-2 bg-blue-200 mr-2">
                                                        <div class="w-4/5 h-full bg-amber-500"></div>
                                                    </div>
                                                    <span class="text-blue-800 font-bold text-sm">80%</span>
                                                </div>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-blue-600 text-sm">Ev Bakim & Tadilat</span>
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
                                        <h5 class="text-blue-700 font-bold text-sm mb-3">EN KAZANCLI SEHIRLER</h5>
                                        <div class="grid grid-cols-2 gap-2 text-xs">
                                            <div class="flex justify-between">
                                                <span class="text-blue-600">Istanbul</span>
                                                <span class="text-amber-600 font-bold">TL1,850</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-blue-600">Ankara</span>
                                                <span class="text-blue-800 font-bold">TL1,240</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-blue-600">Izmir</span>
                                                <span class="text-blue-800 font-bold">TL980</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-blue-600">Bursa</span>
                                                <span class="text-blue-800 font-bold">TL780</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Live Provider Activity -->
                                    <div class="bg-amber-50 p-4 minimal-corner border border-amber-200">
                                        <h5 class="text-amber-700 font-bold text-sm mb-3 flex items-center">
                                            <i class="fas fa-users text-amber-600 mr-2"></i>
                                            AKTIF BAYI AKTIVITESI
                                        </h5>
                                        <div class="space-y-2 text-xs">
                                            <div class="flex justify-between items-center">
                                                <span class="text-amber-700">Su anda aktif:</span>
                                                <span class="text-amber-800 font-bold text-sm">247 Bayi</span>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-amber-700">Is arayan:</span>
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
                        HIZMET KATEGORILERI
                    </h2>
                    <div class="flex flex-wrap items-center justify-center gap-6 text-sm">
                        <div class="flex items-center space-x-2">
                            <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
                            <span class="text-blue-700 font-medium">6 Ana Kategori</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                            <span class="text-green-700 font-medium">50+ Alt Hizmet</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="w-3 h-3 bg-amber-500 rounded-full"></span>
                            <span class="text-amber-700 font-medium">%98.7 Başarı Oranı</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="w-3 h-3 bg-purple-500 rounded-full"></span>
                            <span class="text-purple-700 font-medium">Güvenli Hizmet Alın</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <!-- Televizyon Tamiri -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-blue-200 p-6 minimal-corner hover:border-blue-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-blue-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-blue-600 transition duration-300">
                                    <i class="fas fa-tv text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-blue-900 mb-2">Televizyon Tamiri</h3>
                                <p class="text-xs text-blue-600 mb-3">LED/LCD/OLED/Smart TV</p>
                                <div class="text-xs text-green-600 font-bold">₺300-2.500</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-blue-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Televizyon Servisi</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>LED/LCD Tamiri</span>
                                        <span class="text-yellow-300">₺400-1.8K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>OLED Servisi</span>
                                        <span class="text-yellow-300">₺800-2.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Smart TV Yazılım</span>
                                        <span class="text-yellow-300">₺300-800</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Panel Değişimi</span>
                                        <span class="text-yellow-300">₺1.2K-2.5K</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-blue-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Bilgisayar Servisi -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-green-200 p-6 minimal-corner hover:border-green-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-green-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-green-600 transition duration-300">
                                    <i class="fas fa-laptop text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-green-900 mb-2">Bilgisayar Servisi</h3>
                                <p class="text-xs text-green-600 mb-3">PC/Laptop/Gaming</p>
                                <div class="text-xs text-green-600 font-bold">₺200-2.000</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-green-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Bilgisayar Hizmetleri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Laptop Tamiri</span>
                                        <span class="text-yellow-300">₺300-1.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>PC Toplama</span>
                                        <span class="text-yellow-300">₺200-800</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Veri Kurtarma</span>
                                        <span class="text-yellow-300">₺400-2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Gaming Setup</span>
                                        <span class="text-yellow-300">₺500-1.2K</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-green-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Beyaz Eşya Tamiri -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-purple-200 p-6 minimal-corner hover:border-purple-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-purple-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-purple-600 transition duration-300">
                                    <i class="fas fa-washing-machine text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-purple-900 mb-2">Beyaz Eşya Tamiri</h3>
                                <p class="text-xs text-purple-600 mb-3">Çamaşır/Bulaşık/Buzdolabı</p>
                                <div class="text-xs text-green-600 font-bold">₺400-3.000</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-purple-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Beyaz Eşya Servisi</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Çamaşır Makinesi</span>
                                        <span class="text-yellow-300">₺500-2.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Buzdolabı Tamiri</span>
                                        <span class="text-yellow-300">₺600-3K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Bulaşık Makinesi</span>
                                        <span class="text-yellow-300">₺400-2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Fırın & Ocak</span>
                                        <span class="text-yellow-300">₺300-1.5K</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-purple-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Klima Servisi -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-indigo-200 p-6 minimal-corner hover:border-indigo-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-indigo-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-indigo-600 transition duration-300">
                                    <i class="fas fa-snowflake text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-indigo-900 mb-2">Klima Servisi</h3>
                                <p class="text-xs text-indigo-600 mb-3">Split/VRF/Kaset</p>
                                <div class="text-xs text-green-600 font-bold">₺300-2.500</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-indigo-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Klima Hizmetleri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Split Klima</span>
                                        <span class="text-yellow-300">₺400-2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>VRF Sistem</span>
                                        <span class="text-yellow-300">₺800-2.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Kaset Klima</span>
                                        <span class="text-yellow-300">₆00-2.2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Montaj & Bakım</span>
                                        <span class="text-yellow-300">₺300-1.5K</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-indigo-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Ses Sistemi -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-cyan-200 p-6 minimal-corner hover:border-cyan-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-cyan-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-cyan-600 transition duration-300">
                                    <i class="fas fa-volume-up text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-cyan-900 mb-2">Ses Sistemi</h3>
                                <p class="text-xs text-cyan-600 mb-3">Hoparlör/Amfi/Home Theater</p>
                                <div class="text-xs text-green-600 font-bold">₺250-3.500</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-cyan-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Ses Sistemi Kurulumu</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Home Theater</span>
                                        <span class="text-yellow-300">₺800-3.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Müzik Sistemi</span>
                                        <span class="text-yellow-300">₺400-2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Hoparlör Montajı</span>
                                        <span class="text-yellow-300">₺250-1K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Amfi Kurulumu</span>
                                        <span class="text-yellow-300">₺300-1.5K</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-cyan-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Elektronik Cihazlar -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-orange-200 p-6 minimal-corner hover:border-orange-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-orange-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-orange-600 transition duration-300">
                                    <i class="fas fa-mobile-alt text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-orange-900 mb-2">Elektronik Cihazlar</h3>
                                <p class="text-xs text-orange-600 mb-3">Telefon/Tablet/Konsol</p>
                                <div class="text-xs text-green-600 font-bold">₺150-1.800</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-orange-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Elektronik Tamiri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Telefon Tamiri</span>
                                        <span class="text-yellow-300">₺200-1.2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Tablet Servisi</span>
                                        <span class="text-yellow-300">₺300-1.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>PlayStation/Xbox</span>
                                        <span class="text-yellow-300">₺400-1.8K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Ekran Değişimi</span>
                                        <span class="text-yellow-300">₺150-800</span>
                                    </div>
                                </div>
                                <button class="w-full bg-yellow-500 text-orange-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
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
                                        <img src="https://cdn1.genspark.ai/user-upload-image/rmbg_generated/0_cf86bcd8-44b5-4426-b5e0-8f77c45da44a" alt="Garantor360" class="h-20">
                                    </div>
                                    <p class="text-amber-400 font-medium">Bayi Web Platformu</p>
                                </div>
                                
                                <h4 class="text-3xl font-bold text-white mb-6 leading-tight">
                                    ISLERINIZI HER CIHAZDAN
                                    <span class="block text-amber-400">YONETIN!</span>
                                </h4>
                                
                                <p class="text-blue-200 text-lg mb-8 leading-relaxed">
                                    Web tabanli panelimizle is takibini, musteri iletisimini ve odeme sureclerini 
                                    her cihazdan kolayca yonetin. Responsive tasarim ile masaustu ve mobilde mukemmel deneyim.
                                </p>
                            </div>

                            <!-- App Features -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-bell text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">Aninda Bildirimler</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-map-marker-alt text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">GPS Is Takibi</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-credit-card text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">Odeme Takibi</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-comments text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">Musteri Mesajlari</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-camera text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">Fotograf Paylasimi</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-chart-line text-white text-sm"></i>
                                    </div>
                                    <span class="text-blue-200 font-medium">Kazanc Raporlari</span>
                                </div>
                            </div>

                            <!-- Web Access Buttons -->
                            <div class="flex flex-col sm:flex-row gap-4">
                                <a href="/bayi/login" class="flex items-center bg-amber-500 text-white px-8 py-4 sharp-corner hover:bg-amber-600 transition duration-200 font-bold">
                                    <i class="fas fa-globe text-2xl mr-3"></i>
                                    <div class="text-lg">BAYI PANELINE GIRIS</div>
                                </a>
                                <a href="/bayi/demo" class="flex items-center bg-white text-blue-900 px-8 py-4 sharp-corner hover:bg-gray-100 transition duration-200 font-bold">
                                    <i class="fas fa-play text-xl mr-3"></i>
                                    <div class="text-lg">DEMO IZLE</div>
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
                                                <span class="text-lg font-bold text-amber-400">Garantor360</span>
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
                                                <p class="text-gray-600 text-sm">Bugun 3 yeni is talebi var</p>
                                            </div>

                                            <!-- Stats Cards - Web Style -->
                                            <div class="grid grid-cols-2 gap-3 mb-4">
                                                <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-lg shadow">
                                                    <div class="text-2xl font-bold">TL2,340</div>
                                                    <div class="text-blue-100 text-sm">Bu Hafta Kazanc</div>
                                                </div>
                                                <div class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 rounded-lg shadow">
                                                    <div class="text-2xl font-bold">12</div>
                                                    <div class="text-orange-100 text-sm">Aktif Is</div>
                                                </div>
                                            </div>

                                            <!-- Recent Jobs - Web Table Style -->
                                            <div class="space-y-2">
                                                <h6 class="font-bold text-gray-900 text-sm mb-3">Son Isler</h6>
                                                
                                                <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                                    <div class="flex justify-between items-center">
                                                        <div>
                                                            <div class="font-medium text-gray-900 text-sm">Klima Montaji</div>
                                                            <div class="text-gray-500 text-xs">Kadikoy - 14:30</div>
                                                        </div>
                                                        <div class="text-green-600 font-bold text-sm">TL450</div>
                                                    </div>
                                                </div>

                                                <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                                    <div class="flex justify-between items-center">
                                                        <div>
                                                            <div class="font-medium text-gray-900 text-sm">Beyaz Esya Tamiri</div>
                                                            <div class="text-gray-500 text-xs">Uskudar - 16:00</div>
                                                        </div>
                                                        <div class="text-blue-600 font-bold text-sm">TL280</div>
                                                    </div>
                                                </div>

                                                <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                                    <div class="flex justify-between items-center">
                                                        <div>
                                                            <div class="font-medium text-gray-900 text-sm">Ev Temizligi</div>
                                                            <div class="text-gray-500 text-xs">Besiktas - 17:30</div>
                                                        </div>
                                                        <div class="text-yellow-600 font-bold text-sm">TL200</div>
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
                        <div class="text-blue-600 font-medium">Aktif Kullanici</div>
                        <div class="text-blue-500 text-sm">Web platformunda</div>
                    </div>
                    <div class="text-center p-6 bg-amber-50 minimal-corner">
                        <div class="text-3xl font-bold text-amber-600 mb-2">4.8★</div>
                        <div class="text-amber-700 font-medium">Kullanici Puani</div>
                        <div class="text-amber-600 text-sm">5 yildiz uzerinden</div>
                    </div>
                    <div class="text-center p-6 bg-blue-50 minimal-corner">
                        <div class="text-3xl font-bold text-blue-900 mb-2">24/7</div>
                        <div class="text-blue-600 font-medium">Web Destek</div>
                        <div class="text-blue-500 text-sm">Kesintisiz hizmet</div>
                    </div>
                    <div class="text-center p-6 bg-amber-50 minimal-corner">
                        <div class="text-3xl font-bold text-amber-600 mb-2">%99.9</div>
                        <div class="text-amber-700 font-medium">Uptime</div>
                        <div class="text-amber-600 text-sm">Guvenilir platform</div>
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
                        NEDEN GARANTIR360'DA
                        <span class="block text-amber-400 mt-2">HIZMET VERMELISINIZ?</span>
                    </h2>
                    <p class="text-xl text-blue-200 font-medium max-w-3xl mx-auto leading-relaxed">
                        Turkiye'nin en guvenilir platformunda profesyonel is ortakliginin benzersiz avantajlari
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
                            <h3 class="text-xl font-bold mb-4 text-blue-900 tracking-tight">GARANTILI ODEME SISTEMI</h3>
                            <p class="text-blue-600 mb-6 font-medium leading-relaxed">
                                Is tamamlandiginda odemeniz %100 garantili. Platform escrow sistemi ile para guvencesi.
                            </p>
                            <div class="bg-blue-50 p-3 minimal-corner">
                                <span class="text-amber-600 font-bold text-lg">⚡ Aninda Odeme</span>
                                <p class="text-blue-600 text-sm mt-1">Is onaylandiktan sonra 24 saat icinde</p>
                            </div>
                        </div>
                    </div>

                    <!-- Continuous Work Flow -->
                    <div class="bg-blue-900 text-white p-8 minimal-corner card-corporate group">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-amber-500 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-white group-hover:text-blue-900 transition duration-300">
                                <i class="fas fa-sync-alt text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-white tracking-tight">SUREKLI IS AKISI</h3>
                            <p class="text-blue-200 mb-6 font-medium leading-relaxed">
                                Gunde ortalama 127 yeni is talebi. Hic is arayisiniz olmayacak.
                            </p>
                            <div class="bg-blue-800 p-3 minimal-corner">
                                <span class="text-amber-400 font-bold text-lg">📊 %97 Is Garantisi</span>
                                <p class="text-blue-200 text-sm mt-1">Aktif bayilerimizin ortalamasi</p>
                            </div>
                        </div>
                    </div>

                    <!-- Professional Image -->
                    <div class="bg-white p-8 minimal-corner card-corporate group hover:border-amber-400 border-2 border-transparent">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-900 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-amber-500 transition duration-300">
                                <i class="fas fa-certificate text-white text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-blue-900 tracking-tight">PROFESYONEL IMAJ</h3>
                            <p class="text-blue-600 mb-6 font-medium leading-relaxed">
                                Garantor360 kalite sertifikasi ile musteri guveni ve prestij kazanin.
                            </p>
                            <div class="bg-blue-50 p-3 minimal-corner">
                                <span class="text-amber-600 font-bold text-lg">🏆 Marka Degeri</span>
                                <p class="text-blue-600 text-sm mt-1">Turkiye'nin en guvenilir platformu</p>
                            </div>
                        </div>
                    </div>

                    <!-- Marketing Support -->
                    <div class="bg-white p-8 minimal-corner card-corporate group hover:border-amber-400 border-2 border-transparent">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-900 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-amber-500 transition duration-300">
                                <i class="fas fa-bullhorn text-white text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-blue-900 tracking-tight">PAZARLAMA DESTEGI</h3>
                            <p class="text-blue-600 mb-6 font-medium leading-relaxed">
                                Milyonlarca TL'lik reklam yatirimimizdan ucretsiz faydalanin. Musteri bulma derdi yok.
                            </p>
                            <div class="bg-blue-50 p-3 minimal-corner">
                                <span class="text-amber-600 font-bold text-lg">📈 0 Reklam Masrafi</span>
                                <p class="text-blue-600 text-sm mt-1">Platform tum pazarlamayi yapiyor</p>
                            </div>
                        </div>
                    </div>

                    <!-- Legal Protection -->
                    <div class="bg-amber-500 text-blue-900 p-8 minimal-corner card-corporate group">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-900 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-white transition duration-300">
                                <i class="fas fa-balance-scale text-white group-hover:text-blue-900 text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-blue-900 tracking-tight">HUKUKI KORUMA</h3>
                            <p class="text-blue-800 mb-6 font-medium leading-relaxed">
                                Anlasmazliklarda profesyonel hukuk ekibimiz yaninizda. Guvende hissedin.
                            </p>
                            <div class="bg-amber-400 p-3 minimal-corner">
                                <span class="text-blue-900 font-bold text-lg">⚖️ Ucretsiz Hukuki Destek</span>
                                <p class="text-blue-800 text-sm mt-1">24/7 danismanlik hizmeti</p>
                            </div>
                        </div>
                    </div>

                    <!-- Training & Development -->
                    <div class="bg-white p-8 minimal-corner card-corporate group hover:border-amber-400 border-2 border-transparent">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-900 sharp-corner mx-auto mb-6 flex items-center justify-center group-hover:bg-amber-500 transition duration-300">
                                <i class="fas fa-graduation-cap text-white text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold mb-4 text-blue-900 tracking-tight">EGITIM & GELISIM</h3>
                            <p class="text-blue-600 mb-6 font-medium leading-relaxed">
                                Surekli egitim programlari ve sertifikasyonlar ile kendinizi gelistirin.
                            </p>
                            <div class="bg-blue-50 p-3 minimal-corner">
                                <span class="text-amber-600 font-bold text-lg">🎓 Ucretsiz Egitimler</span>
                                <p class="text-blue-600 text-sm mt-1">Aylik uzman egitim programlari</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Success Metrics Section -->
                <div class="bg-white p-8 minimal-corner">
                    <div class="text-center mb-8">
                        <h3 class="text-3xl font-bold text-blue-900 mb-4 tracking-tight">
                            BASARI ISTATISTIKLERIMIZ
                        </h3>
                        <p class="text-blue-600 text-lg font-medium">Platform performansimizi rakamlarla gorun</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="text-center p-6 bg-blue-50 minimal-corner">
                            <div class="text-4xl font-bold text-blue-900 mb-2">%98.7</div>
                            <div class="text-blue-600 font-semibold text-sm">ODEME BASARI ORANI</div>
                            <div class="text-blue-500 text-xs mt-1">Son 12 ay ortalamasi</div>
                        </div>

                        <div class="text-center p-6 bg-amber-50 minimal-corner">
                            <div class="text-4xl font-bold text-amber-600 mb-2">TL2.3M</div>
                            <div class="text-amber-700 font-semibold text-sm">AYLIK ODENEN TUTAR</div>
                            <div class="text-amber-600 text-xs mt-1">Bayilerimize odenen toplam</div>
                        </div>

                        <div class="text-center p-6 bg-blue-50 minimal-corner">
                            <div class="text-4xl font-bold text-blue-900 mb-2">24dk</div>
                            <div class="text-blue-600 font-semibold text-sm">ORTALAMA ODEME SURESI</div>
                            <div class="text-blue-500 text-xs mt-1">Is tamamlandiktan sonra</div>
                        </div>

                        <div class="text-center p-6 bg-amber-50 minimal-corner">
                            <div class="text-4xl font-bold text-amber-600 mb-2">4.8★</div>
                            <div class="text-amber-700 font-semibold text-sm">BAYI MEMNUNIYET PUANI</div>
                            <div class="text-amber-600 text-xs mt-1">5 uzerinden ortalama</div>
                        </div>
                    </div>
                </div>

                <!-- Call to Action -->
                <div class="text-center mt-16">
                    <div class="bg-amber-500 text-blue-900 p-8 minimal-corner inline-block max-w-2xl">
                        <h4 class="text-2xl font-bold mb-4 tracking-tight">
                            <i class="fas fa-rocket mr-2"></i>
                            SIZ DE BU BASARININ PARCASI OLUN!
                        </h4>
                        <p class="text-blue-800 font-medium mb-6 leading-relaxed">
                            Bugun basvuru yapin, 24 saat icinde degerlendirme sonucunuzu alin. 
                            Basarili bayilerimizin %89'u ilk ayinda hedeflerini asti.
                        </p>
                        <button onclick="scrollToApplication()" class="bg-blue-900 text-white px-10 py-4 sharp-corner font-bold text-lg hover:bg-blue-800 transition duration-200 shadow-lg">
                            HEMEN BASVUR
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
                    5 dakikada basvuru yapin ve profesyonel is agimizin bir parcasi olun. 
                    Sifir yatirim, garantili kazanc.
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                    <a href="/bayi/login" class="bg-orange-600 text-white px-12 py-4 sharp-corner font-bold text-lg hover:bg-orange-700 transition duration-200 shadow-lg">
                        BASVURU YAP
                    </a>
                    <a href="tel:+905001234567" class="border-2 border-orange-600 text-orange-600 px-12 py-4 sharp-corner font-bold text-lg hover:bg-orange-600 hover:text-white transition duration-200">
                        0 500 123 45 67
                    </a>
                </div>
                <p class="text-sm text-slate-600 font-semibold">
                    <span class="inline-block w-2 h-2 bg-orange-600 sharp-corner mr-2"></span>
                    Basvuru ucretsiz - On odeme yok - Aninda degerlendirme
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
                                    <img src="https://cdn1.genspark.ai/user-upload-image/rmbg_generated/0_cf86bcd8-44b5-4426-b5e0-8f77c45da44a" alt="Garantor360" class="h-20">
                                </div>
                            </div>
                            <p class="text-blue-200 font-medium mb-6 leading-relaxed">
                                Turkiye'nin ilk tam guvenceli hizmet platformu. Bayi odakli yaklasimla 
                                surdurulebilir is ortakligi kuran dijital ekosistem.
                            </p>
                            
                            <!-- Trust Indicators -->
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="text-center">
                                    <div class="text-amber-400 font-bold text-2xl">589</div>
                                    <div class="text-blue-300 text-xs">Aktif Bayi</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-amber-400 font-bold text-2xl">TL2.3M</div>
                                    <div class="text-blue-300 text-xs">Aylik Odeme</div>
                                </div>
                            </div>

                            <!-- Certifications -->
                            <div class="flex flex-wrap gap-2">
                                <div class="bg-blue-800 px-3 py-1 sharp-corner">
                                    <span class="text-xs font-bold text-amber-400">ISO 9001</span>
                                </div>
                                <div class="bg-blue-800 px-3 py-1 sharp-corner">
                                    <span class="text-xs font-bold text-amber-400">6 AY GARANTI</span>
                                </div>
                                <div class="bg-blue-800 px-3 py-1 sharp-corner">
                                    <span class="text-xs font-bold text-amber-400">7/24 DESTEK</span>
                                </div>
                            </div>
                        </div>

                        <!-- Service Categories -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">HIZMET ALANLARI</h4>
                            <ul class="space-y-3">
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-tools mr-2 text-amber-500 text-sm"></i>Teknik Onarim
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-home mr-2 text-amber-500 text-sm"></i>Ev Bakim & Tadilat
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
                                    <i class="fas fa-bolt mr-2 text-amber-500 text-sm"></i>Elektrik Isleri
                                </a></li>
                            </ul>
                        </div>

                        <!-- Dealer Resources -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">BAYI KAYNAKLARI</h4>
                            <ul class="space-y-3">
                                <li><a href="/bayi/login" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-sign-in-alt mr-2 text-amber-500 text-sm"></i>Bayi Giris
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-graduation-cap mr-2 text-amber-500 text-sm"></i>Egitim Merkezi
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-file-alt mr-2 text-amber-500 text-sm"></i>Basvuru Formu
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-calculator mr-2 text-amber-500 text-sm"></i>Kazanc Hesaplama
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
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">ILETISIM & DESTEK</h4>
                            
                            <!-- Contact Methods -->
                            <div class="space-y-4 mb-6">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-phone text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <a href="tel:+905001234567" class="text-white font-medium hover:text-amber-400 transition duration-200">0 500 123 45 67</a>
                                        <p class="text-blue-300 text-xs">Bayi Destek Hatti</p>
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-envelope text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <a href="mailto:bayi@garantor360.com" class="text-white font-medium hover:text-amber-400 transition duration-200">bayi@garantor360.com</a>
                                        <p class="text-blue-300 text-xs">Bayi Iletisim</p>
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-comments text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <span class="text-white font-medium">Canli Destek</span>
                                        <p class="text-blue-300 text-xs">7/24 Aktif</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Working Hours -->
                            <div class="mb-6">
                                <h5 class="font-bold text-sm mb-3 text-amber-400 flex items-center">
                                    <i class="fas fa-clock mr-2"></i>CALISMA SAATLERI
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
                                <h5 class="text-blue-900 font-bold">HEMEN BASVURU YAPIN</h5>
                                <p class="text-blue-800 text-sm">24 saat icinde degerlendirme sonucu</p>
                            </div>
                        </div>
                        <div class="flex space-x-4">
                            <button onclick="scrollToApplication()" class="bg-blue-900 text-white px-6 py-3 sharp-corner font-bold hover:bg-blue-800 transition duration-200">
                                BASVUR
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
                            &copy; 2024 Garantor360. Tum haklari saklidir. | Bayi Partner Agi
                        </div>

                        <!-- Legal Links -->
                        <div class="flex items-center space-x-6 text-sm mb-4 lg:mb-0">
                            <a href="#" class="text-blue-300 hover:text-amber-400 transition duration-200">Bayi Sozlesmesi</a>
                            <a href="#" class="text-blue-300 hover:text-amber-400 transition duration-200">Gizlilik Politikasi</a>
                            <a href="#" class="text-blue-300 hover:text-amber-400 transition duration-200">Kullanim Sartlari</a>
                            <a href="/" class="text-amber-400 hover:text-amber-300 font-medium transition duration-200">Musteri Sayfasi</a>
                        </div>

                        <!-- Security Badges -->
                        <div class="flex items-center space-x-3">
                            <span class="text-blue-400 text-xs">Guvenli Platform</span>
                            <div class="flex space-x-2">
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">SSL</div>
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">256BIT</div>
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">GUVEN</div>
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

            // Active dealers - DISABLED: Now synchronized with main counter system
            // const dealersEl = document.getElementById('active-dealers');
            // if (dealersEl) {
            //     const current = parseInt(dealersEl.textContent) || 412;
            //     const change = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
            //     dealersEl.textContent = current + change;
            // }

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

            const cities = ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Gaziantep', 'Konya'];
            const districts = ['Kadikoy', 'Besiktas', 'Cankaya', 'Nilufer', 'Muratpasa', 'Seyhan', 'Sehitkamil', 'Selcuklu'];
            const providerJobs = [
                { name: 'Klima Montaji', category: 'Teknik Onarim', price: 'TL450', priority: 'YUKSEK', urgent: true, commission: 'TL67' },
                { name: 'Mutfak Tadilati', category: 'Ev Bakim', price: 'TL1,200', priority: 'ORTA', urgent: false, commission: 'TL180' },
                { name: 'Beyaz Esya Tamiri', category: 'Teknik Onarim', price: 'TL280', priority: 'ORTA', urgent: false, commission: 'TL42' },
                { name: 'Ev Temizligi', category: 'Temizlik', price: 'TL200', priority: 'DUSUK', urgent: false, commission: 'TL30' },
                { name: 'Kombi Bakimi', category: 'Teknik Onarim', price: 'TL350', priority: 'YUKSEK', urgent: true, commission: 'TL52' },
                { name: 'Hali Yikama', category: 'Temizlik', price: 'TL150', priority: 'DUSUK', urgent: false, commission: 'TL22' },
                { name: 'Boyama Isi', category: 'Ev Bakim', price: 'TL800', priority: 'ORTA', urgent: false, commission: 'TL120' },
                { name: 'Elektrik Tesisati', category: 'Ev Bakim', price: 'TL600', priority: 'YUKSEK', urgent: true, commission: 'TL90' }
            ];

            const city = cities[Math.floor(Math.random() * cities.length)];
            const district = districts[Math.floor(Math.random() * districts.length)];
            const job = providerJobs[Math.floor(Math.random() * providerJobs.length)];
            const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const jobId = 'P' + Math.floor(Math.random() * 9000 + 1000);

            const priorityColor = job.priority === 'YUKSEK' ? 'bg-amber-500' : 
                                job.priority === 'ORTA' ? 'bg-blue-600' : 'bg-blue-400';

            const categoryIcon = job.category === 'Teknik Onarim' ? 'fas fa-tools' :
                               job.category === 'Ev Bakim' ? 'fas fa-home' : 'fas fa-broom';

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
                                \${job.urgent ? '<span class="text-amber-600 text-xs font-bold pulse-dot">ACIL</span>' : ''}
                            </div>
                            <div>
                                <span class="text-blue-800 font-bold text-sm">\${job.name}</span>
                                <span class="text-blue-600 text-xs ml-2">- \${job.category}</span>
                            </div>
                            <div class="text-blue-500 text-xs mt-1">
                                \${city} / \${district} - \${time}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-blue-800 font-bold text-lg">\${job.price}</div>
                        <div class="text-amber-600 font-bold text-sm">Komisyon: \${job.commission}</div>
                        <div class="text-blue-500 text-xs">Musteri odemesi</div>
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
                recentCountEl.textContent = newCount + ' Is';
            }
        }

        // Update provider live stats
        function updateProviderLiveStats() {
            // Update hourly earnings
            const earningsEl = document.getElementById('provider-hourly-earnings');
            if (earningsEl) {
                const earnings = ['TL3,840', 'TL4,120', 'TL4,380', 'TL3,960', 'TL4,560', 'TL4,280', 'TL4,750'];
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

// Bayi login sayfasi
app.get('/bayi/login', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bayi Girisi - TV Servis Yonetim</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
            <div class="text-center mb-8">
                <i class="fas fa-tv text-4xl text-blue-500 mb-4"></i>
                <h1 class="text-2xl font-bold text-gray-800">Bayi Paneli</h1>
                <p class="text-gray-600">TV Servis Yonetim Sistemi</p>
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
                        <i class="fas fa-lock mr-1"></i> Sifre
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="--------"
                    />
                </div>
                
                <button 
                    type="submit" 
                    class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                    id="loginBtn"
                >
                    <i class="fas fa-sign-in-alt mr-1"></i> Giris Yap
                </button>
            </form>
            
            <div id="errorMessage" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded hidden">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                <span id="errorText"></span>
            </div>
            
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-600">Test Bayileri:</p>
                <div class="text-xs text-gray-500 space-y-1 mt-2">
                    <div>teknolojitv@tvservis.com (Istanbul)</div>
                    <div>baskentelektronik@tvservis.com (Ankara)</div>
                    <div>egetv@tvservis.com (Izmir)</div>
                    <div class="font-semibold">Sifre: 123456</div>
                </div>
            </div>
            
            <div class="mt-6 text-center">
                <a href="/" class="text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-arrow-left mr-1"></i> Admin Paneline Don
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
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Giris yapiliyor...';
                loginBtn.disabled = true;
                errorDiv.classList.add('hidden');
                
                try {
                    const response = await axios.post('/api/bayi/login', {
                        email: email,
                        password: password
                    });
                    
                    if (response.data.success) {
                        // Token'i localStorage'a kaydet
                        localStorage.setItem('bayiToken', response.data.token);
                        localStorage.setItem('bayiInfo', JSON.stringify(response.data.bayi));
                        
                        // Dashboard'a yonlendir
                        window.location.href = '/bayi/dashboard';
                    }
                } catch (error) {
                    const errorMessage = error.response?.data?.error || 'Giris islemi basarisiz';
                    document.getElementById('errorText').textContent = errorMessage;
                    errorDiv.classList.remove('hidden');
                } finally {
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-1"></i> Giris Yap';
                    loginBtn.disabled = false;
                }
            });
        </script>
    </body>
    </html>
  `)
})

// Bayi dashboard sayfasi
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
                    <span id="bayiInfo" class="text-sm">Yukleniyor...</span>
                    <div class="space-x-2">
                        <button onclick="showBayiSection('dashboard')" class="nav-btn bg-green-500 hover:bg-green-700 px-4 py-2 rounded">
                            <i class="fas fa-dashboard mr-1"></i> Dashboard
                        </button>
                        <button onclick="showBayiSection('jobs')" class="nav-btn bg-green-500 hover:bg-green-700 px-4 py-2 rounded">
                            <i class="fas fa-tasks mr-1"></i> Mevcut Isler
                        </button>
                        <button onclick="showBayiSection('my-jobs')" class="nav-btn bg-green-500 hover:bg-green-700 px-4 py-2 rounded">
                            <i class="fas fa-check mr-1"></i> Aldigim Isler
                        </button>
                        <button onclick="showBayiSection('credits')" class="nav-btn bg-green-500 hover:bg-green-700 px-4 py-2 rounded">
                            <i class="fas fa-coins mr-1"></i> Kredi
                        </button>
                        <button onclick="logout()" class="bg-red-500 hover:bg-red-700 px-4 py-2 rounded">
                            <i class="fas fa-sign-out-alt mr-1"></i> Cikis
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
                                <p class="text-sm font-medium text-gray-600">Mevcut Isler</p>
                                <p class="text-3xl font-bold text-blue-600" id="mevcut-isler">-</p>
                            </div>
                            <i class="fas fa-tasks text-blue-500 text-2xl"></i>
                        </div>
                    </div>
                    
                    <div class="bg-white p-6 rounded-lg shadow">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Aldigim Isler</p>
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
                    Mevcut Isler
                </h2>
                <div id="bayi-jobs-list" class="space-y-4">
                    Veriler yukleniyor...
                </div>
            </div>

            <!-- My Jobs Section -->
            <div id="bayi-my-jobs-section" class="section hidden">
                <h2 class="text-3xl font-bold mb-6 text-gray-800">
                    <i class="fas fa-check mr-2"></i>
                    Aldigim Isler
                </h2>
                <div id="bayi-my-jobs-list" class="space-y-4">
                    Veriler yukleniyor...
                </div>
            </div>

            <!-- Credits Section -->
            <div id="bayi-credits-section" class="section hidden">
                <h2 class="text-3xl font-bold mb-6 text-gray-800">
                    <i class="fas fa-coins mr-2"></i>
                    Kredi Yonetimi
                </h2>
                <div id="bayi-credits-content" class="space-y-4">
                    Veriler yukleniyor...
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/bayi.js"></script>
    </body>
    </html>
  `)
})

// SSS (Frequently Asked Questions) Route
app.get('/sss', (c) => {
  return c.html(`<!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sıkça Sorulan Sorular - Garantor360</title>
        <meta name="description" content="Garantor360 hakkında merak edilen tüm sorular ve yanıtları. Hizmet alma süreci, garanti koşulları ve daha fazlası.">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            .minimal-corner { border-radius: 4px; }
            .sharp-corner { border-radius: 0; }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-6xl mx-auto px-6 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <img src="https://page.gensparksite.com/v1/base64_upload/048c4b5ab3a7280d26f5b471c120123b" 
                             alt="Garantor360" class="h-8 w-auto mr-3">
                        <h1 class="text-xl font-bold text-gray-800">Sıkça Sorulan Sorular</h1>
                    </div>
                    <button onclick="window.close()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 minimal-corner transition-colors">
                        <i class="fas fa-times mr-2"></i>Kapat
                    </button>
                </div>
            </div>
        </header>

        <!-- FAQ Content -->
        <main class="max-w-4xl mx-auto px-6 py-8">
            <!-- Hizmet Alma Süreci -->
            <section class="mb-8">
                <h2 class="text-2xl font-bold text-blue-900 mb-6 flex items-center">
                    <i class="fas fa-cogs mr-3 text-blue-600"></i>
                    Hizmet Alma Süreci
                </h2>
                <div class="space-y-4">
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            Hizmet talebimi nasıl oluştururum?
                        </h3>
                        <p class="text-gray-600">Formda şehir, ilçe, hizmet kategorisi ve sorun detayını doldurun. İsim-soyisim ve telefon bilgilerinizi ekleyin. "TALEP GÖNDER" butonuna tıklayın.</p>
                    </div>
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            Talebimi gönderdikten sonra ne oluyor?
                        </h3>
                        <p class="text-gray-600">Talebiniz otomatik olarak yakınınızdaki doğrulanmış uzmanlara iletilir. Ortalama 12 dakika içinde size dönüş yapılır.</p>
                    </div>
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            Uzmanlar nasıl seçiliyor?
                        </h3>
                        <p class="text-gray-600">Tüm uzmanlarımız kimlik kontrolünden geçmiştir. Lokasyonunuza yakınlık, uzmanlık alanı ve müşteri memnuniyeti puanına göre eşleştirme yapılır.</p>
                    </div>
                </div>
            </section>

            <!-- Garanti ve Güvence -->
            <section class="mb-8">
                <h2 class="text-2xl font-bold text-purple-900 mb-6 flex items-center">
                    <i class="fas fa-shield-alt mr-3 text-purple-600"></i>
                    Garanti ve Güvenceler
                </h2>
                <div class="space-y-4">
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            Ödeme güvencesi nasıl çalışır?
                        </h3>
                        <p class="text-gray-600">Hizmetten memnun kalmazsanız ödediğiniz ücreti geri alırsınız. Para iade garantisi 7 gün süreyle geçerlidir.</p>
                    </div>
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            İşçilik garantisi kapsamı nedir?
                        </h3>
                        <p class="text-gray-600">Tamamlanan işlerde 6 ay işçilik garantisi verilir. Bu süre içinde aynı problemde tekrar hizmet alabilirsiniz.</p>
                    </div>
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            Sigorta koruması ne anlama gelir?
                        </h3>
                        <p class="text-gray-600">Hizmet sırasında oluşabilecek hasarlar sigorta kapsamındadır. Hasar tazminatı garantor360 tarafından karşılanır.</p>
                    </div>
                </div>
            </section>

            <!-- Fiyatlar ve Ödeme -->
            <section class="mb-8">
                <h2 class="text-2xl font-bold text-green-900 mb-6 flex items-center">
                    <i class="fas fa-money-bill-wave mr-3 text-green-600"></i>
                    Fiyatlar ve Ödeme
                </h2>
                <div class="space-y-4">
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            Fiyatlar nasıl belirleniyor?
                        </h3>
                        <p class="text-gray-600">Her hizmet için pazar araştırması yapılır ve adil fiyatlandırma uygulanır. Sabit fiyat listelerimiz mevcuttur.</p>
                    </div>
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            Hangi ödeme yöntemleri kabul ediliyor?
                        </h3>
                        <p class="text-gray-600">Nakit, kredi kartı, banka kartı ve havale ile ödeme yapabilirsiniz. Online ödeme seçenekleri de mevcuttur.</p>
                    </div>
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            Önceden ödeme yapmak zorunda mıyım?
                        </h3>
                        <p class="text-gray-600">Hayır, ödeme hizmet tamamlandıktan sonra yapılır. Peşin ödeme talep eden uzmanlarla çalışmayın.</p>
                    </div>
                </div>
            </section>

            <!-- İletişim ve Destek -->
            <section class="mb-8">
                <h2 class="text-2xl font-bold text-red-900 mb-6 flex items-center">
                    <i class="fas fa-headset mr-3 text-red-600"></i>
                    İletişim ve Destek
                </h2>
                <div class="space-y-4">
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            7/24 destek nasıl çalışır?
                        </h3>
                        <p class="text-gray-600">Müşteri hizmetlerimize haftanın 7 günü, günün 24 saati ulaşabilirsiniz. Canlı sohbet, telefon ve email destegi mevcuttur.</p>
                    </div>
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            Şikayetimi nasıl iletebilirim?
                        </h3>
                        <p class="text-gray-600">Şikayetlerinizi canlı destek, email veya telefon ile iletebilirsiniz. 48 saat içinde yanıt verilir.</p>
                    </div>
                    <div class="bg-white p-6 minimal-corner shadow border border-gray-200">
                        <h3 class="font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-question-circle mr-2 text-orange-500"></i>
                            Hukuki destek nasıl alınır?
                        </h3>
                        <p class="text-gray-600">Hizmet ile ilgili hukuki sorunlarınızda ücretsiz avukat desteği sağlanır. Başvuru formu ile talepte bulunabilirsiniz.</p>
                    </div>
                </div>
            </section>

            <!-- Ana Sayfaya Dön -->
            <div class="text-center mt-12">
                <a href="/" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 minimal-corner font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
                    <i class="fas fa-home mr-2"></i>
                    ANA SAYFAYA DÖN
                </a>
            </div>
        </main>

        <!-- Footer -->
        <footer class="bg-gray-800 text-white py-6 mt-12">
            <div class="max-w-4xl mx-auto px-6 text-center">
                <p class="text-gray-300">
                    © 2024 Garantor360. Tüm hakları saklıdır. | 
                    <strong class="text-white">7/24 Destek:</strong> 0850 123 45 67
                </p>
            </div>
        </footer>
    </body>
    </html>`)
})

// Default route - Customer Landing Page
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Garantor360 - Guvenli Hizmet Alin | Odeme Guvencesi ve Iscilik Garantisi</title>
        <meta name="description" content="Garantor360 ile ev tamiri, temizlik, nakliye ve tum hizmetlerde odeme guvenligi, 6 ay iscilik garantisi ve sigorta korumasi. Guvenli hizmet almanin en kolay yolu!">
        <meta name="keywords" content="guvenli hizmet, odeme guvencesi, iscilik garantisi, ev tamiri, temizlik hizmeti, nakliye, sigorta korumasi">
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            // Suppress TailwindCSS CDN warning in production
            const originalWarn = console.warn;
            console.warn = function(...args) {
                if (args[0] && typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) {
                    return; // Suppress this warning
                }
                originalWarn.apply(console, args);
            };
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script src="/slider.js"></script>
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
            .superhero-glow {
              filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
              transition: all 0.4s ease;
              animation: superheroFloat 3s ease-in-out infinite, superheroGlow 2s ease-in-out infinite alternate;
            }
            .superhero-glow:hover {
              filter: drop-shadow(0 0 40px rgba(59, 130, 246, 0.8));
              transform: scale(1.05) rotate(2deg);
              animation-play-state: paused;
            }
            .superhero-glow img {
              transition: all 0.3s ease;
            }
            .superhero-glow:hover img {
              transform: translateY(-5px);
            }
            @keyframes superheroFloat {
              0%, 100% { 
                transform: translateY(0px) rotate(0deg); 
              }
              25% { 
                transform: translateY(-10px) rotate(1deg); 
              }
              50% { 
                transform: translateY(-5px) rotate(0deg); 
              }
              75% { 
                transform: translateY(-15px) rotate(-1deg); 
              }
            }
            @keyframes superheroGlow {
              0% { 
                filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3)); 
              }
              100% { 
                filter: drop-shadow(0 0 35px rgba(59, 130, 246, 0.6)); 
              }
            }
            .superhero-title {
              animation: titlePulse 4s ease-in-out infinite;
            }
            
            /* Kompakt Güvenlik Sistemi Animasyonları */
            .security-card-hover:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
            }
            }
            .superhero-subtitle {
              animation: subtitleFade 3s ease-in-out infinite alternate;
            }
            @keyframes titlePulse {
              0%, 100% { 
                transform: scale(1); 
                text-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
              }
              50% { 
                transform: scale(1.02); 
                text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
              }
            }
            @keyframes subtitleFade {
              0% { 
                opacity: 0.8; 
              }
              100% { 
                opacity: 1; 
              }
            }
            .superhero-container:hover .superhero-title {
              text-shadow: 0 0 25px rgba(251, 191, 36, 0.8);
              transform: scale(1.05);
            }
            .superhero-container:hover .superhero-subtitle {
              transform: translateY(-2px);
              opacity: 1;
            }
            .home-services-glow {
              filter: drop-shadow(0 0 20px rgba(230, 126, 34, 0.3));
              transition: all 0.4s ease;
              animation: heartbeat 2s ease-in-out infinite, servicesGlow 3s ease-in-out infinite alternate;
            }
            .home-services-glow:hover {
              filter: drop-shadow(0 0 40px rgba(230, 126, 34, 0.6));
              transform: scale(1.08);
              animation: heartbeatFast 1s ease-in-out infinite, servicesGlow 1.5s ease-in-out infinite alternate;
            }
            @keyframes heartbeat {
              0%, 50%, 100% { 
                transform: scale(1); 
              }
              25% { 
                transform: scale(1.05); 
              }
              37% { 
                transform: scale(1.02); 
              }
            }
            @keyframes heartbeatFast {
              0%, 50%, 100% { 
                transform: scale(1.08); 
              }
              25% { 
                transform: scale(1.15); 
              }
              37% { 
                transform: scale(1.12); 
              }
            }
            @keyframes servicesGlow {
              0% { 
                filter: drop-shadow(0 0 20px rgba(230, 126, 34, 0.3)); 
              }
              100% { 
                filter: drop-shadow(0 0 35px rgba(214, 137, 16, 0.5)); 
              }
            }
            
            /* Fast Contact Text Glow Effect */
            .fast-contact-text {
              background: linear-gradient(90deg, #fbbf24, #f59e0b, #d97706, #92400e);
              background-size: 400% 100%;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              animation: fastContactShine 3s ease-in-out infinite;
              font-weight: 700;
              text-shadow: 0 0 30px rgba(251, 191, 36, 0.5);
              position: relative;
              overflow: hidden;
              display: inline-block;
            }
            
            .fast-contact-text::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 50%, transparent 100%);
              animation: fastContactSweep 2.5s ease-in-out infinite;
              z-index: 1;
              transform: translateX(-100%);
            }
            
            @keyframes fastContactShine {
              0% { 
                background-position: 0% 50%; 
                filter: brightness(1) drop-shadow(0 0 10px rgba(251, 191, 36, 0.3));
              }
              25% {
                background-position: 50% 50%;
                filter: brightness(1.3) drop-shadow(0 0 20px rgba(251, 191, 36, 0.6));
              }
              50% { 
                background-position: 100% 50%; 
                filter: brightness(1.5) drop-shadow(0 0 30px rgba(251, 191, 36, 0.8));
              }
              75% {
                background-position: 50% 50%;
                filter: brightness(1.3) drop-shadow(0 0 20px rgba(251, 191, 36, 0.6));
              }
              100% { 
                background-position: 0% 50%; 
                filter: brightness(1) drop-shadow(0 0 10px rgba(251, 191, 36, 0.3));
              }
            }
            
            @keyframes fastContactSweep {
              0% { 
                transform: translateX(-100%);
                opacity: 0;
              }
              20% { 
                transform: translateX(-50%);
                opacity: 1;
              }
              80% { 
                transform: translateX(50%);
                opacity: 1;
              }
              100% { 
                transform: translateX(100%);
                opacity: 0;
              }
            }
            
            /* Custom Radio Button Styles */
            input[type="radio"][name="urgency"] {
              appearance: none;
              -webkit-appearance: none;
              width: 20px;
              height: 20px;
              border: 2px solid #a855f7;
              border-radius: 50%;
              background: transparent;
              position: relative;
              cursor: pointer;
              transition: all 0.3s ease;
            }
            
            /* Normal - Sarı (Yellow) */
            input[type="radio"][name="urgency"][value="normal"]:checked {
              border-color: #eab308;
              background: #eab308;
            }
            
            input[type="radio"][name="urgency"][value="normal"]:hover {
              border-color: #eab308;
              box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.2);
            }
            
            /* Acil - Yeşil (Green) */
            input[type="radio"][name="urgency"][value="urgent"]:checked {
              border-color: #22c55e;
              background: #22c55e;
            }
            
            input[type="radio"][name="urgency"][value="urgent"]:hover {
              border-color: #22c55e;
              box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
            }
            
            /* Çok Acil - Kırmızı (Red) */
            input[type="radio"][name="urgency"][value="emergency"]:checked {
              border-color: #dc2626;
              background: #dc2626;
            }
            
            input[type="radio"][name="urgency"][value="emergency"]:hover {
              border-color: #dc2626;
              box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
            }
            
            input[type="radio"][name="urgency"]:checked::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: white;
            }
            
            /* Floating Dynamic Stats Text */
            .floating-stats-text {
              color: #ffffff;
              text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
              opacity: 0.8;
              transition: all 0.3s ease;
              min-height: 20px;
            }
            
            /* Floating Dynamic Activity Text */
            .floating-activity-text {
              color: #eab308;
              text-shadow: 0 0 10px rgba(234, 179, 8, 0.3);
              opacity: 0.8;
              transition: all 0.3s ease;
              min-height: 20px;
            }
            
            /* Floating Notifications Styles */
            #floating-notification-area {
              position: relative;
              overflow: hidden;
            }
            
            .floating-notification {
              position: absolute;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
              color: #eab308;
              font-weight: 600;
              font-size: 16px;
              text-align: center;
              opacity: 0;
              animation: floatingNotificationAppear 4s ease-in-out;
              z-index: 10;
              text-shadow: 0 2px 4px rgba(234, 179, 8, 0.3);
            }
            
            .floating-response-text {
              color: #eab308;
              font-weight: 600;
              font-size: 16px;
              text-shadow: 0 2px 4px rgba(234, 179, 8, 0.3);
              opacity: 0;
              animation: floatingTextAppear 3s ease-in-out infinite;
            }
            
            @keyframes floatingNotificationAppear {
              0% { 
                opacity: 0; 
                transform: translate(-50%, -50%) scale(0.8);
              }
              15% { 
                opacity: 1; 
                transform: translate(-50%, -50%) scale(1);
              }
              85% { 
                opacity: 1; 
                transform: translate(-50%, -50%) scale(1);
              }
              100% { 
                opacity: 0; 
                transform: translate(-50%, -50%) scale(0.8);
              }
            }
            
            @keyframes floatingTextAppear {
              0% { 
                opacity: 0; 
                transform: scale(0.95);
              }
              50% { 
                opacity: 1; 
                transform: scale(1);
              }
              100% { 
                opacity: 0; 
                transform: scale(0.95);
              }
            }
            
            /* PROFESYONEL CANLI TALEP METİNLERİ İÇİN CSS */
            
            #job-feed .job-category-text {
                font-size: 14px !important;
                font-weight: 500 !important;
                color: #111827 !important;
                line-height: 1.25 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            }
            
            #job-feed .job-details-text {
                font-size: 12px !important;
                font-weight: 400 !important;
                color: #4b5563 !important;
                line-height: 1.5 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            }
            
            #job-feed .job-time-text {
                font-size: 14px !important;
                font-weight: 600 !important;
                color: #2563eb !important;
                line-height: 1.4 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            }
            
            /* EXTRA GÜVENCE: TÜM ELEMANLAR İÇİN ZORLA STILLEME */
            #job-feed > div > div > div > div:first-child {
                font-size: 16px !important;
                font-weight: 600 !important;
                color: #1f2937 !important;
            }
            
            #job-feed > div > div > div > div:nth-child(2) {
                font-size: 14px !important;
                font-weight: 500 !important;
                color: #6b7280 !important;
            }
            
            /* SELECT OPTION RENKLERİ DÜZELTMESİ - ENHANCED */
            select.city-select option {
                color: #1f2937 !important;
                background-color: #ffffff !important;
                font-weight: 500 !important;
                padding: 8px 12px !important;
                font-size: 14px !important;
            }
            
            select.city-select option:hover {
                background-color: #f3f4f6 !important;
                color: #111827 !important;
            }
            
            select.city-select option:checked,
            select.city-select option:focus,
            select.city-select option:active {
                background-color: #3b82f6 !important;
                color: #ffffff !important;
            }
            
            /* Service Category Select Styling */
            select.service-category-select option {
                color: #1f2937 !important;
                background-color: #ffffff !important;
                font-weight: 500 !important;
                padding: 8px 12px !important;
                font-size: 14px !important;
            }
            
            select.service-category-select optgroup {
                color: #374151 !important;
                background-color: #f9fafb !important;
                font-weight: 600 !important;
                padding: 4px 8px !important;
                font-size: 13px !important;
            }
            
            /* Fallback for older method */
            #customerCity option,
            #serviceCategory option {
                color: #1f2937 !important;
                background-color: #ffffff !important;
                font-weight: 500 !important;
            }
            
            #customerCity option:hover,
            #serviceCategory option:hover {
                background-color: #f3f4f6 !important;
                color: #111827 !important;
            }
            
            #serviceCategory optgroup {
                color: #374151 !important;
                background-color: #f9fafb !important;
                font-weight: 600 !important;
                color: #1f2937 !important;
            }
            
            /* Select açıldığında option listesi için */
            select#customerCity {
                color: white; /* Seçili değer beyaz kalacak */
            }
            
            select#customerCity option {
                color: #1f2937 !important; /* Dropdown listesindeki seçenekler koyu */
                background-color: white !important;
                padding: 8px 12px;
            }
        </style>
    </head>
    <body class="bg-slate-50">
        <!-- Navigation -->
        <nav class="bg-white shadow-lg sticky top-0 z-50 border-b-2 border-blue-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex justify-between items-center h-20">
                    <div class="flex items-center">
                        <!-- Garantor360 Logo -->
                        <div class="flex items-center">
                            <img src="https://cdn1.genspark.ai/user-upload-image/rmbg_generated/0_a592278a-b85c-4292-adc2-ddfd0a7dd6db" alt="Garantor360" class="h-16">
                        </div>
                    </div>
                    
                    <!-- Navigation Menu -->
                    <div class="hidden md:flex items-center space-x-8">
                        <a href="#guarantee" class="text-gray-700 hover:text-blue-600 font-medium transition duration-200 flex items-center">
                            <i class="fas fa-shield-check mr-2 text-sm"></i>
                            Guvenceler
                        </a>
                        <a href="#stats" class="text-gray-700 hover:text-blue-600 font-medium transition duration-200 flex items-center">
                            <i class="fas fa-chart-bar mr-2 text-sm"></i>
                            Istatistikler
                        </a>
                        <a href="#services" class="text-gray-700 hover:text-blue-600 font-medium transition duration-200 flex items-center">
                            <i class="fas fa-tools mr-2 text-sm"></i>
                            Hizmetler
                        </a>

                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex items-center space-x-4">
                        <a href="/bayi" class="text-blue-600 hover:text-blue-800 font-semibold transition duration-200 flex items-center px-3 py-2 rounded-lg hover:bg-blue-50">
                            <i class="fas fa-user-tie mr-2"></i>
                            <span class="hidden lg:inline">Hizmet Veren misiniz?</span>
                            <span class="lg:hidden">Bayi</span>
                        </a>
                        <a href="#hizmet-al" class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-bold text-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                            <i class="fas fa-handshake mr-2"></i>
                            HIZMET AL
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

                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                    <!-- Left Superhero -->
                    <div class="text-center superhero-container">
                        <div class="superhero-glow mb-6">
                            <img src="/static/images/garantor-superhero-v2.png" alt="Garantor360 Guvenlik Koruyucusu" class="w-full max-w-sm mx-auto superhero-image">
                        </div>
                        <h3 class="text-2xl font-bold text-white mb-4 superhero-title">Guvenlik Koruyucusu</h3>
                        <p class="text-blue-100 text-lg superhero-subtitle">Odeme guvenliginiz bizim sorumlulugumuz!</p>
                    </div>

                    <!-- Center Content -->
                    <div class="text-center lg:text-center">
                        <h1 class="text-4xl lg:text-5xl font-bold mb-6 tracking-tight leading-tight">
                            GUVENLI HIZMET ALMAK <span class="text-amber-400">BU KADAR KOLAY!</span>
                        </h1>
                        <p class="text-2xl mb-10 opacity-90 max-w-2xl font-light leading-relaxed text-center mx-auto">
                            Guvenli hizmet almanin <span class="text-amber-400 font-semibold">en kolay yolu</span>
                        </p>
                        <div class="flex flex-row gap-4 justify-center items-center mt-12">
                            <!-- Web Uygulamasi Butonu -->
                            <a href="#hizmet-al" class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 w-48">
                                <i class="fas fa-globe text-sm"></i>
                                <div>
                                    <div class="text-sm font-bold">WEB UYGULAMASI</div>
                                    <div class="text-xs opacity-90">Hemen Kullan</div>
                                </div>
                            </a>
                            
                            <!-- Tarayicidan Erisim Butonu -->
                            <a href="#services" class="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 w-48">
                                <i class="fas fa-browser text-sm"></i>
                                <div>
                                    <div class="text-sm font-bold">TARAYICIDAN ERIS</div>
                                    <div class="text-xs opacity-90">Aninda Erisin</div>
                                </div>
                            </a>
                        </div>



                    </div>

                    <!-- Right Column - Original Circular Home Services Icon -->
                    <div class="text-center hidden lg:block">
                        <div class="home-services-glow mb-6">
                            <img src="https://cdn1.genspark.ai/user-upload-image/rmbg_generated/0_75e4c704-65cb-4b63-91b3-99a36fc53af7" alt="Ev Hizmetleri" class="w-full max-w-sm mx-auto">
                        </div>
                        <h3 class="text-2xl font-bold text-white mb-4">Hizmet Koruyucusu</h3>
                        <p class="text-blue-100 text-lg">Tum ev hizmetlerinizde yaninizda!</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Service Categories -->
        <section class="py-20 bg-white">
            <div class="max-w-7xl mx-auto px-6">
                <div class="text-center mb-16">
                    <div class="section-divider w-20 mx-auto mb-6"></div>
                    <h2 class="text-4xl font-bold text-slate-800 mb-4 tracking-tight">
                        HIZMET KATEGORILERI
                    </h2>
                    <p class="text-slate-600 text-lg font-medium">Guvenli hizmet almanin kapsamli cozumleri</p>
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
                            <div class="text-slate-600 text-sm">Basari Orani</div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <!-- TV Tamiri -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-blue-200 p-6 minimal-corner hover:border-blue-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-blue-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-blue-600 transition duration-300">
                                    <i class="fas fa-tv text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-blue-900 mb-2">TV Tamiri</h3>
                                <p class="text-xs text-blue-600 mb-3">LCD, LED, OLED</p>
                                <div class="text-xs text-green-600 font-bold">TL300-2.500</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-blue-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">TV Tamiri Hizmetleri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Ekran Degisimi</span>
                                        <span class="text-yellow-300">TL800-2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Elektronik Kart</span>
                                        <span class="text-yellow-300">TL400-1K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Genel Bakim</span>
                                        <span class="text-yellow-300">TL300-600</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Kurulum</span>
                                        <span class="text-yellow-300">TL200-500</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-yellow-500 text-blue-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Bilgisayar Tamiri -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-green-200 p-6 minimal-corner hover:border-green-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-green-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-green-600 transition duration-300">
                                    <i class="fas fa-laptop text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-green-900 mb-2">PC Tamiri</h3>
                                <p class="text-xs text-green-600 mb-3">Masaustu & Laptop</p>
                                <div class="text-xs text-green-600 font-bold">TL200-3.000</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-green-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">PC Tamiri Hizmetleri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Donanim Tamiri</span>
                                        <span class="text-yellow-300">TL500-2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Yazilim Kurulum</span>
                                        <span class="text-yellow-300">TL200-800</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Veri Kurtarma</span>
                                        <span class="text-yellow-300">TL400-1.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Genel Bakim</span>
                                        <span class="text-yellow-300">TL200-600</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-yellow-500 text-green-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Beyaz Eşya -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-purple-200 p-6 minimal-corner hover:border-purple-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-purple-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-purple-600 transition duration-300">
                                    <i class="fas fa-snowflake text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-purple-900 mb-2">Beyaz Eşya</h3>
                                <p class="text-xs text-purple-600 mb-3">Buzdolabı, Çamaşır Makinesi</p>
                                <div class="text-xs text-green-600 font-bold">TL400-2.500</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-purple-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Beyaz Eşya Tamiri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Buzdolabı</span>
                                        <span class="text-yellow-300">TL500-1.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Çamaşır Makinesi</span>
                                        <span class="text-yellow-300">TL400-1.2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Bulaşık Makinesi</span>
                                        <span class="text-yellow-300">TL400-1K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Fırın/Ocak</span>
                                        <span class="text-yellow-300">TL300-800</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-yellow-500 text-purple-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Klima Servisi -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-indigo-200 p-6 minimal-corner hover:border-indigo-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-indigo-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-indigo-600 transition duration-300">
                                    <i class="fas fa-wind text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-indigo-900 mb-2">Klima Servisi</h3>
                                <p class="text-xs text-indigo-600 mb-3">Montaj & Bakım</p>
                                <div class="text-xs text-green-600 font-bold">TL300-2.000</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-indigo-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Klima Hizmetleri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Klima Montaj</span>
                                        <span class="text-yellow-300">TL800-1.5K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Gaz Dolumu</span>
                                        <span class="text-yellow-300">TL400-800</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Genel Bakım</span>
                                        <span class="text-yellow-300">TL300-600</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Arıza Tamiri</span>
                                        <span class="text-yellow-300">TL500-2K</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-yellow-500 text-indigo-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Küçük Ev Aletleri -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-pink-200 p-6 minimal-corner hover:border-pink-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-pink-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-pink-600 transition duration-300">
                                    <i class="fas fa-blender text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-pink-900 mb-2">Küçük Ev Aletleri</h3>
                                <p class="text-xs text-pink-600 mb-3">Elektrikli Aletler</p>
                                <div class="text-xs text-green-600 font-bold">TL200-1.000</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-pink-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Küçük Ev Aletleri Tamiri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Mikrodalga</span>
                                        <span class="text-yellow-300">TL200-600</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Elektrikli Süpürge</span>
                                        <span class="text-yellow-300">TL250-700</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Blender/Mutfak</span>
                                        <span class="text-yellow-300">TL150-500</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Ütü/Saç Kurutma</span>
                                        <span class="text-yellow-300">TL200-400</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-yellow-500 text-pink-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Elektronik Cihaz Tamiri -->
                    <div class="relative group cursor-pointer">
                        <div class="bg-white border-2 border-red-200 p-6 minimal-corner hover:border-red-500 transition-all duration-300 hover:shadow-lg">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-red-500 sharp-corner mx-auto mb-3 flex items-center justify-center group-hover:bg-red-600 transition duration-300">
                                    <i class="fas fa-mobile-alt text-white text-lg"></i>
                                </div>
                                <h3 class="font-bold text-sm text-red-900 mb-2">Elektronik Tamiri</h3>
                                <p class="text-xs text-red-600 mb-3">Telefon, Tablet, Oyun</p>
                                <div class="text-xs text-green-600 font-bold">TL200-1.500</div>
                            </div>
                        </div>
                        
                        <!-- Hover Overlay -->
                        <div class="absolute inset-0 bg-red-900 bg-opacity-95 minimal-corner opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 text-white z-10">
                            <div class="h-full flex flex-col">
                                <h4 class="font-bold text-sm mb-3 text-center">Elektronik Tamiri</h4>
                                <div class="space-y-2 text-xs flex-grow">
                                    <div class="flex justify-between">
                                        <span>Telefon Tamiri</span>
                                        <span class="text-yellow-300">TL200-800</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Tablet Tamiri</span>
                                        <span class="text-yellow-300">TL300-1K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Oyun Konsolu</span>
                                        <span class="text-yellow-300">TL400-1.2K</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Ses Sistemi</span>
                                        <span class="text-yellow-300">TL300-1.5K</span>
                                    </div>
                                </div>
                                <button onclick="scrollToServices()" class="w-full bg-yellow-500 text-red-900 py-2 mt-3 sharp-corner text-xs font-bold hover:bg-yellow-400 transition">
                                    Hemen Talep Et
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>


        <!-- Unified Process & Security System -->
        <section class="py-12 bg-white">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Section Header -->
                <div class="text-center mb-8">
                    <div class="section-divider w-20 mx-auto mb-4"></div>
                    <h2 class="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                        HİZMET ALMA SÜRECİMİZ
                    </h2>
                    <p class="text-slate-600 text-base font-medium">4 basit adımda profesyonel hizmet alın</p>
                    
                    <!-- Key Stats -->
                    <div class="flex justify-center items-center space-x-6 mt-4">
                        <div class="text-center">
                            <div class="text-xl font-bold text-blue-900">5dk</div>
                            <div class="text-slate-600 text-xs">Ortalama Süre</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xl font-bold text-orange-600">7/24</div>
                            <div class="text-slate-600 text-xs">Destek</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xl font-bold text-green-600">%100</div>
                            <div class="text-slate-600 text-xs">Güvenli</div>
                        </div>
                    </div>
                </div>

                <!-- Unified Process + Security Cards -->
                <div class="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-5 border border-blue-200 shadow-lg relative overflow-hidden">
                    
                    <!-- 360° Background Logo - Behind Content -->
                    <div class="absolute inset-0 flex items-center justify-center opacity-6 -z-10">
                        <img src="https://cdn1.genspark.ai/user-upload-image/rmbg_generated/0_da4a2c84-aaac-47c9-a813-6b04eedeba63" 
                             alt="360° Güvenlik Arka Plan" 
                             class="w-full h-full object-contain" 
                             style="filter: saturate(0.3) brightness(1.5) grayscale(0.2); transform: scale(0.8);">
                    </div>
                    
                    <!-- Fallback 360° Logo - Behind Content -->
                    <div class="absolute inset-0 flex items-center justify-center opacity-4 -z-10">
                        <div class="w-80 h-80 flex items-center justify-center">
                            <span class="text-slate-300 text-8xl font-bold transform rotate-12 select-none">360°</span>
                        </div>
                    </div>
                    
                    <!-- Garantor360 Header -->
                    <div class="text-center mb-5 relative z-10">
                        <div class="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm border border-blue-100">
                            <div class="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                                <i class="fas fa-shield-alt text-white text-xs"></i>
                            </div>
                            <span class="text-base font-bold text-slate-800">GARANTOR360 KORUMASINDA</span>
                            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    <!-- 4 Step Process with Integrated Security -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                        
                        <!-- Step 1: Talep Oluştur + Koruma -->
                        <div class="bg-white rounded-lg p-4 border border-blue-100 hover:shadow-lg transition-all duration-300 relative">
                            <!-- Step Icon -->
                            <div class="flex justify-center mb-3">
                                <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md relative">
                                    <i class="fas fa-edit text-white text-base"></i>
                                    <div class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white">
                                        <i class="fas fa-shield-alt text-white text-xs flex items-center justify-center h-full"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Step Content -->
                            <h3 class="text-base font-bold text-slate-800 mb-1 text-center">Talep Oluştur</h3>
                            <p class="text-slate-600 text-xs leading-relaxed text-center mb-2">Problem tanımlayın ya da AI önerisinden kategori seçin</p>
                            <div class="text-center text-xs text-blue-600 font-semibold mb-3">⏱️ 2 dakika</div>
                            
                            <!-- Security Info -->
                            <div class="bg-blue-50 rounded-md p-2 border border-blue-100">
                                <div class="flex items-center space-x-2">
                                    <div class="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                        <i class="fas fa-check text-white text-xs"></i>
                                    </div>
                                    <div class="flex-1">
                                        <div class="text-xs font-semibold text-slate-800">Veri Koruması</div>
                                        <div class="text-xs text-green-600">✓ SSL Şifreli</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Arrow (Desktop) -->
                            <div class="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                    <i class="fas fa-arrow-right text-blue-600 text-sm"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2: Uzman Eşleştirme + Doğrulama -->
                        <div class="bg-white rounded-lg p-4 border border-blue-100 hover:shadow-lg transition-all duration-300 relative">
                            <!-- Step Icon -->
                            <div class="flex justify-center mb-3">
                                <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md relative">
                                    <i class="fas fa-user-tie text-white text-base"></i>
                                    <div class="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white">
                                        <i class="fas fa-user-check text-white text-xs flex items-center justify-center h-full"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Step Content -->
                            <h3 class="text-base font-bold text-slate-800 mb-1 text-center">Uzman Eşleştirme</h3>
                            <p class="text-slate-600 text-xs leading-relaxed text-center mb-2">Size en yakın ve uygun uzmanları buluyoruz</p>
                            <div class="text-center text-xs text-green-600 font-semibold mb-3">⚡ 15 saniye</div>
                            
                            <!-- Security Info -->
                            <div class="bg-green-50 rounded-md p-2 border border-green-100">
                                <div class="flex items-center space-x-2">
                                    <div class="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                        <i class="fas fa-id-card text-white text-xs"></i>
                                    </div>
                                    <div class="flex-1">
                                        <div class="text-xs font-semibold text-slate-800">Kimlik Doğrulama</div>
                                        <div class="text-xs text-blue-600">✓ %100 Güvenli</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Arrow (Desktop) -->
                            <div class="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                    <i class="fas fa-arrow-right text-green-600 text-sm"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Step 3: Fiyat & Randevu + Güvence -->
                        <div class="bg-white rounded-lg p-4 border border-blue-100 hover:shadow-lg transition-all duration-300 relative">
                            <!-- Step Icon -->
                            <div class="flex justify-center mb-3">
                                <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-md relative">
                                    <i class="fas fa-handshake text-white text-base"></i>
                                    <div class="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full border-2 border-white">
                                        <i class="fas fa-lock text-white text-xs flex items-center justify-center h-full"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Step Content -->
                            <h3 class="text-base font-bold text-slate-800 mb-1 text-center">Fiyat & Randevu</h3>
                            <p class="text-slate-600 text-xs leading-relaxed text-center mb-2">Şeffaf fiyat alın ve randevu belirleyin</p>
                            <div class="text-center text-xs text-purple-600 font-semibold mb-3">💰 Net fiyat</div>
                            
                            <!-- Security Info -->
                            <div class="bg-purple-50 rounded-md p-2 border border-purple-100">
                                <div class="flex items-center space-x-2">
                                    <div class="w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                                        <i class="fas fa-credit-card text-white text-xs"></i>
                                    </div>
                                    <div class="flex-1">
                                        <div class="text-xs font-semibold text-slate-800">Ödeme Koruması</div>
                                        <div class="text-xs text-purple-600">✓ Escrow Sistemi</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Arrow (Desktop) -->
                            <div class="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                    <i class="fas fa-arrow-right text-purple-600 text-sm"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Step 4: Hizmet Tamamla + Garanti -->
                        <div class="bg-white rounded-lg p-4 border border-blue-100 hover:shadow-lg transition-all duration-300">
                            <!-- Step Icon -->
                            <div class="flex justify-center mb-3">
                                <div class="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-md relative">
                                    <i class="fas fa-check-circle text-white text-base"></i>
                                    <div class="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-white">
                                        <i class="fas fa-star text-white text-xs flex items-center justify-center h-full"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Step Content -->
                            <h3 class="text-base font-bold text-slate-800 mb-1 text-center">Hizmet Tamamla</h3>
                            <p class="text-slate-600 text-xs leading-relaxed text-center mb-2">Hizmet tamamlandıktan sonra güvenle ödeme yapın</p>
                            <div class="text-center text-xs text-orange-600 font-semibold mb-3">🛡️ %100 Garanti</div>
                            
                            <!-- Security Info -->
                            <div class="bg-orange-50 rounded-md p-2 border border-orange-100">
                                <div class="flex items-center space-x-2">
                                    <div class="w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                                        <i class="fas fa-award text-white text-xs"></i>
                                    </div>
                                    <div class="flex-1">
                                        <div class="text-xs font-semibold text-slate-800">Kalite Garantisi</div>
                                        <div class="text-xs text-orange-600">✓ 6 Ay Garanti</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Mobile Arrows -->
                    <div class="lg:hidden flex justify-center items-center mt-4 space-x-4">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center animate-bounce">
                            <i class="fas fa-arrow-down text-blue-600 text-sm"></i>
                        </div>
                        <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                            <i class="fas fa-arrow-down text-green-600 text-sm"></i>
                        </div>
                        <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center animate-bounce">
                            <i class="fas fa-arrow-down text-purple-600 text-sm"></i>
                        </div>
                    </div>

                    <!-- Bottom Security Status Bar -->
                    <div class="mt-5 bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center space-x-2">
                                <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                    <div class="animate-spin">
                                        <i class="fas fa-sync text-white text-xs"></i>
                                    </div>
                                </div>
                                <div>
                                    <div class="text-sm font-bold text-slate-800">Garantor360 Canlı İzleme</div>
                                    <div class="text-xs text-slate-600">Tüm süreç boyunca aktif koruma</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-bold text-green-600">%100 Güvenli</div>
                                <div class="text-xs text-slate-500">SSL + AI Koruması</div>
                            </div>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div class="w-full bg-slate-200 rounded-full h-1.5 mb-3">
                            <div class="bg-gradient-to-r from-blue-500 via-green-500 to-orange-500 h-full rounded-full animate-pulse"></div>
                        </div>

                        <!-- Security Features Grid -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                            <div class="bg-blue-50 rounded-md p-2">
                                <div class="text-xs font-bold text-blue-600">7/24</div>
                                <div class="text-xs text-slate-600">Anlık İzleme</div>
                            </div>
                            <div class="bg-green-50 rounded-md p-2">
                                <div class="text-xs font-bold text-green-600">Real-Time</div>
                                <div class="text-xs text-slate-600">Canlı Takip</div>
                            </div>
                            <div class="bg-purple-50 rounded-md p-2">
                                <div class="text-xs font-bold text-purple-600">AI Powered</div>
                                <div class="text-xs text-slate-600">Akıllı Koruma</div>
                            </div>
                            <div class="bg-orange-50 rounded-md p-2">
                                <div class="text-xs font-bold text-orange-600">256-bit SSL</div>
                                <div class="text-xs text-slate-600">Şifreli Güvenlik</div>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </section>

        <!-- AI-POWERED SMART RECOMMENDATION ENGINE -->
        <section id="ai-recommendation" class="py-16 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
            <div class="max-w-6xl mx-auto px-6">
                <div class="text-center mb-4">
                    <div class="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1 rounded-full mb-2">
                        <i class="fas fa-user-tie text-purple-300 text-sm mr-2"></i>
                        <span class="text-white font-semibold text-sm">UZMAN DANIŞMAN</span>
                    </div>
                    <h2 class="text-2xl lg:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                        Size Özel Çözüm Önerisi
                    </h2>
                    <p class="text-sm text-purple-100 max-w-3xl mx-auto leading-tight">
                        Probleminizi anlatın, deneyimli uzmanlarımız size en uygun çözümü hemen önersin!
                        7/24 canlı destek ile anında yardım.
                    </p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <!-- AI Problem Analysis Form -->
                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                        <h3 class="text-lg font-bold text-white mb-3 flex items-center">
                            <i class="fas fa-headset text-purple-300 mr-2"></i>
                            Uzman Danışman Merkezi
                            <span class="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                                7/24 CANLI
                            </span>
                        </h3>
                        
                        <div class="space-y-3">
                            <div>
                                <label class="block text-purple-200 text-xs font-semibold mb-2">
                                    Probleminizi Detaylı Anlatın
                                </label>
                                <textarea 
                                    id="problemDescription" 
                                    rows="3" 
                                    class="w-full p-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:border-purple-300 focus:bg-white/25 transition-all text-sm"
                                    placeholder="Örn: Çamaşır makinesi su almıyor ve garip sesler çıkarıyor..."
                                ></textarea>
                                <div class="text-xs text-purple-200 mt-1">
                                    <span id="charCount">0</span>/500 karakter
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-purple-200 text-xs font-semibold mb-1">Aciliyet Durumu</label>
                                    <select id="urgencyLevel" class="w-full p-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:border-purple-300 text-sm">
                                        <option value="normal">Normal (1-2 gün)</option>
                                        <option value="urgent">Acil (Aynı gün)</option>
                                        <option value="emergency">Çok Acil (1-2 saat)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-purple-200 text-xs font-semibold mb-1">Şehir</label>
                                    <select id="serviceLocation" class="w-full p-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:border-purple-300 text-sm">
                                        <option value="istanbul">İstanbul</option>
                                        <option value="ankara">Ankara</option>
                                        <option value="izmir">İzmir</option>
                                        <option value="bursa">Bursa</option>
                                        <option value="antalya">Antalya</option>
                                        <option value="adana">Adana</option>
                                        <option value="konya">Konya</option>
                                        <option value="gaziantep">Gaziantep</option>
                                    </select>
                                </div>
                            </div>

                            <button onclick="analyzeWithAI()" class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-lg text-sm">
                                <i class="fas fa-search mr-2"></i>
                                Hemen Analiz Et
                            </button>
                        </div>

                        <!-- AI Analysis States -->
                        <div id="aiAnalysisState" class="mt-4">
                            <!-- Default State (shown initially) -->
                            <div id="aiStateDefault" class="text-center py-4">
                                <div class="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <i class="fas fa-lightbulb text-yellow-400 text-lg" style="
                                        animation: electricPowerOn 3s ease-in-out infinite;
                                        filter: drop-shadow(0 0 8px rgba(255, 255, 0, 0.6));
                                    "></i>
                                </div>
                                <p class="text-purple-200 text-sm">
                                    Probleminizi yazın ve hemen analiz başlayalım!
                                </p>
                            </div>

                            <!-- Loading State -->
                            <div id="aiStateLoading" class="hidden text-center py-4">
                                <div class="w-12 h-12 bg-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-2 animate-spin">
                                    <i class="fas fa-cog text-blue-300 text-lg"></i>
                                </div>
                                <p class="text-blue-200 font-semibold text-sm">
                                    AI analiz ediyor...
                                </p>
                                <div class="w-full bg-white/20 rounded-full h-1 mt-2">
                                    <div class="bg-gradient-to-r from-purple-400 to-blue-400 h-1 rounded-full animate-pulse" style="width: 75%"></div>
                                </div>
                            </div>

                            <!-- Results State -->
                            <div id="aiStateResults" class="hidden">
                                <div class="bg-white/20 rounded-lg p-4">
                                    <h4 class="text-sm font-bold text-white mb-2">
                                        <i class="fas fa-check-circle text-green-400 mr-1"></i>
                                        AI Analiz Sonucu
                                    </h4>
                                    <div id="recommendedCategory" class="mb-2">
                                        <!-- AI recommendation will be populated here -->
                                    </div>
                                    <div id="alternativeOptions" class="space-y-1">
                                        <!-- Alternative options will be populated here -->
                                    </div>
                                    
                                    <div class="flex gap-2 mt-3">
                                        <button onclick="proceedWithRecommendation()" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-xs transition-colors">
                                            <i class="fas fa-arrow-right mr-1"></i>
                                            Bu Öneriyle Devam Et
                                        </button>
                                        <button onclick="tryDifferentAnalysis()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded text-xs transition-colors">
                                            <i class="fas fa-redo mr-1"></i>
                                            Tekrar Dene
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- AI Features Showcase -->
                    <div class="space-y-4 flex flex-col h-full">
                        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                            <h4 class="text-lg font-bold text-white mb-2">
                                Hizmet Özellikleri
                            </h4>
                            <div class="space-y-2">
                                <div class="flex items-start">
                                    <div class="w-6 h-6 bg-green-500/30 rounded-full flex items-center justify-center flex-shrink-0 mr-2">
                                        <i class="fas fa-percentage text-green-300 text-xs"></i>
                                    </div>
                                    <div>
                                        <div class="font-semibold text-white text-sm">%95 Doğruluk Oranı</div>
                                        <div class="text-purple-200 text-xs">8 ana kategoride yüksek eşleştirme başarısı</div>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <div class="w-6 h-6 bg-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0 mr-2">
                                        <i class="fas fa-clock text-blue-300 text-xs"></i>
                                    </div>
                                    <div>
                                        <div class="font-semibold text-white text-sm">Hızlı Analiz</div>
                                        <div class="text-purple-200 text-xs">Anında kategori önerisi ve fiyat tahmini</div>
                                    </div>
                                </div>
                                <div class="flex items-start">
                                    <div class="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center flex-shrink-0 mr-2">
                                        <i class="fas fa-brain text-purple-300 text-xs"></i>
                                    </div>
                                    <div>
                                        <div class="font-semibold text-white text-sm">Çoklu Öneriler</div>
                                        <div class="text-purple-200 text-xs">Ana öneri + 2 alternatif kategori</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Supported Categories -->
                        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 flex-1">
                            <h4 class="text-lg font-bold text-white mb-3 flex items-center">
                                <i class="fas fa-lightbulb text-yellow-400 mr-2" style="
                                    animation: electricPowerOn 3s ease-in-out infinite;
                                    filter: drop-shadow(0 0 8px rgba(255, 255, 0, 0.6));
                                "></i>
                                Desteklenen Kategoriler
                            </h4>
                            <div class="grid grid-cols-2 gap-2">
                                <div class="flex items-center p-1 hover:bg-white/10 rounded transition-all">
                                    <i class="fas fa-bolt text-yellow-300 mr-2 text-sm"></i>
                                    <span class="text-purple-200 text-xs">Ev Elektriği</span>
                                </div>
                                <div class="flex items-center p-1 hover:bg-white/10 rounded transition-all">
                                    <i class="fas fa-tools text-blue-300 mr-2 text-sm"></i>
                                    <span class="text-purple-200 text-xs">Beyaz Eşya</span>
                                </div>
                                <div class="flex items-center p-1 hover:bg-white/10 rounded transition-all">
                                    <i class="fas fa-tint text-cyan-300 mr-2 text-sm"></i>
                                    <span class="text-purple-200 text-xs">Su Tesisatı</span>
                                </div>
                                <div class="flex items-center p-1 hover:bg-white/10 rounded transition-all">
                                    <i class="fas fa-fire text-red-300 mr-2 text-sm"></i>
                                    <span class="text-purple-200 text-xs">Kombi & Kalorifer</span>
                                </div>
                                <div class="flex items-center p-1 hover:bg-white/10 rounded transition-all">
                                    <i class="fas fa-tv text-indigo-300 mr-2 text-sm"></i>
                                    <span class="text-purple-200 text-xs">Elektronik</span>
                                </div>
                                <div class="flex items-center p-1 hover:bg-white/10 rounded transition-all">
                                    <i class="fas fa-broom text-green-300 mr-2 text-sm"></i>
                                    <span class="text-purple-200 text-xs">Temizlik</span>
                                </div>
                                <div class="flex items-center p-1 hover:bg-white/10 rounded transition-all">
                                    <i class="fas fa-paint-roller text-pink-300 mr-2 text-sm"></i>
                                    <span class="text-purple-200 text-xs">Boyama</span>
                                </div>
                                <div class="flex items-center p-1 hover:bg-white/10 rounded transition-all">
                                    <i class="fas fa-door-open text-amber-300 mr-2 text-sm"></i>
                                    <span class="text-purple-200 text-xs">Kapı & Pencere</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Service Options Modal (for AI recommendations) -->
        <div id="serviceOptionsModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 hidden p-4">
            <div class="bg-white max-w-2xl w-full rounded-2xl shadow-2xl">
                <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xl font-bold">Hizmet Seçenekleriniz</h3>
                        <button onclick="closeServiceOptionsModal()" class="text-white hover:text-gray-200">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-8">
                    <div class="text-center mb-8">
                        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-check-circle text-green-600 text-2xl"></i>
                        </div>
                        <h4 class="text-2xl font-bold text-gray-800 mb-2">Mükemmel! Kategori Belirlendi</h4>
                        <p class="text-gray-600">Şimdi nasıl devam etmek istersiniz?</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- WhatsApp Quick Option -->
                        <div class="border-2 border-green-200 rounded-xl p-6 hover:border-green-400 transition-all cursor-pointer" onclick="proceedWithWhatsApp('AI öneri sonrası hızlı teklif', document.getElementById('problemDescription').value)">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i class="fab fa-whatsapp text-green-600 text-xl"></i>
                                </div>
                                <h5 class="font-bold text-gray-800 mb-2">Hızlı WhatsApp Teklifi</h5>
                                <p class="text-sm text-gray-600 mb-4">5 dakika içinde teklif alın</p>
                                <ul class="text-xs text-gray-500 text-left space-y-1">
                                    <li>✓ Anında iletişim</li>
                                    <li>✓ Hızlı fiyat bilgisi</li>
                                    <li>✓ Direkt uzman bağlantısı</li>
                                </ul>
                            </div>
                        </div>

                        <!-- Detailed Form Option -->
                        <div class="border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 transition-all cursor-pointer" onclick="proceedWithDetailedForm()">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i class="fas fa-file-alt text-blue-600 text-xl"></i>
                                </div>
                                <h5 class="font-bold text-gray-800 mb-2">Detaylı Form Doldur</h5>
                                <p class="text-sm text-gray-600 mb-4">Kapsamlı teklif sürecinden geçin</p>
                                <ul class="text-xs text-gray-500 text-left space-y-1">
                                    <li>✓ Detaylı ihtiyaç analizi</li>
                                    <li>✓ Çoklu uzman teklifleri</li>
                                    <li>✓ Karşılaştırmalı fiyatlar</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Compact Customer Success Section -->
        <div class="max-w-6xl mx-auto px-6 mb-8">
            <div class="text-center mb-4">
                <h2 class="text-xl font-bold text-blue-900 mb-2">MUTLU MÜŞTERİLERİMİZ</h2>
                <p class="text-sm text-gray-600">TV-PC-Beyaz Eşya tamirinde başarılı hizmetler</p>
            </div>
            
            <!-- Compact Success Stories -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <!-- Story 1 - TV Tamiri -->
                    <div class="bg-white rounded-lg shadow-sm p-2 text-center">
                        <img src="https://page.gensparksite.com/v1/base64_upload/ee6d91c41c837953855b76e06ba10fbc" 
                             alt="TV Tamiri" 
                             class="w-full h-20 object-cover rounded mb-2">
                        <h4 class="font-bold text-xs text-gray-800">TV Tamiri</h4>
                        <p class="text-xs text-gray-600">Fulya H. ⭐⭐⭐⭐⭐</p>
                    </div>
                    
                    <!-- Story 2 - Klima -->
                    <div class="bg-white rounded-lg shadow-sm p-2 text-center">
                        <img src="https://page.gensparksite.com/v1/base64_upload/a3350dc40a3a83a08928c6c46be858ad" 
                             alt="Klima Tamiri" 
                             class="w-full h-20 object-cover rounded mb-2">
                        <h4 class="font-bold text-xs text-gray-800">Klima Servisi</h4>
                        <p class="text-xs text-gray-600">Selim B. ⭐⭐⭐⭐⭐</p>
                    </div>
                    
                    <!-- Story 3 - PC Tamiri -->
                    <div class="bg-white rounded-lg shadow-sm p-2 text-center">
                        <img src="https://page.gensparksite.com/v1/base64_upload/249fe7eafc02b698735b1eb1b44a10ff" 
                             alt="PC Tamiri" 
                             class="w-full h-20 object-cover rounded mb-2">
                        <h4 class="font-bold text-xs text-gray-800">PC Tamiri</h4>
                        <p class="text-xs text-gray-600">Ahmet K. ⭐⭐⭐⭐⭐</p>
                    </div>
                    
                    <!-- Story 4 - Beyaz Eşya -->
                    <div class="bg-white rounded-lg shadow-sm p-2 text-center">
                        <img src="https://page.gensparksite.com/v1/base64_upload/bc6f58fb2e5abee6389e4a9c8ecdeeff" 
                             alt="Beyaz Eşya Tamiri" 
                             class="w-full h-20 object-cover rounded mb-2">
                        <h4 class="font-bold text-xs text-gray-800">Beyaz Eşya</h4>
                        <p class="text-xs text-gray-600">Nermin H. ⭐⭐⭐⭐⭐</p>
                    </div>
                </div>
                
                <!-- Compact Stats -->
                <div class="flex justify-center items-center mt-3 space-x-4 text-xs text-blue-700">
                    <div class="flex items-center">
                        <i class="fas fa-users mr-1"></i>
                        <span>47.500+ Memnun</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-star mr-1"></i>
                        <span>4.8/5 Puan</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-shield-check mr-1"></i>
                        <span>%98 Başarı</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Live Statistics -->
        <section id="stats" class="py-12 bg-slate-50">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Customer Stats Header - Kompakt -->
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-bold text-blue-900 mb-2 tracking-tight">
                        PLATFORM İSTATİSTİKLERİ
                    </h2>
                    <p class="text-blue-600 text-sm font-medium">Güvenilir hizmet verileri ve başarı oranları</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                    <div class="bg-blue-900 text-white p-4 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-200 text-xs font-medium mb-1">BUGÜN TAMAMLANAN İŞ</p>
                                <p class="text-2xl font-bold stats-counter text-white" id="daily-jobs">357</p>
                            </div>
                            <div class="w-2 h-2 bg-amber-400 sharp-corner pulse-dot"></div>
                        </div>
                        <div class="mt-3 pt-2 border-t border-blue-700">
                            <span class="text-amber-400 text-sm font-semibold">
                                <i class="fas fa-arrow-up mr-1"></i>+34% önceki güne göre
                            </span>
                        </div>
                    </div>

                    <div class="bg-white border-2 border-blue-200 p-4 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-600 text-xs font-medium mb-1">MÜŞTERİ MEMNUNİYET</p>
                                <p class="text-2xl font-bold stats-counter text-blue-900">98.7<span class="text-lg">%</span></p>
                            </div>
                            <div class="w-2 h-2 bg-amber-400 sharp-corner"></div>
                        </div>
                        <div class="mt-3 pt-2 border-t border-blue-100">
                            <span class="text-blue-600 text-xs font-semibold">
                                <i class="fas fa-star mr-1"></i>5 yıldız ortalama
                            </span>
                        </div>
                    </div>

                    <div class="bg-white border-2 border-blue-200 p-4 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-600 text-xs font-medium mb-1">AKTİF HİZMET VEREN</p>
                                <p class="text-2xl font-bold stats-counter text-blue-900" id="active-dealers">1,247</p>
                            </div>
                            <div class="w-2 h-2 bg-amber-400 sharp-corner"></div>
                        </div>
                        <div class="mt-3 pt-2 border-t border-blue-100">
                            <span class="text-blue-600 text-xs font-semibold">
                                <i class="fas fa-users mr-1"></i>Doğrulanmış uzmanlar
                            </span>
                        </div>
                    </div>

                    <div class="bg-amber-500 text-white p-4 minimal-corner card-corporate">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-amber-100 text-xs font-medium mb-1">ORTALAMA YANIT SÜRESİ</p>
                                <p class="text-2xl font-bold stats-counter text-white"><span id="avg-response">12</span><span class="text-lg">dk</span></p>
                            </div>
                            <div class="w-2 h-2 bg-white sharp-corner pulse-dot"></div>
                        </div>
                        <div class="mt-3 pt-2 border-t border-amber-600">
                            <span class="text-amber-100 text-xs font-semibold">
                                <i class="fas fa-clock mr-1"></i>Hızlı çözüm
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Modern Live Feed Dashboard - Kompakt -->
                <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <h3 class="text-gray-800 text-lg font-semibold tracking-tight">Canlı Talep Akışı</h3>
                                <div class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">CANLI</div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <span class="text-gray-500 text-xs">Son 10dk:</span>
                                <div class="bg-gray-800 text-white px-2 py-1 rounded-full text-xs font-semibold" id="recent-count">10</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Anlık talep bölümü kaldırıldı -->
                </div>
            </div>
        </section>

        <!-- SOCIAL PROOF & CUSTOMER SUCCESS STORIES -->
        <section id="social-proof" class="py-2 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
            <div class="max-w-6xl mx-auto px-6">
                <div class="text-center mb-8">
                    <div class="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full mb-4">
                        <i class="fas fa-heart text-red-400 text-sm mr-1"></i>
                        <span class="font-semibold text-xs">MÜŞTERİ MEMNUNIYETI</span>
                    </div>
                    <h2 class="text-2xl lg:text-3xl font-bold mb-4 bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                        Mutlu Müşterilerimiz Konuşuyor
                    </h2>
                    <p class="text-sm text-blue-100 max-w-3xl mx-auto leading-relaxed mb-6">
                        47.500+ memnun müşterinin deneyimleri ve gerçek yorumları. 
                        Garantor360 ile hayatları nasıl kolaylaştıklarını keşfedin!
                    </p>
                    
                    <!-- Live Statistics Row -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
                        <!-- Active Users -->
                        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3">
                            <div class="flex items-center justify-center space-x-3">
                                <div class="flex items-center">
                                    <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-2"></div>
                                    <span class="text-green-300 font-semibold">ŞU ANDA CANLI:</span>
                                </div>
                                <div class="text-xl font-bold text-yellow-300" id="liveUserCount">1,847</div>
                                <span class="text-blue-200">kişi</span>
                            </div>
                            <div class="text-xs text-blue-300 text-center mt-1">
                                <i class="fas fa-eye mr-1"></i>
                                Son 5 dakikada siteyi ziyaret eden kullanıcılar
                            </div>
                        </div>

                        <!-- Active Services -->
                        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3">
                            <div class="flex items-center justify-center space-x-3">
                                <div class="flex items-center">
                                    <div class="w-3 h-3 bg-blue-400 rounded-full animate-pulse mr-2"></div>
                                    <span class="text-blue-300 font-semibold">AKTİF HİZMET:</span>
                                </div>
                                <div class="text-xl font-bold text-yellow-300" id="activeServices">156</div>
                                <span class="text-blue-200">adet</span>
                            </div>
                            <div class="text-xs text-blue-300 text-center mt-1">
                                <i class="fas fa-tools mr-1"></i>
                                Şu anda devam eden servis çalışmaları
                            </div>
                        </div>

                        <!-- Expert Online -->
                        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3">
                            <div class="flex items-center justify-center space-x-3">
                                <div class="flex items-center">
                                    <div class="w-3 h-3 bg-orange-400 rounded-full animate-pulse mr-2"></div>
                                    <span class="text-orange-300 font-semibold">UZMAN ONLİNE:</span>
                                </div>
                                <div class="text-xl font-bold text-yellow-300" id="onlineExperts">156</div>
                                <span class="text-blue-200">usta</span>
                            </div>
                            <div class="text-xs text-blue-300 text-center mt-1">
                                <i class="fas fa-user-check mr-1"></i>
                                Şu anda hizmet verebilecek uzmanlar
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Live Statistics -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div class="text-center">
                        <div class="text-xl lg:text-2xl font-bold text-blue-300 mb-1" id="liveCustomers">47,583</div>
                        <div class="text-blue-100 text-sm">Memnun Müşteri</div>
                    </div>
                    <div class="text-center">
                        <div class="text-xl lg:text-2xl font-bold text-green-300 mb-1">4.9</div>
                        <div class="text-blue-100 text-sm">Ortalama Puan</div>
                    </div>
                    <div class="text-center">
                        <div class="text-xl lg:text-2xl font-bold text-yellow-300 mb-1">%98</div>
                        <div class="text-blue-100 text-sm">Sorunsuz İş</div>
                    </div>
                    <div class="text-center">
                        <div class="text-xl lg:text-2xl font-bold text-purple-300 mb-1" id="liveJobs">23,891</div>
                        <div class="text-blue-100 text-sm">Tamamlanan İş</div>
                    </div>
                </div>

                <!-- Customer Reviews Carousel -->
                <div class="relative">
                    <div class="overflow-hidden rounded-2xl">
                        <div id="reviewsCarousel" class="flex transition-transform duration-500 ease-in-out">
                            <!-- Review 1 -->
                            <div class="w-full flex-shrink-0">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[240px] flex flex-col">
                                        <div class="flex items-center mb-3">
                                            <img src="https://ui-avatars.com/api/?name=Ayse+Kaya&background=f59e0b&color=fff" alt="Ayşe Kaya" class="w-12 h-12 rounded-full mr-3">
                                            <div>
                                                <h4 class="text-lg font-bold text-white">Ayşe Kaya</h4>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                    </div>
                                                    <span class="text-blue-200 text-sm">İstanbul, Kadıköy</span>
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote class="text-blue-100 leading-relaxed mb-4 flex-grow">
                                            "Evdeki elektrik problemi için aradım. 2 saat içinde 3 farklı elektrikçi teklif verdi! 
                                            En uygun fiyatlısını seçtim, aynı gün geldi ve sorunu çözdü. Harika bir sistem!"
                                        </blockquote>
                                        <div class="text-xs text-blue-300 mt-auto">
                                            <i class="fas fa-check-circle mr-1"></i>
                                            Doğrulanmış Müşteri • 2 gün önce
                                        </div>
                                    </div>

                                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[240px] flex flex-col">
                                        <div class="flex items-center mb-3">
                                            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face&auto=format&q=80" alt="Mehmet Öztürk" class="w-12 h-12 rounded-full mr-3">
                                            <div>
                                                <h4 class="text-lg font-bold text-white">Mehmet Öztürk</h4>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                    </div>
                                                    <span class="text-blue-200 text-sm">Ankara, Çankaya</span>
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote class="text-blue-100 leading-relaxed mb-4 flex-grow">
                                            "Klima arızası için kullandım. Fiyat hesaplayıcı gerçekten çok başarılı, 
                                            önceden ne kadar ödeyeceğimi biliyordum. Garantor360 sayesinde dolandırılma korkum kalmadı!"
                                        </blockquote>
                                        <div class="text-xs text-blue-300 mt-auto">
                                            <i class="fas fa-check-circle mr-1"></i>
                                            Doğrulanmış Müşteri • 5 gün önce
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Review 2 -->
                            <div class="w-full flex-shrink-0">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[240px] flex flex-col">
                                        <div class="flex items-center mb-3">
                                            <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face&auto=format&q=80" alt="Zeynep Yılmaz" class="w-12 h-12 rounded-full mr-3">
                                            <div>
                                                <h4 class="text-lg font-bold text-white">Zeynep Yılmaz</h4>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                    </div>
                                                    <span class="text-blue-200 text-sm">İzmir, Bornova</span>
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote class="text-blue-100 leading-relaxed mb-4 flex-grow">
                                            "Ev temizliği için sürekli kullanıyorum. Uzman eşleştirme sistemi muhteşem! 
                                            Her seferinde kaliteli ve güvenilir temizlikçiler geliyor. Kesinlikle tavsiye ederim."
                                        </blockquote>
                                        <div class="text-xs text-blue-300 mt-auto">
                                            <i class="fas fa-check-circle mr-1"></i>
                                            Doğrulanmış Müşteri • 1 hafta önce
                                        </div>
                                    </div>

                                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[240px] flex flex-col">
                                        <div class="flex items-center mb-3">
                                            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face&auto=format&q=80" alt="Ali Çelik" class="w-12 h-12 rounded-full mr-3">
                                            <div>
                                                <h4 class="text-lg font-bold text-white">Ali Çelik</h4>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                    </div>
                                                    <span class="text-blue-200 text-sm">Bursa, Osmangazi</span>
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote class="text-blue-100 leading-relaxed mb-4 flex-grow">
                                            "Tesisatçı aradım, AI önerisi ile 10 dakikada sorunu tarif ettim ve uygun uzman buldu. 
                                            Bu kadar kolay olacağını hiç düşünmemiştim. Artık hep Garantor360 kullanacağım!"
                                        </blockquote>
                                        <div class="text-xs text-blue-300 mt-auto">
                                            <i class="fas fa-check-circle mr-1"></i>
                                            Doğrulanmış Müşteri • 3 gün önce
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Review 3 -->
                            <div class="w-full flex-shrink-0">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[240px] flex flex-col">
                                        <div class="flex items-center mb-3">
                                            <img src="https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=100&h=100&fit=crop&crop=face&auto=format&q=80" alt="Fatma Demir" class="w-12 h-12 rounded-full mr-3">
                                            <div>
                                                <h4 class="text-lg font-bold text-white">Fatma Demir</h4>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                    </div>
                                                    <span class="text-blue-200 text-sm">Antalya, Muratpaşa</span>
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote class="text-blue-100 leading-relaxed mb-4 flex-grow">
                                            "Televizyonum bozulmuştu, tamiri için 5 farklı teknisyenden teklif aldım. 
                                            En uygun fiyatlı ve en yakın olanı seçtim. Aynı gün gelip TV'mi tamir etti. 
                                            Garantor360'dan çok memnunum!"
                                        </blockquote>
                                        <div class="text-xs text-blue-300 mt-auto">
                                            <i class="fas fa-check-circle mr-1"></i>
                                            Doğrulanmış Müşteri • 4 gün önce
                                        </div>
                                    </div>

                                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[240px] flex flex-col">
                                        <div class="flex items-center mb-3">
                                            <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face&auto=format&q=80" alt="Hasan Koç" class="w-12 h-12 rounded-full mr-3">
                                            <div>
                                                <h4 class="text-lg font-bold text-white">Hasan Koç</h4>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                    </div>
                                                    <span class="text-blue-200 text-sm">Adana, Seyhan</span>
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote class="text-blue-100 leading-relaxed mb-4 flex-grow">
                                            "Buzdolabım arızalandı, acil tamire ihtiyacım vardı. Uygulamayı indirdim, 
                                            hemen 3 beyaz eşya ustası ile iletişim kurdum. En hızlı gelebileni seçtim, 
                                            2 saatte geldi ve sorunu çözdü. Mükemmel!"
                                        </blockquote>
                                        <div class="text-xs text-blue-300 mt-auto">
                                            <i class="fas fa-check-circle mr-1"></i>
                                            Doğrulanmış Müşteri • 1 gün önce
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Review 4 -->
                            <div class="w-full flex-shrink-0">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[240px] flex flex-col">
                                        <div class="flex items-center mb-3">
                                            <img src="https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop&crop=face&auto=format&q=80" alt="Elif Arslan" class="w-12 h-12 rounded-full mr-3">
                                            <div>
                                                <h4 class="text-lg font-bold text-white">Elif Arslan</h4>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                    </div>
                                                    <span class="text-blue-200 text-sm">Konya, Selçuklu</span>
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote class="text-blue-100 leading-relaxed mb-4 flex-grow">
                                            "Laptopumun ekranı kırılmıştı, onarım için güvenilir bir yer arıyordum. 
                                            Garantor360 sayesinde hızlıca laptop tamircisi buldum. 
                                            Uygun fiyata, garantili onarım yaptı. Kesinlikle tavsiye ederim!"
                                        </blockquote>
                                        <div class="text-xs text-blue-300 mt-auto">
                                            <i class="fas fa-check-circle mr-1"></i>
                                            Doğrulanmış Müşteri • 6 gün önce
                                        </div>
                                    </div>

                                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[240px] flex flex-col">
                                        <div class="flex items-center mb-3">
                                            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face&auto=format&q=80" alt="Mustafa Yıldız" class="w-12 h-12 rounded-full mr-3">
                                            <div>
                                                <h4 class="text-lg font-bold text-white">Mustafa Yıldız</h4>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                    </div>
                                                    <span class="text-blue-200 text-sm">Gaziantep, Şahinbey</span>
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote class="text-blue-100 leading-relaxed mb-4 flex-grow">
                                            "Klimam çalışmıyordu, yaz ayında çok zorluk yaşıyorduk. 
                                            Garantor360'dan klima teknisyeni buldum, çok profesyonel bir ekip geldi. 
                                            Sorunu çözdüler ve bakım da yaptılar. Müthiş bir hizmet!"
                                        </blockquote>
                                        <div class="text-xs text-blue-300 mt-auto">
                                            <i class="fas fa-check-circle mr-1"></i>
                                            Doğrulanmış Müşteri • 8 gün önce
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Review 5 -->
                            <div class="w-full flex-shrink-0">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[240px] flex flex-col">
                                        <div class="flex items-center mb-3">
                                            <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face&auto=format&q=80" alt="Gamze Polat" class="w-12 h-12 rounded-full mr-3">
                                            <div>
                                                <h4 class="text-lg font-bold text-white">Gamze Polat</h4>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                    </div>
                                                    <span class="text-blue-200 text-sm">Eskişehir, Odunpazarı</span>
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote class="text-blue-100 leading-relaxed mb-4 flex-grow">
                                            "Çamaşır makinam bozulmuştu, tamir ettirmeye korkuyordum çünkü daha önce 
                                            kötü deneyimler yaşamıştım. Garantor360'dan güvenilir bir usta buldum. 
                                            Hem ucuz hem de çok kaliteli iş yaptı!"
                                        </blockquote>
                                        <div class="text-xs text-blue-300 mt-auto">
                                            <i class="fas fa-check-circle mr-1"></i>
                                            Doğrulanmış Müşteri • 2 hafta önce
                                        </div>
                                    </div>

                                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[240px] flex flex-col">
                                        <div class="flex items-center mb-3">
                                            <img src="https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=100&h=100&fit=crop&crop=face&auto=format&q=80" alt="Emre Şahin" class="w-12 h-12 rounded-full mr-3">
                                            <div>
                                                <h4 class="text-lg font-bold text-white">Emre Şahin</h4>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                        <i class="fas fa-star"></i>
                                                    </div>
                                                    <span class="text-blue-200 text-sm">Samsun, İlkadım</span>
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote class="text-blue-100 leading-relaxed mb-4 flex-grow">
                                            "PC'im çalışmıyordu, önemli dosyalarım vardı kaybetme korkusu yaşıyordum. 
                                            Garantor360'dan bilgisayar teknisyeni buldum. Hem verilerimi kurtardı 
                                            hem de bilgisayarımı tamir etti. İnanılmaz profesyonel!"
                                        </blockquote>
                                        <div class="text-xs text-blue-300 mt-auto">
                                            <i class="fas fa-check-circle mr-1"></i>
                                            Doğrulanmış Müşteri • 10 gün önce
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Navigation Dots -->
                    <div class="flex justify-center mt-6 space-x-3">
                        <button onclick="changeReviewSlide(0)" class="review-dot w-3 h-3 rounded-full bg-white transition-all"></button>
                        <button onclick="changeReviewSlide(1)" class="review-dot w-3 h-3 rounded-full bg-white/40 transition-all"></button>
                        <button onclick="changeReviewSlide(2)" class="review-dot w-3 h-3 rounded-full bg-white/40 transition-all"></button>
                        <button onclick="changeReviewSlide(3)" class="review-dot w-3 h-3 rounded-full bg-white/40 transition-all"></button>
                        <button onclick="changeReviewSlide(4)" class="review-dot w-3 h-3 rounded-full bg-white/40 transition-all"></button>
                    </div>
                </div>

                <!-- Live Activity - Side by Side -->
                <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Real-time Success Stories -->
                    <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <h3 class="text-xl font-bold text-center text-white mb-4">
                            <i class="fas fa-broadcast-tower text-green-400 mr-3"></i>
                            Canlı İş Tamamlama Bildirimleri
                        </h3>
                        
                        <div id="liveNotifications" class="space-y-2 max-h-40 overflow-hidden">
                            <!-- JavaScript ile doldurulacak -->
                        </div>
                        
                        <div class="text-center mt-4">
                            <div class="inline-flex items-center text-green-300 text-sm">
                                <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                                Gerçek zamanlı güncellemeler
                            </div>
                        </div>
                    </div>

                    <!-- Live Comments System -->
                    <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                        <h3 class="text-lg font-bold text-center text-white mb-2">
                            <i class="fas fa-comments text-blue-400 mr-2"></i>
                            Canlı Müşteri Yorumları
                        </h3>
                        
                        <div id="liveComments" class="space-y-2 max-h-40 overflow-hidden">
                            <!-- JavaScript ile doldurulacak -->
                        </div>
                        
                        <div class="text-center mt-2">
                            <div class="inline-flex items-center text-blue-300 text-sm">
                                <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
                                Her saniye yeni yorumlar geliyor
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Garantor360 Guvence Sistemi - Minimal & Clean Design -->
        <section id="guarantee" class="py-20 bg-slate-50">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Security and Trust Section -->
                <div class="text-center mb-16">
                    <div class="section-divider w-20 mx-auto mb-6"></div>

                    <h2 class="text-4xl lg:text-5xl font-bold mb-6 tracking-tight leading-tight text-blue-900">
                        GUVENLI HIZMET ALMAK
                        <span class="block text-amber-600">ARTIK COK KOLAY</span>
                    </h2>
                    <p class="text-lg text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                        Piyasadaki guvenlik endiselerinize son veren kapsamli guvence sistemiyle 
                        <span class="text-blue-700 font-semibold">tamamen risk-free hizmet alin</span>
                    </p>
                </div>

                <!-- Elegant Problem vs Solution Comparison -->
                <div class="relative mb-10 py-2 -mt-20">
                    
                    <div class="relative z-20 container mx-auto px-6">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative" style="grid-template-columns: 1fr 1fr; gap: 2rem;">
                            
                            <!-- Superhero Between Containers -->
                            <div class="hidden lg:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
                                <img src="https://cdn1.genspark.ai/user-upload-image/rmbg_generated/0_43faffb1-910b-46ee-baf7-a563689163e9" 
                                     alt="Garantor360 Superhero" 
                                     class="w-96 h-96 object-contain opacity-100 floating-animation">
                            </div>
                            
                            <!-- Left: Problems Container -->
                            <div class="group transform scale-90">
                                <div class="relative">
                                    <!-- Oval Frame -->
                                    <div class="absolute -inset-4 border-2 border-slate-300 rounded-3xl opacity-50"></div>
                                    <div class="bg-white border border-slate-200 hover:border-slate-300 transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md relative">
                                        <!-- Simple Header -->
                                        <div class="px-3 py-1 border-b border-slate-100">
                                            <div class="text-center">
                                                <div class="inline-flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg mb-1">
                                                    <i class="fas fa-exclamation-circle text-slate-500 text-2xl"></i>
                                                </div>
                                                <h3 class="text-2xl font-bold text-slate-800 mb-1">GENEL PIYASA SORUNLARI</h3>
                                                <p class="text-slate-500 text-base">Bu endiseleri yasiyor musunuz?</p>
                                            </div>
                                        </div>

                                        <!-- Problems List -->
                                        <div class="p-2 space-y-1">
                                            <div class="flex items-start p-4 hover:bg-slate-50 transition-colors duration-200 rounded-xl">
                                                <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                    <i class="fas fa-search text-slate-500 text-lg"></i>
                                                </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-slate-800 text-base mb-1">Guvenilir Usta Bulamama</div>
                                                <div class="text-slate-600 text-sm">Hangi ustanin guvenilir oldugu belirsiz</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-4 hover:bg-slate-50 transition-colors duration-200 rounded-xl">
                                            <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-question-circle text-slate-500 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-slate-800 text-base mb-1">Fiyat Belirsizligi</div>
                                                <div class="text-slate-600 text-sm">Ne kadar odeyeceginiz onceden bilinmiyor</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-4 hover:bg-slate-50 transition-colors duration-200 rounded-xl">
                                            <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-tools text-slate-500 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-slate-800 text-base mb-1">Iscilik Garantisi Eksikligi</div>
                                                <div class="text-slate-600 text-sm">Yapilan isin garantisi belirsiz veya yok</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-4 hover:bg-slate-50 transition-colors duration-200 rounded-xl">
                                            <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-lock-open text-slate-500 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-slate-800 text-base mb-1">Odeme Guvensizligi</div>
                                                <div class="text-slate-600 text-sm">Para iade garantisi ve guvenli odeme yok</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-4 hover:bg-slate-50 transition-colors duration-200 rounded-xl">
                                            <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-phone-slash text-slate-500 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-slate-800 text-base mb-1">Iletisim Sorunu</div>
                                                <div class="text-slate-600 text-sm">Sonradan ulasamama ve destek alamama</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-4 hover:bg-slate-50 transition-colors duration-200 rounded-xl">
                                            <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-shield-alt text-slate-500 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-slate-800 text-base mb-1">Sigorta ve Koruma Eksikligi</div>
                                                <div class="text-slate-600 text-sm">Hasar durumunda koruma ve tazminat yok</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-3 hover:bg-slate-50 transition-colors duration-200 border-t border-slate-100 mt-4 pt-4 rounded-xl">
                                            <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-user-times text-amber-600 text-sm"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-slate-800 text-base mb-1">Dolandiricilik Riski</div>
                                                <div class="text-amber-600 text-xs font-medium">Guvensiz platformlarda dolandirilma ihtimali</div>
                                            </div>
                                        </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right: Solutions Container -->
                            <div class="group transform scale-90">
                                <div class="relative">
                                    <!-- Oval Frame -->
                                    <div class="absolute -inset-4 border-2 border-amber-300 rounded-3xl opacity-50"></div>
                                    <div class="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-300 hover:border-blue-200 transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md relative">
                                        <!-- Simple Header -->
                                        <div class="px-3 py-1 border-b border-blue-700">
                                            <div class="text-center">
                                                <div class="flex items-center justify-center mb-1">
                                                    <img src="https://cdn1.genspark.ai/user-upload-image/rmbg_generated/0_cf86bcd8-44b5-4426-b5e0-8f77c45da44a" alt="Garantor360" class="h-8 w-auto mr-2">
                                                    <h3 class="text-2xl font-bold text-white">KORUMA</h3>
                                                </div>
                                                <p class="text-blue-200 text-base">Artik kimse sizi dolandiramaz!</p>
                                            </div>
                                        </div>

                                        <!-- Solutions List -->
                                        <div class="p-2 space-y-1 text-white">
                                            <div class="flex items-start p-4 hover:bg-white/5 transition-colors duration-200 rounded-xl">
                                                <div class="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-user-shield text-amber-400 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-white text-base mb-1">Dogrulanmis Uzmanlar</div>
                                                <div class="text-blue-200 text-sm">Kimlik, adres, referans kontrollu</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-4 hover:bg-white/5 transition-colors duration-200 rounded-xl">
                                            <div class="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-search-plus text-amber-400 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-white text-base mb-1">Sabika Kaydi Sorgulama</div>
                                                <div class="text-blue-200 text-sm">Adli sicil kontrolu ve gecmis sorgulamasi</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-4 hover:bg-white/5 transition-colors duration-200 rounded-xl">
                                            <div class="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-money-check-alt text-amber-400 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-white text-base mb-1">Para Iade Garantisi</div>
                                                <div class="text-blue-200 text-sm">Memnun kalmazsan tum paran geri</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-4 hover:bg-white/5 transition-colors duration-200 rounded-xl">
                                            <div class="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-umbrella text-amber-400 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-white text-base mb-1">Sigorta Korumasi</div>
                                                <div class="text-blue-200 text-sm">Hasar ve sorun durumunda sigorta tazminati</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-4 hover:bg-white/5 transition-colors duration-200 rounded-xl">
                                            <div class="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-headset text-amber-400 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-white text-base mb-1">7/24 Izleme Sistemi</div>
                                                <div class="text-blue-200 text-sm">Surekli takip, aninda mudahale</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-4 hover:bg-white/5 transition-colors duration-200 rounded-xl">
                                            <div class="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-comments text-amber-400 text-lg"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-white text-base mb-1">Danismanlik Hizmeti</div>
                                                <div class="text-blue-200 text-sm">Uzman danismanlardan ucretsiz rehberlik</div>
                                            </div>
                                        </div>

                                        <div class="flex items-start p-3 hover:bg-white/5 transition-colors duration-200 border-t border-blue-700 mt-4 pt-4 rounded-xl">
                                            <div class="w-8 h-8 bg-amber-400/30 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                                                <i class="fas fa-gavel text-amber-300 text-sm"></i>
                                            </div>
                                            <div class="flex-1">
                                                <div class="font-semibold text-white text-base mb-1">Hukuki Koruma</div>
                                                <div class="text-blue-200 text-sm">Sorun cikarsa avukat devreye girer</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>



                <!-- Service & Emergency Section -->
                <div class="bg-slate-100 text-gray-800 p-6 minimal-corner">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <!-- Left: Service Call to Action -->
                        <div class="text-left">
                            <!-- Premium Badge -->
                            <div class="mb-6">
                                <div class="inline-flex items-center bg-amber-500 text-blue-900 px-4 py-2 rounded-full mb-4">
                                    <i class="fas fa-crown mr-2 text-sm"></i>
                                    <span class="font-bold text-sm">PREMIUM GUVENLIK</span>
                                </div>
                            </div>
                            
                            <div class="mb-6">
                                <h3 class="text-4xl font-bold text-gray-800 mb-4 leading-tight">
                                    Güvenli Hizmet Almaya 
                                    <span class="text-amber-500">Başlayın</span>
                                </h3>
                                <p class="text-gray-600 text-xl leading-relaxed">Tüm güvencelerimizle korumalı, <span class="text-blue-600 font-semibold">risk-free</span> hizmet deneyimi</p>
                            </div>
                            
                            <div class="space-y-3">
                                <!-- Main Service Button -->
                                <button onclick="scrollToServices()" class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-blue-900 px-6 py-3 rounded-lg font-semibold text-base inline-flex items-center space-x-2 transition-all duration-300 shadow-sm hover:shadow-md w-full justify-center">
                                    <i class="fas fa-arrow-right text-blue-900 text-sm"></i>
                                    <span>Hizmet Talep Et</span>
                                </button>
                                
                                <!-- Phone Button -->
                                <button onclick="scrollToServices()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold text-base inline-flex items-center justify-center space-x-2 transition-all duration-300 w-full">
                                    <i class="fas fa-comments text-white text-sm"></i>
                                    <span>Canlı Destek</span>
                                    <span class="text-sm opacity-80">7/24</span>
                                </button>
                                
                                <!-- Guarantee Notice -->
                                <div class="text-center text-gray-600 text-lg mt-4 font-medium">
                                    <i class="fas fa-shield-check text-green-500 mr-2 text-lg"></i>
                                    Tüm güvenceler yasal olarak garanti edilir
                                </div>
                            </div>
                        </div>

                        <!-- Right: Emergency Section -->
                        <div class="bg-white border border-gray-200 p-6 minimal-corner shadow-sm">
                            <!-- ACIL DURUM Badge -->
                            <div class="mb-4">
                                <div class="inline-flex items-center bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                                    <i class="fas fa-headset mr-2 text-sm"></i>
                                    <span class="font-medium text-sm">Destek Merkezi</span>
                                </div>
                            </div>
                            
                            <h4 class="text-xl font-bold text-gray-800 mb-3">Başka Yerden Aldığın Hizmette Sorun mu Yaşıyorsun?</h4>
                            <p class="text-gray-600 text-lg mb-4 leading-relaxed">Kandırıldın, paranı alamıyorsun veya işin yarım kaldı? Hemen yardım al.</p>
                            
                            <!-- Problem Icons -->
                            <div class="grid grid-cols-4 gap-2 mb-4">
                                <div class="text-center">
                                    <div class="bg-gray-50 border border-gray-200 p-3 minimal-corner mb-1">
                                        <i class="fas fa-user-times text-blue-500 text-lg"></i>
                                    </div>
                                    <div class="text-gray-700 text-xs">Kandirildin</div>
                                </div>
                                <div class="text-center">
                                    <div class="bg-gray-50 border border-gray-200 p-3 minimal-corner mb-1">
                                        <i class="fas fa-money-bill-wave text-blue-500 text-lg"></i>
                                    </div>
                                    <div class="text-gray-700 text-xs">Para Iadesi</div>
                                </div>
                                <div class="text-center">
                                    <div class="bg-gray-50 border border-gray-200 p-3 minimal-corner mb-1">
                                        <i class="fas fa-tools text-blue-500 text-lg"></i>
                                    </div>
                                    <div class="text-gray-700 text-xs">Yarim Is</div>
                                </div>
                                <div class="text-center">
                                    <div class="bg-gray-50 border border-gray-200 p-3 minimal-corner mb-1">
                                        <i class="fas fa-shield-alt text-blue-500 text-lg"></i>
                                    </div>
                                    <div class="text-gray-700 text-xs">Tehdit</div>
                                </div>
                            </div>
                            
                            <!-- Elegant Contact Button -->
                            <div class="text-center">
                                <button onclick="openWhatsAppChat()" class="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md">
                                    <i class="fas fa-headset text-white text-sm mr-2"></i>
                                    <span>Hemen Danış</span>
                                </button>
                            </div>
                            
                            <div class="text-center text-gray-500 text-xs mt-2">
                                <i class="fas fa-clock mr-1"></i>
                                24/7 - Ücretsiz Danışma - Hukuki Destek
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>



        <!-- City Opportunities -->
        <section class="py-12 bg-white">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Header with Premium Badge -->
                <div class="text-center mb-10">
                    <div class="mb-4">
                        <div class="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
                            <i class="fas fa-map-marker-alt mr-2 text-sm"></i>
                            <span class="font-medium text-sm">TURKIYE GENELI HIZMET</span>
                        </div>
                    </div>
                    
                    <h2 class="text-3xl font-bold text-gray-800 mb-3 leading-tight">
                        Sehir Bazinda <span class="text-blue-600">Hizmet Imkanlari</span>
                    </h2>
                    <p class="text-gray-600 text-lg leading-relaxed">81 ilde guvenli hizmet alin, profesyonel cozumler</p>
                </div>

                <!-- Kompakt Şehir Kart Sistemi -->
                <div class="max-w-6xl mx-auto mt-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        
                        <!-- İSTANBUL -->
                        <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer" onclick="scrollToServices()">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-lg font-bold">İSTANBUL</h3>
                                <div class="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">📍 Aktif Teknisyen</span>
                                    <span class="font-bold">347</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">⚡ Yanıt Süresi</span>
                                    <span class="font-bold">8dk</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">⭐ Memnuniyet</span>
                                    <span class="font-bold">4.9/5</span>
                                </div>
                                <div class="mt-3 pt-3 border-t border-blue-400">
                                    <div class="text-xs text-blue-200">🔥 En Popüler: TV Tamiri</div>
                                </div>
                            </div>
                        </div>

                        <!-- ANKARA -->
                        <div class="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer" onclick="scrollToServices()">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-lg font-bold">ANKARA</h3>
                                <div class="w-3 h-3 bg-indigo-300 rounded-full animate-pulse"></div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">📍 Aktif Teknisyen</span>
                                    <span class="font-bold">156</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">⚡ Yanıt Süresi</span>
                                    <span class="font-bold">12dk</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">⭐ Memnuniyet</span>
                                    <span class="font-bold">4.8/5</span>
                                </div>
                                <div class="mt-3 pt-3 border-t border-indigo-400">
                                    <div class="text-xs text-indigo-200">🔥 En Popüler: Kombi Servisi</div>
                                </div>
                            </div>
                        </div>

                        <!-- İZMİR -->
                        <div class="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer" onclick="scrollToServices()">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-lg font-bold">İZMİR</h3>
                                <div class="w-3 h-3 bg-purple-300 rounded-full animate-pulse"></div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">📍 Aktif Teknisyen</span>
                                    <span class="font-bold">89</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">⚡ Yanıt Süresi</span>
                                    <span class="font-bold">15dk</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">⭐ Memnuniyet</span>
                                    <span class="font-bold">4.7/5</span>
                                </div>
                                <div class="mt-3 pt-3 border-t border-purple-400">
                                    <div class="text-xs text-purple-200">🔥 En Popüler: Beyaz Eşya</div>
                                </div>
                            </div>
                        </div>

                        <!-- BURSA -->
                        <div class="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer" onclick="scrollToServices()">
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-lg font-bold">BURSA</h3>
                                <div class="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">📍 Aktif Teknisyen</span>
                                    <span class="font-bold">67</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">⚡ Yanıt Süresi</span>
                                    <span class="font-bold">18dk</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm opacity-90">⭐ Memnuniyet</span>
                                    <span class="font-bold">4.6/5</span>
                                </div>
                                <div class="mt-3 pt-3 border-t border-blue-400">
                                    <div class="text-xs text-blue-200">🔥 En Popüler: Teknik Onarım</div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Alt Şehirler Satırı -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        
                        <!-- ANTALYA -->
                        <div class="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer" onclick="scrollToServices()">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-sm font-bold">ANTALYA</h4>
                                <div class="w-2 h-2 bg-purple-300 rounded-full animate-pulse"></div>
                            </div>
                            <div class="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div class="text-lg font-bold">54</div>
                                    <div class="text-xs opacity-80">Teknisyen</div>
                                </div>
                                <div>
                                    <div class="text-lg font-bold">20dk</div>
                                    <div class="text-xs opacity-80">Yanıt</div>
                                </div>
                                <div>
                                    <div class="text-lg font-bold">4.5</div>
                                    <div class="text-xs opacity-80">Puan</div>
                                </div>
                            </div>
                            <div class="text-xs text-purple-200 mt-2 text-center">Klima Bakımı</div>
                        </div>

                        <!-- ADANA -->
                        <div class="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer" onclick="scrollToServices()">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-sm font-bold">ADANA</h4>
                                <div class="w-2 h-2 bg-indigo-300 rounded-full animate-pulse"></div>
                            </div>
                            <div class="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div class="text-lg font-bold">43</div>
                                    <div class="text-xs opacity-80">Teknisyen</div>
                                </div>
                                <div>
                                    <div class="text-lg font-bold">22dk</div>
                                    <div class="text-xs opacity-80">Yanıt</div>
                                </div>
                                <div>
                                    <div class="text-lg font-bold">4.4</div>
                                    <div class="text-xs opacity-80">Puan</div>
                                </div>
                            </div>
                            <div class="text-xs text-indigo-200 mt-2 text-center">Beyaz Eşya</div>
                        </div>

                        <!-- KONYA -->
                        <div class="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer" onclick="scrollToServices()">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-sm font-bold">KONYA</h4>
                                <div class="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                            </div>
                            <div class="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div class="text-lg font-bold">38</div>
                                    <div class="text-xs opacity-80">Teknisyen</div>
                                </div>
                                <div>
                                    <div class="text-lg font-bold">25dk</div>
                                    <div class="text-xs opacity-80">Yanıt</div>
                                </div>
                                <div>
                                    <div class="text-lg font-bold">4.3</div>
                                    <div class="text-xs opacity-80">Puan</div>
                                </div>
                            </div>
                            <div class="text-xs text-blue-200 mt-2 text-center">Enerji & Isıtma</div>
                        </div>

                    </div>


                </div>
                
            </div>
        </section>

        <!-- Benefits Section -->


        </section>

        <!-- Benefits Section -->



        <!-- Customer Benefits Section -->
        <section class="py-20 bg-white">
            <div class="max-w-7xl mx-auto px-6">
                <!-- Customer Benefits moved after testimonials -->
                <div class="mb-16">
                    <div class="text-center mb-12">
                        <div class="section-divider w-20 mx-auto mb-6"></div>
                        <h2 class="text-3xl font-bold mb-4 tracking-tight text-blue-900">MUSTERI GUVENCELERI</h2>
                        <p class="text-blue-600 font-medium">Garantor360 ile hizmet almanin avantajlari</p>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <!-- Odeme Guvencesi -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-8 h-8 bg-amber-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-piggy-bank text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-amber-600">ODEME GUVENCESI</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">Para iade garantisi</p>
                        </div>

                        <!-- Iscilik Garantisi -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-8 h-8 bg-green-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-tools text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-green-600">ISCILIK GARANTISI</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">6 ay garanti</p>
                        </div>

                        <!-- Dogrulanmis Ustalar -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-8 h-8 bg-blue-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-user-shield text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-blue-600">DOGRULANMIS USTALAR</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">Kimlik kontrolu</p>
                        </div>

                        <!-- Sigorta Korumasi -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-8 h-8 bg-purple-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-umbrella text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-purple-600">SIGORTA KORUMASI</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">Hasar tazminati</p>
                        </div>

                        <!-- Hukuki Destek -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-8 h-8 bg-orange-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-gavel text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-orange-600">HUKUKI DESTEK</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">Avukat destegi</p>
                        </div>

                        <!-- 7/24 Destek -->
                        <div class="bg-blue-50 p-4 minimal-corner text-center border border-blue-200 hover:border-amber-400 hover:bg-blue-100 transition-all duration-300 group">
                            <div class="w-8 h-8 bg-pink-500 minimal-corner mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <i class="fas fa-headset text-white text-lg"></i>
                            </div>
                            <h3 class="font-bold mb-2 text-sm text-pink-600">7/24 DESTEK</h3>
                            <p class="text-blue-700 text-xs leading-relaxed">Surekli destek</p>
                        </div>
                    </div>
                </div>


            </div>
        </section>



        <!-- Service Request Form -->
        <section class="py-8 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white" id="hizmet-al">
            <div class="max-w-6xl mx-auto px-6">
                <div class="text-center mb-3">
                    <div class="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full mb-2">
                        <i class="fas fa-shield-check text-green-300 mr-2"></i>
                        <span class="text-white font-semibold text-sm">%100 GUVENLI HIZMET BASVURUSU</span>
                    </div>
                    <h2 class="text-2xl lg:text-3xl font-bold mb-2 text-green-300 tracking-tight">
                        GUVENLI HIZMET ALMAK ICIN
                    </h2>
                </div>

                <div class="flex flex-col lg:flex-row gap-6 items-start" style="max-width: 100%;">
                    <!-- Form area - increased width by 50px -->
                    <!-- Service Request Form - LEFT SIDE - Width increased by 50px -->
                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-lg flex-1" style="min-width: 0; max-width: calc(100% - 330px);">
                        <form id="serviceRequestForm" class="space-y-3">


                            <!-- Location Information -->
                            <div data-step="1" class="form-step">
                                <div class="flex items-center justify-between mb-0.5">
                                    <h4 class="text-base font-bold text-white">1 Konum Bilgileri</h4>
                                    <div id="step1Reward" class="hidden bg-white/20 text-purple-200 px-2 py-1 rounded text-xs font-bold">
                                        <i class="fas fa-map-marker-alt mr-1"></i>En yakin ustalar bulunuyor...
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-xs font-bold text-purple-200 mb-0.5">
                                            <i class="fas fa-map-marker-alt mr-1"></i>Sehir *
                                        </label>
                                        <select id="customerCity" required 
                                                class="w-full p-1.5 bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-300 focus:outline-none transition duration-200 text-sm city-select"
                                                onchange="updateFormProgress(); validateStep(1); showNearbyExperts(); handleCityChange();">
                                            <option value="" class="bg-white text-gray-800">Şehir Seçin</option>
                                            <option value="İstanbul" class="bg-white text-gray-800">İstanbul</option>
                                            <option value="Ankara" class="bg-white text-gray-800">Ankara</option>
                                            <option value="İzmir" class="bg-white text-gray-800">İzmir</option>
                                            <option value="Bursa" class="bg-white text-gray-800">Bursa</option>
                                            <option value="Antalya" class="bg-white text-gray-800">Antalya</option>
                                            <option value="Adana" class="bg-white text-gray-800">Adana</option>
                                            <option value="Gaziantep" class="bg-white text-gray-800">Gaziantep</option>
                                            <option value="Konya" class="bg-white text-gray-800">Konya</option>
                                            <option value="Mersin" class="bg-white text-gray-800">Mersin</option>
                                            <option value="Kayseri" class="bg-white text-gray-800">Kayseri</option>
                                            <option value="Eskişehir" class="bg-white text-gray-800">Eskişehir</option>
                                            <option value="Diyarbakır" class="bg-white text-gray-800">Diyarbakır</option>
                                            <option value="Samsun" class="bg-white text-gray-800">Samsun</option>
                                            <option value="Denizli" class="bg-white text-gray-800">Denizli</option>
                                            <option value="Şanlıurfa" class="bg-white text-gray-800">Şanlıurfa</option>
                                            <option value="Adapazarı" class="bg-white text-gray-800">Adapazarı</option>
                                            <option value="Malatya" class="bg-white text-gray-800">Malatya</option>
                                            <option value="Kahramanmaraş" class="bg-white text-gray-800">Kahramanmaraş</option>
                                            <option value="Erzurum" class="bg-white text-gray-800">Erzurum</option>
                                            <option value="Van" class="bg-white text-gray-800">Van</option>
                                            <option value="Batman" class="bg-white text-gray-800">Batman</option>
                                            <option value="Elazığ" class="bg-white text-gray-800">Elazığ</option>
                                            <option value="İzmit" class="bg-white text-gray-800">İzmit</option>
                                            <option value="Manisa" class="bg-white text-gray-800">Manisa</option>
                                            <option value="Sivas" class="bg-white text-gray-800">Sivas</option>
                                            <option value="Gebze" class="bg-white text-gray-800">Gebze</option>
                                            <option value="Balıkesir" class="bg-white text-gray-800">Balıkesir</option>
                                            <option value="Tarsus" class="bg-white text-gray-800">Tarsus</option>
                                            <option value="Çorum" class="bg-white text-gray-800">Çorum</option>
                                            <option value="Diğer" class="bg-white text-gray-800">Diğer (Kendim Yazacağım)</option>
                                        </select>
                                        <!-- Custom City Input (hidden by default) -->
                                        <input type="text" id="customCityInput" 
                                               class="w-full p-1.5 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:border-purple-300 focus:outline-none transition duration-200 text-sm mt-2 hidden"
                                               placeholder="Şehrinizi yazın (örn: Trabzon, Ordu, vb.)"
                                               onchange="updateFormProgress();">
                                        <div id="cityValidation" class="text-xs mt-1 hidden">
                                            <span class="text-purple-200"><i class="fas fa-search mr-1"></i>Sehrinizde uzman araniyor...</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-purple-200 mb-0.5">
                                            <i class="fas fa-building mr-1"></i>Ilce
                                        </label>
                                        <input type="text" id="customerDistrict" 
                                               class="w-full p-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:border-purple-300 focus:outline-none transition duration-200 text-sm"
                                               placeholder="Orn: Kadikoy"
                                               onchange="updateFormProgress();">
                                    </div>
                                </div>
                            </div>

                            <!-- Service Category & Contact Info -->
                            <div data-step="2" class="form-step">
                                <div class="flex items-center justify-between mb-0.5">
                                    <h4 class="text-base font-bold text-white">2 Hizmet Kategorisi ve Iletisim</h4>
                                    <div id="step2Reward" class="hidden bg-white/20 text-purple-200 px-2 py-1 rounded text-xs font-bold">
                                        <i class="fas fa-tools mr-1"></i>Fiyat hesaplaniyor...
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 lg:grid-cols-3 gap-2">
                                    <!-- Hizmet Kategorisi - Kisaltilmis -->
                                    <div class="lg:col-span-1">
                                        <label class="block text-xs font-bold text-purple-200 mb-0.5">
                                            <i class="fas fa-tools mr-1"></i>Hizmet Kategorisi *
                                        </label>
                                        <select id="serviceCategory" required 
                                                class="w-full p-1.5 text-sm bg-white/20 border border-white/30 rounded-lg text-white focus:border-purple-300 focus:outline-none transition duration-200 service-category-select"
                                                onchange="updateFormProgress(); validateStep(2); showEstimatedPrice();">
                                            <option value="" class="bg-white text-gray-800">Kategori Secin</option>
                                    
                                    <!-- TEKNIK ONARIM - Detaylandirilmis -->
                                    <optgroup label=" TEKNIK ONARIM HIZMETLERI">
                                        <option value="Televizyon Tamiri">Televizyon Tamiri (LED, LCD, OLED, Smart TV)</option>
                                        <option value="Bilgisayar Tamiri">Bilgisayar Tamiri (Masaustu, Laptop)</option>
                                        <option value="Camasir Makinesi">Camasir Makinesi Tamiri</option>
                                        <option value="Bulasik Makinesi">Bulasik Makinesi Tamiri</option>
                                        <option value="Klima Servisi">Klima Servisi & Tamiri</option>
                                        <option value="Kombi Servisi">Kombi Servisi & Tamiri</option>
                                        <option value="Buzdolabi Tamiri">Buzdolabi & Derin Dondurucu Tamiri</option>
                                        <option value="Firin Ocak">Firin & Ocak Tamiri</option>
                                        <option value="Mikrodalga">Mikrodalga & Kucuk Ev Aletleri</option>
                                        <option value="Telefon Tablet">Telefon & Tablet Tamiri</option>
                                    </optgroup>
                                    
                                    <!-- EV BAKIM & TADILAT -->
                                    <optgroup label=" EV BAKIM & TADILAT">
                                        <option value="Boyama Badana">Boyama & Badana Isleri</option>
                                        <option value="Elektrik Isleri">Elektrik Tesisati & Onarim</option>
                                        <option value="Su Tesisati">Su Tesisati & Sihhi Tesisat</option>
                                        <option value="Doseme Parke">Doseme, Parke & Laminat</option>
                                        <option value="Cam Ayna">Cam & Ayna Isleri</option>
                                        <option value="Kapi Pencere">Kapi & Pencere Tamiri</option>
                                    </optgroup>
                                    
                                    <!-- TEMIZLIK HIZMETLERI -->
                                    <optgroup label=" TEMIZLIK HIZMETLERI">
                                        <option value="Ev Temizligi">Genel Ev Temizligi</option>
                                        <option value="Derin Temizlik">Derin Temizlik & Dezenfeksiyon</option>
                                        <option value="Hali Yikama">Hali & Koltuk Yikama</option>
                                        <option value="Cam Temizligi">Cam Temizligi (Ic & Dis)</option>
                                        <option value="Tasinma Temizlik">Tasinma Sonrasi Temizlik</option>
                                    </optgroup>
                                    
                                    <!-- DIGER HIZMETLER -->
                                    <optgroup label=" DIGER HIZMETLER">
                                        <option value="Mobilya Montaj">Mobilya Montaj & Kurulum</option>
                                        <option value="Asma Tavan">Asma Tavan & Alcipan</option>
                                        <option value="Bahce Peyzaj">Bahce & Peyzaj Isleri</option>
                                        <option value="Nakliye">Nakliye & Tasima</option>
                                        <option value="Diger">Diger (Aciklama kisminda belirtiniz)</option>
                                    </optgroup>
                                        </select>
                                        <div id="categoryValidation" class="text-xs mt-1 hidden">
                                            <span class="text-purple-200"><i class="fas fa-calculator mr-1"></i>Tahmini fiyat hesaplaniyor...</span>
                                        </div>
                                    </div>
                                    
                                    <!-- Isim Soyisim -->
                                    <div>
                                        <label class="block text-xs font-bold text-purple-200 mb-0.5">
                                            <i class="fas fa-user mr-1"></i>Isim Soyisim *
                                        </label>
                                        <input type="text" id="customerName" required 
                                               class="w-full p-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:border-purple-300 focus:outline-none transition duration-200 text-sm"
                                               placeholder="Orn: Ahmet Yilmaz"
                                               onchange="updateFormProgress();">
                                    </div>
                                    
                                    <!-- Telefon -->
                                    <div>
                                        <label class="block text-xs font-bold text-purple-200 mb-0.5">
                                            <i class="fas fa-phone mr-1"></i>Telefon *
                                        </label>
                                        <input type="tel" id="customerPhone" required 
                                               class="w-full p-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:border-purple-300 focus:outline-none transition duration-200 text-sm"
                                               placeholder="Orn: 0532 123 45 67"
                                               onchange="updateFormProgress();">
                                    </div>
                                </div>
                            </div>

                            <!-- Problem Description -->
                            <div data-step="3" class="form-step">
                                <div class="flex items-center justify-between mb-0.5">
                                    <h4 class="text-base font-bold text-white">3 Sorun Detayi</h4>
                                    <div id="step3Reward" class="hidden bg-white/20 text-purple-200 px-2 py-1 rounded text-xs font-bold">
                                        <i class="fas fa-brain mr-1"></i>AI analiz ediliyor...
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-purple-200 mb-0.5">
                                        <i class="fas fa-edit mr-1"></i>Sorun Detayi *
                                    </label>
                                    <textarea id="problemDescription" required rows="3" 
                                              class="w-full p-1.5 text-sm bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:border-purple-300 focus:outline-none transition duration-200"
                                              placeholder="Sorununuzu detayli sekilde aciklayin. Orn: Camasir makinesi calisiyor ama su almiyor, sesli calisiyor..."
                                              onchange="updateFormProgress(); validateStep(3); analyzeDescription();"></textarea>
                                    <div id="descriptionValidation" class="text-xs mt-1 hidden">
                                        <span class="text-orange-600"><i class="fas fa-robot mr-1"></i>Aciklama AI ile analiz ediliyor...</span>
                                    </div>
                                    <div class="text-sm text-yellow-300 mt-2 font-medium">
                                        <span id="charCount">0</span>/500 karakter - Daha detayli aciklama daha hizli cozum!
                                    </div>
                                </div>
                            </div>

                            <!-- Urgency Level -->
                            <div>
                                <label class="block text-sm font-bold text-white mb-2">
                                    <i class="fas fa-clock mr-2"></i>Aciliyet Durumu
                                </label>
                                <div class="flex flex-wrap justify-between">
                                    <label class="flex items-center justify-center p-1.5 border-2 border-purple-300 sharp-corner cursor-pointer hover:border-yellow-400 transition duration-200 bg-white/10 backdrop-blur-sm" style="width: calc(33.333% - 10px); margin: 0 2px;">
                                        <input type="radio" name="urgency" value="normal" checked class="mr-2">
                                        <span class="text-white font-medium text-sm">Normal</span>
                                    </label>
                                    <label class="flex items-center justify-center p-1.5 border-2 border-purple-300 sharp-corner cursor-pointer hover:border-yellow-400 transition duration-200 bg-white/10 backdrop-blur-sm" style="width: calc(33.333% - 10px); margin: 0 2px;">
                                        <input type="radio" name="urgency" value="urgent" class="mr-2">
                                        <span class="text-white font-medium text-sm">Acil</span>
                                    </label>
                                    <label class="flex items-center justify-center p-1.5 border-2 border-purple-300 sharp-corner cursor-pointer hover:border-yellow-400 transition duration-200 bg-white/10 backdrop-blur-sm" style="width: calc(33.333% - 10px); margin: 0 2px;">
                                        <input type="radio" name="urgency" value="emergency" class="mr-2">
                                        <span class="text-white font-medium text-sm">Çok Acil</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Contact Preference -->
                            <!-- Submit Button Only -->
                            <div class="text-center pt-1">
                                <!-- Talep Gonder Butonu - En Üstte Ortalı -->
                                <button type="submit" 
                                        class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-2 minimal-corner font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                                    <i class="fas fa-paper-plane mr-2"></i>
                                    TALEBI GONDER
                                </button>
                                
                                <!-- 15px Space + Status Info -->
                                <div style="margin-top: 15px;" class="text-center space-y-2">
                                    <p class="text-green-500 font-bold text-base" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                                        <i class="fas fa-clock mr-2 text-blue-500"></i>
                                        Ortalama geri donus suresi: 10 dk
                                    </p>
                                    <p id="dynamicStatsText" class="floating-stats-text font-bold text-base" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; transition: all 0.3s ease;">
                                        <i class="fas fa-chart-line mr-2 text-blue-400"></i>
                                        <strong>Aktif uzman sayisi: 847</strong>
                                    </p>
                                    <p id="dynamicActivityText" class="floating-activity-text font-bold text-base" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; transition: all 0.3s ease;">
                                        <i class="fas fa-user-check mr-2 text-green-400"></i>
                                        <strong>Ahmet K. elektrik hizmeti aldi</strong>
                                    </p>
                                </div>
                                

                            </div>

                            <!-- Dynamic Notifications Collector -->
                            <!-- Floating Live Notifications Area -->
                            <div id="floating-notification-area" class="mt-2 pt-2 min-h-8 relative">
                                <div id="live-notification-display" class="text-center">
                                    <!-- Live notifications will appear here as floating text -->
                                </div>
                            </div>

                        </form>

                        <!-- Form Status Messages -->
                        <div id="formMessages" class="mt-2 hidden">
                            <div id="successMessage" class="bg-emerald-50 border-2 border-emerald-200 p-4 minimal-corner text-emerald-800 hidden">
                                <i class="fas fa-check-circle mr-2"></i>
                                <strong>Basarili!</strong> Talebiniz alindi. En kisa surede size donus yapilacak.
                            </div>
                            <div id="errorMessage" class="bg-red-50 border-2 border-red-200 p-4 minimal-corner text-red-800 hidden">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                <strong>Hata!</strong> Talep gonderilirken bir sorun olustu. Lutfen tekrar deneyin.
                            </div>
                        </div>
                        




                        

                    </div>

                    <!-- Contact Options Sidebar - RIGHT SIDE - Width reduced by 50px -->
                    <div class="space-y-2" style="flex: 0 0 280px; width: 280px;">
                        <!-- AI Live Chat - Compact -->
                        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white p-2 relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-10 h-10 bg-white/10 rounded-full -translate-y-6 translate-x-6"></div>
                            <div class="mb-1 relative z-10 text-center">
                                <img src="https://page.gensparksite.com/v1/base64_upload/048c4b5ab3a7280d26f5b471c120123b" 
                                     alt="Garantor360" 
                                     class="h-6 w-auto mx-auto mb-1">
                                <h3 class="text-base font-bold text-white">
                                    <i class="fas fa-headset mr-1"></i>
                                    TEMSILCISI
                                </h3>
                            </div>
                            <p class="text-sm mb-1 text-purple-100 relative z-10">
                                Sorularinizi aninda cevaplayalim! <span class="text-yellow-300 font-bold">7/24</span> aktif temsilci.
                            </p>
                            <button onclick="toggleAIChat()" 
                                    class="w-full flex items-center justify-center p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition duration-200 relative z-10">
                                <i class="fas fa-comments mr-2"></i>
                                <div>
                                    <div class="font-bold text-base">Canli Sohbet Baslat</div>
                                    <div class="text-sm opacity-90">Ucretsiz & Aninda</div>
                                </div>
                            </button>
                        </div>

                        <!-- Quick Contact - Compact -->
                        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white p-2">
                            <h3 class="text-base font-bold mb-1 text-center">
                                <i class="fas fa-phone mr-1 text-yellow-400"></i>
                                <span class="fast-contact-text">HIZLI ILETISIM</span>
                            </h3>
                            <div class="space-y-1">
                                <a href="tel:+905001234567" 
                                   class="flex items-center p-1.5 bg-white/20 rounded-lg hover:bg-purple-600 transition duration-200">
                                    <i class="fas fa-phone mr-2"></i>
                                    <div>
                                        <div class="font-bold text-base">0 500 123 45 67</div>
                                        <div class="text-sm opacity-90">Aninda Destek</div>
                                    </div>
                                </a>
                                <a href="https://wa.me/905001234567?text=Merhaba, Garantor360 hizmet talebi icin yazmistim..." 
                                   target="_blank"
                                   class="flex items-center p-1.5 bg-[#25D366] rounded-lg hover:bg-[#20BA5A] transition duration-200">
                                    <i class="fab fa-whatsapp mr-2"></i>
                                    <div>
                                        <div class="font-bold text-base">WhatsApp</div>
                                        <div class="text-sm opacity-90">Mesajla Iletisim</div>
                                    </div>
                                </a>
                            </div>
                        </div>

                        <!-- Compact Security Guarantee -->
                        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1.5">
                            <div class="text-center mb-1">
                                <div class="w-4 h-4 bg-white/20 rounded mx-auto mb-1 flex items-center justify-center">
                                    <i class="fas fa-shield-alt text-purple-300 text-xs"></i>
                                </div>
                                <h4 class="text-sm font-bold text-white mb-1">
                                    GUVENLIK GARANTILERI
                                </h4>
                            </div>
                            
                            
                            <!-- Dinamik Güvenlik Bilgileri -->
                            <div class="flex items-center p-1.5 bg-white/20 rounded mb-1">
                                <i id="securityIcon" class="fas fa-tools text-blue-300 mr-1 text-sm"></i>
                                <div>
                                    <div id="securityTitle" class="text-sm font-semibold text-white">ISCILIK GARANTISI</div>
                                    <div id="securityDetail" class="text-sm text-purple-200">6 ay garanti</div>
                                </div>
                            </div>
                            
                            <!-- Risk-Free Badge -->
                            <div class="p-1.5 bg-green-500/20 border border-green-300/30 rounded text-center">
                                <p class="text-sm font-semibold text-green-300">
                                    <i class="fas fa-shield-alt mr-1"></i>
                                    %100 Risk-Free Hizmet
                                </p>
                            </div>
                        </div>

                        <!-- FAQ Section - Compact -->
                        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1.5">
                            <div class="text-center mb-1">
                                <div class="w-4 h-4 bg-white/20 rounded mx-auto mb-1 flex items-center justify-center">
                                    <i class="fas fa-question-circle text-amber-300 text-xs"></i>
                                </div>
                                <h4 class="text-sm font-bold text-white mb-1">
                                    BİLGİ MERKEZİ
                                </h4>
                            </div>
                            
                            <!-- FAQ Content -->
                            <div class="flex items-center p-1.5 bg-white/20 rounded mb-1">
                                <i class="fas fa-star text-amber-300 mr-1 text-sm"></i>
                                <div>
                                    <div class="text-sm font-semibold text-white">GARANTOR360 FAYDALARI</div>
                                    <div class="text-sm text-purple-200">Detayli bilgiler</div>
                                </div>
                            </div>
                            
                            <!-- FAQ Button -->
                            <div class="p-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded text-center">
                                <a href="/sss" target="_blank" class="text-sm font-semibold text-white hover:text-white">
                                    <i class="fas fa-external-link-alt mr-1"></i>
                                    SSS Sayfasini Gor
                                </a>
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
                                Cevrimici
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
                                Merhaba! Ben Garantor360 yapay zeka asistaniyim.  
                                <br><br>
                                Size nasil yardimci olabilirim? Hizmet kategorileri, fiyatlar veya surecler hakkinda sorularinizi yanitlayabilirim.
                            </div>
                            <div class="text-xs text-slate-500 mt-2">Az once</div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="mb-4">
                        <div class="text-xs text-slate-500 mb-2 text-center">Hizli Sorular:</div>
                        <div class="flex flex-wrap gap-2">
                            <button onclick="sendQuickMessage('Televizyon tamiri ne kadar surer?')" 
                                    class="bg-blue-100 text-blue-700 px-3 py-1 sharp-corner text-xs hover:bg-blue-200 transition duration-200">
                                TV tamiri suresi?
                            </button>
                            <button onclick="sendQuickMessage('Fiyatlar nasil belirleniyor?')" 
                                    class="bg-blue-100 text-blue-700 px-3 py-1 sharp-corner text-xs hover:bg-blue-200 transition duration-200">
                                Fiyat hesaplama?
                            </button>
                            <button onclick="sendQuickMessage('Odeme nasil yapiliyor?')" 
                                    class="bg-blue-100 text-blue-700 px-3 py-1 sharp-corner text-xs hover:bg-blue-200 transition duration-200">
                                Odeme sistemi?
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Chat Input -->
                <div class="border-t border-slate-200 p-4">
                    <form id="chatForm" class="flex space-x-2">
                        <input type="text" id="chatInput" 
                               placeholder="Mesajinizi yazin..." 
                               class="flex-1 p-2 border border-slate-300 sharp-corner text-sm focus:border-blue-500 focus:outline-none">
                        <button type="submit" 
                                class="bg-blue-600 text-white px-4 py-2 sharp-corner hover:bg-blue-700 transition duration-200">
                            <i class="fas fa-paper-plane text-sm"></i>
                        </button>
                    </form>
                    <div class="text-xs text-slate-500 mt-2 text-center">
                        <i class="fas fa-shield-alt mr-1"></i>
                        Yapay zeka destekli guvenli sohbet
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
                                    <img src="https://page.gensparksite.com/v1/base64_upload/048c4b5ab3a7280d26f5b471c120123b" alt="Garantor360" class="h-16">
                                </div>
                                <p class="text-slate-600 font-medium">Musteri Mobil Uygulamasi</p>
                            </div>
                            
                            <h3 class="text-2xl font-bold text-slate-800 mb-4">
                                HIZMET TAKIBINI CEBINIZDEN YAPIN
                            </h3>
                            
                            <p class="text-slate-600 mb-6 leading-relaxed">
                                Mobil uygulamamizla hizmet talebinizi kolayca olusturun, uzman ustalarla iletisim kurun 
                                ve isin ilerleyisini anlik takip edin.
                            </p>

                            <!-- Minimal Features -->
                            <div class="grid grid-cols-2 gap-3 mb-6">
                                <div class="flex items-center">
                                    <i class="fas fa-bell text-amber-500 mr-3"></i>
                                    <span class="text-slate-700 text-sm">Anlik Bildirimler</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-map-marker-alt text-amber-500 mr-3"></i>
                                    <span class="text-slate-700 text-sm">Konum Takibi</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-credit-card text-amber-500 mr-3"></i>
                                    <span class="text-slate-700 text-sm">Guvenli Odeme</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-star text-amber-500 mr-3"></i>
                                    <span class="text-slate-700 text-sm">Usta Degerlendirme</span>
                                </div>
                            </div>

                            <!-- Web App Access Buttons -->
                            <div class="flex flex-row gap-3 justify-start items-start">
                                <!-- Web Uygulamasi Butonu -->
                                <a href="#hizmet-al" class="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                    <i class="fas fa-globe text-sm"></i>
                                    <div>
                                        <div class="text-sm font-bold">WEB UYGULAMASI</div>
                                        <div class="text-xs opacity-90">Hemen Basla</div>
                                    </div>
                                </a>
                                
                                <!-- PWA Kurulum Rehberi -->
                                <button onclick="showPWAGuide()" class="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                    <i class="fas fa-mobile-alt text-sm"></i>
                                    <div>
                                        <div class="text-sm font-bold">ANA EKRANA EKLE</div>
                                        <div class="text-xs opacity-90">Nasil Yapilir?</div>
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
                                            <span>---</span>
                                        </div>
                                        
                                        <!-- App Content -->
                                        <div class="p-3">
                                            <div class="text-center mb-3">
                                                <div class="w-8 h-8 bg-amber-400 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                                    <i class="fas fa-tools text-white"></i>
                                                </div>
                                                <h6 class="font-bold text-gray-900 text-sm">TV Tamiri</h6>
                                                <p class="text-gray-600 text-xs">Istanbul, Kadikoy</p>
                                            </div>
                                            
                                            <!-- Status -->
                                            <div class="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                                                <div class="flex items-center">
                                                    <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                                    <span class="text-green-700 text-xs font-medium">Usta yolda</span>
                                                </div>
                                                <p class="text-green-600 text-xs mt-1">Tahmini varis: 15 dk</p>
                                            </div>
                                            
                                            <!-- Actions -->
                                            <div class="space-y-2">
                                                <button class="w-full bg-blue-900 text-white py-2 rounded text-xs font-medium">
                                                    Ustayi Ara
                                                </button>
                                                <button class="w-full border border-gray-300 text-gray-700 py-2 rounded text-xs">
                                                    Mesaj Gonder
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
                                    <img src="https://cdn1.genspark.ai/user-upload-image/rmbg_generated/0_cf86bcd8-44b5-4426-b5e0-8f77c45da44a" alt="Garantor360" class="h-20">
                                </div>
                            </div>
                            <p class="text-blue-200 font-medium mb-6 leading-relaxed">
                                Turkiye'nin ilk tam guvenceli hizmet platformu. Musteri odakli yaklasimla 
                                guvenli hizmet alma deneyimi sunan dijital ekosistem.
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
                                    <span class="text-xs font-bold text-amber-400">6 AY GARANTI</span>
                                </div>
                                <div class="bg-blue-800 px-3 py-1 sharp-corner">
                                    <span class="text-xs font-bold text-amber-400">7/24 DESTEK</span>
                                </div>
                            </div>
                        </div>

                        <!-- Service Categories -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">HIZMET ALANLARI</h4>
                            <ul class="space-y-3">
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-tools mr-2 text-amber-500 text-sm"></i>Teknik Onarim
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-home mr-2 text-amber-500 text-sm"></i>Ev Bakim & Tadilat
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
                                    <i class="fas fa-bolt mr-2 text-amber-500 text-sm"></i>Elektrik Isleri
                                </a></li>
                            </ul>
                        </div>

                        <!-- Customer Resources -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">MUSTERI KAYNAKLARI</h4>
                            <ul class="space-y-3">
                                <li><a href="#hizmet-al" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-search mr-2 text-amber-500 text-sm"></i>Hizmet Talebi
                                </a></li>
                                <li><a href="/bayi" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-user-tie mr-2 text-amber-500 text-sm"></i>Hizmet Veren Ol
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-shield-alt mr-2 text-amber-500 text-sm"></i>Guvence Sistemi
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-calculator mr-2 text-amber-500 text-sm"></i>Fiyat Hesaplama
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-question-circle mr-2 text-amber-500 text-sm"></i>SSS
                                </a></li>
                                <li><a href="#" class="text-blue-200 hover:text-amber-400 font-medium transition duration-200 flex items-center">
                                    <i class="fas fa-book mr-2 text-amber-500 text-sm"></i>Musteri Rehberi
                                </a></li>
                            </ul>
                        </div>

                        <!-- Contact & Support -->
                        <div>
                            <h4 class="font-bold text-lg mb-6 tracking-tight text-amber-400">ILETISIM & DESTEK</h4>
                            
                            <!-- Contact Methods -->
                            <div class="space-y-4 mb-6">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-phone text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <a href="tel:+905001234567" class="text-white font-medium hover:text-amber-400 transition duration-200">0 500 123 45 67</a>
                                        <p class="text-blue-300 text-xs">Musteri Destek Hatti</p>
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-envelope text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <a href="mailto:destek@garantor360.com" class="text-white font-medium hover:text-amber-400 transition duration-200">destek@garantor360.com</a>
                                        <p class="text-blue-300 text-xs">Musteri Iletisim</p>
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-amber-500 sharp-corner flex items-center justify-center mr-3">
                                        <i class="fas fa-comments text-white text-sm"></i>
                                    </div>
                                    <div>
                                        <span class="text-white font-medium">Canli Destek</span>
                                        <p class="text-blue-300 text-xs">7/24 Aktif</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Working Hours -->
                            <div class="mb-6">
                                <h5 class="font-bold text-sm mb-3 text-amber-400 flex items-center">
                                    <i class="fas fa-clock mr-2"></i>CALISMA SAATLERI
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
                                <h5 class="text-blue-900 font-bold">HEMEN HIZMET ALIN</h5>
                                <p class="text-blue-800 text-sm">Guvenli odeme, 6 ay garanti</p>
                            </div>
                        </div>
                        <div class="flex space-x-4">
                            <button onclick="scrollToServices()" class="bg-blue-900 text-white px-6 py-3 sharp-corner font-bold hover:bg-blue-800 transition duration-200">
                                HIZMET AL
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
                            &copy; 2024 Garantor360. Tum haklari saklidir. | Guvenli Hizmet Platformu
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
                                <span class="text-blue-400">-</span>
                                <a href="#" class="text-blue-300 hover:text-amber-400 transition duration-200">Gizlilik</a>
                                <span class="text-blue-400">-</span>
                                <a href="/bayi" class="text-amber-400 hover:text-amber-300 font-medium transition duration-200">Bayi Ol</a>
                            </div>
                            <p class="text-blue-400 text-xs mt-1">
                                <i class="fas fa-clock mr-1"></i>
                                WhatsApp uzerinden 7/24 hizmet takibi
                            </p>
                        </div>

                        <!-- Security Badges -->
                        <div class="flex items-center space-x-3">
                            <span class="text-blue-400 text-xs">Guvenli Platform</span>
                            <div class="flex space-x-2">
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">SSL</div>
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">256BIT</div>
                                <div class="bg-amber-500 text-blue-900 px-2 py-1 sharp-corner text-xs font-bold">GUVEN</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>



        <script>
        /*
        // COMMENTED OUT DUE TO SYNTAX ERRORS - FUNCTIONALITY MOVED TO APP.JS
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
            const servicesSection = document.querySelector('section:has(h2:contains("HIZMET KATEGORILERI"))') || 
                                  document.querySelector('[id*="service"]');
            if (servicesSection) {
                servicesSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        function scrollToGuarantee() {
            const guaranteeSection = document.querySelector('section:has(h2:contains("MUSTERI GUVENCELERI"))');
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
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>GONDERILIYOR...';
            submitButton.disabled = true;
            
            try {
                // Collect form data
                const formData = {
                    customerName: document.getElementById('customerName').value.trim(),
                    customerPhone: document.getElementById('customerPhone').value.trim(),
                    customerCity: document.getElementById('customerCity').value === 'Diğer' 
                        ? document.getElementById('customCityInput').value.trim() 
                        : document.getElementById('customerCity').value,
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
                if (!formData.customerName || !formData.customerPhone || !formData.customerCity || !formData.serviceCategory || !formData.problemDescription) {
                    throw new Error('Lutfen gerekli alanlari doldurun');
                }
                
                // Phone validation (basic)
                const phoneRegex = /^[0-9\s\+\(\)\-]{10,}$/;
                if (!phoneRegex.test(formData.customerPhone)) {
                    throw new Error('Lutfen gecerli bir telefon numarasi girin');
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
                    successMessage.innerHTML = 
                        '<i class="fas fa-check-circle mr-2"></i>' +
                        '<strong>Basarili!</strong> Talebiniz alindi. Talep kodu: ' + result.requestCode +
                        '<br><small class="block mt-2">En kisa surede size donus yapilacak.</small>';
                    successMessage.classList.remove('hidden');
                    messagesContainer.classList.remove('hidden');
                    
                    // Reset form
                    form.reset();
                    
                    // Auto-scroll to success message
                    setTimeout(() => {
                        messagesContainer.scrollIntoView({ behavior: 'smooth' });
                    }, 500);
                    
                } else {
                    throw new Error(result.error || 'Talep gonderilirken hata olustu');
                }
                
            } catch (error) {
                console.error('Form submission error:', error);
                errorMessage.innerHTML = 
                    '<i class="fas fa-exclamation-triangle mr-2"></i>' +
                    '<strong>Hata!</strong> ' + error.message;
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
                const formatted = '0 ' + value.substring(0, 3) + ' ' + value.substring(3, 6) + ' ' + value.substring(6, 8) + ' ' + value.substring(8, 10);
                input.value = formatted;
            } else if (value.length > 0) {
                input.value = '0 ' + value;
            }
        }

        // Initialize form handling when page loads
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize Hero Slider
            initHeroSlider();
            
            // Initialize Dynamic Notifications System - Direct Call
            setTimeout(() => {
                console.log('Starting notifications system directly...');
                if (typeof window.initializeDynamicNotifications === 'function') {
                    window.initializeDynamicNotifications();
                    console.log('Dynamic notifications initialized!');
                } else {
                    // Start notifications manually if function not found
                    console.log('Starting notifications manually...');
                    startNotificationsManually();
                }
            }, 2000);
            
            // Initialize Dynamic Stats and Activity Text
            setTimeout(() => {
                initDynamicStats();
                initDynamicActivity();
                initSecurityGuarantees();
            }, 2000);
        });

        // Manual notifications starter as fallback
        function startNotificationsManually() {
            console.log('Manual notification system starting...');
            
            const notifications = [
                { text: "İstanbul'da elektrik tamiri tamamlandı", type: "success", location: "İstanbul", service: "Elektrik", icon: "fas fa-bolt" },
                { text: "Ankara'da tesisatçı işini bitirdi", type: "success", location: "Ankara", service: "Tesisat", icon: "fas fa-wrench" },
                { text: "Bursa'da boyacı çalışması kabul edildi", type: "success", location: "Bursa", service: "Boyacı", icon: "fas fa-paint-brush" },
                { text: "İzmir'de klima tamiri başladı", type: "active", location: "İzmir", service: "Klima", icon: "fas fa-snowflake" }
            ];
            
            let notificationIndex = 0;
            
            function showNotification() {
                const notification = notifications[notificationIndex % notifications.length];
                notificationIndex++;
                
                // Add to liveNotifications container
                const liveContainer = document.getElementById('liveNotifications');
                if (liveContainer) {
                    addLiveNotification(liveContainer, notification);
                }
                
                // Also add to liveComments container
                const commentsContainer = document.getElementById('liveComments');
                if (commentsContainer) {
                    addLiveComment(commentsContainer, notification);
                }
            }
            

            
            // Start showing notifications every 4 seconds
            showNotification(); // Show first one immediately
            setInterval(showNotification, 4000);
        }
        
        // Function to add live notification to container
        function addLiveNotification(container, notification) {
            // Remove old notifications if too many
            while (container.children.length >= 3) {
                container.removeChild(container.firstChild);
            }
            
            const notificationEl = document.createElement('div');
            notificationEl.className = 'bg-white/10 backdrop-blur-sm border border-green-400/30 rounded-lg p-3 transform translate-x-full transition-all duration-500';
            
            const timeAgo = Math.floor(Math.random() * 5) + 1; // 1-5 dakika önce
            
            notificationEl.innerHTML = 
                '<div class="flex items-center space-x-3">' +
                    '<div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">' +
                        '<i class="' + notification.icon + ' text-white text-xs"></i>' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<div class="text-white font-semibold text-sm">' + notification.text + '</div>' +
                        '<div class="text-green-300 text-xs">' +
                            '<i class="fas fa-clock mr-1"></i>' + timeAgo + ' dakika önce' +
                        '</div>' +
                    '</div>' +
                '</div>';
            
            container.appendChild(notificationEl);
            
            // Animate in
            setTimeout(() => {
                notificationEl.classList.remove('translate-x-full');
            }, 100);
        }
        
        // Function to add live comment to container  
        function addLiveComment(container, notification) {
            // Remove old comments if too many
            while (container.children.length >= 4) {
                container.removeChild(container.firstChild);
            }
            
            const commentEl = document.createElement('div');
            commentEl.className = 'bg-white/10 backdrop-blur-sm border border-blue-400/30 rounded-lg p-2 transform translate-x-full transition-all duration-500';
            
            const customerNames = ['Ahmet K.', 'Zeynep M.', 'Mehmet Y.', 'Ayşe T.', 'Murat S.', 'Fatma D.'];
            const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
            const rating = Math.random() > 0.2 ? 5 : 4; // Mostly 5 stars
            
            commentEl.innerHTML = 
                '<div class="flex items-start space-x-2">' +
                    '<div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">' +
                        customerName.charAt(0) +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<div class="text-white text-xs font-semibold">' + customerName + '</div>' +
                        '<div class="text-yellow-400 text-xs mb-1">' +
                            '★'.repeat(rating) + '☆'.repeat(5-rating) +
                        '</div>' +
                        '<div class="text-blue-100 text-xs">"' + notification.service + ' hizmeti mükemmeldi!"</div>' +
                    '</div>' +
                '</div>';
            
            container.appendChild(commentEl);
            
            // Animate in
            setTimeout(() => {
                commentEl.classList.remove('translate-x-full');
            }, 100);
        }
            
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
            
            // Eski dinamik sistem kaldırıldı - Yeni temiz sistem dosyanın sonunda
        });

        // Canlı Talep Akışı - Dinamik Güncelleme Sistemi
        function startLiveRequestFlow() {
            const liveNotifications = document.getElementById('liveNotifications');
            const liveComments = document.getElementById('liveComments');
            
            if (!liveNotifications || !liveComments) return;
            
            // GENİŞLETİLMİŞ TV-PC-Beyaz Eşya Hizmet Verileri - 50+ Çeşit
            const serviceTypes = [
                // TV TAMİRLERİ
                { service: 'TV Tamiri', details: 'Samsung 75" Neo QLED 8K', location: 'İstanbul, Beşiktaş', color: 'green' },
                { service: 'TV Tamiri', details: 'LG 65" OLED C3', location: 'İstanbul, Kadıköy', color: 'green' },
                { service: 'TV Tamiri', details: 'Sony 55" Bravia XR', location: 'İstanbul, Şişli', color: 'green' },
                { service: 'TV Tamiri', details: 'TCL 50" QLED', location: 'İstanbul, Ümraniye', color: 'green' },
                { service: 'TV Panel Değişimi', details: 'Philips 43" 4K Smart', location: 'İstanbul, Bakırköy', color: 'emerald' },
                { service: 'TV Anakart Tamiri', details: 'Grundig 40" LED', location: 'İstanbul, Maltepe', color: 'teal' },
                
                // PC TAMİRLERİ
                { service: 'PC Tamiri', details: 'Gaming RTX 4090 Setup', location: 'Ankara, Kızılay', color: 'blue' },
                { service: 'PC Tamiri', details: 'İş Bilgisayarı Dell OptiPlex', location: 'Ankara, Çankaya', color: 'blue' },
                { service: 'PC Kurulum', details: 'AMD Ryzen 7 + RTX 4070', location: 'Ankara, Keçiören', color: 'cyan' },
                { service: 'PC Format', details: 'Windows 11 Kurulumu', location: 'Ankara, Mamak', color: 'sky' },
                { service: 'PC Temizlik', details: 'Desktop Deep Clean', location: 'Ankara, Etimesgut', color: 'indigo' },
                { service: 'Oyun PC Toplama', details: 'Intel i7 + RTX 4060 Ti', location: 'İzmir, Konak', color: 'violet' },
                
                // LAPTOP TAMİRLERİ
                { service: 'Laptop Tamiri', details: 'MacBook Pro 16" M2 Max', location: 'İzmir, Alsancak', color: 'purple' },
                { service: 'Laptop Tamiri', details: 'ASUS ROG Strix G15', location: 'İzmir, Bornova', color: 'purple' },
                { service: 'Laptop Tamiri', details: 'HP Pavilion 15.6"', location: 'İzmir, Karşıyaka', color: 'purple' },
                { service: 'Laptop Ekran Değişimi', details: 'Lenovo ThinkPad X1', location: 'İzmir, Bayraklı', color: 'fuchsia' },
                { service: 'Laptop Klavye Tamiri', details: 'Dell XPS 13 Plus', location: 'Bursa, Osmangazi', color: 'pink' },
                
                // BUZDOLABI TAMİRLERİ
                { service: 'Buzdolabı Tamiri', details: 'LG InstaView Door-in-Door', location: 'Bursa, Nilüfer', color: 'yellow' },
                { service: 'Buzdolabı Tamiri', details: 'Samsung Family Hub 4', location: 'Bursa, Yıldırım', color: 'yellow' },
                { service: 'Buzdolabı Gaz Dolumu', details: 'Bosch Serie 4 No-Frost', location: 'Antalya, Muratpaşa', color: 'amber' },
                { service: 'Buzdolabı Kompresör', details: 'Arçelik A++ 640 Lt', location: 'Antalya, Kepez', color: 'orange' },
                { service: 'Buzdolabı Termostat', details: 'Vestel NF640 X A++', location: 'Antalya, Konyaaltı', color: 'red' },
                
                // ÇAMAŞIR MAKİNESİ TAMİRLERİ
                { service: 'Çamaşır Makinesi', details: 'Bosch WAX32EH0TR 10kg', location: 'Gaziantep, Şahinbey', color: 'red' },
                { service: 'Çamaşır Makinesi', details: 'LG F4WV912P2 12kg', location: 'Konya, Selçuklu', color: 'red' },
                { service: 'Çamaşır M. Pompa', details: 'Samsung WW12T504DAW', location: 'Adana, Seyhan', color: 'rose' },
                { service: 'Çamaşır M. Rulman', details: 'Arçelik 9143 YP 9kg', location: 'Kayseri, Melikgazi', color: 'pink' },
                { service: 'Çamaşır M. Kilit', details: 'Beko WMY 91443 LB1', location: 'Eskişehir, Odunpazarı', color: 'fuchsia' },
                
                // KLİMA SERVİSLERİ
                { service: 'Klima Servisi', details: 'Daikin Ururu Sarara', location: 'İstanbul, Şişli', color: 'indigo' },
                { service: 'Klima Servisi', details: 'Mitsubishi Electric MSZ', location: 'İstanbul, Beyoğlu', color: 'indigo' },
                { service: 'Klima Montaj', details: 'LG Artcool Gallery 18K', location: 'Ankara, Yenimahalle', color: 'blue' },
                { service: 'Klima Gaz Dolumu', details: 'Samsung WindFree Elite', location: 'İzmir, Gaziemir', color: 'cyan' },
                { service: 'Klima Temizlik', details: 'Vestel Vega Plus 12K', location: 'Bursa, Gemlik', color: 'sky' },
                { service: 'VRV Klima Sistemi', details: 'Daikin VRV IV-S 8HP', location: 'Antalya, Aksu', color: 'teal' },
                
                // BULAŞIK MAKİNESİ TAMİRLERİ  
                { service: 'Bulaşık Makinesi', details: 'Siemens iQ700 speedMatic', location: 'Ankara, Bahçelievler', color: 'emerald' },
                { service: 'Bulaşık Makinesi', details: 'Bosch Serie 6 XXL', location: 'İzmir, Narlıdere', color: 'green' },
                { service: 'Bulaşık M. Motor', details: 'Beko DFN39430X', location: 'Bursa, Mudanya', color: 'lime' },
                { service: 'Bulaşık M. Pompa', details: 'Arçelik 6263 I 14 Kişilik', location: 'Mersin, Mezitli', color: 'emerald' },
                
                // KÜÇÜK EV ALETLERİ
                { service: 'Mikrodalga Tamiri', details: 'Panasonic NN-DS596M', location: 'İstanbul, Avcılar', color: 'slate' },
                { service: 'Fırın Tamiri', details: 'Bosch HBG635BS1 Ankastre', location: 'Ankara, Pursaklar', color: 'gray' },
                { service: 'Davlumbaz Tamiri', details: 'Siemens LC87KHM60 90cm', location: 'İzmir, Çiğli', color: 'zinc' },
                { service: 'Ocak Tamiri', details: 'Arçelik AFO 5652 B', location: 'Bursa, İnegöl', color: 'stone' },
                { service: 'Süpürge Tamiri', details: 'Dyson V15 Detect Absolute', location: 'Antalya, Serik', color: 'neutral' },
                { service: 'Ütü Tamiri', details: 'Philips PerfectCare Elite', location: 'Trabzon, Ortahisar', color: 'gray' },
                
                // ELEKTRONİK CİHAZLAR
                { service: 'Telefon Tamiri', details: 'iPhone 15 Pro Max', location: 'İstanbul, Taksim', color: 'purple' },
                { service: 'Tablet Tamiri', details: 'iPad Pro 12.9" M2', location: 'Ankara, Ulus', color: 'violet' },
                { service: 'Konsol Tamiri', details: 'PlayStation 5 Slim', location: 'İzmir, Foça', color: 'indigo' },
                { service: 'Hoparlör Tamiri', details: 'JBL PartyBox 710', location: 'Bursa, Orhangazi', color: 'blue' },
                { service: 'Kulaklık Tamiri', details: 'Sony WH-1000XM5', location: 'Antalya, Manavgat', color: 'sky' },
                
                // AKILLI EV CİHAZLARI
                { service: 'Akıllı TV Setup', details: 'Samsung Neo QLED 8K AI', location: 'İstanbul, Levent', color: 'emerald' },
                { service: 'Ses Sistemi', details: 'Bose Lifestyle 650', location: 'Ankara, Bilkent', color: 'teal' },
                { service: 'Projektör Kurulum', details: 'Epson EH-TW7100 4K', location: 'İzmir, Cesme', color: 'cyan' },
                { service: 'Güvenlik Kamera', details: 'Hikvision 4K NVR Sistem', location: 'Bursa, Karacabey', color: 'slate' },
                { service: 'Akıllı Ev Sistemi', details: 'Samsung SmartThings Hub', location: 'Antalya, Kas', color: 'zinc' }
            ];
            
            const customerNames = [
                'Mehmet K.', 'Ayşe Y.', 'Can S.', 'Elif K.', 'Murat D.', 'Zeynep A.', 'Ali R.', 'Fatma B.',
                'Ahmet T.', 'Seda M.', 'Burak Ö.', 'Deniz L.', 'Cem Y.', 'Pınar G.', 'Oğuz B.', 'Merve K.',
                'Emre D.', 'Selin A.', 'Barış C.', 'Gizem E.', 'Kaan P.', 'Tuğba R.', 'Serkan M.', 'Ebru T.',
                'Volkan S.', 'Esra H.', 'Tolga K.', 'Nazlı B.', 'Onur G.', 'Burcu Y.', 'Arda F.', 'İpek L.'
            ];
            const comments = [
                // TV Yorumları
                'TV\'im artık mükemmel çalışıyor! Görüntü kalitesi harika 📺✨',
                '8K TV kurulumu mükemmeldi, sinema keyfi evimde 🎬🔥',
                'OLED TV tamiri çok başarılı, renkler canlı 🌈👍',
                'Smart TV ayarları perfect, tüm uygulamalar çalışıyor 📱💯',
                'TV panel değişimi süper oldu, yepyeni gibi 🆕🎉',
                
                // PC Yorumları  
                'Gaming PC\'im şimdi çok güçlü, tüm oyunlar Ultra ayarlarda 🎮⚡',
                'PC kurulum hizmetinden çok memnunum, hız inanılmaz 🚀💪',
                'İş bilgisayarım artık çok hızlı, verimliliğim arttı 💼⚡',
                'PC format işlemi harika, Windows 11 çok smooth 🖥️✨',
                'Oyun PC toplama servisi mükemmel, RTX performansı 🔥🎯',
                
                // Laptop Yorumları
                'MacBook tamiri profesyoneldi, M2 chip uçuyor 🍎💨',
                'Gaming laptop\'ım yeniden hayata döndü 🎮💥',
                'Laptop ekran değişimi perfect, 4K görüntü net 📱🌟',
                'İş laptop\'ım artık çok verimli çalışıyor 💻📈',
                'Laptop klavye tamiri başarılı, yazma keyfi geri geldi ⌨️😊',
                
                // Beyaz Eşya Yorumları
                'Buzdolabım mükemmel soğutuyor, enerji tasarrufu var ❄️💚',
                'Çamaşır makinem sessiz çalışıyor, yeni gibi 🌊✨',
                'Bulaşık makinesi tamiri süper, temizlik mükemmel 🍽️💎',
                'Mikrodalga tamiri başarılı, hızlı ısıtma geri geldi 🔥⚡',
                'Fırın tamiri harika, ekmeklerim artık perfect 🍞👨‍🍳',
                
                // Klima Yorumları
                'Klima servisi mükemmeldi, evim çok serin ve sessiz ❄️🏠',
                'VRV sistem kurulumu professional, tüm odalar ideal 🌡️✅',
                'Klima temizliği süper, hava quality çok iyi 💨😌',
                'Split klima montajı perfect, enerji tasarruflu 💡💚',
                'Inverter klima tamiri başarılı, sessiz çalışıyor 🔇❄️',
                
                // Elektronik Yorumları
                'iPhone tamiri mükemmel, ekran yepyeni gibi 📱✨',
                'PlayStation tamiri süper, oyunlar lag-free 🎮🚀',
                'Tablet tamiri başarılı, dokunma hassasiyeti perfect 📋👆',
                'Kulaklık tamiri harika, ses kalitesi muhteşem 🎧🎵',
                'Hoparlör tamiri excellent, bass performansı top 🔊🎶',
                
                // Genel Memnuniyet
                'Hizmet kalitesi A+, kesinlikle tavsiye ederim 👌⭐',
                'Teknisyen çok bilgili ve güler yüzlü 😊👨‍🔧',
                'Fiyat-performans oranı mükemmel 💰✅',
                'Zamanında geldi, işini hızlı bitirdi ⏰💯',
                'Garantili hizmet, güvenle tercih edin 🛡️✨',
                'Problem tamamen çözüldü, teşekkürler 🙏💪',
                'Profesyonel ekip, kaliteli malzeme 👥🔧',
                'İkinci kez hizmet alıyorum, yine mükemmel 🔄⭐'
            ];
            
            let notificationIndex = 0;
            let commentIndex = 0;
            
            // İlk yüklemede loading mesajını temizle
            function clearLoadingMessages() {
                // Bildirimlerdeki loading mesajını temizle
                const loadingNotification = liveNotifications.querySelector('div');
                if (loadingNotification && loadingNotification.textContent.includes('yükleniyor')) {
                    liveNotifications.innerHTML = '';
                }
                
                // Yorumlardaki loading mesajını temizle
                const loadingComment = liveComments.querySelector('div');
                if (loadingComment && loadingComment.textContent.includes('yükleniyor')) {
                    liveComments.innerHTML = '';
                }
            }
            
            // Yeni talep bildirimi ekleme - ÇOK DAHA DİNAMİK
            function addNewNotification() {
                clearLoadingMessages();
                const service = serviceTypes[Math.floor(Math.random() * serviceTypes.length)]; // Rastgele seçim
                const timeOptions = ['şimdi', '1 dk önce', '2 dk önce', '3 dk önce', '4 dk önce', '5 dk önce', '30 sn önce', '45 sn önce'];
                const timeAgo = timeOptions[Math.floor(Math.random() * timeOptions.length)];
                
                const notification = document.createElement('div');
                notification.className = 'bg-white/10 border-l-4 border-' + service.color + '-400 p-3 rounded-r-lg transform translate-x-full transition-all duration-500 shadow-lg';
                
                notification.innerHTML = 
                    '<div class="flex items-center justify-between">' +
                        '<div class="flex-1">' +
                            '<div class="text-white font-semibold text-sm">' + service.service + ' Tamamlandı</div>' +
                            '<div class="text-' + service.color + '-200 text-xs">' + service.details + ' - ' + service.location + '</div>' +
                        '</div>' +
                        '<div class="text-' + service.color + '-400 font-bold text-xs">' + timeAgo + '</div>' +
                    '</div>';
                
                // En üste ekle
                liveNotifications.insertBefore(notification, liveNotifications.firstChild);
                
                // Çarpıcı animasyon efekti + Ses
                setTimeout(() => {
                    notification.classList.remove('translate-x-full');
                    notification.classList.add('animate-pulse');
                    
                    // Yeni talep ses efekti (opsiyonel)
                    try {
                        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEbBDGJ0fPQfS4ELnjK7+KURQ0PVK3n77BdGAg+ltryxnkpBSl+zPLaizsIGGS57+OXRBAUXrTp66hVFApGn+DyvmEbBDGJ0fPQfS4ELnjK7+KURQ0PVK3n77BdGAg+ltryxnkpBSl+zPLaizsIGGS57+OXRBAUXrTp66hVFApGn+DyvmEbBDGJ0fPQfS4ELnjK7+KURQ0PVK3n77BdGAg+ltryxnkpBSl+zPLaizsIGGS57+OXRBAUXrTp66hVFApGn+DyvmEbBDGJ0fPQfS4ELnjK7+KURQ0PVK3n77BdGAg+ltryxnkpBSl+zPLaizsIGGS57+OXRBAUXrTp66hVFA==');
                        audio.volume = 0.1; // Çok düşük ses seviyesi
                        audio.play().catch(() => {}); // Hata varsa sessizce devam et
                    } catch(e) {}
                    
                    setTimeout(() => {
                        notification.classList.remove('animate-pulse');
                    }, 1000);
                }, 100);
                
                // Fazla olanları sil (maksimum 4 tane - hızlı değişim için)
                while (liveNotifications.children.length > 4) {
                    liveNotifications.removeChild(liveNotifications.lastChild);
                }
                
                notificationIndex++;
            }
            
            // Yeni yorum ekleme - TAM RANDOMİZE
            function addNewComment() {
                clearLoadingMessages();
                const service = serviceTypes[Math.floor(Math.random() * serviceTypes.length)]; // Rastgele hizmet
                const customer = customerNames[Math.floor(Math.random() * customerNames.length)]; // Rastgele müşteri
                const comment = comments[Math.floor(Math.random() * comments.length)]; // Rastgele yorum
                const initials = customer.split(' ').map(n => n[0]).join('');
                const timeOptions = ['şimdi', '1 dk', '2 dk', '3 dk', '30 sn', '45 sn', '1,5 dk', '2,5 dk'];
                const timeText = timeOptions[Math.floor(Math.random() * timeOptions.length)];
                
                const commentEl = document.createElement('div');
                commentEl.className = 'bg-white/10 p-3 rounded-lg transform translate-x-full transition-all duration-500 shadow-lg';
                
                commentEl.innerHTML = 
                    '<div class="flex items-start space-x-2">' +
                        '<div class="w-8 h-8 bg-' + service.color + '-500 rounded-full flex items-center justify-center">' +
                            '<span class="text-white text-xs font-bold">' + initials + '</span>' +
                        '</div>' +
                        '<div class="flex-1">' +
                            '<div class="text-white text-xs font-semibold">' + customer + '</div>' +
                            '<div class="text-' + service.color + '-200 text-xs">"' + comment + '"</div>' +
                            '<div class="text-' + service.color + '-300 text-xs mt-1">⭐⭐⭐⭐⭐ | ' + service.service + '</div>' +
                        '</div>' +
                        '<div class="text-' + service.color + '-400 text-xs">' + timeText + '</div>' +
                    '</div>';
                
                // En üste ekle
                liveComments.insertBefore(commentEl, liveComments.firstChild);
                
                // Çarpıcı animasyon efekti
                setTimeout(() => {
                    commentEl.classList.remove('translate-x-full');
                    commentEl.classList.add('animate-bounce');
                    setTimeout(() => {
                        commentEl.classList.remove('animate-bounce');
                    }, 1000);
                }, 100);
                
                // Fazla olanları sil (maksimum 3 tane - hızlı değişim için)
                while (liveComments.children.length > 3) {
                    liveComments.removeChild(liveComments.lastChild);
                }
                
                commentIndex++;
            }
            
            // ULTRA HIZLI SÜREKLI AKIŞ - Çok daha sık güncelleme!
            // Her 1-2 saniyede bir yeni talep bildirimi (ÇILGIN HIZLI!)
            setInterval(addNewNotification, 1000 + Math.random() * 1000);
            
            // Her 1.5-2.5 saniyede bir yeni yorum (ÇILGIN HIZLI!)
            setInterval(addNewComment, 1500 + Math.random() * 1000);
            
            // Sayfa yüklendiğinde HEMEN başlasın - çoklu dalga
            setTimeout(addNewNotification, 500);   // İlk bildirim
            setTimeout(addNewComment, 800);        // İlk yorum
            setTimeout(addNewNotification, 1200);  // İkinci bildirim
            setTimeout(addNewComment, 1600);       // İkinci yorum
            setTimeout(addNewNotification, 2100);  // Üçüncü bildirim
            setTimeout(addNewComment, 2400);       // Üçüncü yorum
        }
        
        // Simulated real-time data updates - DISABLED (using unified system)
        function updateStats() {
            // DISABLED - Now using unified statistics system
            return;
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

            // Active dealers - DISABLED: Now synchronized with main counter system
            // const dealersEl = document.getElementById('active-dealers');
            // if (dealersEl) {
            //     const current = parseInt(dealersEl.textContent) || 412;
            //     const change = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
            //     dealersEl.textContent = current + change;
            // }

            // Average price
            const avgPriceEl = document.getElementById('avg-price');
            if (avgPriceEl) {
                const prices = [245, 267, 289, 234, 312, 198, 356, 276, 234, 287];
                avgPriceEl.textContent = prices[Math.floor(Math.random() * prices.length)];
            }
        }

        // Enhanced customer request feed simulation
        // ESKİ addJobToFeed FONKSIYONU KALDIRILDI

        // ESKİ KOD PARÇALARI KALDIRILDI

            const requestElement = document.createElement('div');
            requestElement.className = \`bg-white border border-slate-200 minimal-corner p-4 hover:border-orange-600 transition-all duration-200 \${request.urgent ? 'border-l-4 border-l-red-500' : ''}\`;
            requestElement.innerHTML = \`
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="flex flex-col">
                            <div class="flex items-center space-x-2">
                                <span class="\${priorityColor} text-white px-2 py-1 sharp-corner text-xs font-bold">\${request.priority}</span>
                                <span class="text-slate-500 text-xs font-medium">#\${requestId}</span>
                                \${request.urgent ? '<span class="text-red-600 text-xs font-bold pulse-dot">ACIL</span>' : ''}
                            </div>
                            <div class="mt-1">
                                <span class="text-slate-800 font-bold text-sm">\${request.category}</span>
                                <span class="text-slate-600 text-sm ml-2">- \${customerName}</span>
                            </div>
                            <div class="text-slate-600 text-lg mt-1">
                                \${request.description}
                            </div>
                            <div class="text-slate-500 text-xs mt-1">
                                \${city} / \${district} - \${time}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-green-600 font-bold text-sm">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="text-slate-500 text-xs">Uzman Araniyor</div>
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

        // City opportunities function disabled - no city categories to display
        function populateCityOpportunities() {
            // Function disabled to remove city categories from "Sehir Bazinda Hizmet Imkanlari" section
            return;
        }

        // Anlık talep fonksiyonları kaldırıldı

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
                addChatMessage('Uzgunum, su anda bir teknik sorun yasiyorum. Lutfen daha sonra tekrar deneyin veya telefon ile iletisime gecin.', 'ai');
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
                    throw new Error(data.error || 'API hatasi');
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
                name: 'Ev Elektrigi',
                icon: 'fas fa-bolt',
                color: 'yellow',
                priceRange: 'TL150-800',
                keywords: ['elektrik', 'priz', 'sigorta', 'kablo', 'ampul', 'lamba', 'salter', 'kacak', 'kesinti', 'voltaj'],
                description: 'Elektrik tesisati, priz takma, sigorta degistirme',
                whatsappMessage: 'Merhaba! Elektrik isi icin destek istiyorum.',
                urgency: { emergency: '30dk', urgent: '1-2 saat', normal: '2-4 saat' }
            },
            'beyaz_esya': {
                name: 'Beyaz Esya Tamiri',
                icon: 'fas fa-home',
                color: 'blue',
                priceRange: 'TL200-1200',
                keywords: ['buzdolabi', 'camasir makinesi', 'bulasik makinesi', 'firin', 'ocak', 'mikrodalga', 'klima', 'sogutmuyor', 'calismiyor'],
                description: 'Buzdolabi, camasir makinesi, bulasik makinesi tamiri',
                whatsappMessage: 'Merhaba! Beyaz esya tamiri icin yardim istiyorum.',
                urgency: { emergency: '1 saat', urgent: '2-4 saat', normal: '4-8 saat' }
            },
            'su_tesisati': {
                name: 'Su Tesisati',
                icon: 'fas fa-tint',
                color: 'blue',
                priceRange: 'TL100-600',
                keywords: ['musluk', 'tikaniklik', 'su kacagi', 'boru', 'sifon', 'klozet', 'rezervuar', 'damla', 'akiyor', 'tikali'],
                description: 'Musluk tamiri, tikaniklik acma, su kacagi',
                whatsappMessage: 'Merhaba! Su tesisati sorunu icin yardim istiyorum.',
                urgency: { emergency: '30dk', urgent: '1 saat', normal: '2-3 saat' }
            },
            'kombi_kalorifer': {
                name: 'Kombi & Kalorifer',
                icon: 'fas fa-fire',
                color: 'orange',
                priceRange: 'TL200-800',
                keywords: ['kombi', 'kalorifer', 'radyator', 'isinmiyor', 'sicak su', 'dogalgaz', 'petek', 'termostat'],
                description: 'Kombi tamiri, kalorifer bakimi, termostat ayari',
                whatsappMessage: 'Merhaba! Kombi/kalorifer sorunu icin destek istiyorum.',
                urgency: { emergency: '1 saat', urgent: '2-3 saat', normal: '4-6 saat' }
            },
            'elektronik': {
                name: 'Elektronik Tamiri',
                icon: 'fas fa-tv',
                color: 'purple',
                priceRange: 'TL150-1000',
                keywords: ['televizyon', 'tv', 'bilgisayar', 'pc', 'laptop', 'tablet', 'ses sistemi', 'goruntu yok', 'acilmiyor'],
                description: 'TV tamiri, bilgisayar tamiri, ses sistemi',
                whatsappMessage: 'Merhaba! Elektronik cihaz tamiri icin yardim istiyorum.',
                urgency: { emergency: '2 saat', urgent: '4-6 saat', normal: '1-2 gun' }
            },
            'temizlik': {
                name: 'Temizlik Hizmetleri',
                icon: 'fas fa-broom',
                color: 'green',
                priceRange: 'TL120-500',
                keywords: ['temizlik', 'ev temizligi', 'ofis temizligi', 'derin temizlik', 'cam silme', 'hali yikama'],
                description: 'Ev temizligi, ofis temizligi, derin temizlik',
                whatsappMessage: 'Merhaba! Temizlik hizmeti icin randevu istiyorum.',
                urgency: { emergency: '3 saat', urgent: '6-8 saat', normal: '1-2 gun' }
            },
            'boyama': {
                name: 'Boyama & Badana',
                icon: 'fas fa-paint-roller',
                color: 'indigo',
                priceRange: 'TL300-1500',
                keywords: ['boya', 'badana', 'duvar boyama', 'ic boyama', 'dis boyama', 'alcipan', 'macun'],
                description: 'Duvar boyama, badana, alcipan isleri',
                whatsappMessage: 'Merhaba! Boyama isi icin teklif istiyorum.',
                urgency: { emergency: '1-2 gun', urgent: '2-3 gun', normal: '3-5 gun' }
            },
            'kapi_pencere': {
                name: 'Kapi & Pencere',
                icon: 'fas fa-door-open',
                color: 'red',
                priceRange: 'TL150-800',
                keywords: ['kapi', 'pencere', 'kilit', 'kol', 'mentese', 'cam', 'acilmiyor', 'kapanmiyor', 'sikisiyor'],
                description: 'Kapi tamiri, kilit degistirme, pencere tamiri',
                whatsappMessage: 'Merhaba! Kapi/pencere tamiri icin yardim istiyorum.',
                urgency: { emergency: '1 saat', urgent: '2-4 saat', normal: '4-8 saat' }
            }
        };

        // AI-powered problem analysis function
        async function analyzeWithAI() {
            const problemText = document.getElementById('problemDescription').value.trim();
            const urgencyLevel = document.getElementById('urgencyLevel').value;
            const serviceLocation = document.getElementById('serviceLocation').value;

            if (!problemText) {
                alert('Lutfen probleminizi detayli bir sekilde anlatin.');
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
                alert('Analiz sirasinda bir hata olustu. Lutfen tekrar deneyin.');
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
                    message: 'Probleminizi daha detayli anlatirsaniz size daha iyi yardimci olabilirim.'
                });
                return insights;
            }

            const category = topRecommendation[1].category;
            const confidence = topRecommendation[1].confidence;

            // Confidence-based insights
            if (confidence >= 80) {
                insights.push({
                    type: 'success',
                    title: 'Yuksek Eslesme',
                    message: \`Problem taniminiz \\"\${category.name}\\" kategorisiyle %\${confidence} uyumlu.\`
                });
            } else if (confidence >= 60) {
                insights.push({
                    type: 'info',
                    title: 'Olasi Eslesme',
                    message: \`Problem taniminiz buyuk ihtimalle \\"\${category.name}\\" kategorisinde.\`
                });
            }

            // Urgency-based insights
            if (urgencyLevel === 'emergency') {
                insights.push({
                    type: 'urgent',
                    title: 'Acil Durum',
                    message: \`Acil durumunuz icin \${category.urgency.emergency} icinde uzman destegi saglanabilir.\`
                });
            }

            // Price insights
            insights.push({
                type: 'price',
                title: 'Tahmini Maliyet',
                message: \`Bu kategori icin ortalama hizmet bedeli \${category.priceRange} arasindadir.\`
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
                        <div class="w-8 h-8 bg-\${category.color}-500 minimal-corner flex items-center justify-center mr-4">
                            <i class="\${category.icon} text-white text-xl"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-white text-lg">\${category.name}</h4>
                            <p class="text-green-200 text-sm">%\${confidence} Eslesme</p>
                        </div>
                    </div>
                    <p class="text-white text-sm mb-3">\${category.description}</p>
                    <div class="grid grid-cols-2 gap-3 text-xs">
                        <div class="bg-white/20 p-2 minimal-corner text-center">
                            <div class="text-white/80">Fiyat Araligi</div>
                            <div class="text-white font-bold">\${category.priceRange}</div>
                        </div>
                        <div class="bg-white/20 p-2 minimal-corner text-center">
                            <div class="text-white/80">Yanit Suresi</div>
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
                        <h4 class="font-bold text-white text-2xl mb-2">Kategori Belirlenemedi</h4>
                        <p class="text-white text-sm">
                            Probleminizi daha detayli anlatirsaniz size daha iyi yardimci olabilirim.
                            Ornegin hangi cihaz, nerede, nasil bir sorun yasiyorsunuz?
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
                    <p class="text-blue-200 text-sm text-center">Baska kategori onerisi bulunamadi.</p>
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
                            <i class="fas fa-lightbulb mr-1"></i>AI Analiz Sonuclari
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
            modal.innerHTML = '<div class="bg-white minimal-corner max-w-lg mx-4 p-8">' +
                '<div class="text-center mb-6">' +
                    '<div class="w-16 h-16 bg-' + category.color + '-500 minimal-corner mx-auto mb-4 flex items-center justify-center">' +
                        '<i class="' + category.icon + ' text-white text-2xl"></i>' +
                    '</div>' +
                    '<h3 class="text-2xl font-bold text-gray-800 mb-2">' + category.name + '</h3>' +
                    '<p class="text-gray-600">' + category.description + '</p>' +
                    '<div class="mt-4 p-4 bg-gray-50 minimal-corner">' +
                        '<div class="text-sm text-gray-600 mb-2">Tahmini Maliyet</div>' +
                        '<div class="text-xl font-bold text-' + category.color + '-600">' + category.priceRange + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="space-y-4">' +
                    '<h4 class="text-lg font-bold text-gray-800 text-center mb-4">Nasil devam etmek istiyorsunuz?</h4>' +
                    '<button onclick="proceedWithWhatsApp(\'' + category.whatsappMessage + '\', \'' + (details.originalText || '') + '\')" class="w-full bg-green-500 hover:bg-green-600 text-white p-4 minimal-corner transition duration-200 flex items-center justify-center group">' +
                        '<i class="fab fa-whatsapp text-2xl mr-3 group-hover:animate-pulse"></i>' +
                        '<div class="text-left">' +
                            '<div class="font-bold">WhatsApp ile Hizli Teklif</div>' +
                            '<div class="text-sm opacity-90">5 dakikada teklif alin</div>' +
                        '</div>' +
                    '</button>' +
                    '<button onclick="proceedWithForm(\'' + JSON.stringify({category, details}).replace(/"/g, '&quot;') + '\')" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 minimal-corner transition duration-200 flex items-center justify-center">' +
                        '<i class="fas fa-file-alt text-xl mr-3"></i>' +
                        '<div class="text-left">' +
                            '<div class="font-bold">Detayli Form Doldur</div>' +
                            '<div class="text-sm opacity-90">Kapsamli teklif icin</div>' +
                        '</div>' +
                    '</button>' +
                    '<button onclick="closeServiceOptionsModal()" class="w-full border-2 border-gray-300 text-gray-600 hover:bg-gray-50 p-3 minimal-corner transition duration-200">Iptal Et</button>' +
                '</div>' +
            '</div>';
            
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
            const enhancedMessage = baseMessage + (problemDescription ? ('\n\nProbleminiz: ' + problemDescription) : '');
            const encodedMessage = encodeURIComponent(enhancedMessage);
            const whatsappUrl = 'https://wa.me/905001234567?text=' + encodedMessage;
            
            // Open WhatsApp
            window.open(whatsappUrl, '_blank');
            
            // Close modal
            closeServiceOptionsModal();
            
            // Show success notification
            showNotification('WhatsApp uzerinden size ulasacagiz! 5 dakika icinde uzmanimiz sizinle iletisime gececek.', 'success');
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
                showNotification('AI onerisi form alanlarina aktarildi! Kisisel bilgilerinizi tamamlayip talebinizi gonderebilirsiniz.', 'success');
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
            showNotification('AI onerisi form alanlarina aktarildi! Kisisel bilgilerinizi tamamlayip talebinizi gonderebilirsiniz.', 'success');
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
                location: 'Istanbul, Kadikoy',
                service: 'Camasir Makinesi Tamiri',
                rating: 5,
                price: 'TL450',
                duration: '2 saat',
                technician: 'Ahmet Usta',
                category: 'beyaz-esya'
            },
            {
                customerName: 'Ayse K.',
                location: 'Ankara, Cankaya',
                service: 'Elektrik Tesisati',
                rating: 5,
                price: 'TL280',
                duration: '1.5 saat',
                technician: 'Osman Usta',
                category: 'elektrik'
            },
            {
                customerName: 'Fatma D.',
                location: 'Izmir, Bornova',
                service: 'Su Tesisati Tamiri',
                rating: 5,
                price: 'TL320',
                duration: '45 dakika',
                technician: 'Mustafa Usta',
                category: 'su-tesisati'
            },
            {
                customerName: 'Ali S.',
                location: 'Bursa, Osmangazi',
                service: 'Kombi Servisi',
                rating: 5,
                price: 'TL680',
                duration: '3 saat',
                technician: 'Hasan Usta',
                category: 'kombi'
            },
            {
                customerName: 'Zeynep T.',
                location: 'Antalya, Muratpasa',
                service: 'Klima Temizligi',
                rating: 5,
                price: 'TL200',
                duration: '1 saat',
                technician: 'Emre Usta',
                category: 'klima'
            },
            {
                customerName: 'Okan Y.',
                location: 'Adana, Seyhan',
                service: 'TV Tamiri',
                rating: 5,
                price: 'TL520',
                duration: '2.5 saat',
                technician: 'Kemal Usta',
                category: 'elektronik'
            },
            {
                customerName: 'Elif M.',
                location: 'Konya, Selcuklu',
                service: 'Bulasik Makinesi',
                rating: 5,
                price: 'TL390',
                duration: '1.5 saat',
                technician: 'Serkan Usta',
                category: 'beyaz-esya'
            },
            {
                customerName: 'Huseyin B.',
                location: 'Gaziantep, Sahinbey',
                service: 'Kapi Kilidi Degisimi',
                rating: 5,
                price: 'TL180',
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
                                <span class="text-gray-500 text-xs">-</span>
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
                        <div class="text-xs text-gray-500">Tamamlandi</div>
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
                    message: 'Ahmet K.     Elektrik hizmeti aldi',
                    location: 'Istanbul'
                },
                {
                    icon: 'fas fa-star',
                    color: 'bg-yellow-500',
                    message: 'Ayse D. 5  puan verdi',
                    location: 'Ankara'
                },
                {
                    icon: 'fas fa-check-circle',
                    color: 'bg-blue-500',
                    message: 'Mehmet S. hizmetini tamamladi',
                    location: 'Izmir'
                },
                {
                    icon: 'fas fa-handshake',
                    color: 'bg-purple-500',
                    message: 'Fatma A. uzman ile eslesti',
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
                        <div class="text-xs opacity-80">\${notification.location} - Simdi</div>
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

        // Live Comments System
        function initializeLiveComments() {
            // Add initial comments with varying delays
            for (let i = 0; i < 4; i++) {
                setTimeout(() => addLiveComment(), i * 1200);
            }
            
            // Update live user count
            updateLiveUserCount();
        }

        function addLiveComment() {
            const comments = [
                {
                    name: 'Zeynep K.',
                    location: 'İstanbul',
                    comment: 'Klima tamiri için çağırdığım usta çok profesyoneldi, teşekkürler! ⭐⭐⭐⭐⭐',
                    time: 'şimdi'
                },
                {
                    name: 'Murat A.',
                    location: 'Ankara', 
                    comment: 'Elektrik problemi 2 saatte çözüldü, fiyat da uygundu 👍',
                    time: '1dk önce'
                },
                {
                    name: 'Ayşe D.',
                    location: 'İzmir',
                    comment: 'Ev temizliği hizmeti mükemmeldi, kesinlikle tekrar kullanacağım!',
                    time: '2dk önce'
                },
                {
                    name: 'Hasan M.',
                    location: 'Bursa',
                    comment: 'Su kaçağı sorunu anında çözüldü, çok memnunum 💯',
                    time: '3dk önce'
                },
                {
                    name: 'Elif S.',
                    location: 'Antalya',
                    comment: 'Boyacı usta işini çok güzel yaptı, herkese tavsiye ederim!',
                    time: '4dk önce'
                },
                {
                    name: 'Ali R.',
                    location: 'Gaziantep',
                    comment: 'Kombi bakımı için gelen usta çok bilgiliydi ⭐⭐⭐⭐⭐',
                    time: '5dk önce'
                },
                {
                    name: 'Fatma T.',
                    location: 'Konya',
                    comment: 'Buzdolabı tamiri mükemmel oldu, çok teşekkürler! 🙏',
                    time: '6dk önce'
                },
                {
                    name: 'Mehmet G.',
                    location: 'Adana',
                    comment: 'Kapı-pencere montajı profesyonel yapıldı 👌',
                    time: '7dk önce'
                }
            ];

            const container = document.getElementById('liveComments');
            if (!container) return;

            const comment = comments[Math.floor(Math.random() * comments.length)];
            
            const commentEl = document.createElement('div');
            commentEl.className = 'bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 opacity-0 transform translate-y-4 transition-all duration-500';
            
            commentEl.innerHTML = \`
                <div class="flex items-start space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        \${comment.name.charAt(0)}
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                            <span class="font-semibold text-white">\${comment.name}</span>
                            <span class="text-xs text-blue-300">\${comment.time}</span>
                        </div>
                        <div class="text-xs text-blue-200 mb-2">\${comment.location}</div>
                        <div class="text-blue-100 text-sm">\${comment.comment}</div>
                    </div>
                </div>
            \`;

            container.insertBefore(commentEl, container.firstChild);
            
            // Animate in
            setTimeout(() => {
                commentEl.classList.remove('opacity-0', 'translate-y-4');
            }, 100);

            // Remove old comments (keep only 5)
            const comments_list = container.children;
            while (comments_list.length > 5) {
                const oldComment = comments_list[comments_list.length - 1];
                oldComment.style.opacity = '0';
                oldComment.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    if (oldComment.parentElement) {
                        oldComment.remove();
                    }
                }, 500);
            }
        }

        function updateLiveUserCount() {
            // Update live user count
            const userCounter = document.getElementById('liveUserCount');
            if (userCounter) {
                const baseCount = 1800;
                const variation = Math.floor(Math.random() * 100) - 50; // ±50
                const newCount = baseCount + variation;
                userCounter.textContent = newCount.toLocaleString('tr-TR');
                
                // Add pulse effect
                userCounter.classList.add('animate-pulse');
                setTimeout(() => {
                    userCounter.classList.remove('animate-pulse');
                }, 1000);
            }
            
            // Update active services - AYNI DEĞER İKİ YERDE
            const minServices = 33;
            const maxServices = 350;
            const newServices = Math.floor(Math.random() * (maxServices - minServices + 1)) + minServices;
            const formattedServices = newServices.toLocaleString('tr-TR');
            
            // 1. Mutlu müşteriler bölümündeki AKTİF HİZMET
            const servicesCounter = document.getElementById('activeServices');
            if (servicesCounter) {
                servicesCounter.textContent = formattedServices;
                
                // Add pulse effect
                servicesCounter.classList.add('animate-pulse');
                setTimeout(() => {
                    servicesCounter.classList.remove('animate-pulse');
                }, 1000);
            }
            
            // 2. İstatistikler bölümündeki AKTİF HİZMET VEREN
            const activeDealers = document.getElementById('active-dealers');
            if (activeDealers) {
                activeDealers.textContent = formattedServices;
                
                // Add pulse effect
                activeDealers.classList.add('animate-pulse');
                setTimeout(() => {
                    activeDealers.classList.remove('animate-pulse');
                }, 1000);
            }
            
            // Update online experts
            const expertsCounter = document.getElementById('onlineExperts');
            if (expertsCounter) {
                const baseExperts = 150;
                const variation = Math.floor(Math.random() * 20) - 10; // ±10
                const newExperts = baseExperts + variation;
                expertsCounter.textContent = newExperts.toLocaleString('tr-TR');
                
                // Add pulse effect
                expertsCounter.classList.add('animate-pulse');
                setTimeout(() => {
                    expertsCounter.classList.remove('animate-pulse');
                }, 1000);
            }
        }

        // Auto-sliding customer reviews
        let currentSlideIndex = 0;
        
        function initializeAutoSlideReviews() {
            const reviews = [
                // Reviews data will be duplicated to create seamless loop
                {
                    name: 'Ayşe K.', location: 'İstanbul', 
                    comment: 'Çamaşır makinesi tamiri çok başarılı. 2 saatte geldi, 1 saatte tamir etti. Kesinlikle tavsiye ederim!',
                    category: 'Beyaz Eşya', date: '15 Eylül',
                    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b3bb?w=32&h=32&fit=crop&crop=face&auto=format&q=80',
                    bgColor: 'bg-blue-50', textColor: 'text-blue-600'
                },
                {
                    name: 'Mehmet Ö.', location: 'Ankara',
                    comment: 'Elektrik arızası gece vakti çözüldü. 45 dakikada geldi, 6 ay garanti verdi. Profesyonel hizmet!',
                    category: 'Elektrik', date: '18 Eylül',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face&auto=format&q=80',
                    bgColor: 'bg-yellow-50', textColor: 'text-yellow-600'
                },
                {
                    name: 'Zeynep D.', location: 'İzmir',
                    comment: 'Kombi arızası kış ortasında çözüldü. 1 saatte teknisyen buldum. İş kalitesi mükemmel!',
                    category: 'Kombi', date: '14 Eylül',
                    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face&auto=format&q=80',
                    bgColor: 'bg-orange-50', textColor: 'text-orange-600'
                }
            ];

            const container = document.getElementById('autoSlideReviews');
            if (!container) return;

            // Create all review cards (duplicate set for seamless loop)
            const allReviews = [...reviews, ...reviews]; // Double for seamless loop
            
            allReviews.forEach(review => {
                const reviewEl = document.createElement('div');
                reviewEl.className = 'bg-white p-4 rounded-lg shadow border border-gray-100 w-64 flex-shrink-0';
                
                reviewEl.innerHTML = \`
                    <div class="flex items-center mb-2">
                        <img src="\${review.avatar}" alt="\${review.name}" class="w-8 h-8 rounded-full mr-2">
                        <div class="flex-1">
                            <div class="font-medium text-sm text-gray-800">\${review.name}</div>
                            <div class="text-xs text-gray-500">\${review.location}</div>
                        </div>
                        <div class="flex text-yellow-400 text-xs">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                        </div>
                    </div>
                    <p class="text-xs text-gray-600 leading-relaxed">
                        "\${review.comment}"
                    </p>
                    <div class="flex justify-between items-center mt-2">
                        <span class="\${review.bgColor} \${review.textColor} px-2 py-1 rounded text-xs">\${review.category}</span>
                        <span class="text-xs text-gray-400">\${review.date}</span>
                    </div>
                \`;
                
                container.appendChild(reviewEl);
            });
        }

        function autoSlideReviews() {
            const container = document.getElementById('autoSlideReviews');
            if (!container) return;

            const cardWidth = 272; // 256px + 16px margin
            currentSlideIndex++;
            
            // Reset to beginning for seamless loop (when reaching halfway point)
            if (currentSlideIndex >= 3) {
                currentSlideIndex = 0;
                container.style.transition = 'none';
                container.style.transform = 'translateX(0px)';
                
                // Re-enable transition after a brief moment
                setTimeout(() => {
                    container.style.transition = 'transform 500ms ease-in-out';
                }, 50);
                return;
            }
            
            const translateX = -(currentSlideIndex * cardWidth);
            container.style.transform = \`translateX(\${translateX}px)\`;
        }

        // Missing Live Notifications Functions - RESTORED
        window.populateCityOpportunities = function() {
            // Populate city opportunities in the stats section
            console.log('Populating city opportunities...');
        }
        
        // Anlık talep fonksiyonları kaldırıldı - müşteri arayüzünden çıkarıldı
        
        window.updateStats = function() {
            // Update various statistics counters
            const dailyJobs = document.getElementById('daily-jobs');
            const activeDealer = document.getElementById('active-dealers');
            const avgResponse = document.getElementById('avg-response');
            const recentCount = document.getElementById('recent-count');
            
            if (dailyJobs) {
                const current = parseInt(dailyJobs.textContent) || 357;
                dailyJobs.textContent = current + Math.floor(Math.random() * 3);
            }
            
            if (activeDealer) {
                const current = parseInt(activeDealer.textContent.replace(',', '')) || 1247;
                const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
                activeDealer.textContent = (current + change).toLocaleString('tr-TR');
            }
            
            if (avgResponse) {
                const times = [10, 11, 12, 13, 14, 15];
                avgResponse.textContent = times[Math.floor(Math.random() * times.length)];
            }
            
            if (recentCount) {
                const count = Math.floor(Math.random() * 5) + 8; // 8-12
                recentCount.textContent = count;
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, starting all systems...');
            
            // Anlık talep başlatma kodu kaldırıldı
            
            if (window.populateCityOpportunities) window.populateCityOpportunities();
            initializeSocialProof();
            initializeLiveComments();
            initializeAutoSlideReviews();
            
            // Update stats every 10 seconds
            setInterval(updateStats, 10000);
            
            // Update live stats every 15 seconds (original + social proof)
            setInterval(updateLiveStats, 15000);
            
            // Anlık talep interval kodu kaldırıldı
            
            // Add service completions every 12 seconds
            setInterval(addServiceCompletion, 12000);
            
            // Show social proof notifications every 20 seconds
            setInterval(showSocialProofNotification, 20000);
            
            // Show first social proof notification after 5 seconds
            setTimeout(showSocialProofNotification, 5000);
            
            // Add live comments every 6 seconds
            setInterval(addLiveComment, 6000);
            
            // Update live user count every 30 seconds
            setInterval(updateLiveUserCount, 30000);
            
            // Auto-slide reviews every 4 seconds
            setInterval(autoSlideReviews, 4000);
        });

        // Show all 81 cities modal
        function showAllCities() {
            // Create modal if not exists
            let modal = document.getElementById('citiesModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'citiesModal';
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
                modal.innerHTML = 
                    '<div class="bg-white minimal-corner max-w-6xl max-h-[90vh] overflow-y-auto m-4 relative">' +
                        '<div class="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">' +
                            '<div>' +
                                '<h2 class="text-2xl font-bold text-slate-800">TURKIYE GENELI HIZMET FIYATLARI</h2>' +
                                '<p class="text-slate-600 mt-1">81 ilde guncel fiyatlar ve hizmet kalitesi</p>' +
                            '</div>' +
                            '<button onclick="closeAllCities()" class="text-slate-400 hover:text-slate-600 text-2xl">' +
                                '<i class="fas fa-times"></i>' +
                            '</button>' +
                        '</div>' +
                        '<div class="p-6" id="allCitiesContainer">' +
                            '<!-- All cities will be populated here -->' +
                        '</div>' +
                    '</div>';
                document.body.appendChild(modal);
            }

            // Populate all 81 cities
            const allCitiesContainer = document.getElementById('allCitiesContainer');
            const allCities = [
                // Major cities
                { name: 'Istanbul', avgPrice: 'TL280-450', responseTime: '2-4 saat', satisfaction: '4.8', region: 'Marmara' },
                { name: 'Ankara', avgPrice: 'TL240-380', responseTime: '1-3 saat', satisfaction: '4.7', region: 'Ic Anadolu' },
                { name: 'Izmir', avgPrice: 'TL250-400', responseTime: '2-4 saat', satisfaction: '4.9', region: 'Ege' },
                { name: 'Bursa', avgPrice: 'TL220-350', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Marmara' },
                { name: 'Antalya', avgPrice: 'TL260-420', responseTime: '2-3 saat', satisfaction: '4.6', region: 'Akdeniz' },
                { name: 'Adana', avgPrice: 'TL210-340', responseTime: '1-3 saat', satisfaction: '4.7', region: 'Akdeniz' },
                
                // Additional cities (75 more cities)
                { name: 'Konya', avgPrice: 'TL200-320', responseTime: '1-2 saat', satisfaction: '4.9', region: 'Ic Anadolu' },
                { name: 'Gaziantep', avgPrice: 'TL190-310', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Guneydogu Anadolu' },
                { name: 'Sanliurfa', avgPrice: 'TL160-270', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Guneydogu Anadolu' },
                { name: 'Kocaeli', avgPrice: 'TL230-360', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Marmara' },
                { name: 'Mersin', avgPrice: 'TL220-340', responseTime: '1-3 saat', satisfaction: '4.7', region: 'Akdeniz' },
                { name: 'Diyarbakir', avgPrice: 'TL170-280', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Guneydogu Anadolu' },
                { name: 'Kayseri', avgPrice: 'TL180-290', responseTime: '30dk-2 saat', satisfaction: '4.9', region: 'Ic Anadolu' },
                { name: 'Eskisehir', avgPrice: 'TL200-320', responseTime: '45dk-2 saat', satisfaction: '4.8', region: 'Ic Anadolu' },
                { name: 'Erzurum', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Dogu Anadolu' },
                { name: 'Elazig', avgPrice: 'TL160-260', responseTime: '45dk-2 saat', satisfaction: '4.7', region: 'Dogu Anadolu' },
                { name: 'Malatya', avgPrice: 'TL170-280', responseTime: '45dk-2 saat', satisfaction: '4.8', region: 'Dogu Anadolu' },
                { name: 'Manisa', avgPrice: 'TL190-300', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ege' },
                { name: 'Samsun', avgPrice: 'TL190-310', responseTime: '1-3 saat', satisfaction: '4.6', region: 'Karadeniz' },
                { name: 'Van', avgPrice: 'TL140-240', responseTime: '1-3 saat', satisfaction: '4.6', region: 'Dogu Anadolu' },
                { name: 'Aydin', avgPrice: 'TL180-290', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Ege' },
                { name: 'Balikesir', avgPrice: 'TL170-280', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Marmara' },
                { name: 'Denizli', avgPrice: 'TL180-300', responseTime: '30dk-2 saat', satisfaction: '4.9', region: 'Ege' },
                { name: 'Trabzon', avgPrice: 'TL180-290', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Ordu', avgPrice: 'TL160-270', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Karadeniz' },
                { name: 'Mugla', avgPrice: 'TL210-340', responseTime: '1-3 saat', satisfaction: '4.6', region: 'Ege' },
                { name: 'Tekirdag', avgPrice: 'TL200-320', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Marmara' },
                { name: 'Sakarya', avgPrice: 'TL210-330', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Marmara' },
                { name: 'Afyonkarahisar', avgPrice: 'TL160-260', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Ege' },
                { name: 'Mardin', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Guneydogu Anadolu' },
                { name: 'Kahramanmaras', avgPrice: 'TL170-280', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Akdeniz' },
                { name: 'Zonguldak', avgPrice: 'TL170-280', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Karadeniz' },
                { name: 'Batman', avgPrice: 'TL140-240', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Guneydogu Anadolu' },
                { name: 'Usak', avgPrice: 'TL160-260', responseTime: '45dk-2 saat', satisfaction: '4.8', region: 'Ege' },
                { name: 'Duzce', avgPrice: 'TL180-290', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Bolu', avgPrice: 'TL170-280', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Karadeniz' },
                { name: 'Isparta', avgPrice: 'TL160-270', responseTime: '45dk-2 saat', satisfaction: '4.8', region: 'Akdeniz' },
                { name: 'Corum', avgPrice: 'TL160-260', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ic Anadolu' },
                { name: 'Tokat', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Kirklareli', avgPrice: 'TL180-290', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Marmara' },
                { name: 'Rize', avgPrice: 'TL170-280', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Karadeniz' },
                { name: 'Edirne', avgPrice: 'TL180-290', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Marmara' },
                
                // Complete the remaining cities to reach 81
                { name: 'Aksaray', avgPrice: 'TL140-240', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ic Anadolu' },
                { name: 'Amasya', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Karadeniz' },
                { name: 'Artvin', avgPrice: 'TL150-250', responseTime: '1-3 saat', satisfaction: '4.6', region: 'Karadeniz' },
                { name: 'Bilecik', avgPrice: 'TL170-280', responseTime: '45dk-2 saat', satisfaction: '4.7', region: 'Marmara' },
                { name: 'Bingol', avgPrice: 'TL130-230', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Dogu Anadolu' },
                { name: 'Bitlis', avgPrice: 'TL130-230', responseTime: '1-2 saat', satisfaction: '4.5', region: 'Dogu Anadolu' },
                { name: 'Burdur', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Akdeniz' },
                { name: 'Canakkale', avgPrice: 'TL170-280', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Marmara' },
                { name: 'Cankiri', avgPrice: 'TL140-240', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ic Anadolu' },
                { name: 'Giresun', avgPrice: 'TL160-260', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Gumushane', avgPrice: 'TL140-240', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Karadeniz' },
                { name: 'Hakkari', avgPrice: 'TL120-220', responseTime: '2-4 saat', satisfaction: '4.4', region: 'Dogu Anadolu' },
                { name: 'Hatay', avgPrice: 'TL190-310', responseTime: '1-3 saat', satisfaction: '4.6', region: 'Akdeniz' },
                { name: 'Igdir', avgPrice: 'TL130-230', responseTime: '1-3 saat', satisfaction: '4.5', region: 'Dogu Anadolu' },
                { name: 'Karaman', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ic Anadolu' },
                { name: 'Kars', avgPrice: 'TL130-230', responseTime: '1-3 saat', satisfaction: '4.5', region: 'Dogu Anadolu' },
                { name: 'Kastamonu', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Kirikkale', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Ic Anadolu' },
                { name: 'Kirsehir', avgPrice: 'TL140-240', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ic Anadolu' },
                { name: 'Kutahya', avgPrice: 'TL160-260', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ege' },
                { name: 'Nevsehir', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Ic Anadolu' },
                { name: 'Nigde', avgPrice: 'TL140-240', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ic Anadolu' },
                { name: 'Siirt', avgPrice: 'TL130-230', responseTime: '1-2 saat', satisfaction: '4.5', region: 'Guneydogu Anadolu' },
                { name: 'Sinop', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Sivas', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Ic Anadolu' },
                { name: 'Sirnak', avgPrice: 'TL120-220', responseTime: '1-3 saat', satisfaction: '4.4', region: 'Guneydogu Anadolu' },
                { name: 'Tunceli', avgPrice: 'TL130-230', responseTime: '1-3 saat', satisfaction: '4.5', region: 'Dogu Anadolu' },
                { name: 'Yalova', avgPrice: 'TL200-320', responseTime: '1-2 saat', satisfaction: '4.8', region: 'Marmara' },
                { name: 'Yozgat', avgPrice: 'TL140-240', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Ic Anadolu' },
                { name: 'Karabuk', avgPrice: 'TL160-260', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Kilis', avgPrice: 'TL140-240', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Guneydogu Anadolu' },
                { name: 'Osmaniye', avgPrice: 'TL160-270', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Akdeniz' },
                { name: 'Bartin', avgPrice: 'TL150-250', responseTime: '1-2 saat', satisfaction: '4.7', region: 'Karadeniz' },
                { name: 'Ardahan', avgPrice: 'TL120-220', responseTime: '1-3 saat', satisfaction: '4.4', region: 'Dogu Anadolu' },
                { name: 'Bayburt', avgPrice: 'TL130-230', responseTime: '1-2 saat', satisfaction: '4.6', region: 'Karadeniz' }
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
                                    <span class="text-slate-600">Sure:</span>
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
                name: 'Elektrik Isleri',
                basePrice: { min: 150, max: 500 },
                cityMultiplier: { istanbul: 1.3, ankara: 1.1, izmir: 1.2, bursa: 1.0, antalya: 1.1, adana: 0.9, konya: 0.9, gaziantep: 0.8 },
                complexityMultiplier: { 1: 0.8, 2: 1.0, 3: 1.4 }
            },
            'beyaz-esya': {
                name: 'Beyaz Esya Tamiri',
                basePrice: { min: 200, max: 600 },
                cityMultiplier: { istanbul: 1.4, ankara: 1.2, izmir: 1.3, bursa: 1.1, antalya: 1.2, adana: 1.0, konya: 0.9, gaziantep: 0.8 },
                complexityMultiplier: { 1: 0.7, 2: 1.0, 3: 1.5 }
            },
            'su-tesisati': {
                name: 'Su Tesisati',
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
                name: 'Kapi & Pencere',
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
                1: { label: 'Basit', desc: 'Hizli cozum, standart malzeme' },
                2: { label: 'Orta', desc: 'Standart islem suresi ve malzeme' },
                3: { label: 'Karmasik', desc: 'Uzun sure, ozel malzeme gerekebilir' }
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
                document.getElementById('priceRange').textContent = 'TL200-600';
                document.getElementById('priceCity_display').textContent = city ? 
                    city.charAt(0).toUpperCase() + city.slice(1) : 'Sehir seciniz';
                document.getElementById('basePrice').textContent = 'TL200-400';
                document.getElementById('urgencyFee').textContent = 'TL0';
                document.getElementById('complexityFee').textContent = 'Standart';
                document.getElementById('totalPriceRange').textContent = 'TL200-600';
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
            document.getElementById('priceRange').textContent = 'TL' + finalMin + '-' + finalMax;
            document.getElementById('priceCity_display').textContent = 
                city.charAt(0).toUpperCase() + city.slice(1) + ' - ' + data.name;
            document.getElementById('basePrice').textContent = 'TL' + baseMin + '-' + baseMax;
            
            if (urgencyFeeMin > 0) {
                document.getElementById('urgencyFee').textContent = 'TL' + urgencyFeeMin + '-' + urgencyFeeMax;
            } else {
                document.getElementById('urgencyFee').textContent = 'TL0';
            }
            
            const complexityLabels = { 1: 'Basit (-20%)', 2: 'Standart', 3: 'Karmasik (+40%)' };
            document.getElementById('complexityFee').textContent = complexityLabels[complexity] || 'Standart';
            document.getElementById('totalPriceRange').textContent = 'TL' + finalMin + '-' + finalMax;

            // Store current calculation for later use
            window.currentPriceCalculation = {
                serviceCategory: serviceCategory,
                serviceName: data.name,
                city: city,
                urgencyLevel: urgencyLevel,
                complexity: complexity,
                priceRange: 'TL' + finalMin + '-' + finalMax,
                breakdown: {
                    base: 'TL' + baseMin + '-' + baseMax,
                    urgency: urgencyFeeMin > 0 ? ('TL' + urgencyFeeMin + '-' + urgencyFeeMax) : 'TL0',
                    complexity: complexityLabels[complexity],
                    total: 'TL' + finalMin + '-' + finalMax
                }
            };
        }

        function proceedWithPriceCalculation() {
            const calc = window.currentPriceCalculation;
            if (!calc) {
                alert('Lutfen once tum secimleri yapiniz.');
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
                        normal: 'Normal (1-2 gun icinde)',
                        urgent: 'Acil (Ayni gun)',
                        emergency: 'Cok Acil (1-2 saat icinde)'
                    };
                    
                    problemInput.value = calc.serviceName + ' hizmeti icin tahmini maliyet: ' + calc.priceRange + '\n\n' +
                        'Aciliyet: ' + urgencyText[calc.urgencyLevel] + '\n' +
                        'Karmasiklik: ' + calc.breakdown.complexity + '\n\n' +
                        'Detaylari asagiya yazabilirsiniz:';
                }

                // Scroll to form
                serviceRequestForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        function sharePrice() {
            const calc = window.currentPriceCalculation;
            if (!calc) {
                alert('Lutfen once fiyat hesaplamasi yapiniz.');
                return;
            }

            const whatsappUrl = createWhatsAppMessage(calc);
            
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
            shareButton.innerHTML = '<i class="fas fa-check mr-2"></i>PAYLASILDI!';
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
                    experience: '12 yil', 
                    price: 'TL200-500',
                    specialties: ['Ev elektrigi', 'Sigorta kutulari', 'LED montaji'],
                    responseTime: '15 dakika',
                    availability: 'Su an musait'
                },
                { 
                    name: 'Mehmet Usta', 
                    rating: 4.8, 
                    distance: 1.2, 
                    experience: '8 yil', 
                    price: 'TL180-450',
                    specialties: ['Priz montaji', 'Kablo doseme', 'Elektrik arizalari'],
                    responseTime: '25 dakika',
                    availability: 'Bu aksam musait'
                },
                { 
                    name: 'Ali Usta', 
                    rating: 4.7, 
                    distance: 2.1, 
                    experience: '15 yil', 
                    price: 'TL250-550',
                    specialties: ['Elektrik panosu', 'Aydinlatma', 'Guvenlik sistemleri'],
                    responseTime: '35 dakika',
                    availability: 'Yarin sabah musait'
                }
            ],
            'beyaz-esya': [
                {
                    name: 'Osman Usta',
                    rating: 4.9,
                    distance: 0.5,
                    experience: '10 yil',
                    price: 'TL300-800',
                    specialties: ['Camasir makinesi', 'Bulasik makinesi', 'Buzdolabi'],
                    responseTime: '20 dakika',
                    availability: 'Su an musait'
                },
                {
                    name: 'Hasan Usta',
                    rating: 4.8,
                    distance: 1.5,
                    experience: '14 yil',
                    price: 'TL280-750',
                    specialties: ['Beyaz esya tamiri', 'Motor degisimi', 'Elektronik kart'],
                    responseTime: '30 dakika',
                    availability: 'Bu aksam musait'
                },
                {
                    name: 'Ibrahim Usta',
                    rating: 4.6,
                    distance: 2.3,
                    experience: '9 yil',
                    price: 'TL250-700',
                    specialties: ['Klima servisi', 'Firin tamiri', 'Mikrodalga'],
                    responseTime: '45 dakika',
                    availability: 'Yarin musait'
                }
            ]
        };

        function getCurrentLocation() {
            const locationInput = document.getElementById('quickLocation');
            
            if (navigator.geolocation) {
                locationInput.value = 'Konum aliniyor...';
                
                navigator.geolocation.getCurrentPosition(function(position) {
                    // Simulated address from coordinates
                    const mockAddresses = [
                        'Kadikoy, Istanbul',
                        'Cankaya, Ankara', 
                        'Bornova, Izmir',
                        'Nilufer, Bursa',
                        'Muratpasa, Antalya'
                    ];
                    
                    const address = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
                    locationInput.value = address;
                    
                    startExpertSearch();
                }, function(error) {
                    locationInput.value = '';
                    alert('Konum alinamadi. Manuel olarak girebilirsiniz.');
                });
            } else {
                alert('Tarayiciniz konum ozelligini desteklemiyor.');
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
                'Lokasyonunuza gore uzmanlar taraniyor...',
                'Uygun uzmanlar filtreleniyor...',  
                'Musaitlik durumlari kontrol ediliyor...',
                'En iyi eslesmeler bulunuyor...',
                'Sonuclar hazirlaniyor...'
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
                const priceMatch = expert.price.match(/TL(\d+)-(\d+)/);
                const minPrice = Math.round(parseInt(priceMatch[1]) * priceMultiplier);
                const maxPrice = Math.round(parseInt(priceMatch[2]) * priceMultiplier);
                const adjustedPrice = 'TL' + minPrice + '-' + maxPrice;
                
                const expertCard = document.createElement('div');
                expertCard.className = 'bg-white/90 backdrop-blur p-4 minimal-corner border-2 border-white/50 hover:border-yellow-300 transition-all duration-300 cursor-pointer transform hover:scale-105';
                const stars = ' '.repeat(Math.floor(expert.rating));
                const specialtyTags = expert.specialties.map(specialty => 
                    '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 text-xs minimal-corner">' + specialty + '</span>'
                ).join('');
                
                expertCard.innerHTML = 
                    '<div class="flex items-start justify-between">' +
                        '<div class="flex items-center">' +
                            '<div class="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 minimal-corner flex items-center justify-center mr-4">' +
                                '<i class="fas fa-user text-white text-lg"></i>' +
                        '</div><div>' +
                        '<h4 class="font-bold text-gray-800 text-lg">' + expert.name + '</h4>' +
                        '<div class="flex items-center text-sm text-gray-600 mb-1">' +
                            '<div class="flex text-yellow-400 mr-2">' + stars + '</div>' +
                            '<span class="font-bold">' + expert.rating + '</span>' +
                            '<span class="mx-2">-</span>' +
                            '<i class="fas fa-map-marker-alt text-emerald-600 mr-1"></i>' +
                            '<span>' + expert.distance + 'km uzaklikta</span>' +
                        '</div>' +
                        '<div class="text-xs text-gray-500">' + expert.experience + ' deneyim - ' + expert.responseTime + ' icinde yanit</div>' +
                        '</div></div>' +
                        '<div class="text-right">' +
                            '<div class="font-bold text-emerald-600 text-lg">' + adjustedPrice + '</div>' +
                            '<div class="text-xs text-gray-600">' + expert.availability + '</div>' +
                        '</div></div>' +
                        '<div class="mt-3 pt-3 border-t border-gray-200">' +
                            '<div class="text-xs text-gray-600 mb-2">Uzmanlik Alanlari:</div>' +
                            '<div class="flex flex-wrap gap-1">' + specialtyTags + '</div>' +
                        '</div>' +
                        '<div class="mt-4 flex gap-2">' +
                            '<button onclick="callExpert(\'' + expert.name + '\')" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 minimal-corner text-sm transition duration-200">' +
                                '<i class="fas fa-phone mr-1"></i>Ara</button>' +
                            '<button onclick="messageExpert(\'' + expert.name + '\')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 minimal-corner text-sm transition duration-200">' +
                                '<i class="fas fa-message mr-1"></i>Mesaj</button>' +
                            '<button onclick="getQuote(\'' + expert.name + '\')" class="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 minimal-corner text-sm transition duration-200">' +
                                '<i class="fas fa-file-invoice mr-1"></i>Teklif</button>' +
                        '</div>';
                
                container.appendChild(expertCard);
            });
            
            resultsDiv.classList.remove('hidden');
            searchInProgress = false;
            
            // Scroll to results
            resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Handle city selection change - show/hide custom input
        function handleCityChange() {
            const citySelect = document.getElementById('customerCity');
            const customInput = document.getElementById('customCityInput');
            
            if (citySelect && customInput) {
                if (citySelect.value === 'Diğer') {
                    customInput.classList.remove('hidden');
                    customInput.focus();
                } else {
                    customInput.classList.add('hidden');
                    customInput.value = ''; // Clear custom input when not used
                }
            }
        }

        function proceedToChat() {
            const chatSystem = document.getElementById('liveChatSystem');
            chatSystem.classList.remove('hidden');
            chatSystem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Simulate incoming messages after a delay
            setTimeout(() => {
                addChatMessage(1, 'Ahmet Usta', 'Merhaba! Size nasil yardimci olabilirim?');
            }, 2000);
            
            setTimeout(() => {
                addChatMessage(2, 'Mehmet Usta', 'Probleminizi anlattiniz mi? Fotograf gonderebilir misiniz?');
            }, 4000);
            
            setTimeout(() => {
                addChatMessage(3, 'Osman Usta', 'Teklif verebilirim, ne zaman musaitsiniz?');
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
            alert('  ' + expertName + ' araniyor...\n\nGercek uygulamada telefon aramasi baslatilacak.');
        }

        function messageExpert(expertName) {
            alert('  ' + expertName + ' ile mesajlasma basliyor...\n\nCanli sohbet sistemi aciliyor.');
            proceedToChat();
        }

        function getQuote(expertName) {
            const serviceType = document.getElementById('quickServiceType').value;
            const location = document.getElementById('quickLocation').value;
            
            const message = '  *Garantor360 - Teklif Talebi*\n\n' +
                '   *Uzman:* ' + expertName + '\n' +
                ' *Hizmet:* ' + serviceType + '\n' +
                '  *Lokasyon:* ' + location + '\n\n' +
                '  *Hemen teklif almak icin:* https://wa.me/905301234567\n\n' +
                '  Aninda teklif\n' +
                '  Garantili hizmet\n' +
                '  Guvenli odeme';

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
            const serviceSection = document.getElementById('hizmet-al') || document.querySelector('section:has(h2:contains("TALEBINIZI BILDIRIN"))');
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
        
        // END OF COMMENTED BLOCK - MOVED TO APP.JS
        */
        
        // Simple floating notifications starter
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize floating notifications from app.js
            setTimeout(() => {
                if (window.initializeFloatingNotifications) {
                    window.initializeFloatingNotifications();
                }
            }, 3000);
            
            // FORCE START NOTIFICATIONS - IMMEDIATELY
            console.log('FORCING NOTIFICATION START NOW!');
            setTimeout(() => {
                console.log('Starting job feed...');
                // Initialize job feed
                if (document.getElementById('job-feed')) {
                    console.log('Found job-feed container, starting...');
                    initializeJobFeed();
                    setInterval(addJobToFeed, 8000);
                } else {
                    console.log('job-feed container not found!');
                }
                
                // Initialize other systems - SAFELY
                try { initializeSocialProof(); } catch(e) { console.log('initializeSocialProof not found'); }
                try { initializeLiveComments(); } catch(e) { console.log('initializeLiveComments not found'); }
                
                // Start stats updates
                try { setInterval(updateStats, 10000); } catch(e) { console.log('updateStats not found'); }
                try { setInterval(updateLiveStats, 15000); } catch(e) { console.log('updateLiveStats not found'); }
                try { setInterval(addServiceCompletion, 12000); } catch(e) { console.log('addServiceCompletion not found'); }
                try { setInterval(showSocialProofNotification, 20000); } catch(e) { console.log('showSocialProofNotification not found'); }
                try { setInterval(addLiveComment, 6000); } catch(e) { console.log('addLiveComment not found'); }
                try { setInterval(updateLiveUserCount, 30000); } catch(e) { console.log('updateLiveUserCount not found'); }
                
                // Update ALL LIVE STATS - COMPREHENSIVE DYNAMIC UPDATES
                setInterval(() => {
                    console.log('Updating all dynamic stats...');
                    
                    // Update daily jobs
                    const dailyJobs = document.getElementById('daily-jobs');
                    if (dailyJobs) {
                        const current = parseInt(dailyJobs.textContent) || 357;
                        dailyJobs.textContent = current + Math.floor(Math.random() * 3);
                    }
                    
                    // Update active dealers - DISABLED: Now synchronized with main counter system  
                    // const activeDealer = document.getElementById('active-dealers');
                    // if (activeDealer) {
                    //     const current = parseInt(activeDealer.textContent.replace(',', '')) || 1247;
                    //     const change = Math.floor(Math.random() * 5) - 2;
                    //     activeDealer.textContent = (current + change).toLocaleString('tr-TR');
                    // }
                    
                    // Update avg response
                    const avgResponse = document.getElementById('avg-response');
                    if (avgResponse) {
                        const times = [10, 11, 12, 13, 14, 15];
                        avgResponse.textContent = times[Math.floor(Math.random() * times.length)];
                    }
                    
                    // Update live user count (ŞU ANDA CANLI)
                    const liveUserCount = document.getElementById('liveUserCount');
                    if (liveUserCount) {
                        const baseCount = 1800;
                        const variation = Math.floor(Math.random() * 100) - 50;
                        const newCount = baseCount + variation;
                        liveUserCount.textContent = newCount.toLocaleString('tr-TR');
                    }
                    
                    // Active services güncelleme devre dışı (çakışmayı engellemek için)
                    // updateLiveUserCount fonksiyonu zaten güncelleme yapıyor
                    
                    // Update online experts (UZMAN ONLİNE)
                    const onlineExperts = document.getElementById('onlineExperts');
                    if (onlineExperts) {
                        const baseExperts = 150;
                        const variation = Math.floor(Math.random() * 20) - 10;
                        const newExperts = baseExperts + variation;
                        onlineExperts.textContent = newExperts.toLocaleString('tr-TR');
                    }
                    
                    // Update hourly total (Son 6 Saat)
                    const hourlyTotal = document.getElementById('hourly-total');
                    if (hourlyTotal) {
                        const baseTalep = 45;
                        const variation = Math.floor(Math.random() * 15) - 7;
                        const newTalep = baseTalep + variation;
                        hourlyTotal.textContent = newTalep;
                    }
                    
                    // Update recent count (Son 10dk)
                    const recentCount = document.getElementById('recent-count');
                    if (recentCount) {
                        const count = Math.floor(Math.random() * 5) + 8;
                        recentCount.textContent = count;
                    }
                    
                    // Update dynamic stats text (Aktif uzman sayisi: 847)
                    const dynamicStatsText = document.getElementById('dynamicStatsText');
                    if (dynamicStatsText) {
                        const statsMessages = [
                            { icon: 'fas fa-users', text: 'Aktif uzman sayısı: ' + (800 + Math.floor(Math.random() * 100)), color: 'text-blue-500' },
                            { icon: 'fas fa-chart-line', text: 'Bugünkü tamamlanan iş: ' + (1200 + Math.floor(Math.random() * 100)), color: 'text-green-500' },
                            { icon: 'fas fa-smile', text: 'Müşteri memnuniyeti: %' + (97 + Math.floor(Math.random() * 3)), color: 'text-yellow-500' },
                            { icon: 'fas fa-fire', text: 'Günlük talep sayısı: ' + (2800 + Math.floor(Math.random() * 100)), color: 'text-red-500' }
                        ];
                        const randomStat = statsMessages[Math.floor(Math.random() * statsMessages.length)];
                        dynamicStatsText.innerHTML = '<i class="' + randomStat.icon + ' mr-2 ' + randomStat.color + '"></i><strong>' + randomStat.text + '</strong>';
                    }
                    
                    // Update dynamic activity text (Ahmet K. elektrik hizmeti aldi)
                    const dynamicActivityText = document.getElementById('dynamicActivityText');
                    if (dynamicActivityText) {
                        const activities = [
                            'Ahmet K. elektrik hizmeti aldı',
                            'Zeynep H. 5/5 yıldız verdi', 
                            'Mehmet S. klima tamiri tamamladı',
                            'Ayşe D. beyaz eşya servisi aldı',
                            'Ali R. TV tamiri hizmeti aldı',
                            'Fatma K. temizlik hizmeti tamamladı'
                        ];
                        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
                        dynamicActivityText.innerHTML = '<i class="fas fa-user-check mr-2 text-green-500"></i><strong>' + randomActivity + '</strong>';
                    }
                    
                }, 8000); // Her 8 saniyede bir güncelle
                
                console.log('All notification systems started!');
            }, 1000);
        });

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
                        <span class="font-bold text-sm">  OZEL INDIRIM!</span>
                    </div>
                    <div class="text-sm">
                        <span class="font-bold">%15 INDIRIM</span> - Sadece bu sayfada gecerli!
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
                    <p class="text-orange-100 text-sm">Gitmeden once bu ozel teklifi kacirma!</p>
                </div>
                
                <div class="p-8 text-center">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">
                          SIZE OZEL %20 INDIRIM!
                    </h4>
                    <p class="text-gray-600 mb-6">
                        Bu sayfadan ayrilmadan once size ozel hazirladigimiz 
                        <strong>%20 indirim firsatini</strong> degerlendirin!
                    </p>
                    
                    <div class="bg-gradient-to-r from-green-50 to-blue-50 p-4 minimal-corner mb-6 border-2 border-green-200">
                        <div class="flex items-center justify-center mb-3">
                            <i class="fas fa-gift text-green-600 text-xl mr-3"></i>
                            <span class="font-bold text-green-800">BONUS AVANTAJLAR:</span>
                        </div>
                        <div class="text-sm space-y-1 text-left">
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-600 mr-2"></i>
                                <span>%20 Indirim (Tum hizmetlerde gecerli)</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-600 mr-2"></i>
                                <span>Ucretsiz kesif (Normalde 50TL)</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-600 mr-2"></i>
                                <span>7/24 oncelikli destek</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-600 mr-2"></i>
                                <span>1 yil ek garanti</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <button 
                            onclick="acceptExitOffer()"
                            class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 minimal-corner transition duration-200 transform hover:scale-105 shadow-lg"
                        >
                            <i class="fas fa-rocket mr-2"></i>
                            %20 INDIRIM ILE HIZMET AL
                        </button>
                        <button 
                            onclick="closeExitModal()"
                            class="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-6 minimal-corner transition duration-200"
                        >
                            Hayir, indirim istemiyorum
                        </button>
                    </div>
                    
                    <p class="text-xs text-gray-500 mt-4">
                        Bu teklif sadece bu sayfaya ozeldir ve tekrar edilmeyecektir.
                    </p>
                </div>
            </div>
        </div>

        <!-- Urgency Timer Popup -->
        <div id="urgencyTimerPopup" class="fixed bottom-6 left-6 z-50 max-w-sm hidden">
            <div class="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 minimal-corner shadow-2xl border-2 border-white transform hover:scale-105 transition-all duration-300">
                <div class="flex items-center mb-3">
                    <i class="fas fa-clock text-yellow-300 mr-3 animate-pulse text-lg"></i>
                    <div class="font-bold text-sm">  SURE DOLUYOR!</div>
                </div>
                <p class="text-xs mb-3 text-purple-100">
                    Bu ozel fiyatlar <strong>sadece bugun</strong> gecerli!
                </p>
                <div class="bg-white/20 p-3 minimal-corner text-center mb-3">
                    <div class="text-xs text-purple-200 mb-1">Kalan Sure:</div>
                    <div id="urgencyTimerDisplay" class="text-lg font-bold text-yellow-300">
                        05:42:17
                    </div>
                </div>
                <button 
                    onclick="scrollToService(); closeUrgencyTimer();"
                    class="w-full bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold py-2 px-4 minimal-corner transition duration-200 text-sm"
                >
                    HEMEN BASVUR
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
        // Dynamic Stats Text System (Statistics)
        window.initDynamicStats = function() {
            console.log('Initializing dynamic stats...');
            
            const statsMessages = [
                { icon: 'fas fa-users', text: 'Aktif uzman sayisi: 847', color: 'text-blue-500' },
                { icon: 'fas fa-chart-line', text: 'Bugunku tamamlanan is: 1.247', color: 'text-green-500' },
                { icon: 'fas fa-smile', text: 'Musteri memnuniyeti: %98', color: 'text-yellow-500' },
                { icon: 'fas fa-fire', text: 'Gunluk talep sayisi: 2.847', color: 'text-red-500' }
            ];
            
            let currentIndex = 0;
            const textElement = document.getElementById('dynamicStatsText');
            
            if (!textElement) {
                console.log('dynamicStatsText element not found!');
                return;
            }
            
            function updateStatsText() {
                const stat = statsMessages[currentIndex];
                
                textElement.style.opacity = '0';
                textElement.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    textElement.innerHTML = '<i class="' + stat.icon + ' mr-2 ' + stat.color + '"></i><strong>' + stat.text + '</strong>';
                    textElement.style.opacity = '1';
                    textElement.style.transform = 'translateY(0)';
                    currentIndex = (currentIndex + 1) % statsMessages.length;
                }, 200);
            }
            
            updateStatsText();
            setInterval(updateStatsText, 3000);
        }
        
        // Dynamic Activity Text System (User Activities)
        window.initDynamicActivity = function() {
            console.log('Initializing dynamic activities...');
            
            const activityMessages = [
                { icon: 'fas fa-user-check', text: 'Ahmet K. elektrik hizmeti aldi', color: 'text-green-500' },
                { icon: 'fas fa-star', text: 'Zeynep H. 5/5 yildiz verdi', color: 'text-yellow-500' },
                { icon: 'fas fa-wrench', text: 'Ankara da tesisatci onarimlarinin tamamlanmasi', color: 'text-gray-500' },
                { icon: 'fas fa-paint-brush', text: 'Bursa da boyaci calismasi kabul edildi', color: 'text-purple-500' },
                { icon: 'fas fa-home', text: 'Ayse K. ev temizligi hizmeti aldi', color: 'text-pink-500' },
                { icon: 'fas fa-bolt', text: 'Istanbul da elektrik tamiri tamamlandi', color: 'text-yellow-500' },
                { icon: 'fas fa-snowflake', text: 'Izmir de klima tamiri basladi', color: 'text-blue-400' },
                { icon: 'fas fa-tools', text: 'Konya da cam tamircisi arandi', color: 'text-orange-500' },
                { icon: 'fas fa-handshake', text: 'Antalya da temizlik hizmeti tamamlandi', color: 'text-green-500' },
                { icon: 'fas fa-trophy', text: 'Adana da mobilyaci teklifleri verdi', color: 'text-yellow-600' },
                { icon: 'fas fa-tv', text: 'Mehmet B. TV tamiri hizmeti aldi', color: 'text-blue-500' },
                { icon: 'fas fa-hammer', text: 'Gaziantep te marangoz isi kabul edildi', color: 'text-amber-600' },
                { icon: 'fas fa-car', text: 'Fatma S. nakliye hizmeti tamamlandi', color: 'text-indigo-500' },
                { icon: 'fas fa-laptop', text: 'Trabzon da bilgisayar tamiri basladi', color: 'text-cyan-500' },
                { icon: 'fas fa-fire', text: 'Kemal A. kombi bakimi hizmeti aldi', color: 'text-red-500' },
                { icon: 'fas fa-leaf', text: 'Samsun da bahcivan calismasi tamamlandi', color: 'text-green-600' },
                { icon: 'fas fa-cogs', text: 'Diyarbakir da makine tamiri kabul edildi', color: 'text-slate-500' },
                { icon: 'fas fa-phone', text: 'Esra T. telefon tamiri hizmeti aldi', color: 'text-teal-500' },
                { icon: 'fas fa-couch', text: 'Kayseri de koltuk tamiri basladi', color: 'text-brown-500' },
                { icon: 'fas fa-shower', text: 'Mersin de banyo tadilati tamamlandi', color: 'text-blue-600' },
                { icon: 'fas fa-camera', text: 'Halil M. guvenlik kamerasi kuruldu', color: 'text-purple-600' },
                { icon: 'fas fa-wifi', text: 'Denizli de internet kurulumu yapildi', color: 'text-emerald-500' },
                { icon: 'fas fa-solar-panel', text: 'Erzurum da gunes paneli montaji', color: 'text-orange-600' },
                { icon: 'fas fa-kitchen-set', text: 'Aylin K. mutfak tadilati hizmeti aldi', color: 'text-rose-500' }
            ];
            
            let currentIndex = 0;
            const textElement = document.getElementById('dynamicActivityText');
            
            if (!textElement) {
                console.log('dynamicActivityText element not found!');
                return;
            }
            
            function updateActivityText() {
                const activity = activityMessages[currentIndex];
                
                textElement.style.opacity = '0';
                textElement.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    textElement.innerHTML = '<i class="' + activity.icon + ' mr-2 ' + activity.color + '"></i><strong>' + activity.text + '</strong>';
                    textElement.style.opacity = '1';
                    textElement.style.transform = 'translateY(0)';
                    currentIndex = (currentIndex + 1) % activityMessages.length;
                }, 200);
            }
            
            updateActivityText();
            setInterval(updateActivityText, 2500);
        }
        
        // Security Guarantees Rotation System
        window.initSecurityGuarantees = function() {
            console.log('Initializing security guarantees...');
            
            const guarantees = [
                { icon: 'fas fa-money-bill-wave', title: 'ODEME GUVENCESI', desc: 'Para iade garantisi', color: 'text-green-300' },
                { icon: 'fas fa-tools', title: 'ISCILIK GARANTISI', desc: '6 ay garanti', color: 'text-blue-300' },
                { icon: 'fas fa-user-check', title: 'DOGRULANMIS USTALAR', desc: 'Kimlik kontrolu', color: 'text-purple-300' },
                { icon: 'fas fa-shield-alt', title: 'SIGORTA KORUMASI', desc: 'Hasar tazminati', color: 'text-orange-300' },
                { icon: 'fas fa-gavel', title: 'HUKUKI DESTEK', desc: 'Avukat destegi', color: 'text-amber-300' },
                { icon: 'fas fa-clock', title: '7/24 DESTEK', desc: 'Surekli destek', color: 'text-cyan-300' }
            ];
            
            let currentIndex = 0;
            const element = document.getElementById('securityGuarantee');
            
            if (!element) {
                console.log('securityGuarantee element not found!');
                return;
            }
            
            function updateGuarantee() {
                const guarantee = guarantees[currentIndex];
                
                element.style.opacity = '0';
                element.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    element.innerHTML = 
                        '<i class="' + guarantee.icon + ' ' + guarantee.color + ' mr-3 text-lg"></i>' +
                        '<div>' +
                            '<div class="text-sm font-semibold text-white">' + guarantee.title + '</div>' +
                            '<div class="text-xs text-purple-200">' + guarantee.desc + '</div>' +
                        '</div>';
                    
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                    
                    currentIndex = (currentIndex + 1) % guarantees.length;
                }, 200);
            }
            
            updateGuarantee();
            setInterval(updateGuarantee, 3000);
        }
        

        
        // Also try to start it immediately when page loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(() => {
                    if (typeof window.initDynamicStats === 'function') {
                        window.initDynamicStats();
                    }
                    if (typeof window.initDynamicActivity === 'function') {
                        window.initDynamicActivity();
                    }
                    if (typeof window.initSecurityGuarantees === 'function') {
                        window.initSecurityGuarantees();
                    }

                }, 1500);
            });
        } else {
            setTimeout(() => {
                if (typeof window.initDynamicStats === 'function') {
                    window.initDynamicStats();
                }
                if (typeof window.initDynamicActivity === 'function') {
                    window.initDynamicActivity();
                }
                if (typeof window.initSecurityGuarantees === 'function') {
                    window.initSecurityGuarantees();
                }
                if (typeof window.initDynamicStatus === 'function') {
                    window.initDynamicStatus();
                }
            }, 1500);
        }

        // Smart Alert & Motivation System Functions - TEMPORARILY DISABLED FOR DEBUGGING
        /*
        let exitIntentTriggered = false;
        let discountTimerActive = false;
        let urgencyTimerActive = false;
        
        // Scarcity notifications data
        const scarcityMessages = [
            {
                icon: 'fas fa-users',
                color: 'orange',
                title: 'Son 3 Uzman Kaldi!',
                message: 'Elektrik kategorisinde sadece 3 uzman musait',
                type: 'warning'
            },
            {
                icon: 'fas fa-clock',
                color: 'red', 
                title: 'Bu Fiyat 2 Saatte Bitiyor!',
                message: 'Ozel indirimli fiyat son 2 saatte',
                type: 'urgent'
            },
            {
                icon: 'fas fa-fire',
                color: 'purple',
                title: '12 Kisi Bu Sayfada!',
                message: 'Su anda 12 kisi ayni hizmete bakiyor',
                type: 'social'
            },
            {
                icon: 'fas fa-star',
                color: 'green',
                title: 'Bu Ayin En Populer Hizmeti!',
                message: 'Bu kategoride 847 kisi hizmet aldi',
                type: 'social'
            },
            {
                icon: 'fas fa-bolt',
                color: 'blue',
                title: 'Hizla Doluyoruz!',
                message: 'Yarin icin sadece 5 randevu kaldi',
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
            
            notification.innerHTML = '<div class="flex items-start">' +
                '<div class="w-8 h-8 bg-' + messageData.color + '-500 minimal-corner flex items-center justify-center mr-3 mt-1">' +
                    '<i class="' + messageData.icon + ' text-white text-sm"></i>' +
                '</div>' +
                '<div class="flex-1">' +
                    '<h4 class="font-bold text-' + messageData.color + '-800 text-sm">' + messageData.title + '</h4>' +
                    '<p class="text-gray-600 text-xs mt-1">' + messageData.message + '</p>' +
                '</div>' +
                '<button class="text-gray-400 hover:text-gray-600 ml-2 close-notification" data-notification-id="' + notificationId + '">' +
                    '<i class="fas fa-times text-xs"></i>' +
                '</button>' +
            '</div>';
            
            container.appendChild(notification);
            
            // Add click event listener for close button
            const closeButton = notification.querySelector('.close-notification');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    closeScarcityNotification(notificationId);
                });
            }
            
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
                title: '%20 Indirim Uygulandi!',
                message: 'Ozel indiriminiz form doldururken otomatik uygulanacak',
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
                { icon: 'fas fa-handshake', color: 'blue', title: 'Ahmet K. hizmeti aldi!', message: '5 dakika once - Elektrik isleri' },
                { icon: 'fas fa-star', color: 'yellow', title: 'Mukemmel puan aldik!', message: 'Zeynep H. - 5/5 yildiz verdi' },
            ];
            
            let notificationIndex = 0;
            
            function showNextConversionNotification() {
                if (conversionMessages.length === 0) return;
                
                const message = conversionMessages[notificationIndex % conversionMessages.length];
                showConversionNotification(message);
                notificationIndex++;
            }
            
            setInterval(showNextConversionNotification, 25000);
            setTimeout(showNextConversionNotification, 8000);
        }

        </script>
    </body>
    </html>`
  )
})

// Separate script for slider to avoid conflicts
app.get('/slider.js', (c) => {
  return new Response(`
// CUSTOMER REVIEWS SLIDER - SIMPLE VERSION
console.log('Slider script loaded!');

var currentSlide = 0;
var totalSlides = 5;
var sliderTimer = null;

function changeReviewSlide(slideIndex) {
    console.log('Changing to slide:', slideIndex);
    currentSlide = slideIndex;
    updateSliderView();
}

function updateSliderView() {
    var carousel = document.getElementById('reviewsCarousel');
    if (carousel) {
        var translateX = -(currentSlide * 100);
        carousel.style.transform = 'translateX(' + translateX + '%)';
        console.log('Updated to slide', currentSlide, 'with transform', translateX + '%');
    }
    
    var dots = document.querySelectorAll('.review-dot');
    for (var i = 0; i < dots.length; i++) {
        if (i === currentSlide) {
            dots[i].className = 'review-dot w-3 h-3 rounded-full bg-white transition-all';
        } else {
            dots[i].className = 'review-dot w-3 h-3 rounded-full bg-white/40 transition-all';
        }
    }
}

function autoAdvance() {
    currentSlide = (currentSlide + 1) % totalSlides;
    console.log('Auto advancing to slide:', currentSlide);
    updateSliderView();
}

function startSlider() {
    console.log('Starting slider with', totalSlides, 'slides');
    if (sliderTimer) clearInterval(sliderTimer);
    sliderTimer = setInterval(autoAdvance, 4000);
    updateSliderView();
}

// Export to window
window.changeReviewSlide = changeReviewSlide;
window.startSlider = startSlider;

// ==========================================
// DİNAMİK CANLI BİLDİRİMLER SİSTEMİ
// ==========================================

// Dinamik update fonksiyonu - GLOBAL SCOPE
function updateLiveNotifications() {
    console.log('🔄 Updating live notifications...');
    
    const notifications = document.getElementById('liveNotifications');
    const comments = document.getElementById('liveComments');
    
    // ZENGİN TV-PC-BEYAZ EŞYA SERVİSLERİ
    const services = [
        // TV TAMİRLERİ - Premium Modeller
        'TV Tamiri - Samsung Neo QLED 8K 75"',
        'TV Tamiri - LG OLED evo C3 65"', 
        'TV Tamiri - Sony Bravia XR A95K',
        'TV Panel Değişimi - TCL C845 Mini LED',
        'TV Anakart Tamiri - Philips OLED908',
        'Smart TV Kurulum - Hisense U8K ULED',
        'TV Hoparlör Tamiri - Grundig Vision 7',
        'TV Yazılım Güncelleme - Vestel 4K UHD',
        
        // PC & LAPTOP TAMİRLERİ - Gaming & İş
        'Gaming PC Kurulum - RTX 4090 + i9-13900K',
        'İş PC Tamiri - Dell OptiPlex 7090 SFF',
        'PC Anakart Tamiri - ASUS ROG Maximus',
        'Gaming Laptop Tamiri - ASUS ROG Strix G18',
        'MacBook Tamiri - MacBook Pro 16" M2 Max',
        'PC Soğutma Sistemi - Corsair iCUE H150i',
        'Oyun PC Toplama - AMD Ryzen 9 + RTX 4080',
        'Laptop Ekran Tamiri - Lenovo Legion Pro 7',
        'PC Format & Setup - Windows 11 Pro Kurulum',
        'SSD Upgrade - Samsung 980 PRO 2TB NVMe',
        
        // BEYAZ EŞYA - Premium Markalar
        'Buzdolabı Tamiri - Samsung Family Hub RF23M',
        'Buzdolabı Tamiri - LG InstaView Door-in-Door', 
        'Çamaşır Makinesi - Bosch Serie | 8 WAX32EH0TR',
        'Çamaşır Makinesi - LG TurboWash360 F4WV912P2',
        'Bulaşık Makinesi - Siemens iQ700 speedMatic',
        'Bulaşık Makinesi - Bosch Serie 8 Crystal Dry',
        'Mikrodalga Tamiri - Panasonic NN-DS596MEPG',
        'Fırın Tamiri - Bosch HBG675BS1 Piroliz',
        'Davlumbaz Tamiri - Siemens LC87KHM60T',
        
        // KLİMA & HVAC SİSTEMLERİ
        'VRV Klima Sistemi - Daikin VRV 5 A-series',
        'Split Klima Tamiri - Mitsubishi Electric MSZ-LN',
        'Klima Gaz Dolumu - LG Artcool Gallery AC12SQ',
        'Klima Montaj & Setup - Samsung WindFree Elite',
        'Multi Split Sistem - Fujitsu General ASHG12KMCC',
        'Inverter Klima Tamiri - Vestel Vega Plus 18000',
        
        // ELEKTRONİK CİHAZLAR
        'iPhone Tamiri - iPhone 15 Pro Max 1TB',
        'Samsung Tamiri - Galaxy S24 Ultra 512GB',
        'Tablet Tamiri - iPad Pro 12.9" M2 Wi-Fi',
        'PlayStation Tamiri - PS5 Slim Digital Edition',
        'Xbox Tamiri - Xbox Series X 1TB SSD',
        'Akıllı Saat Tamiri - Apple Watch Ultra 2',
        'Kulaklık Tamiri - Sony WH-1000XM5 Wireless',
        'Hoparlör Setup - JBL PartyBox 710 Bluetooth'
    ];
    
    const locations = [
        'İstanbul, Beşiktaş', 'İstanbul, Kadıköy', 'İstanbul, Şişli', 'İstanbul, Beyoğlu',
        'Ankara, Çankaya', 'Ankara, Kızılay', 'Ankara, Bahçelievler', 'Ankara, Keçiören',  
        'İzmir, Konak', 'İzmir, Alsancak', 'İzmir, Bornova', 'İzmir, Karşıyaka',
        'Bursa, Osmangazi', 'Bursa, Nilüfer', 'Bursa, Yıldırım', 'Bursa, Gemlik',
        'Antalya, Muratpaşa', 'Antalya, Kepez', 'Antalya, Konyaaltı', 'Antalya, Serik',
        'Gaziantep, Şahinbey', 'Konya, Selçuklu', 'Adana, Seyhan', 'Kayseri, Melikgazi'
    ];
    const timeAgo = ['şimdi', '1 dk önce', '2 dk önce', '3 dk önce', '30 sn önce', '45 sn önce', '1.5 dk önce'];
    
    const customerNames = [
        'Mehmet K.', 'Ayşe Y.', 'Can S.', 'Elif M.', 'Murat D.', 'Zeynep A.', 'Ali R.', 'Fatma B.',
        'Ahmet T.', 'Seda L.', 'Burak Ö.', 'Deniz K.', 'Cem Y.', 'Pınar G.', 'Oğuz B.', 'Merve S.',
        'Emre D.', 'Selin A.', 'Barış C.', 'Gizem E.', 'Kaan P.', 'Tuğba R.', 'Serkan M.', 'Ebru T.',
        'Volkan S.', 'Esra H.', 'Tolga K.', 'Nazlı B.', 'Onur G.', 'Burcu Y.', 'Arda F.', 'İpek L.'
    ];
    const customerComments = [
        // TV Yorumları - Kısa & Noktalı  
        'OLED TV tamiri mükemmel, artık sinema keyfi evimde...',
        '8K görüntü kalitesi harika oldu, çok teşekkürler...',
        'Smart TV kurulumu perfect, tüm uygulamalar çalışıyor...',
        'Panel değişimi süper, yepyeni gibi görünüyor...',
        'TV sesinde problem vardı, şimdi müthiş ses kalitesi...',
        'QLED teknolojisi harika, renkler çok canlı...',
        
        // PC & Laptop Yorumları - Kısa & Noktalı
        'Gaming PC kurulumu efsane, RTX performansı müthiş...',
        'MacBook tamiri professional, M2 chip gerçekten uçuyor...',
        'PC format çok hızlı oldu, Windows 11 çok smooth...',
        'SSD upgrade sonrası bilgisayarım roket gibi hızlı...',
        'Laptop ekranı yenilendi, 4K kalite gerçekten süper...',
        'Oyun PC toplama hizmeti A+, fps ciddi arttı...',
        'İş bilgisayarım artık çok verimli çalışıyor...',
        'Anakart tamiri başarılı, tüm portlar perfect...',
        
        // Beyaz Eşya Yorumları - Kısa & Noktalı  
        'Buzdolabı tamiri mükemmel, artık sessiz çalışıyor...',
        'Çamaşır makinesi artık 10/10, temizlik harika...',
        'Bulaşık makinesi tamiri başarılı, spotless sonuç...',
        'Mikrodalga yeniden hayata döndü, çok hızlı...',
        'Fırın tamiri süper, ekmeklerim artık perfect...',
        'Family Hub özelliği artık mükemmel çalışıyor...',
        'Kompresör tamiri başarılı, enerji tasarrufu var...',
        'Pompa değişimi perfect, artık sessiz yıkıyor...',
        
        // Klima Yorumları - Kısa & Noktalı
        'VRV sistem kurulumu professional, tüm ev ideal...',
        'Klima tamiri mükemmel, sessiz ve güçlü soğutma...',
        'Split montaj çok temiz, duvarda iz kalmadı...',
        'Inverter klima artık energy efficient çalışıyor...',
        'Multi split sistemi harika, her oda ayrı kontrol...',
        'Gaz dolumu perfect, soğutma performansı geri geldi...',
        
        // Elektronik Yorumları - Kısa & Noktalı
        'iPhone ekranı yepyeni gibi, dokunmatik hassas...',
        'PlayStation tamiri süper, lag problemi tamamen...',
        'iPad Pro tamiri başarılı, Apple Pencil çalışıyor...',
        'Galaxy S24 kamera sorunu tamamen çözüldü...',
        'Apple Watch tamiri perfect, battery life uzun...',
        'Kulaklık ses kalitesi geri geldi, bass muhteşem...',
        'Tablet ekran tamiri başarılı, çok net görüntü...',
        'Konsol fan temizliği perfect, artık sessiz...',
        
        // Genel Memnuniyet - Kısa & Noktalı
        'Hizmet kalitesi A+, kesinlikle tavsiye ederim...',
        'Teknisyen çok bilgili, gerçekten işini biliyor...',
        'Zamanında geldi, çok hızlı çözüm buldu...',
        'Fiyat-performans mükemmel, çok uygun fiyat...',
        'Garantili hizmet, güvenle tercih edebilirsiniz...',
        'Problem tamamen çözüldü, çok memnunum...',
        'Profesyonel ekip, kaliteli malzeme kullanıyor...',
        'İkinci kez hizmet alıyorum, yine mükemmel...',
        'Müşteri hizmetleri de çok iyi, çok anlayışlı...',
        'Randevu sistemi kolay, esnek saatler mevcut...',
        'Ödeme seçenekleri uygun, taksit imkanı var...',
        'Servis sonrası takip yapıyorlar, çok caring...',
        'Usta çok deneyimli, işi hızlı ve temiz yapıyor...',
        'Malzeme kalitesi yüksek, orijinal parça kullanıyor...'
    ];
    
    // Bildirimleri güncelle
    if (notifications) {
        console.log('✅ Found notifications container');
        const randomService = services[Math.floor(Math.random() * services.length)];
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];
        const randomTime = timeAgo[Math.floor(Math.random() * timeAgo.length)];
        
        const div = document.createElement('div');
        div.className = 'bg-white/10 border-l-4 border-green-400 p-3 text-white text-sm rounded-r-lg shadow-lg mb-2 transform opacity-0 scale-95 transition-all duration-300';
        div.innerHTML = 
            '<div class="font-semibold">' + randomService + '</div>' +
            '<div class="text-green-200 text-xs">' + randomLocation + ' • ' + randomTime + '</div>';
        
        // YENİ İÇERİK EN ÜSTTE GÖRÜNSÜN
        if (notifications.firstChild) {
            notifications.insertBefore(div, notifications.firstChild);
        } else {
            notifications.appendChild(div);
        }
        
        // Animasyon için
        setTimeout(function() {
            div.style.opacity = '1';
            div.style.transform = 'scale(1)';
        }, 50);
        
        // Maximum 5 bildirim tut
        while (notifications.children.length > 5) {
            notifications.removeChild(notifications.lastChild);
        }
        console.log('✅ Added new notification:', randomService);
    } else {
        console.log('❌ liveNotifications container not found!');
    }
    
    // Yorumları güncelle
    if (comments) {
        console.log('✅ Found comments container');
        const randomName = customerNames[Math.floor(Math.random() * customerNames.length)];
        const randomComment = customerComments[Math.floor(Math.random() * customerComments.length)];
        
        const div = document.createElement('div');
        div.className = 'bg-white/10 p-3 text-white text-sm rounded-lg shadow-lg mb-2 transform opacity-0 scale-95 transition-all duration-300';
        // Rastgele yıldız sayısı (4 veya 5 yıldız)
        const starCount = Math.random() < 0.7 ? 5 : 4; // %70 ihtimalle 5 yıldız, %30 ihtimalle 4 yıldız
        const stars = '⭐'.repeat(starCount);
        
        div.innerHTML = 
            '<div class="font-medium">' + randomName + '</div>' +
            '<div class="text-yellow-400 text-sm my-1">' + stars + '</div>' +
            '<div class="text-blue-200 text-xs">' + randomComment + '</div>' +
            '<div class="text-green-300 text-xs mt-1 flex items-center">' +
                '<i class="fas fa-check-circle mr-1"></i>' +
                'Doğrulanmış Kullanıcı' +
            '</div>';
        
        // YENİ YORUM EN ÜSTTE GÖRÜNSÜN  
        if (comments.firstChild) {
            comments.insertBefore(div, comments.firstChild);
        } else {
            comments.appendChild(div);
        }
        
        // Animasyon için
        setTimeout(function() {
            div.style.opacity = '1';
            div.style.transform = 'scale(1)';
        }, 50);
        
        // Maximum 5 yorum tut
        while (comments.children.length > 5) {
            comments.removeChild(comments.lastChild);
        }
        console.log('✅ Added new comment:', randomName);
    } else {
        console.log('❌ liveComments container not found!');
    }
}

// ==========================================
// DİNAMİK GÜVENLİK GARANTİLERİ SİSTEMİ
// ==========================================

// Dinamik güvenlik garantileri verisi
function updateSecurityGuarantees() {
    const securityData = [
        {
            icon: 'fas fa-tools',
            title: 'IŞÇILIK GARANTISI',
            detail: '6 ay garanti',
            color: 'text-blue-300'
        },
        {
            icon: 'fas fa-shield-check',
            title: 'ÖDEME GÜVENCESI',
            detail: '24 saat koruma',
            color: 'text-green-300'
        },
        {
            icon: 'fas fa-medal',
            title: 'KALİTE GARANTISI',
            detail: 'A+ sertifikali',
            color: 'text-amber-300'
        },
        {
            icon: 'fas fa-headset',
            title: 'DESTEK GARANTISI',
            detail: '7/24 yardım',
            color: 'text-purple-300'
        },
        {
            icon: 'fas fa-clock',
            title: 'SÜRE GARANTISI',
            detail: 'Zamanında teslimat',
            color: 'text-cyan-300'
        },
        {
            icon: 'fas fa-certificate',
            title: 'UZMAN GARANTISI',
            detail: 'Sertifikalı teknisyen',
            color: 'text-orange-300'
        },
        {
            icon: 'fas fa-undo',
            title: 'İADE GARANTISI',
            detail: 'Koşulsuz iade',
            color: 'text-pink-300'
        }
    ];
    
    const securityIcon = document.getElementById('securityIcon');
    const securityTitle = document.getElementById('securityTitle');
    const securityDetail = document.getElementById('securityDetail');
    
    if (securityIcon && securityTitle && securityDetail) {
        const randomSecurity = securityData[Math.floor(Math.random() * securityData.length)];
        
        // Icon ve rengi güncelle
        securityIcon.className = randomSecurity.icon + ' ' + randomSecurity.color + ' mr-1 text-xs';
        
        // Başlık güncelle
        securityTitle.textContent = randomSecurity.title;
        
        // Detay güncelle
        securityDetail.textContent = randomSecurity.detail;
        
        console.log('🛡️ Updated security guarantee:', randomSecurity.title);
    }
}

// Export to global scope
window.updateLiveNotifications = updateLiveNotifications;
window.updateSecurityGuarantees = updateSecurityGuarantees;

// Auto-start when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready, starting slider...');
    setTimeout(startSlider, 1000);
    
    console.log('🚀 Starting live notifications system...');
    // İlk güncellemeyi hemen başlat
    setTimeout(updateLiveNotifications, 2000);
    
    // Her 3 saniyede bir güncelle  
    setInterval(updateLiveNotifications, 3000);
    
    console.log('🛡️ Starting dynamic security guarantees...');
    // İlk güvenlik garantisi güncellemesi
    setTimeout(updateSecurityGuarantees, 1500);
    
    // Her 4 saniyede bir güvenlik garantilerini güncelle
    setInterval(updateSecurityGuarantees, 4000);
});
`, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache'
    }
  })
})

export default app
