-- Lead Scoring Rules Seed Data
-- This file contains pre-configured lead scoring rules for GARANTOR360

-- DEMOGRAPHIC SCORING RULES (0-25 points)
INSERT OR REPLACE INTO lead_scoring_rules (rule_name, rule_category, trigger_event, trigger_conditions, score_value, max_applications, description) VALUES
('Istanbul Location Bonus', 'demographic', 'profile_created', '{"location": "istanbul"}', 5, 1, 'İstanbul lokasyonu için bonus puan - yüksek servis talebi bölgesi'),
('Ankara Location Bonus', 'demographic', 'profile_created', '{"location": "ankara"}', 4, 1, 'Ankara lokasyonu için bonus puan - orta seviye servis talebi'),
('Izmir Location Bonus', 'demographic', 'profile_created', '{"location": "izmir"}', 4, 1, 'İzmir lokasyonu için bonus puan - orta seviye servis talebi'),
('Company Lead Bonus', 'demographic', 'profile_created', '{"has_company": true}', 8, 1, 'Şirket müşterisi - potansiyel toplu hizmet talebi'),
('Premium Service Area', 'demographic', 'profile_created', '{"location": ["besiktas", "sisli", "kadikoy", "uskudar"]}', 3, 1, 'Premium hizmet alanları için bonus'),
('Complete Profile Bonus', 'demographic', 'profile_updated', '{"profile_completeness": ">80%"}', 5, 1, 'Profil eksiksizliği bonusu - ciddi müşteri göstergesi');

-- BEHAVIORAL SCORING RULES (0-40 points)  
INSERT OR REPLACE INTO lead_scoring_rules (rule_name, rule_category, trigger_event, trigger_conditions, score_value, max_applications, description) VALUES
('Page View Activity', 'behavioral', 'page_view', '{}', 1, 20, 'Her sayfa görüntüleme için puan - maksimum 20 puan'),
('Service Page Visit', 'behavioral', 'page_view', '{"page_type": ["televizyon_tamiri", "bilgisayar_tamiri", "beyaz_esya_tamiri", "klima_tamiri"]}', 3, 5, 'Hizmet sayfası ziyareti - yüksek niyet göstergesi'),
('Contact Page Visit', 'behavioral', 'page_view', '{"page_type": "contact"}', 5, 3, 'İletişim sayfası ziyareti - güçlü niyet sinyali'),
('Multiple Session Bonus', 'behavioral', 'session_start', '{"session_count": ">3"}', 8, 1, '3+ oturum açan kullanıcılar - yüksek ilgi göstergesi'),
('Long Session Duration', 'behavioral', 'session_end', '{"session_duration": ">300"}', 4, 3, '5+ dakika oturum süresi - derin ilgi göstergesi'),
('High Engagement Score', 'behavioral', 'engagement_calculated', '{"engagement_score": ">75"}', 6, 1, 'Yüksek engagement skoru - aktif kullanıcı'),
('Scroll Depth 75%+', 'behavioral', 'scroll_tracking', '{"scroll_depth": ">75"}', 2, 5, 'Derin scroll - içeriğe güçlü ilgi'),
('Return Visitor Bonus', 'behavioral', 'session_start', '{"is_returning": true}', 3, 3, 'Tekrar ziyaret - marka tanıma göstergesi');

