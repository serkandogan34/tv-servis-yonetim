-- KVKV Privacy & Cookie Compliance Tables
-- Migration 0009: KVKV (Personal Data Protection Law) compliance system

-- KVKV Cookie Consent Logging Table
CREATE TABLE IF NOT EXISTS kvkv_consent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consent_version TEXT DEFAULT '1.0',          -- Consent mechanism version
  consent_timestamp TEXT,                      -- When consent was given
  preferences TEXT NOT NULL,                   -- JSON: consent preferences by category
  user_agent TEXT,                            -- Browser user agent for identification
  ip_address TEXT,                            -- IP address (for legal compliance)
  page_url TEXT,                              -- URL where consent was given
  expires_at TEXT,                            -- When consent expires
  withdrawal_timestamp TEXT,                   -- When consent was withdrawn (if applicable)
  is_withdrawn INTEGER DEFAULT 0,             -- Whether consent has been withdrawn
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- KVKV Data Subject Rights Requests (Veri Sahibi Hakları)
CREATE TABLE IF NOT EXISTS kvkv_data_subject_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT UNIQUE NOT NULL,            -- Unique identifier for the request
  request_type TEXT NOT NULL,                 -- data_access, data_correction, data_deletion, etc.
  first_name TEXT NOT NULL,                   -- Data subject's first name
  last_name TEXT NOT NULL,                    -- Data subject's last name
  email TEXT NOT NULL,                        -- Contact email
  phone_number TEXT,                          -- Optional contact phone
  identity_number TEXT,                       -- Turkish ID number (for verification)
  request_details TEXT,                       -- Detailed request description
  document_urls TEXT,                         -- JSON array of supporting document URLs
  status TEXT DEFAULT 'pending',              -- pending, in_progress, completed, rejected
  response_details TEXT,                      -- Response provided to data subject
  response_timestamp TEXT,                    -- When response was provided
  ip_address TEXT,                           -- IP address of requester
  user_agent TEXT,                           -- Browser information
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- KVKV Data Processing Activities Log
CREATE TABLE IF NOT EXISTS kvkv_data_processing_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  processing_activity TEXT NOT NULL,          -- Type of data processing
  data_categories TEXT,                       -- JSON: categories of data processed
  legal_basis TEXT NOT NULL,                  -- Legal basis for processing (KVKV Article 5)
  data_subject_email TEXT,                    -- Data subject identifier
  processing_purpose TEXT NOT NULL,           -- Purpose of processing
  retention_period TEXT,                      -- How long data will be retained
  third_party_sharing INTEGER DEFAULT 0,     -- Whether data is shared with third parties
  third_party_details TEXT,                  -- Details of third party sharing
  security_measures TEXT,                     -- JSON: security measures applied
  processing_timestamp TEXT,                  -- When processing occurred
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- KVKV Data Breach Incidents Log
CREATE TABLE IF NOT EXISTS kvkv_data_breach_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  breach_id TEXT UNIQUE NOT NULL,             -- Unique breach identifier
  breach_type TEXT NOT NULL,                  -- confidentiality, integrity, availability
  affected_data_categories TEXT,              -- JSON: types of data affected
  number_of_subjects INTEGER DEFAULT 0,       -- Number of data subjects affected
  breach_description TEXT NOT NULL,           -- Detailed description of the breach
  discovery_timestamp TEXT,                   -- When breach was discovered
  containment_timestamp TEXT,                 -- When breach was contained
  notification_required INTEGER DEFAULT 0,    -- Whether DPA notification is required
  dpa_notification_timestamp TEXT,           -- When DPA was notified (if required)
  data_subject_notification_required INTEGER DEFAULT 0, -- Whether subjects need notification
  subject_notification_timestamp TEXT,       -- When data subjects were notified
  remediation_measures TEXT,                  -- JSON: measures taken to remediate
  breach_status TEXT DEFAULT 'investigating', -- investigating, contained, resolved
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- KVKV Cookie Categories and Descriptions
CREATE TABLE IF NOT EXISTS kvkv_cookie_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_key TEXT UNIQUE NOT NULL,          -- necessary, analytics, marketing, functional
  category_name_tr TEXT NOT NULL,             -- Turkish name
  category_name_en TEXT,                      -- English name (optional)
  description_tr TEXT NOT NULL,               -- Turkish description
  description_en TEXT,                        -- English description (optional)
  is_required INTEGER DEFAULT 0,             -- Whether this category is required
  retention_period_days INTEGER DEFAULT 365,  -- Default retention period
  cookies_list TEXT,                         -- JSON: list of cookies in this category
  legal_basis TEXT,                          -- Legal basis for this cookie category
  is_active INTEGER DEFAULT 1,              -- Whether category is active
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and compliance queries
CREATE INDEX IF NOT EXISTS idx_kvkv_consent_logs_timestamp ON kvkv_consent_logs(consent_timestamp);
CREATE INDEX IF NOT EXISTS idx_kvkv_consent_logs_ip ON kvkv_consent_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_kvkv_consent_logs_withdrawal ON kvkv_consent_logs(is_withdrawn);
CREATE INDEX IF NOT EXISTS idx_kvkv_consent_logs_expires ON kvkv_consent_logs(expires_at);

