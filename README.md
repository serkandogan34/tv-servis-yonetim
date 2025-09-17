# TV Servis Yönetim Sistemi

## Proje Genel Bakış
- **İsim**: TV Servis Yönetim Sistemi  
- **Amaç**: 81 ilde anlaşmalı TV servislerine iş dağıtımı ve müşteri eşleştirme sistemi
- **Özellikler**: Todo/iş takibi, bayi yönetimi, N8N entegrasyonu, WhatsApp/form desteği

## URL'ler
- **Geliştirme**: https://3000-i9quaqabu83e1ygd769z4-6532622b.e2b.dev
- **GitHub**: https://github.com/username/tv-servis-yonetim (henüz yüklenmedi)

## Veri Mimarisi
- **Veri Modelleri**: 
  - İller/İlçeler (81 il tam listesi)
  - Bayiler (servis sağlayıcıları) 
  - Müşteriler
  - İş Talepleri (todo sistemi)
  - Servis Türleri
  - N8N Webhook Logları
  - İş Geçmişi
- **Depolama Servisleri**: Cloudflare D1 SQLite (ilişkisel veritabanı)
- **Veri Akışı**: N8N → Webhook → İş Talebi → Bayi Ataması → Takip

## Kullanıcı Rehberi

### Dashboard
- Genel istatistikleri görüntüleme
- Son 7 gün iş grafiği
- İl bazında iş dağılımı
- Aktif/tamamlanan iş sayıları

### İş Yönetimi
- Aktif işleri listeleme
- Öncelik bazlı sıralama (yüksek/normal/düşük)
- İş detayları görüntüleme
- Bayi ataması yapma

### Bayi Yönetimi
- 81 il bazında bayi listeleme
- Bayi detayları ve iletişim bilgileri
- Rating ve iş geçmişi
- Uzmanlık alanları

### N8N Entegrasyonu
- WhatsApp webhook: `/api/webhook/whatsapp`
- Form webhook: `/api/webhook/form`
- Otomatik iş talebi oluşturma (geliştiriliyor)

## Deployment
- **Platform**: Cloudflare Pages (geliştirme aşamasında)
- **Durum**: ✅ Aktif (lokal geliştirme)
- **Teknoloji**: Hono + TypeScript + TailwindCSS + Cloudflare D1
- **Son Güncelleme**: 2025-09-17

## Tamamlanan Özellikler
- ✅ Veritabanı şeması ve 81 il verisi
- ✅ Bayi/servis yönetim sistemi
- ✅ İş takip ve todo sistemi  
- ✅ Dashboard ve istatistikler
- ✅ N8N webhook endpoints
- ✅ Temel frontend arayüz

## Geliştirme Aşamasındaki Özellikler
- 🔄 Müşteri talep formu ve yönetim paneli
- ⏳ Lokasyon bazlı otomatik servis eşleştirme
- ⏳ İş satış/dağıtım paneli ve bayi dashboard
- ⏳ WhatsApp ve form verisi otomatik işleme
- ⏳ Gelişmiş raporlama ve analitik

## API Endpoints
- `GET /api/dashboard/stats` - Dashboard istatistikleri
- `GET /api/jobs/active` - Aktif işler
- `GET /api/dealers` - Bayiler (`?il_id=X` ile filtreleme)
- `GET /api/cities` - 81 il listesi
- `POST /api/jobs/:id/assign` - İş ataması
- `POST /api/webhook/whatsapp` - WhatsApp webhook
- `POST /api/webhook/form` - Form webhook

## Teknik Detaylar
- **Backend**: Hono framework (Cloudflare Workers uyumlu)
- **Frontend**: Vanilla JS + TailwindCSS
- **Veritabanı**: Cloudflare D1 (SQLite)
- **Geliştirme**: PM2 + Wrangler Pages Dev
- **Deployment**: Cloudflare Pages (prod hazır)