-- Türkiye 81 İl Seed Data ve Test Veriler

-- 81 İl Verileri (İl Kodu ve Bölge Bilgileri ile)
INSERT OR IGNORE INTO iller (id, il_kodu, il_adi, bolge) VALUES
(1, 1, 'Adana', 'Akdeniz'),
(2, 2, 'Adıyaman', 'Güneydoğu Anadolu'),
(3, 3, 'Afyonkarahisar', 'Ege'),
(4, 4, 'Ağrı', 'Doğu Anadolu'),
(5, 5, 'Amasya', 'Karadeniz'),
(6, 6, 'Ankara', 'İç Anadolu'),
(7, 7, 'Antalya', 'Akdeniz'),
(8, 8, 'Artvin', 'Karadeniz'),
(9, 9, 'Aydın', 'Ege'),
(10, 10, 'Balıkesir', 'Marmara'),
(11, 11, 'Bilecik', 'Marmara'),
(12, 12, 'Bingöl', 'Doğu Anadolu'),
(13, 13, 'Bitlis', 'Doğu Anadolu'),
(14, 14, 'Bolu', 'Karadeniz'),
(15, 15, 'Burdur', 'Akdeniz'),
(16, 16, 'Bursa', 'Marmara'),
(17, 17, 'Çanakkale', 'Marmara'),
(18, 18, 'Çankırı', 'İç Anadolu'),
(19, 19, 'Çorum', 'Karadeniz'),
(20, 20, 'Denizli', 'Ege'),
(21, 21, 'Diyarbakır', 'Güneydoğu Anadolu'),
(22, 22, 'Edirne', 'Marmara'),
(23, 23, 'Elazığ', 'Doğu Anadolu'),
(24, 24, 'Erzincan', 'Doğu Anadolu'),
(25, 25, 'Erzurum', 'Doğu Anadolu'),
(26, 26, 'Eskişehir', 'İç Anadolu'),
(27, 27, 'Gaziantep', 'Güneydoğu Anadolu'),
(28, 28, 'Giresun', 'Karadeniz'),
(29, 29, 'Gümüşhane', 'Karadeniz'),
(30, 30, 'Hakkari', 'Doğu Anadolu'),
(31, 31, 'Hatay', 'Akdeniz'),
(32, 32, 'Isparta', 'Akdeniz'),
(33, 33, 'Mersin', 'Akdeniz'),
(34, 34, 'İstanbul', 'Marmara'),
(35, 35, 'İzmir', 'Ege'),
(36, 36, 'Kars', 'Doğu Anadolu'),
(37, 37, 'Kastamonu', 'Karadeniz'),
(38, 38, 'Kayseri', 'İç Anadolu'),
(39, 39, 'Kırklareli', 'Marmara'),
(40, 40, 'Kırşehir', 'İç Anadolu'),
(41, 41, 'Kocaeli', 'Marmara'),
(42, 42, 'Konya', 'İç Anadolu'),
(43, 43, 'Kütahya', 'Ege'),
(44, 44, 'Malatya', 'Doğu Anadolu'),
(45, 45, 'Manisa', 'Ege'),
(46, 46, 'Kahramanmaraş', 'Akdeniz'),
(47, 47, 'Mardin', 'Güneydoğu Anadolu'),
(48, 48, 'Muğla', 'Ege'),
(49, 49, 'Muş', 'Doğu Anadolu'),
(50, 50, 'Nevşehir', 'İç Anadolu'),
(51, 51, 'Niğde', 'İç Anadolu'),
(52, 52, 'Ordu', 'Karadeniz'),
(53, 53, 'Rize', 'Karadeniz'),
(54, 54, 'Sakarya', 'Marmara'),
(55, 55, 'Samsun', 'Karadeniz'),
(56, 56, 'Siirt', 'Güneydoğu Anadolu'),
(57, 57, 'Sinop', 'Karadeniz'),
(58, 58, 'Sivas', 'İç Anadolu'),
(59, 59, 'Tekirdağ', 'Marmara'),
(60, 60, 'Tokat', 'Karadeniz'),
(61, 61, 'Trabzon', 'Karadeniz'),
(62, 62, 'Tunceli', 'Doğu Anadolu'),
(63, 63, 'Şanlıurfa', 'Güneydoğu Anadolu'),
(64, 64, 'Uşak', 'Ege'),
(65, 65, 'Van', 'Doğu Anadolu'),
(66, 66, 'Yozgat', 'İç Anadolu'),
(67, 67, 'Zonguldak', 'Karadeniz'),
(68, 68, 'Aksaray', 'İç Anadolu'),
(69, 69, 'Bayburt', 'Karadeniz'),
(70, 70, 'Karaman', 'İç Anadolu'),
(71, 71, 'Kırıkkale', 'İç Anadolu'),
(72, 72, 'Batman', 'Güneydoğu Anadolu'),
(73, 73, 'Şırnak', 'Güneydoğu Anadolu'),
(74, 74, 'Bartın', 'Karadeniz'),
(75, 75, 'Ardahan', 'Doğu Anadolu'),
(76, 76, 'Iğdır', 'Doğu Anadolu'),
(77, 77, 'Yalova', 'Marmara'),
(78, 78, 'Karabük', 'Karadeniz'),
(79, 79, 'Kilis', 'Güneydoğu Anadolu'),
(80, 80, 'Osmaniye', 'Akdeniz'),
(81, 81, 'Düzce', 'Karadeniz');

