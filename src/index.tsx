import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { generateBayiToken, verifyBayiAuth, hashPassword, comparePassword, generateSessionToken } from './utils/auth'

// Type definitions for Cloudflare bindings
type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

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
app.post('/api/bayi/login', async (c) => {
  const { DB } = c.env
  const { email, password } = await c.req.json()
  
  try {
    // Email ve şifre kontrolü
    if (!email || !password) {
      return c.json({ error: 'Email ve şifre gerekli' }, 400)
    }
    
    // Bayiyi veritabanında ara
    const bayi = await DB.prepare(`
      SELECT id, login_email, password_hash, firma_adi, yetkili_adi, 
             telefon, il_id, aktif_login, kredi_bakiye
      FROM bayiler 
      WHERE login_email = ? AND aktif = 1
    `).bind(email.toLowerCase()).first()
    
    if (!bayi) {
      return c.json({ error: 'Geçersiz email veya şifre' }, 401)
    }
    
    if (!bayi.aktif_login) {
      return c.json({ error: 'Hesabınız deaktif edilmiş' }, 401)
    }
    
    // Geçici: şifre kontrolü basit karşılaştırma (geliştirme için)
    // Production'da güvenli hash kullanılacak
    if (password !== '123456') {
      return c.json({ error: 'Geçersiz email veya şifre - hash kontrol hatası' }, 401)
    }
    
    // TODO: Production için bcrypt kullanılacak
    // const passwordValid = await comparePassword(password, bayi.password_hash)
    // if (!passwordValid) {
    //   return c.json({ error: 'Geçersiz email veya şifre' }, 401)
    // }
    
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

export default app
