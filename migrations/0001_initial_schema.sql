-- TV Servis Yönetim Sistemi - Ana Veritabanı Şeması
-- 81 İl TV Servis ve İş Dağıtım Sistemi

-- İller ve İlçeler Tablosu
CREATE TABLE IF NOT EXISTS iller (
  id INTEGER PRIMARY KEY,
  il_kodu INTEGER UNIQUE NOT NULL,
  il_adi TEXT NOT NULL,
  bolge TEXT NOT NULL,
  aktif INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ilceler (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  il_id INTEGER NOT NULL,
  ilce_adi TEXT NOT NULL,
  aktif INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (il_id) REFERENCES iller(id)
);

-- Bayiler/Servisler Tablosu
CREATE TABLE IF NOT EXISTS bayiler (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bayi_kodu TEXT UNIQUE NOT NULL,
  firma_adi TEXT NOT NULL,
  yetkili_adi TEXT NOT NULL,
  telefon TEXT NOT NULL,
  email TEXT,
  adres TEXT NOT NULL,
  il_id INTEGER NOT NULL,
  ilce_id INTEGER,
  uzmanlik_alani TEXT, -- TV marka/modelleri
  aktif INTEGER DEFAULT 1,
  rating REAL DEFAULT 5.0,
  tamamlanan_is_sayisi INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (il_id) REFERENCES iller(id),
  FOREIGN KEY (ilce_id) REFERENCES ilceler(id)
);

-- Müşteriler Tablosu
CREATE TABLE IF NOT EXISTS musteriler (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ad_soyad TEXT NOT NULL,
  telefon TEXT NOT NULL,
  email TEXT,
  adres TEXT NOT NULL,
  il_id INTEGER NOT NULL,
  ilce_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (il_id) REFERENCES iller(id),
  FOREIGN KEY (ilce_id) REFERENCES ilceler(id)
);

-- Servis Türleri
CREATE TABLE IF NOT EXISTS servis_turleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tur_adi TEXT NOT NULL,
  aciklama TEXT,
  ortalama_sure INTEGER, -- dakika cinsinden
  ortalama_fiyat REAL,
  aktif INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- İş Talepleri (Ana Todo Sistemi)
CREATE TABLE IF NOT EXISTS is_talepleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  talep_kodu TEXT UNIQUE NOT NULL,
  musteri_id INTEGER NOT NULL,
  servis_turu_id INTEGER NOT NULL,
  aciklama TEXT NOT NULL,
  telefon_numarasi TEXT,
  tv_marka TEXT,
  tv_model TEXT,
  sorun_aciklama TEXT,
  oncelik TEXT DEFAULT 'normal', -- yüksek, normal, düşük
  durum TEXT DEFAULT 'yeni', -- yeni, atandı, devam_ediyor, tamamlandı, iptal
  kaynak TEXT DEFAULT 'form', -- whatsapp, form, telefon, n8n
  bayi_id INTEGER,
  atama_tarihi DATETIME,
  tamamlanma_tarihi DATETIME,
  fiyat REAL,
  notlar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (musteri_id) REFERENCES musteriler(id),
  FOREIGN KEY (servis_turu_id) REFERENCES servis_turleri(id),
  FOREIGN KEY (bayi_id) REFERENCES bayiler(id)
);

-- N8N Webhook Logları
CREATE TABLE IF NOT EXISTS n8n_webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_type TEXT NOT NULL, -- whatsapp, form
  payload TEXT, -- JSON data
  processed INTEGER DEFAULT 0,
  is_talep_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (is_talep_id) REFERENCES is_talepleri(id)
);

-- İş Geçmişi ve Durum Değişiklikleri
CREATE TABLE IF NOT EXISTS is_gecmisi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  is_talep_id INTEGER NOT NULL,
  eski_durum TEXT,
  yeni_durum TEXT NOT NULL,
  aciklama TEXT,
  degistiren TEXT, -- kim değiştirdi
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (is_talep_id) REFERENCES is_talepleri(id)
);

-- İstatistikler ve Raporlama için Index'ler
CREATE INDEX IF NOT EXISTS idx_bayiler_il ON bayiler(il_id);
CREATE INDEX IF NOT EXISTS idx_bayiler_aktif ON bayiler(aktif);
CREATE INDEX IF NOT EXISTS idx_musteriler_il ON musteriler(il_id);
CREATE INDEX IF NOT EXISTS idx_is_talepleri_durum ON is_talepleri(durum);
CREATE INDEX IF NOT EXISTS idx_is_talepleri_bayi ON is_talepleri(bayi_id);
CREATE INDEX IF NOT EXISTS idx_is_talepleri_tarih ON is_talepleri(created_at);
CREATE INDEX IF NOT EXISTS idx_ilceler_il ON ilceler(il_id);
CREATE INDEX IF NOT EXISTS idx_n8n_processed ON n8n_webhooks(processed);