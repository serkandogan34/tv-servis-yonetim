-- Email Marketing System Seed Data
-- This file contains pre-configured email templates for GARANTOR360

-- WELCOME SERIES TEMPLATES
INSERT OR REPLACE INTO email_templates (template_name, template_category, subject_line, preview_text, html_content, plain_text_content, template_variables, is_active, is_default) VALUES
('Welcome - New Lead', 'welcome', 'Hoşgeldiniz {{customer_name}} - GARANTOR360''a Güvenin!', 'Türkiye''nin en güvenilir teknik servis platformuna hoşgeldiniz', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GARANTOR360 Hoşgeldiniz</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔧 GARANTOR360</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Türkiye''nin En Güvenilir Teknik Servis Platformu</p>
    </div>
    
    <div style="background: white; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #2c5aa0; margin-top: 0;">Merhaba {{customer_name}}! 👋</h2>
        
        <p>GARANTOR360 ailesine hoşgeldiniz! {{service_interest}} hizmeti için gösterdiğiniz ilgiden dolayı teşekkür ederiz.</p>
        
        <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #2c5aa0; margin-top: 0;">✨ Size Özel Avantajlarınız:</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li>🎯 <strong>Ücretsiz Keşif:</strong> Problemin teşhisi tamamen ücretsiz</li>
                <li>🛡️ <strong>6 Ay Garanti:</strong> Tüm işçiliklerimizde garanti</li>
                <li>⚡ <strong>Aynı Gün Servis:</strong> Acil durumlar için hızlı müdahale</li>
                <li>💰 <strong>En Uygun Fiyat:</strong> Piyasa ortalamasının altında</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://garantor360.com/hizmet-talep-et" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
                🔥 Hemen Hizmet Talep Et
            </a>
        </div>
        
        <div style="background: #fff8e1; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #795548;"><strong>💡 İpucu:</strong> Acil durum mu? WhatsApp üzerinden <a href="https://wa.me/905551234567" style="color: #25D366; text-decoration: none;">anında iletişime geçin!</a></p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <div style="text-align: center; color: #666; font-size: 14px;">
            <p>Bu email {{recipient_email}} adresine gönderilmiştir.<br>
            <a href="{{unsubscribe_url}}" style="color: #999;">Abonelikten çık</a> | 
            <a href="https://garantor360.com/iletisim" style="color: #999;">İletişim</a></p>
        </div>
    </div>
</body>
</html>', 
'GARANTOR360 - Hoşgeldiniz!

Merhaba {{customer_name}}!

GARANTOR360 ailesine hoşgeldiniz! {{service_interest}} hizmeti için gösterdiğiniz ilgiden dolayı teşekkür ederiz.

Size Özel Avantajlarınız:
• Ücretsiz Keşif: Problemin teşhisi tamamen ücretsiz  
• 6 Ay Garanti: Tüm işçiliklerimizde garanti
• Aynı Gün Servis: Acil durumlar için hızlı müdahale
• En Uygun Fiyat: Piyasa ortalamasının altında

Hemen Hizmet Talep Et: https://garantor360.com/hizmet-talep-et

Acil durumlar için WhatsApp: https://wa.me/905551234567

Bu email {{recipient_email}} adresine gönderilmiştir.
Abonelikten çıkmak için: {{unsubscribe_url}}', 
'customer_name,service_interest,recipient_email,unsubscribe_url', 1, 1);

