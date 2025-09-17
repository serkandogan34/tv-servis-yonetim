-- Faz 1: Bayi Authentication ve Ödeme Sistemi Tabloları
-- TV Servis Yönetim Sistemi - Veritabanı Güncellemeleri

-- 1. Bayiler tablosuna authentication ve kredi kolonları ekleme
ALTER TABLE bayiler ADD COLUMN login_email TEXT;
ALTER TABLE bayiler ADD COLUMN password_hash TEXT;
ALTER TABLE bayiler ADD COLUMN kredi_bakiye REAL DEFAULT 0.0;
ALTER TABLE bayiler ADD COLUMN aktif_login INTEGER DEFAULT 1;
ALTER TABLE bayiler ADD COLUMN son_giris DATETIME;

-- 2. İş talepleri tablosuna satın alma bilgileri ekleme
ALTER TABLE is_talepleri ADD COLUMN satin_alan_bayi_id INTEGER;
ALTER TABLE is_talepleri ADD COLUMN satin_alma_tarihi DATETIME;
ALTER TABLE is_talepleri ADD COLUMN satin_alma_fiyati REAL;
ALTER TABLE is_talepleri ADD COLUMN goruntuleme_durumu TEXT DEFAULT 'kısıtlı';
ALTER TABLE is_talepleri ADD COLUMN is_fiyati REAL DEFAULT 50.0;

-- Foreign key constraints
-- ALTER TABLE is_talepleri ADD CONSTRAINT fk_satin_alan_bayi 
--   FOREIGN KEY (satin_alan_bayi_id) REFERENCES bayiler(id);

-- 3. Ödeme İşlemleri Tablosu
CREATE TABLE IF NOT EXISTS odeme_islemleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bayi_id INTEGER NOT NULL,
  is_talep_id INTEGER,
  odeme_turu TEXT NOT NULL, -- 'kredi_karti', 'havale', 'kredi_yukleme'
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

-- 4. Kredi Hareketleri Tablosu
CREATE TABLE IF NOT EXISTS kredi_hareketleri (
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

-- 5. Bayi Session Yönetimi
CREATE TABLE IF NOT EXISTS bayi_sessions (
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

-- 6. Sistem Ayarları Tablosu
CREATE TABLE IF NOT EXISTS sistem_ayarlari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anahtar TEXT UNIQUE NOT NULL,
  deger TEXT NOT NULL,
  aciklama TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index'ler ekleme
CREATE UNIQUE INDEX IF NOT EXISTS idx_bayiler_email_unique ON bayiler(login_email);
CREATE INDEX IF NOT EXISTS idx_bayiler_aktif_login ON bayiler(aktif_login);
CREATE INDEX IF NOT EXISTS idx_is_talepleri_satin_alan ON is_talepleri(satin_alan_bayi_id);
CREATE INDEX IF NOT EXISTS idx_is_talepleri_goruntuleme ON is_talepleri(goruntuleme_durumu);
CREATE INDEX IF NOT EXISTS idx_odeme_islemleri_bayi ON odeme_islemleri(bayi_id);
CREATE INDEX IF NOT EXISTS idx_odeme_islemleri_durum ON odeme_islemleri(durum);
CREATE INDEX IF NOT EXISTS idx_kredi_hareketleri_bayi ON kredi_hareketleri(bayi_id);
CREATE INDEX IF NOT EXISTS idx_bayi_sessions_token ON bayi_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_bayi_sessions_bayi ON bayi_sessions(bayi_id);
CREATE INDEX IF NOT EXISTS idx_sistem_ayarlari_anahtar ON sistem_ayarlari(anahtar);