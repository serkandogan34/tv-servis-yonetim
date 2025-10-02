-- ====================================
-- KVKV Cookie Consent System Migration
-- Türk GDPR Uyumlu Cookie Yönetimi
-- ====================================

-- 1. Cookie Consent Records Table
-- User consent records with detailed tracking
CREATE TABLE IF NOT EXISTS cookie_consents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_identifier TEXT NOT NULL, -- UUID or session ID
    ip_address TEXT,
    user_agent TEXT,
    
    -- Consent Categories (KVKV Requirements)
    necessary_cookies BOOLEAN DEFAULT 1, -- Always required
    functional_cookies BOOLEAN DEFAULT 0, -- Remember preferences
    analytics_cookies BOOLEAN DEFAULT 0, -- GA4, performance tracking  
    marketing_cookies BOOLEAN DEFAULT 0, -- Facebook Pixel, ads tracking
    
    -- Consent Metadata
    consent_version TEXT DEFAULT '1.0',
    consent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    consent_method TEXT DEFAULT 'banner', -- banner, settings, api
    consent_language TEXT DEFAULT 'tr',
    
    -- Legal Compliance
    privacy_policy_version TEXT,
    cookie_policy_version TEXT,
    consent_withdrawn BOOLEAN DEFAULT 0,
    withdrawal_date DATETIME,
    withdrawal_reason TEXT,
    
    -- Technical Details
    page_url TEXT,
    referrer TEXT,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cookie Categories Configuration
-- Dynamic cookie category management
CREATE TABLE IF NOT EXISTS cookie_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_key TEXT UNIQUE NOT NULL, -- 'necessary', 'functional', 'analytics', 'marketing'
    category_name_tr TEXT NOT NULL,
    category_name_en TEXT NOT NULL,
    description_tr TEXT NOT NULL,
    description_en TEXT NOT NULL,
    
    -- Category Settings
    is_required BOOLEAN DEFAULT 0, -- Cannot be disabled
    is_enabled BOOLEAN DEFAULT 1, -- Available for consent
    default_state BOOLEAN DEFAULT 0, -- Default on/off
    
    -- Legal Information
    legal_basis_tr TEXT, -- KVKV legal basis in Turkish
    legal_basis_en TEXT, -- Legal basis in English
    data_retention_days INTEGER, -- How long data is kept
    
    -- Display Settings
    display_order INTEGER DEFAULT 0,
    icon_class TEXT, -- FontAwesome icon
    color_class TEXT, -- CSS color class
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Cookie Definitions
-- Detailed information about each cookie
CREATE TABLE IF NOT EXISTS cookie_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cookie_name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    
    -- Cookie Details
    purpose_tr TEXT NOT NULL,
    purpose_en TEXT NOT NULL,
    provider TEXT, -- 'Google Analytics', 'Facebook', 'Garantor360'
    domain TEXT,
    expiry_duration TEXT, -- '2 years', '30 days', 'session'
    
    -- Technical Details
    cookie_type TEXT DEFAULT 'HTTP', -- HTTP, JavaScript, Pixel
    is_essential BOOLEAN DEFAULT 0,
    is_third_party BOOLEAN DEFAULT 0,
    
    -- Privacy Information
    data_collected TEXT, -- What data is collected
    data_purpose TEXT, -- Why data is collected
    data_sharing TEXT, -- Who data is shared with
    
    -- Management
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES cookie_categories(id)
);

-- 4. Consent History
-- Track consent changes over time
CREATE TABLE IF NOT EXISTS consent_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_identifier TEXT NOT NULL,
    consent_id INTEGER,
    
    -- Change Details
    action_type TEXT NOT NULL, -- 'grant', 'withdraw', 'update', 'expire'
    changed_categories TEXT, -- JSON of changed categories
    previous_state TEXT, -- JSON of previous consent state
    new_state TEXT, -- JSON of new consent state
    
    -- Context
    change_reason TEXT, -- 'user_action', 'policy_update', 'expiry', 'admin'
    ip_address TEXT,
    user_agent TEXT,
    page_url TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (consent_id) REFERENCES cookie_consents(id)
);

