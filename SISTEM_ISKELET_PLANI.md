# TV Servis Yönetim Sistemi - Sistem İskelet Planı

## 📋 **PROJE GENEL BAKIŞ**

### **Mevcut Durum:**
- Yönetici dashboard'u mevcut
- 81 il veritabanı hazır
- N8N webhook entegrasyonu var
- Temel iş takip sistemi çalışıyor

### **Hedef Sistem:**
- **Dual Dashboard:** Admin + Bayi panelleri
- **İş Satış Sistemi:** Bayiler işleri satın alabilir
- **Ödeme Entegrasyonu:** Kredi kartı (PayTR) + Havale
- **Kısıtlı Görünüm:** Ödeme öncesi kısıtlı, sonrası tam bilgi
- **İl Bazlı Filtreleme:** Her bayi sadece kendi ilini görür

---

## 📊 **VERİTABANI İSKELETİ**

### **Mevcut Tabloların Güncellenmesi:**

#### **bayiler tablosu - Eklemeler:**
```sql
ALTER TABLE bayiler ADD COLUMN login_email TEXT UNIQUE;
ALTER TABLE bayiler ADD COLUMN password_hash TEXT;
ALTER TABLE bayiler ADD COLUMN kredi_bakiye REAL DEFAULT 0.0;
ALTER TABLE bayiler ADD COLUMN aktif_login INTEGER DEFAULT 1;
ALTER TABLE bayiler ADD COLUMN son_giris DATETIME;
ALTER TABLE bayiler ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

#### **is_talepleri tablosu - Eklemeler:**
```sql
ALTER TABLE is_talepleri ADD COLUMN satin_alan_bayi_id INTEGER;
ALTER TABLE is_talepleri ADD COLUMN satin_alma_tarihi DATETIME;
ALTER TABLE is_talepleri ADD COLUMN satin_alma_fiyati REAL;
ALTER TABLE is_talepleri ADD COLUMN goruntuleme_durumu TEXT DEFAULT 'kısıtlı';
ALTER TABLE is_talepleri ADD COLUMN is_fiyati REAL DEFAULT 50.0;
```

### **Yeni Tablolar:**

#### **1. Ödeme İşlemleri:**
```sql
CREATE TABLE odeme_islemleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bayi_id INTEGER NOT NULL,
  is_talep_id INTEGER,
  odeme_turu TEXT NOT NULL, -- 'kredi_karti', 'havale', 'kredi_yükleme'
  tutar REAL NOT NULL,
  durum TEXT DEFAULT 'beklemede', -- 'tamamlandi', 'iptal', 'beklemede'
  paytr_merchant_oid TEXT,
  paytr_payment_id TEXT,
  havale_referans TEXT,
  havale_aciklama TEXT,
  admin_onay INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bayi_id) REFERENCES bayiler(id),
  FOREIGN KEY (is_talep_id) REFERENCES is_talepleri(id)
);
```

#### **2. Kredi Hareketleri:**
```sql
CREATE TABLE kredi_hareketleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bayi_id INTEGER NOT NULL,
  hareket_turu TEXT NOT NULL, -- 'yükleme', 'harcama', 'iade'
  tutar REAL NOT NULL,
  onceki_bakiye REAL NOT NULL,
  yeni_bakiye REAL NOT NULL,
  aciklama TEXT,
  odeme_id INTEGER,
  is_talep_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bayi_id) REFERENCES bayiler(id),
  FOREIGN KEY (odeme_id) REFERENCES odeme_islemleri(id),
  FOREIGN KEY (is_talep_id) REFERENCES is_talepleri(id)
);
```

#### **3. Bayi Session Yönetimi:**
```sql
CREATE TABLE bayi_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bayi_id INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_adres TEXT,
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  aktif INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bayi_id) REFERENCES bayiler(id)
);
```

#### **4. Sistem Ayarları:**
```sql
CREATE TABLE sistem_ayarlari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anahtar TEXT UNIQUE NOT NULL,
  deger TEXT NOT NULL,
  aciklama TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Varsayılan ayarlar