CREATE INDEX IF NOT EXISTS idx_kvkv_dsr_request_id ON kvkv_data_subject_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_kvkv_dsr_email ON kvkv_data_subject_requests(email);
CREATE INDEX IF NOT EXISTS idx_kvkv_dsr_status ON kvkv_data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_kvkv_dsr_type ON kvkv_data_subject_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_kvkv_dsr_created_at ON kvkv_data_subject_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_kvkv_processing_logs_email ON kvkv_data_processing_logs(data_subject_email);
CREATE INDEX IF NOT EXISTS idx_kvkv_processing_logs_timestamp ON kvkv_data_processing_logs(processing_timestamp);
CREATE INDEX IF NOT EXISTS idx_kvkv_processing_logs_activity ON kvkv_data_processing_logs(processing_activity);

CREATE INDEX IF NOT EXISTS idx_kvkv_breach_logs_breach_id ON kvkv_data_breach_logs(breach_id);
CREATE INDEX IF NOT EXISTS idx_kvkv_breach_logs_status ON kvkv_data_breach_logs(breach_status);
CREATE INDEX IF NOT EXISTS idx_kvkv_breach_logs_discovery ON kvkv_data_breach_logs(discovery_timestamp);

-- Insert default cookie categories (KVKV compliant)
INSERT OR IGNORE INTO kvkv_cookie_categories (category_key, category_name_tr, description_tr, is_required, cookies_list, legal_basis) VALUES
('necessary', 'Gerekli Çerezler', 'Websitesinin temel işlevlerini sağlayan zorunlu çerezler. Bu çerezler olmadan website düzgün çalışmaz.', 1, 
 '["session_id", "csrf_token", "kvkv_cookie_consent", "auth_token"]', 'KVKV Madde 5/2-ç (Hukuki yükümlülüğün yerine getirilmesi)'),

('analytics', 'Analitik Çerezler', 'Website kullanımını anlamak ve iyileştirmek için kullanılan çerezler. Google Analytics ve benzeri hizmetler.', 0,
 '["_ga", "_ga_*", "_gid", "_gat", "gtag", "gtm_*"]', 'KVKV Madde 5/2-a (Açık rıza)'),

('marketing', 'Pazarlama Çerezleri', 'Kişiselleştirilmiş reklamlar ve sosyal medya entegrasyonu için kullanılan çerezler.', 0,
 '["_fbp", "_fbc", "fbq", "fr", "sb", "datr", "google_ads", "adsystem"]', 'KVKV Madde 5/2-a (Açık rıza)'),

('functional', 'Fonksiyonel Çerezler', 'Kullanıcı deneyimini iyileştiren tercihler, dil seçimi ve özelleştirme ayarları.', 0,
 '["preferences", "language", "theme", "location", "user_settings"]', 'KVKV Madde 5/2-e (Meşru menfaat)');

-- Sample KVKV configuration data
INSERT OR IGNORE INTO tracking_config (config_key, config_value, config_category, is_active) VALUES
('kvkv_company_name', 'GARANTOR360', 'privacy', 1),
('kvkv_contact_email', 'kvkv@garantor360.com', 'privacy', 1),
('kvkv_data_controller_details', '{"name": "GARANTOR360", "address": "İstanbul, Türkiye", "phone": "+90 500 123 45 67", "email": "kvkv@garantor360.com"}', 'privacy', 1),
('kvkv_cookie_retention_days', '365', 'privacy', 1),
('kvkv_consent_banner_settings', '{"position": "bottom", "theme": "dark", "showDetailedSettings": true, "language": "tr"}', 'privacy', 1),
('kvkv_privacy_policy_url', '/kvkv-politikasi', 'privacy', 1),
('kvkv_cookie_policy_url', '/cerez-politikasi', 'privacy', 1),
('kvkv_dpa_notification_required_threshold', '100', 'privacy', 1),
('kvkv_data_retention_policy', '{"customer_data": "5_years", "analytics_data": "2_years", "marketing_data": "1_year", "logs": "1_year"}', 'privacy', 1);

-- Insert sample data processing activities for compliance tracking
INSERT OR IGNORE INTO kvkv_data_processing_logs (processing_activity, data_categories, legal_basis, processing_purpose, retention_period, security_measures, processing_timestamp) VALUES
('customer_service_request', '["name", "phone", "email", "service_details"]', 'KVKV Madde 5/2-c (Sözleşmenin kurulması veya ifası)', 'Müşteri hizmet taleplerinin işlenmesi ve yerine getirilmesi', '5_years', '{"encryption": true, "access_control": true, "audit_logs": true}', datetime('now')),
('website_analytics', '["ip_address", "user_agent", "page_views", "session_data"]', 'KVKV Madde 5/2-a (Açık rıza)', 'Website kullanımının analizi ve iyileştirilmesi', '2_years', '{"anonymization": true, "encryption": true, "limited_access": true}', datetime('now')),
('marketing_communications', '["email", "preferences", "interaction_data"]', 'KVKV Madde 5/2-a (Açık rıza)', 'Pazarlama iletişimi ve kişiselleştirilmiş içerik', '1_year', '{"encryption": true, "consent_tracking": true, "opt_out_mechanism": true}', datetime('now'));