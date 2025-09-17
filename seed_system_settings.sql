-- Sistem Ayarları - Varsayılan Değerler

INSERT OR IGNORE INTO sistem_ayarlari (anahtar, deger, aciklama) VALUES 
('varsayilan_is_fiyati', '50.0', 'Yeni işlerin varsayılan fiyatı (TL)'),
('minimum_kredi_yukleme', '100.0', 'Minimum kredi yükleme tutarı (TL)'),
('havale_hesap_no', '1234567890', 'Havale için hesap numarası'),
('havale_iban', 'TR123456789012345678901234', 'Havale için IBAN numarası'),
('havale_hesap_sahibi', 'TV Servis Yönetim A.Ş.', 'Havale için hesap sahibi adı'),
('paytr_merchant_id', '', 'PayTR Merchant ID (production için doldurulacak)'),
('paytr_merchant_key', '', 'PayTR Merchant Key (production için doldurulacak)'),
('paytr_merchant_salt', '', 'PayTR Merchant Salt (production için doldurulacak)'),
('jwt_secret', 'tv-servis-super-secret-key-2025', 'JWT token için secret key'),
('session_expire_hours', '24', 'Bayi session süresi (saat)'),
('max_login_attempts', '5', 'Maksimum başarısız giriş denemesi'),
('lockout_duration_minutes', '30', 'Hesap kilitleme süresi (dakika)');

-- Mevcut bayiler için örnek login bilgileri ekleme (test için)
-- Şifre: "123456" (bcrypt hash'i: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi)
UPDATE bayiler SET 
  login_email = LOWER(REPLACE(firma_adi, ' ', '') || '@tvservis.com'),
  password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  kredi_bakiye = 500.0
WHERE login_email IS NULL;

-- Örnek test bayilerinin email'lerini düzenle
UPDATE bayiler SET login_email = 'teknolojitv@tvservis.com' WHERE bayi_kodu = 'IST001';
UPDATE bayiler SET login_email = 'baskentelektronik@tvservis.com' WHERE bayi_kodu = 'ANK001';
UPDATE bayiler SET login_email = 'egetv@tvservis.com' WHERE bayi_kodu = 'IZM001';
UPDATE bayiler SET login_email = 'marmaraservis@tvservis.com' WHERE bayi_kodu = 'BUR001';
UPDATE bayiler SET login_email = 'akdeniztek@tvservis.com' WHERE bayi_kodu = 'ANT001';
UPDATE bayiler SET login_email = 'guneydoguelectronics@tvservis.com' WHERE bayi_kodu = 'GAZ001';
UPDATE bayiler SET login_email = 'karadeniztv@tvservis.com' WHERE bayi_kodu = 'TRB001';
UPDATE bayiler SET login_email = 'doguservis@tvservis.com' WHERE bayi_kodu = 'ERS001';