-- 5. Cookie Policy Management
-- Version control for cookie policies
CREATE TABLE IF NOT EXISTS cookie_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    
    -- Policy Content
    policy_title_tr TEXT NOT NULL,
    policy_title_en TEXT NOT NULL,
    policy_content_tr TEXT NOT NULL,
    policy_content_en TEXT NOT NULL,
    
    -- Policy Metadata
    effective_date DATETIME NOT NULL,
    expiry_date DATETIME,
    is_active BOOLEAN DEFAULT 0,
    
    -- Change Information
    change_summary_tr TEXT,
    change_summary_en TEXT,
    previous_version TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'admin'
);

-- 6. KVKV Compliance Logs
-- Legal compliance and audit logs
CREATE TABLE IF NOT EXISTS kvkv_compliance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Event Details
    event_type TEXT NOT NULL, -- 'consent_request', 'data_access', 'data_deletion', 'policy_update'
    user_identifier TEXT,
    event_description TEXT NOT NULL,
    
    -- Legal Context
    legal_basis TEXT, -- KVKV Article reference
    data_subject_rights TEXT, -- Which rights were exercised
    compliance_status TEXT DEFAULT 'compliant', -- 'compliant', 'pending', 'violation'
    
    -- Technical Details
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    request_details TEXT, -- JSON of full request
    response_details TEXT, -- JSON of response
    
    -- Audit Trail
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_by TEXT DEFAULT 'system'
);

-- ====================================
-- INSERT DEFAULT COOKIE CATEGORIES
-- ====================================

INSERT OR REPLACE INTO cookie_categories (
    category_key, category_name_tr, category_name_en, 
    description_tr, description_en,
    is_required, default_state, display_order, 
    legal_basis_tr, icon_class, color_class
) VALUES 
-- Necessary Cookies (Always Required)
('necessary', 
 'Zorunlu Çerezler', 
 'Necessary Cookies',
 'Web sitesinin temel işlevlerini yerine getirmesi için gerekli çerezlerdir. Bu çerezler olmadan site düzgün çalışamaz.',
 'Essential cookies required for basic website functionality. The site cannot function properly without these cookies.',
 1, 1, 1, 
 'KVKV Madde 5/2-a: Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi',
 'fas fa-shield-alt', 'text-green-600'),

-- Functional Cookies 
('functional',
 'İşlevsel Çerezler',
 'Functional Cookies', 
 'Kullanıcı tercihlerini hatırlayarak daha iyi bir deneyim sunan çerezlerdir.',
 'Cookies that remember your preferences to provide enhanced functionality.',
 0, 0, 2,
 'KVKV Madde 5/2-f: Veri sorumlusunun meşru menfaatleri',
 'fas fa-cog', 'text-blue-600'),

-- Analytics Cookies
('analytics',
 'Analitik Çerezler', 
 'Analytics Cookies',
 'Web sitesi performansını ve kullanım istatistiklerini anlamamıza yardımcı olan çerezlerdir.',
 'Cookies that help us understand website performance and usage statistics.',
 0, 0, 3,
 'KVKV Madde 5/2-f: Veri sorumlusunun meşru menfaatleri',
 'fas fa-chart-bar', 'text-purple-600'),

-- Marketing Cookies
('marketing',
 'Pazarlama Çerezleri',
 'Marketing Cookies',
 'Size daha alakalı reklamlar gösterebilmek için kullanılan çerezlerdir.',
 'Cookies used to deliver more relevant advertisements and marketing content.',
 0, 0, 4,
 'KVKV Madde 5/1: Açık rıza',
 'fas fa-bullhorn', 'text-orange-600');

-- ====================================
-- INSERT COOKIE DEFINITIONS
-- ====================================

INSERT OR REPLACE INTO cookie_definitions (
    cookie_name, category_id, purpose_tr, purpose_en, 
    provider, domain, expiry_duration, cookie_type, 
    is_essential, is_third_party
) VALUES 
-- Necessary Cookies
('session_token', 1, 
 'Kullanıcı oturumunu yönetmek için', 
 'Managing user session',
 'Garantor360', '.garantor360.com', 'Session', 'HTTP', 1, 0),