-- FOLLOW-UP TEMPLATES
INSERT OR REPLACE INTO email_templates (template_name, template_category, subject_line, preview_text, html_content, plain_text_content, template_variables, is_active, is_default) VALUES
('Follow Up - 24 Hours', 'followup', '{{customer_name}}, Hala Yardıma İhtiyacınız Var mı? 🤔', 'Size özel %15 indirim fırsatı!', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GARANTOR360 Takip</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Henüz Karar Veremediniz mi?</h1>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #2c5aa0; margin-top: 0;">Merhaba {{customer_name}},</h2>
        
        <p>Dün {{service_interest}} konusunda bizimle iletişime geçtiniz. Hala sorununuz devam ediyor mu?</p>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0; text-align: center;">🎉 ÖZEL FIRSATINIZ!</h3>
            <p style="text-align: center; font-size: 18px; color: #856404; margin: 0;">
                <strong>%15 İNDİRİM</strong><br>
                <span style="font-size: 14px;">Bugün hizmet alırsanız</span>
            </p>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
            <a href="https://garantor360.com/hizmet-talep-et?discount=15OFF" style="background: #28a745; color: white; padding: 15px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
                💰 %15 İndirimli Hizmet Al
            </a>
        </div>
        
        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h4 style="color: #007bff; margin-top: 0;">📞 Ücretsiz Danışmanlık</h4>
            <p style="margin-bottom: 0;">Hangi hizmete ihtiyacınız olduğundan emin değil misiniz? Uzmanlarımız size ücretsiz danışmanlık verebilir.</p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
            <p>Bu fırsat sadece bugün geçerli!</p>
        </div>
    </div>
</body>
</html>', 
'Merhaba {{customer_name}},

Dün {{service_interest}} konusunda bizimle iletişime geçtiniz. Hala sorununuz devam ediyor mu?

ÖZEL FIRSATINIZ!
%15 İNDİRİM - Bugün hizmet alırsanız

Hemen Faydalanın: https://garantor360.com/hizmet-talep-et?discount=15OFF

Ücretsiz danışmanlık için: https://wa.me/905551234567

Bu fırsat sadece bugün geçerli!', 
'customer_name,service_interest', 1, 0);

-- PROMOTIONAL TEMPLATES  
INSERT OR REPLACE INTO email_templates (template_name, template_category, subject_line, preview_text, html_content, plain_text_content, template_variables, is_active, is_default) VALUES
('Promo - Winter Campaign', 'promotional', '❄️ Kış Bakım Kampanyası - %25 İndirim!', 'Kış gelmeden cihazlarınızı hazır hale getirin', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GARANTOR360 Kış Kampanyası</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">❄️ KIŞ BAKIMI ZAMANI!</h1>
        <p style="color: #ddd; margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">%25 İndirim Fırsatı</p>
    </div>
    
    <div style="background: white; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #2c5aa0; margin-top: 0;">Merhaba {{customer_name}},</h2>
        
        <p>Kış ayları yaklaşıyor! Kombi, klima ve beyaz eşyalarınızı kış şartlarına hazırlamanın tam zamanı.</p>
        
        <div style="background: linear-gradient(135deg, #00cec9 0%, #55efc4 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
            <h3 style="color: white; margin: 0; font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🎯 KIŞ BAKIMI PAKETİ</h3>
            <p style="color: white; margin: 15px 0; font-size: 18px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                <span style="text-decoration: line-through; opacity: 0.8;">500₺</span> 
                <strong style="font-size: 24px;">375₺</strong>
            </p>
            <p style="color: #f0f0f0; margin: 0; font-size: 14px;">%25 indirimli!</p>
        </div>
        
        <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #2c5aa0; margin-top: 0;">📋 Paket İçeriği:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
                <li>🔧 Kombi bakım ve temizliği</li>
                <li>❄️ Klima kış hazırlığı</li>
                <li>🏠 Beyaz eşya kontrolü</li>
                <li>⚡ Elektrik sistemi check-up</li>
                <li>🛡️ 6 ay garanti</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://garantor360.com/kis-bakimi?promo=WINTER25" style="background: linear-gradient(135deg, #fd79a8 0%, #e84393 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                ❄️ Kış Bakımı Rezervasyonu
            </a>
        </div>
        
        <div style="background: #fff8e1; padding: 15px; border-radius: 8px; margin: 20px 0; border: 2px dashed #ffc107;">
            <p style="margin: 0; color: #795548; text-align: center;">
                <strong>⏰ Sınırlı Süre!</strong><br>
                Kampanya {{campaign_end_date}} tarihine kadar geçerli
            </p>
        </div>
    </div>
</body>
</html>', 
'KIŞ BAKIMI ZAMANI! ❄️

Merhaba {{customer_name}},

Kış ayları yaklaşıyor! %25 indirimli kış bakım paketimizden faydalanın.

KIŞ BAKIMI PAKETİ - 375₺ (Normal fiyat: 500₺)

Paket İçeriği:
• Kombi bakım ve temizliği
• Klima kış hazırlığı  
• Beyaz eşya kontrolü
• Elektrik sistemi check-up
• 6 ay garanti

Rezervasyon: https://garantor360.com/kis-bakimi?promo=WINTER25

Kampanya {{campaign_end_date}} tarihine kadar geçerli!', 
'customer_name,campaign_end_date', 1, 0);