-- INTEREST SCORING RULES (0-25 points)
INSERT OR REPLACE INTO lead_scoring_rules (rule_name, rule_category, trigger_event, trigger_conditions, score_value, max_applications, description) VALUES
('Service Category Selection', 'interest', 'form_interaction', '{"field": "serviceCategory", "action": "select"}', 5, 1, 'Hizmet kategorisi seçimi - spesifik ihtiyaç göstergesi'),
('Problem Description Provided', 'interest', 'form_interaction', '{"field": "problemDescription", "length": ">20"}', 8, 1, 'Detaylı problem açıklaması - ciddi talep göstergesi'),
('Urgency Level High', 'interest', 'form_interaction', '{"field": "urgency", "value": "acil"}', 10, 1, 'Acil hizmet talebi - anında dönüşüm potansiyeli'),
('Urgency Level Today', 'interest', 'form_interaction', '{"field": "urgency", "value": "bugun"}', 7, 1, 'Bugün hizmet talebi - yüksek dönüşüm potansiyeli'),
('Price Calculator Usage', 'interest', 'tool_usage', '{"tool": "price_calculator"}', 4, 2, 'Fiyat hesaplayıcı kullanımı - bütçe planlama göstergesi'),
('Service Comparison Activity', 'interest', 'page_interaction', '{"action": "service_comparison"}', 3, 3, 'Hizmet karşılaştırması - satın alma araştırması'),
('FAQ Interaction', 'interest', 'page_interaction', '{"section": "faq"}', 2, 5, 'SSS etkileşimi - bilgi toplama davranışı');

-- INTENT SCORING RULES (0-10 points)
INSERT OR REPLACE INTO lead_scoring_rules (rule_name, rule_category, trigger_event, trigger_conditions, score_value, max_applications, description) VALUES
('Phone Number Click', 'intent', 'click_interaction', '{"target": "phone_number"}', 8, 1, 'Telefon numarası tıklama - güçlü arama niyeti'),
('WhatsApp Click', 'intent', 'click_interaction', '{"target": "whatsapp"}', 7, 1, 'WhatsApp tıklama - anında iletişim niyeti'),
('Form Submission Attempt', 'intent', 'form_interaction', '{"action": "submit_attempt"}', 9, 1, 'Form gönderim girişimi - güçlü dönüşüm niyeti'),
('Email Click-to-Call', 'intent', 'click_interaction', '{"target": "email"}', 5, 1, 'Email tıklama - iletişim kurma niyeti'),
('Live Chat Initiation', 'intent', 'chat_interaction', '{"action": "chat_start"}', 10, 1, 'Canlı sohbet başlatma - anında yardım talebi'),
('Callback Request', 'intent', 'form_interaction', '{"field": "callback_request", "value": true}', 8, 1, 'Geri arama talebi - aktif iletişim beklentisi');

-- NEGATIVE SCORING RULES (Penalty points)
INSERT OR REPLACE INTO lead_scoring_rules (rule_name, rule_category, trigger_event, trigger_conditions, score_value, max_applications, description) VALUES
('Bot Behavior Detected', 'behavioral', 'security_check', '{"bot_confidence": ">85%"}', -20, 1, 'Bot davranışı tespiti - geçersiz lead'),
('Spam Email Domain', 'demographic', 'profile_created', '{"email_domain": ["tempmail", "10minutemail", "guerrillamail"]}', -15, 1, 'Geçici email adresi kullanımı'),
('Bounce Rate High', 'behavioral', 'session_end', '{"session_duration": "<10", "page_views": "=1"}', -3, 5, 'Yüksek bounce rate - düşük ilgi göstergesi'),
('Suspicious Activity', 'behavioral', 'security_check', '{"suspicious_score": ">70%"}', -10, 1, 'Şüpheli aktivite tespiti'),
('Invalid Phone Format', 'demographic', 'profile_created', '{"phone_valid": false}', -5, 1, 'Geçersiz telefon numarası formatı'),
('Competitor Domain', 'demographic', 'profile_created', '{"email_domain": ["competitor1.com", "competitor2.com"]}', -25, 1, 'Rakip firma email adresi'),
('Repeated Form Spam', 'behavioral', 'form_interaction', '{"spam_attempts": ">3"}', -15, 1, 'Tekrarlayan spam form gönderimi');

-- QUALIFICATION THRESHOLDS
-- These will be used in the application logic
-- Cold Lead: 0-25 points
-- Warm Lead: 26-50 points  
-- Hot Lead: 51-75 points
-- Qualified Lead: 76-100 points