('csrf_token', 1,
 'Güvenlik saldırılarını önlemek için',
 'Preventing security attacks', 
 'Garantor360', '.garantor360.com', '1 day', 'HTTP', 1, 0),

-- Analytics Cookies  
('_ga', 3,
 'Google Analytics kullanıcı tanımlama',
 'Google Analytics user identification',
 'Google Analytics', '.garantor360.com', '2 years', 'JavaScript', 0, 1),

('_ga_*', 3,
 'Google Analytics 4 oturum verisi',
 'Google Analytics 4 session data',
 'Google Analytics', '.garantor360.com', '2 years', 'JavaScript', 0, 1),

-- Marketing Cookies
('_fbp', 4,
 'Facebook Pixel kullanıcı takibi', 
 'Facebook Pixel user tracking',
 'Facebook', '.garantor360.com', '3 months', 'JavaScript', 0, 1),

('fr', 4,
 'Facebook reklamları için kullanıcı tanımlama',
 'Facebook ads user identification', 
 'Facebook', '.facebook.com', '3 months', 'HTTP', 0, 1);

-- ====================================
-- INSERT DEFAULT COOKIE POLICY
-- ====================================

INSERT OR REPLACE INTO cookie_policies (
    version, policy_title_tr, policy_title_en,
    policy_content_tr, policy_content_en,
    effective_date, is_active
) VALUES (
    '1.0',
    'Çerez Politikası',
    'Cookie Policy',
    'Bu çerez politikası, Garantor360 platformunun çerez kullanımını açıklamaktadır. KVKV (Kişisel Verilerin Korunması Kanunu) kapsamında bilgilendirme yükümlülüğümüzü yerine getirmek amacıyla hazırlanmıştır.',
    'This cookie policy explains the use of cookies on the Garantor360 platform. It has been prepared to fulfill our information obligation under the KVKV (Personal Data Protection Law).',
    CURRENT_TIMESTAMP,
    1
);

-- ====================================
-- CREATE INDEXES FOR PERFORMANCE
-- ====================================

CREATE INDEX IF NOT EXISTS idx_cookie_consents_user ON cookie_consents(user_identifier);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_date ON cookie_consents(consent_date);
CREATE INDEX IF NOT EXISTS idx_consent_history_user ON consent_history(user_identifier);
CREATE INDEX IF NOT EXISTS idx_cookie_definitions_category ON cookie_definitions(category_id);
CREATE INDEX IF NOT EXISTS idx_kvkv_logs_type ON kvkv_compliance_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_kvkv_logs_date ON kvkv_compliance_logs(created_at);

-- ====================================
-- VIEWS FOR EASY ACCESS
-- ====================================

-- Active Consents View
CREATE VIEW IF NOT EXISTS active_consents AS
SELECT 
    cc.user_identifier,
    cc.consent_date,
    cc.necessary_cookies,
    cc.functional_cookies, 
    cc.analytics_cookies,
    cc.marketing_cookies,
    cc.consent_version,
    cc.ip_address
FROM cookie_consents cc
WHERE cc.consent_withdrawn = 0
AND cc.id = (
    SELECT MAX(id) 
    FROM cookie_consents cc2 
    WHERE cc2.user_identifier = cc.user_identifier
);

-- Cookie Categories with Definitions
CREATE VIEW IF NOT EXISTS cookie_categories_full AS
SELECT 
    cat.category_key,
    cat.category_name_tr,
    cat.description_tr,
    cat.is_required,
    cat.default_state,
    COUNT(def.id) as cookie_count
FROM cookie_categories cat
LEFT JOIN cookie_definitions def ON cat.id = def.category_id AND def.is_active = 1
WHERE cat.is_enabled = 1
GROUP BY cat.id
ORDER BY cat.display_order;

-- ====================================
-- MIGRATION COMPLETED
-- ====================================