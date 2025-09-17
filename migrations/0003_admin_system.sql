-- Admin System Migration
-- Admin users table
CREATE TABLE IF NOT EXISTS admin_kullanicilari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_adi TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    sifre_hash TEXT NOT NULL,
    ad_soyad TEXT NOT NULL,
    yetki_seviyesi INTEGER DEFAULT 1, -- 1: Normal Admin, 2: Super Admin
    aktif BOOLEAN DEFAULT TRUE,
    son_giris DATETIME,
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_oturumlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    ip_adresi TEXT,
    user_agent TEXT,
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    son_aktivite DATETIME DEFAULT CURRENT_TIMESTAMP,
    aktif BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (admin_id) REFERENCES admin_kullanicilari(id)
);

-- Payment approval logs table  
CREATE TABLE IF NOT EXISTS odeme_onay_loglari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    odeme_id INTEGER NOT NULL,
    admin_id INTEGER NOT NULL,
    onceki_durum TEXT NOT NULL,
    yeni_durum TEXT NOT NULL,
    aciklama TEXT,
    islem_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (odeme_id) REFERENCES odeme_islemleri(id),
    FOREIGN KEY (admin_id) REFERENCES admin_kullanicilari(id)
);

-- Insert default admin user
INSERT OR IGNORE INTO admin_kullanicilari (kullanici_adi, email, sifre_hash, ad_soyad, yetki_seviyesi) 
VALUES ('admin', 'admin@tvservis.com', 'temp_password', 'Sistem Yöneticisi', 2);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_oturumlar_token ON admin_oturumlar(token);
CREATE INDEX IF NOT EXISTS idx_admin_oturumlar_admin_id ON admin_oturumlar(admin_id);
CREATE INDEX IF NOT EXISTS idx_odeme_onay_loglari_odeme_id ON odeme_onay_loglari(odeme_id);