-- TRANSACTIONAL TEMPLATES
INSERT OR REPLACE INTO email_templates (template_name, template_category, subject_line, preview_text, html_content, plain_text_content, template_variables, is_active, is_default) VALUES
('Transaction - Service Confirmation', 'transactional', 'Hizmet Onaylandı - {{service_type}} | GARANTOR360', 'Hizmetiniz onaylandı, teknisyenimiz yolda!', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hizmet Onayı - GARANTOR360</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #00b894 0%, #55a3ff 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 26px;">✅ HİZMET ONAYLANDI</h1>
        <p style="color: #e8f8f5; margin: 10px 0 0 0; font-size: 16px;">Rezervasyon No: {{reservation_id}}</p>
    </div>
    
    <div style="background: white; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #2c5aa0; margin-top: 0;">Merhaba {{customer_name}},</h2>
        
        <p><strong>{{service_type}}</strong> hizmet talebiniz onaylandı! Teknisyenimiz {{appointment_date}} tarihinde {{appointment_time}} saatinde adresinizde olacak.</p>
        
        <div style="background: #f8f9ff; padding: 25px; border-radius: 10px; margin: 25px 0; border: 1px solid #e3f2fd;">
            <h3 style="color: #1976d2; margin-top: 0; display: flex; align-items: center;">
                📋 Hizmet Detayları
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #666; width: 40%;">Hizmet Türü:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{{service_type}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Teknisyen:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{{technician_name}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Tarih:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{{appointment_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Saat:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{{appointment_time}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Adres:</td>
                    <td style="padding: 8px 0; font-weight: bold;">{{customer_address}}</td>
                </tr>
            </table>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <h4 style="color: #2e7d32; margin-top: 0;">📞 Teknisyen İletişim</h4>
            <p style="margin: 5px 0;"><strong>{{technician_name}}</strong></p>
            <p style="margin: 5px 0;">📱 {{technician_phone}}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #666;">Randevu saatinden 30 dk önce sizinle iletişime geçecek</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://garantor360.com/randevu/{{reservation_id}}" style="background: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 0 10px;">
                📅 Randevu Detayları
            </a>
            <a href="https://wa.me/{{technician_phone}}" style="background: #25d366; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 0 10px;">
                💬 WhatsApp İletişim
            </a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; text-align: center;">
                <strong>💡 Hatırlatma:</strong> Teknisyenimiz geldiğinde cihazların çalışır durumda olmasını sağlayın
            </p>
        </div>
    </div>
</body>
</html>', 
'HİZMET ONAYLANDI ✅

Merhaba {{customer_name}},

{{service_type}} hizmet talebiniz onaylandı!

HİZMET DETAYLARI:
Rezervasyon No: {{reservation_id}}
Teknisyen: {{technician_name}}
Tarih: {{appointment_date}}
Saat: {{appointment_time}}
Adres: {{customer_address}}

TEKNİSYEN İLETİŞİM:
{{technician_name}} - {{technician_phone}}

Randevu saatinden 30 dk önce sizinle iletişime geçecek.

Randevu Detayları: https://garantor360.com/randevu/{{reservation_id}}

Hatırlatma: Cihazların çalışır durumda olmasını sağlayın.', 
'customer_name,service_type,reservation_id,technician_name,appointment_date,appointment_time,customer_address,technician_phone', 1, 1);