-- Bazı örnek ilçeler (Ana illerden)
INSERT OR IGNORE INTO ilceler (il_id, ilce_adi) VALUES
-- İstanbul
(34, 'Kadıköy'), (34, 'Beşiktaş'), (34, 'Şişli'), (34, 'Bakırköy'), (34, 'Üsküdar'),
-- Ankara
(6, 'Çankaya'), (6, 'Keçiören'), (6, 'Yenimahalle'), (6, 'Mamak'), (6, 'Sincan'),
-- İzmir
(35, 'Konak'), (35, 'Karşıyaka'), (35, 'Bornova'), (35, 'Balçova'), (35, 'Buca'),
-- Bursa
(16, 'Osmangazi'), (16, 'Nilüfer'), (16, 'Yıldırım'), (16, 'Mudanya'), (16, 'Gemlik'),
-- Antalya
(7, 'Muratpaşa'), (7, 'Kepez'), (7, 'Konyaaltı'), (7, 'Aksu'), (7, 'Alanya');

-- Servis Türleri
INSERT OR IGNORE INTO servis_turleri (tur_adi, aciklama, ortalama_sure, ortalama_fiyat) VALUES
('TV Ekran Değişimi', 'TV ekranı kırık, değişim gerekli', 120, 800.00),
('TV Tamiri', 'Genel TV arıza tamiri', 60, 200.00),
('LED Ekran Tamiri', 'LED TV ekran arızası', 90, 350.00),
('Smart TV Kurulumu', 'Smart TV kurulum ve ayar', 45, 150.00),
('Uydu Kurulumu', 'Uydu alıcı kurulum', 90, 250.00),
('Ev Sinema Kurulumu', 'Ses sistemi ve projeksiyon', 180, 500.00);

-- Örnek Bayiler (Her bölgeden)
INSERT OR IGNORE INTO bayiler (bayi_kodu, firma_adi, yetkili_adi, telefon, email, adres, il_id, uzmanlik_alani) VALUES
('IST001', 'Teknoloji TV Servisi', 'Mehmet Yılmaz', '02121234567', 'mehmet@teknotv.com', 'Kadıköy Merkez', 34, 'Samsung,LG,Sony'),
('ANK001', 'Başkent Elektronik', 'Ahmet Demir', '03125556677', 'ahmet@baskentelektronik.com', 'Çankaya Merkez', 6, 'Tüm Markalar'),
('IZM001', 'Ege TV Merkezi', 'Fatma Özkan', '02323334455', 'fatma@egetv.com', 'Konak Alsancak', 35, 'Philips,Vestel'),
('BUR001', 'Marmara Servis', 'Ali Kaya', '02244445566', 'ali@marmaraservis.com', 'Osmangazi', 16, 'LG,Samsung'),
('ANT001', 'Akdeniz Teknoloji', 'Zeynep Aydın', '02425557788', 'zeynep@akdeniztek.com', 'Muratpaşa', 7, 'Smart TV Kurulumu'),
('GAZ001', 'Güneydoğu Electronics', 'Hasan Polat', '03426667799', 'hasan@guneydoguelectronics.com', 'Şahinbey', 27, 'Tüm Markalar'),
('TRB001', 'Karadeniz TV', 'Ayşe Çelik', '04627778800', 'ayse@karadeniztv.com', 'Ortahisar', 61, 'Vestel,Arçelik'),
('ERS001', 'Doğu Servis', 'Murat Şen', '04428889911', 'murat@doguservis.com', 'Palandöken', 25, 'Samsung,LG');

-- Örnek Müşteriler
INSERT OR IGNORE INTO musteriler (ad_soyad, telefon, email, adres, il_id) VALUES
('Aylin Kara', '05321112233', 'aylin@email.com', 'Kadıköy Fenerbahçe Mah.', 34),
('Serkan Özdemir', '05334445566', 'serkan@email.com', 'Çankaya Kızılay', 6),
('Elif Yıldız', '05467778899', 'elif@email.com', 'Konak Alsancak', 35),
('Burak Güneş', '05598887766', 'burak@email.com', 'Osmangazi Nilüfer', 16),
('Seda Akman', '05321119988', 'seda@email.com', 'Muratpaşa Lara', 7);

-- Örnek İş Talepleri
INSERT OR IGNORE INTO is_talepleri (
  talep_kodu, musteri_id, servis_turu_id, aciklama, telefon_numarasi, 
  tv_marka, tv_model, sorun_aciklama, oncelik, durum, kaynak
) VALUES
('TV2025001', 1, 1, 'TV ekranı çatladı, değişmesi gerek', '05321112233', 'Samsung', '55Q80A', 'Çocuk top attı, ekran çatladı', 'yüksek', 'yeni', 'whatsapp'),
('TV2025002', 2, 2, 'TV açılmıyor, ses yok', '05334445566', 'LG', '50UN7340', 'Ani elektrik kesintisi sonrası çalışmıyor', 'normal', 'yeni', 'form'),
('TV2025003', 3, 3, 'LED ışıklar yanmıyor', '05467778899', 'Sony', 'KD-65X80J', 'Yarısı karanlık, LED problemi var', 'normal', 'atandı', 'telefon'),
('TV2025004', 4, 4, 'Smart TV kurulumu lazım', '05598887766', 'Vestel', '50U9500', 'Yeni aldım, internete bağlanmıyor', 'düşük', 'yeni', 'form'),
('TV2025005', 5, 1, 'Ekran kırıldı, acil değişim', '05321119988', 'Philips', '58PUS7906', 'Taşınma sırasında kırıldı', 'yüksek', 'yeni', 'n8n');