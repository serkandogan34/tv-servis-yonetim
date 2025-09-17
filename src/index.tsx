import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

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

export default app