INSERT INTO sistem_ayarlari (anahtar, deger, aciklama) VALUES 
('varsayilan_is_fiyati', '50.0', 'Yeni işlerin varsayılan fiyatı'),
('minimum_kredi_yukleme', '100.0', 'Minimum kredi yükleme tutarı'),
('havale_hesap_no', '', 'Havale için hesap numarası'),
('paytr_merchant_id', '', 'PayTR Merchant ID'),
('paytr_merchant_key', '', 'PayTR Merchant Key');
```

---

## 🎨 **FRONTEND İSKELETİ**

### **1. Yönetici Paneli (Mevcut + Güncellemeler)**

#### **Mevcut Sayfalar (Güncellenecek):**
- `/` - Dashboard (+ ödeme istatistikleri)
- `/jobs` - İş yönetimi (+ fiyat belirleme)
- `/dealers` - Bayi yönetimi (+ kredi yönetimi)

#### **Yeni Admin Sayfalar:**
- `/admin/payments` - Ödeme takibi ve onayları
- `/admin/transfers` - Havale onay bekleyenleri
- `/admin/credits` - Kredi yükleme istekleri
- `/admin/settings` - Sistem ayarları (fiyatlar, hesap bilgileri)

### **2. Bayi Paneli (Tamamen Yeni)**

#### **Bayi Sayfaları:**
```
/bayi/login              → Bayi giriş sayfası
/bayi/dashboard          → Bayi ana sayfa (istatistikler)
/bayi/jobs              → Mevcut işler (il bazlı, kısıtlı görünüm)
/bayi/my-jobs           → Satın aldığı işler (tam bilgi)
/bayi/credits           → Kredi bakiye ve yükleme
/bayi/payments          → Ödeme geçmişi
/bayi/profile           → Profil ayarları ve şifre değiştirme
```

---

## 🔧 **BACKEND API İSKELETİ**

### **Admin API (Mevcut + Yeni Endpoint'ler)**

#### **Mevcut API'ler (Güncellenecek):**
```
GET  /api/dashboard/stats        → + ödeme istatistikleri
GET  /api/jobs/active           → + fiyat bilgileri
GET  /api/dealers               → + kredi bakiye bilgileri
```

#### **Yeni Admin API'ler:**
```
GET  /api/admin/payments         → Tüm ödeme işlemleri
POST /api/admin/approve-transfer → Havale onayı
POST /api/admin/reject-transfer  → Havale reddi
POST /api/admin/set-job-price   → İş fiyat belirleme
GET  /api/admin/credit-requests → Kredi yükleme istekleri
POST /api/admin/add-dealer-credit → Bayiye kredi ekleme
GET  /api/admin/settings        → Sistem ayarları
POST /api/admin/update-settings → Ayar güncelleme
```

### **Bayi API (Tamamen Yeni)**

#### **Authentication:**
```
POST /api/bayi/login            → Bayi girişi
POST /api/bayi/logout           → Çıkış yapma
GET  /api/bayi/profile          → Profil bilgileri
POST /api/bayi/update-profile   → Profil güncelleme
POST /api/bayi/change-password  → Şifre değiştirme
```

#### **İş Yönetimi:**
```
GET  /api/bayi/jobs            → İl bazlı işler (kısıtlı bilgi)
GET  /api/bayi/job/:id         → İş detayı (kısıtlı/tam)
POST /api/bayi/buy-job/:id     → İş satın alma
GET  /api/bayi/my-jobs         → Satın aldığı işler (tam bilgi)
```

#### **Kredi ve Ödeme:**
```
GET  /api/bayi/credits         → Kredi bakiyesi ve geçmiş
POST /api/bayi/add-credit      → Kredi yükleme başlatma
GET  /api/bayi/payments        → Ödeme geçmişi
POST /api/bayi/transfer-notify → Havale bildirimi
```

### **Ödeme API (Tamamen Yeni)**

#### **PayTR Entegrasyonu:**
```
POST /api/payment/paytr/init     → PayTR ödeme başlatma
POST /api/payment/paytr/callback → PayTR callback
GET  /api/payment/paytr/success  → Başarılı ödeme sayfası
GET  /api/payment/paytr/failed   → Başarısız ödeme sayfası
```

#### **Havale Sistemi:**
```
POST /api/payment/transfer/notify   → Havale bildirimi
GET  /api/payment/transfer/status   → Havale durumu sorgulama
```

---

## 🔐 **GÜVENLİK İSKELETİ**

### **Authentication Sistemi:**
- **JWT Token:** Bayi session yönetimi
- **Password Hashing:** bcrypt ile şifre hashleme
- **Session Management:** Otomatik logout, token yenileme
- **IP Tracking:** Güvenlik logları

### **İş Satın Alma Güvenliği:**
- **Race Condition Koruması:** İlk alan alır garantisi
- **Double Payment Koruması:** Aynı işe çift ödeme engeli
- **Transaction Integrity:** Atomik ödeme işlemleri

### **API Güvenliği:**
- **Rate Limiting:** API çağrı sınırları
- **Input Validation:** Tüm girdi kontrolleri
- **SQL Injection Koruması:** Prepared statements

---

## 💰 **ÖDEME SİSTEMİ İSKELETİ**

### **1. Kredi Kartı Ödemeleri (PayTR):**
```
Akış: Bayi → PayTR → Callback → Kredi Yükleme
Entegrasyon: REST API
Güvenlik: Hash kontrolü, merchant validation
```

### **2. Havale Ödemeleri:**
```
Akış: Bayi Bildirimi → Admin Onayı → Kredi Yükleme
Manuel Kontrol: Admin panelinde onay/red
Takip: Referans numarası ile eşleştirme
```

### **3. Kredi Sistemi:**
```
Bakiye Yönetimi: Real-time bakiye takibi
Harcama: İş satın alma sırasında kesinti
Geçmiş: Tüm kredi hareketlerinin loglanması
```

---

## 📱 **KULLANICI DENEYİMİ İSKELETİ**

### **Bayi İş Akışı:**
```
1. Login → Bayi Dashboard
2. "İşler" sekmesi → Sadece kendi ilindeki işler
3. İş detayı → Kısıtlı bilgiler (sorun, cihaz, genel lokasyon)
4. "Satın Al" butonu → Ödeme modalı açılır
5. Ödeme seçimi → Kredi kartı veya mevcut bakiye
6. Ödeme tamamlandı → Tam bilgilere erişim
7. Müşteri bilgileri → Telefon, adres, detaylar
8. İletişim → Müşteri ile direkt kontak
```

### **Admin İş Akışı:**
```
1. N8N → Otomatik iş kaydı
2. Admin → İş fiyatı belirleme
3. Sistem → Bayilere görünür hale getirme
4. Bayi → İş satın alma
5. Admin → Ödeme takibi (havale onayları)
6. Sistem → Otomatik kredi yüklemeleri
```

---

## 🎯 **İSKELET UYGULAMA SIRASI**

### **Faz 1: Temel Altyapı (1-2 gün)**
- Veritabanı güncellemeleri
- Bayi authentication sistemi
- JWT token implementasyonu
- Temel bayi dashboard

### **Faz 2: İş Görüntüleme (1-2 gün)**
- İl bazlı iş filtreleme
- Kısıtlı/tam görünüm sistemi
- Bayi job listesi ve detayları
- Frontend bayi paneli

### **Faz 3: Ödeme Sistemi (2-3 gün)**
- PayTR entegrasyonu
- Kredi sistemi implementasyonu
- İş satın alma mekanizması
- Havale bildirimi sistemi

### **Faz 4: Admin Yönetimi (1-2 gün)**
- Admin ödeme takibi
- Havale onay sistemi
- Sistem ayarları paneli
- İstatistik güncellemeleri

### **Faz 5: Test ve Optimizasyon (1 gün)**
- End-to-end testler
- Güvenlik testleri
- Performance optimizasyonu
- Dokümantasyon

---

## 📊 **BAŞARI KRİTERLERİ**

### **Fonksiyonel:**
- ✅ Bayiler sadece kendi illerindeki işleri görebilir
- ✅ Ödeme yapmadan tam bilgi görülmez
- ✅ İlk ödeme yapan iş alır, diğerleri alamaz
- ✅ PayTR entegrasyonu çalışır
- ✅ Havale sistemi admin onayı ile işler

### **Teknik:**
- ✅ Sistem 7/24 çalışır durumda
- ✅ Race condition koruması aktif
- ✅ Güvenlik açığı bulunmaz
- ✅ API response time < 500ms
- ✅ Mobile responsive tasarım

### **İş:**
- ✅ N8N entegrasyonu sorunsuz çalışır
- ✅ Bayiler kolayca iş satın alabilir
- ✅ Admin kolayca sistem yönetebilir
- ✅ Ödeme süreçleri güvenilir işler

---

**📅 Tahmini Toplam Süre:** 7-10 gün  
**🎯 Hedef:** Tam otomatik iş satış sistemi  
**💡 Sonuç:** Ölçeklenebilir ve güvenilir platform