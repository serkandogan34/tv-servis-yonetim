# TV Servis Yönetim Sistemi

## 🎯 Proje Özeti
Türkiye'nin 81 ili için TV servis talep yönetim sistemi. N8N webhook entegrasyonu ile otomatik iş akışı.

## ✅ Özellikler
- **Müşteri Talep Formu** - Online servis talep sistemi
- **N8N Webhook Entegrasyonu** - Otomatik workflow tetikleme  
- **SQLite Database** - Talep takip sistemi
- **Responsive Design** - Mobil uyumlu arayüz
- **Real-time Notifications** - Canlı bildirim sistemi

## 🚀 Deployment

### Coolify Deployment
1. **GitHub Repository** bağlantısı kur
2. **Environment Variables** ayarla:
   ```env
   N8N_WEBHOOK_URL=https://n8nwork.dtekai.com/webhook/04c07c0a-774f-4309-9437-9fed7a88cfcf
   NODE_ENV=production
   PORT=3000
   DATABASE_PATH=/app/data/database.sqlite
   ```
3. **Build Command**: `npm run build`
4. **Start Command**: `npm run start:prod`

### Cloudflare Pages Deployment  
1. `npm run build`
2. `wrangler pages deploy dist`

## 🔧 Teknoloji Stack
- **Backend**: Hono.js Framework
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Vanilla JS + TailwindCSS
- **Deployment**: Coolify / Cloudflare Pages
- **Integration**: N8N Webhook

## 📊 API Endpoints
- `POST /api/service-request` - Yeni servis talebi
- `GET /` - Ana sayfa
- `GET /sss` - SSS sayfası

## 🗄️ Database Schema
```sql
service_requests (
  id, request_code, customer_name, customer_phone,
  customer_city, service_category, problem_description,
  n8n_sent, n8n_response, created_at
)
```

## 🔗 N8N Webhook Format
```json
{
  "requestCode": "GRT-1758916686711",
  "timestamp": "2025-09-26T19:50:07Z",
  "customer": {
    "name": "Müşteri Adı",
    "phone": "0532-123-4567",
    "city": "İstanbul"
  },
  "service": {
    "category": "tv-tamir",
    "description": "Problem açıklaması"
  },
  "source": "garantor360_website"
}
```

## ⚡ Quick Start
```bash
# Install dependencies
npm install

# Build application
npm run build

# Start production server
npm run start:prod

# Development mode
npm run dev:sandbox
```

## 📈 Status
- ✅ **Backend API**: Tamamen çalışıyor
- ✅ **N8N Webhook**: Aktif ve test edildi
- ✅ **Database**: SQLite entegrasyonu hazır
- ⚠️ **Frontend Form**: JavaScript optimizasyonu devam ediyor

## 🔧 Environment Variables
```env
# N8N Integration
N8N_WEBHOOK_URL=https://n8nwork.dtekai.com/webhook/04c07c0a-774f-4309-9437-9fed7a88cfcf

# Database  
DATABASE_PATH=/app/data/database.sqlite

# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

## 📝 Son Güncellemeler
- ✅ N8N production webhook entegrasyonu tamamlandı
- ✅ Türkçe karakter encoding sorunları çözüldü  
- ✅ Coolify deployment konfigürasyonu eklendi
- ✅ Node.js server adaptörü hazırlandı