-- NURTURE CAMPAIGN TEMPLATE
INSERT OR REPLACE INTO email_templates (template_name, template_category, subject_line, preview_text, html_content, plain_text_content, template_variables, is_active, is_default) VALUES
('Nurture - Maintenance Tips', 'nurture', 'Cihazlarınızın Ömrü 2 Kat Uzasın! 🔧', 'Uzmanlarımızdan bakım ipuçları', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GARANTOR360 Bakım İpuçları</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 26px;">💡 UZMAN İPUÇLARI</h1>
        <p style="color: #ddd; margin: 10px 0 0 0; font-size: 16px;">Cihazlarınızın ömrü 2 kat uzasın!</p>
    </div>
    
    <div style="background: white; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #2c5aa0; margin-top: 0;">Merhaba {{customer_name}},</h2>
        
        <p>15 yıllık deneyimimizle edindiğimiz bakım sırlarını sizinle paylaşıyoruz! Bu basit ipuçları cihazlarınızın ömrünü ikiye katlar.</p>
        
        <div style="background: #f0f8ff; padding: 25px; border-radius: 10px; margin: 25px 0;">
            <h3 style="color: #1e3a8a; margin-top: 0;">🔧 KOMBİ BAKIMI</h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li><strong>Aylık Kontrol:</strong> Basınç göstergesini kontrol edin (1-1.5 bar arası olmalı)</li>
                <li><strong>Su Kalitesi:</strong> Sert su bölgelerinde su yumuşatıcı kullanın</li>
                <li><strong>Havalandırma:</strong> Kombi odasını her zaman havalandırın</li>
                <li><strong>Yıllık Bakım:</strong> Mutlaka yılda 1 kez profesyonel bakım yaptırın</li>
            </ul>
        </div>
        
        <div style="background: #f0fff4; padding: 25px; border-radius: 10px; margin: 25px 0;">
            <h3 style="color: #16a34a; margin-top: 0;">❄️ KLİMA BAKIMI</h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li><strong>Filtre Temizliği:</strong> Ayda 1 kez filtreleri temizleyin</li>
                <li><strong>Dış Ünite:</strong> Dış ünitenin etrafını temiz tutun</li>
                <li><strong>Sıcaklık Ayarı:</strong> Dış ortam ile 6°C''den fazla fark yapmayın</li>
                <li><strong>Kış Koruması:</strong> Kışın dış üniteyi koruyun</li>
            </ul>
        </div>
        
        <div style="background: #fefce8; padding: 25px; border-radius: 10px; margin: 25px 0;">
            <h3 style="color: #ca8a04; margin-top: 0;">🏠 BEYAZ EŞYA BAKIMI</h3>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li><strong>Buzdolabı:</strong> Arka kısmını yılda 2 kez temizleyin</li>
                <li><strong>Çamaşır Makinesi:</strong> Ayda 1 kez boş yıkama yapın</li>
                <li><strong>Bulaşık Makinesi:</strong> Filtrelerini düzenli temizleyin</li>
                <li><strong>Fırın:</strong> Her kullanımdan sonra temizleyin</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://garantor360.com/bakim-rehberi" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 15px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
                📖 Detaylı Bakım Rehberi
            </a>
        </div>
        
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h4 style="color: #1d4ed8; margin-top: 0;">🎯 ÜCRETSİZ BAKIM TAKVIMI</h4>
            <p style="margin-bottom: 10px;">Cihazlarınız için kişisel bakım takvimi oluşturalım! Hangi ay ne yapacağınızı unutmayın.</p>
            <a href="https://garantor360.com/bakim-takvimi" style="color: #1d4ed8; text-decoration: none; font-weight: bold;">📅 Bakım Takvimi Oluştur →</a>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
            <p>Sorularınız için: <a href="https://wa.me/905551234567" style="color: #25D366; text-decoration: none;">WhatsApp Destek</a></p>
        </div>
    </div>
</body>
</html>', 
'UZMAN İPUÇLARI 💡

Merhaba {{customer_name}},

Cihazlarınızın ömrü 2 kat uzasın! 15 yıllık deneyimimizden bakım sırları:

KOMBİ BAKIMI:
• Aylık basınç kontrolü (1-1.5 bar)
• Sert suda yumuşatıcı kullanın
• Kombi odasını havalandırın
• Yılda 1 kez profesyonel bakım

KLİMA BAKIMI:  
• Ayda 1 filtre temizliği
• Dış ünite çevresini temiz tutun
• 6°C''den fazla sıcaklık farkı yapmayın
• Kışın dış üniteyi koruyun

BEYAZ EŞYA BAKIMI:
• Buzdolabı arkasını yılda 2 kez temizleyin
• Çamaşır makinesine ayda 1 boş yıkama
• Bulaşık makinesi filtrelerini temizleyin
• Fırını her kullanımdan sonra temizleyin

Detaylı Rehber: https://garantor360.com/bakim-rehberi
Bakım Takvimi: https://garantor360.com/bakim-takvimi

Sorular için WhatsApp: https://wa.me/905551234567', 
'customer_name', 1, 0);