-- Tracking Configuration System
-- Bu tablo tüm tracking ve analytics konfigürasyonlarını saklar

CREATE TABLE IF NOT EXISTS tracking_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT,
    config_category TEXT NOT NULL DEFAULT 'general',
    is_active BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default tracking configurations
INSERT OR IGNORE INTO tracking_config (config_key, config_value, config_category, is_active) VALUES
-- Google Analytics 4 Configuration
('ga4_measurement_id', 'G-XXXXXXXXXX', 'analytics', 0),
('ga4_enabled', 'false', 'analytics', 0),
('ga4_enhanced_ecommerce', 'true', 'analytics', 1),
('ga4_debug_mode', 'false', 'analytics', 0),

-- Facebook Pixel Configuration
('facebook_pixel_id', 'YOUR_PIXEL_ID_HERE', 'facebook', 0),
('facebook_pixel_enabled', 'false', 'facebook', 0),
('facebook_advanced_matching', 'true', 'facebook', 1),
('facebook_data_processing_options', '[]', 'facebook', 1),

-- Google Tag Manager Configuration
('gtm_container_id', 'GTM-XXXXXXX', 'gtm', 0),
('gtm_enabled', 'false', 'gtm', 0),
('gtm_preview_mode', 'false', 'gtm', 0),

-- Cookie Consent Configuration
('cookie_consent_enabled', 'true', 'privacy', 1),
('cookie_consent_position', 'bottom', 'privacy', 1),
('cookie_consent_theme', 'dark', 'privacy', 1),
('cookie_banner_text_tr', 'Bu web sitesi, size en iyi deneyimi sunabilmek için çerezleri kullanır. Web sitemizi kullanmaya devam ederek çerez kullanımımızı kabul etmiş olursunuz.', 'privacy', 1),
('cookie_policy_url', '/cerez-politikasi', 'privacy', 1),

-- Schema.org Configuration
('schema_business_name', 'Garantor360', 'seo', 1),
('schema_business_type', 'LocalBusiness', 'seo', 1),
('schema_business_phone', '+90 500 123 45 67', 'seo', 1),
('schema_business_email', 'info@garantor360.com', 'seo', 1),
('schema_business_address', 'İstanbul, Türkiye', 'seo', 1),
('schema_business_description', 'Güvenli hizmet alın. Ödeme güvencesi ve işçilik garantisi ile ev tamiri, temizlik, nakliye hizmetleri.', 'seo', 1),

-- SEO Meta Configuration
('site_title', 'Garantor360 - Güvenli Hizmet Alın', 'seo', 1),
('site_description', 'Garantor360 ile ev tamiri, temizlik, nakliye ve tüm hizmetlerde ödeme güvenliği, 6 ay işçilik garantisi ve sigorta koruması.', 'seo', 1),
('site_keywords', 'güvenli hizmet, ödeme güvencesi, işçilik garantisi, ev tamiri, temizlik hizmeti, nakliye, sigorta koruması', 'seo', 1),
('site_author', 'Garantor360 Tech Team', 'seo', 1),
('site_canonical_url', 'https://garantor360.pages.dev', 'seo', 1),

-- Webhook & API Integration Configuration
('n8n_webhook_url', 'https://your-n8n-instance.com/webhook/garantor360', 'webhooks', 0),
('n8n_webhook_enabled', 'false', 'webhooks', 0),
('n8n_webhook_timeout', '30000', 'webhooks', 1),
('n8n_webhook_retry_count', '3', 'webhooks', 1),

-- Third-party API Configurations
('openai_api_key', '', 'api_keys', 0),
('openai_model', 'gpt-4', 'api_keys', 1),
('openai_enabled', 'false', 'api_keys', 0),

('email_service_provider', 'sendgrid', 'email', 1),
('sendgrid_api_key', '', 'email', 0),
('sendgrid_from_email', 'noreply@garantor360.com', 'email', 1),
('sendgrid_enabled', 'false', 'email', 0),

('sms_service_provider', 'twilio', 'sms', 1),
('twilio_account_sid', '', 'sms', 0),
('twilio_auth_token', '', 'sms', 0),
('twilio_phone_number', '', 'sms', 0),
('sms_enabled', 'false', 'sms', 0),

-- Payment Gateway API Keys
('paytr_merchant_id', '', 'payment', 0),
('paytr_merchant_key', '', 'payment', 0),
('paytr_merchant_salt', '', 'payment', 0),
('paytr_enabled', 'false', 'payment', 0),

-- External Service Integrations
('google_maps_api_key', '', 'external', 0),
('google_maps_enabled', 'false', 'external', 0),
('whatsapp_business_token', '', 'external', 0),
('whatsapp_business_enabled', 'false', 'external', 0);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_tracking_config_category ON tracking_config(config_category);
CREATE INDEX IF NOT EXISTS idx_tracking_config_active ON tracking_config(is_active);
CREATE INDEX IF NOT EXISTS idx_tracking_config_key ON tracking_config(config_key);

-- Update trigger for updated_at
CREATE TRIGGER IF NOT EXISTS tracking_config_updated_at 
    AFTER UPDATE ON tracking_config 
    FOR EACH ROW 
BEGIN
    UPDATE tracking_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;