# 🔗 N8N Webhook Konfigürasyon Rehberi

## 📋 Mevcut Durum
- ✅ **Backend API**: Tam çalışır durumda
- ✅ **Database Integration**: Webhook tracking aktif
- ✅ **Error Handling**: Graceful fallback mekanizması
- ⚠️ **N8N Webhook**: Manuel konfigürasyon gerekli

## 🎯 N8N Workflow Konfigürasyonu

### 1. N8N Workflow'a Webhook Node Ekleyin

```
N8N Workflow URL: https://n8n-pro.beyazyakaai.com/workflow/xtiLEVWoCY8XBiO7

1. Workflow'u açın
2. "Add Node" > "Trigger" > "Webhook" seçin
3. Webhook Node ayarları:
   - HTTP Method: POST
   - Path: garantor360 (veya istediğiniz path)
   - Authentication: None
   - Response Mode: "On Received"
   - Response Code: 200
```

### 2. Webhook URL'ini Alın

Webhook node'u ekledikten sonra, N8N size şu formatta bir URL verecek:
```
https://n8n-pro.beyazyakaai.com/webhook/garantor360
```

### 3. Webhook URL'ini Sisteme Ekleyin

**Development (Local Test):**
```bash
# .dev.vars dosyasını güncelleyin:
N8N_WEBHOOK_URL=https://n8n-pro.beyazyakaai.com/webhook/garantor360
```

**Production:**
```bash
npx wrangler secret put N8N_WEBHOOK_URL --project-name tv-servis-yonetim
# Value: https://n8n-pro.beyazyakaai.com/webhook/garantor360
```

## 📦 Webhook Payload Formatı (Otomatik Gönderiliyor)

```json
{
  "requestCode": "GRT-1758914215540",
  "timestamp": "2025-09-26T19:16:55.536Z",
  "customer": {
    "name": "Müşteri Adı",
    "phone": "0533 555 77 99",
    "city": "İstanbul",
    "district": "Beşiktaş"
  },
  "service": {
    "category": "Hizmet Kategorisi",
    "description": "Problem açıklaması",
    "urgency": "normal"
  },
  "contactPreference": ["phone", "whatsapp"],
  "source": "garantor360_website"
}
```

## 🔄 N8N Workflow Önerilen Adımlar

1. **Webhook Trigger** (Yukarıda yapılandırıldı)
2. **Data Validation** (İsteğe bağlı)
3. **Service Provider Query** (Şehir/kategori bazlı bayi bulma)
4. **SMS/WhatsApp Notification** (Bayilere bildirim)
5. **Customer Response** (Müşteriye onay)

## 🧪 Test Prosedürü

### 1. Webhook URL Test:
```bash
curl -X POST "https://n8n-pro.beyazyakaai.com/webhook/garantor360" \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook test", "source": "manual"}'
```

### 2. Full Integration Test:
```bash
# Garantor360 formunu kullanarak test:
# https://your-app.dev/ - form doldur ve gönder
```

### 3. Database Verification:
```sql
SELECT request_code, n8n_sent, n8n_response 
FROM service_requests 
ORDER BY created_at DESC LIMIT 5;
```

## 📊 Success Indicators

- ✅ `n8n_sent = 1`
- ✅ `n8n_response` contains valid response data
- ✅ No "Webhook failed" errors in logs
- ✅ N8N workflow executes successfully

## 🚨 Troubleshooting

### Webhook 404 Error:
- N8N workflow'da webhook node'u aktif değil
- Webhook path yanlış (.dev.vars'daki URL kontrol edin)
- N8N instance erişilemiyor

### Webhook Timeout:
- N8N workflow çok uzun süren işlemler içeriyor
- Response timeout ayarını artırın

### Authentication Errors:
- N8N webhook authentication açık olabilir
- Webhook node'unda "Authentication: None" olduğunu kontrol edin

## 📞 Support

Entegrasyon tamamlandıktan sonra, sistem otomatik olarak:
1. Müşteri hizmet taleplerini alacak
2. N8N workflow'una gönderecek  
3. Webhook response'unu database'e kaydedecek
4. Müşteriye onay mesajı gönderecek

**Sistem hazır - sadece N8N webhook konfigürasyonu gerekli!** 🚀