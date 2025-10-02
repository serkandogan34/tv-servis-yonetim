-- ====================================
-- Enhanced Event Tracking System Migration
-- GA4 & Facebook Pixel Advanced Analytics
-- ====================================

-- 1. Event Tracking Configuration Table
-- Store tracking configuration for different event types
CREATE TABLE IF NOT EXISTS event_tracking_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT UNIQUE NOT NULL, -- 'form_submit', 'button_click', 'page_view', etc.
    event_category TEXT NOT NULL, -- 'engagement', 'conversion', 'ecommerce'
    
    -- GA4 Configuration
    ga4_enabled BOOLEAN DEFAULT 1,
    ga4_event_name TEXT, -- GA4 event name (can be different from internal)
    ga4_parameters TEXT, -- JSON of additional GA4 parameters
    
    -- Facebook Pixel Configuration  
    fb_enabled BOOLEAN DEFAULT 1,
    fb_event_name TEXT, -- Facebook event name
    fb_parameters TEXT, -- JSON of additional Facebook parameters
    
    -- Event Settings
    is_conversion BOOLEAN DEFAULT 0, -- Mark as conversion event
    conversion_value REAL DEFAULT 0, -- Default conversion value
    description TEXT,
    
    -- Management
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Event Logs Table
-- Store all tracked user events for analytics
CREATE TABLE IF NOT EXISTS user_event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Event Identification
    event_id TEXT NOT NULL, -- Unique event ID (UUID)
    event_name TEXT NOT NULL, -- Internal event name
    event_category TEXT NOT NULL, -- Event category
    
    -- User & Session Data
    user_identifier TEXT, -- User ID or session ID
    session_id TEXT,
    visitor_id TEXT, -- Unique visitor ID
    
    -- Event Details
    event_label TEXT, -- Event label/description
    event_value REAL, -- Numeric value (price, score, etc.)
    event_data TEXT, -- JSON of additional event data
    
    -- Page Context
    page_url TEXT NOT NULL,
    page_title TEXT,
    page_referrer TEXT,
    
    -- Element Context (for clicks, forms)
    element_id TEXT, -- HTML element ID
    element_class TEXT, -- HTML element classes
    element_text TEXT, -- Element text content
    element_type TEXT, -- Element type (button, form, link)
    
    -- User Context
    user_agent TEXT,
    ip_address TEXT,
    country_code TEXT,
    city TEXT,
    
    -- Timing Data
    page_load_time INTEGER, -- Page load time in milliseconds
    time_on_page INTEGER, -- Time spent on page in seconds
    scroll_depth INTEGER, -- Scroll depth percentage
    
    -- A/B Testing
    ab_test_id TEXT, -- A/B test identifier
    ab_variant TEXT, -- A/B test variant
    
    -- Conversion Tracking
    is_conversion BOOLEAN DEFAULT 0,
    conversion_type TEXT, -- 'lead', 'sale', 'signup', etc.
    conversion_value REAL,
    
    -- External Tracking IDs
    ga4_client_id TEXT, -- GA4 client ID
    fb_pixel_id TEXT, -- Facebook pixel ID
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    
    -- Metadata
    server_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    client_timestamp DATETIME,
    processed BOOLEAN DEFAULT 0, -- For batch processing
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Conversion Funnels Table
-- Track conversion funnel steps and performance
CREATE TABLE IF NOT EXISTS conversion_funnels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    funnel_name TEXT UNIQUE NOT NULL, -- 'service_request', 'newsletter_signup'
    funnel_description TEXT,
    
    -- Funnel Steps (JSON array)
    funnel_steps TEXT NOT NULL, -- JSON array of step configurations
    
    -- Funnel Settings
    is_active BOOLEAN DEFAULT 1,
    conversion_window_hours INTEGER DEFAULT 24, -- Conversion attribution window
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. User Journey Tracking Table  
-- Track complete user journeys and paths
CREATE TABLE IF NOT EXISTS user_journeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- User Identification
    user_identifier TEXT NOT NULL,
    session_id TEXT NOT NULL,
    journey_id TEXT NOT NULL, -- Unique journey ID
    
    -- Journey Details
    journey_start DATETIME NOT NULL,
    journey_end DATETIME,
    total_duration_seconds INTEGER,
    
    -- Journey Path (JSON array of page visits)
    journey_path TEXT, -- JSON array of pages with timestamps
    events_path TEXT, -- JSON array of events in chronological order
    
    -- Journey Classification
    journey_type TEXT, -- 'conversion', 'bounce', 'exploration', 'return'
    entry_page TEXT,
    exit_page TEXT,
    pages_visited INTEGER DEFAULT 1,
    events_triggered INTEGER DEFAULT 0,
    
    -- Conversion Data
    converted BOOLEAN DEFAULT 0,
    conversion_event TEXT, -- Event that led to conversion
    conversion_value REAL,
    
    -- Traffic Source
    traffic_source TEXT, -- 'organic', 'paid', 'social', 'direct', 'referral'
    utm_data TEXT, -- JSON of UTM parameters
    referrer TEXT,
    
    -- Device & Technical
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    browser TEXT,
    operating_system TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Real-time Event Metrics Table
-- Aggregated metrics for real-time dashboard
CREATE TABLE IF NOT EXISTS realtime_event_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Time Bucket
    time_bucket DATETIME NOT NULL, -- Hour/minute bucket for aggregation
    bucket_type TEXT NOT NULL, -- 'hour', 'minute', 'day'
    
    -- Event Metrics
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL,
    
    -- Counts
    event_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    
    -- Conversion Metrics
    conversion_count INTEGER DEFAULT 0,
    total_conversion_value REAL DEFAULT 0,
    conversion_rate REAL DEFAULT 0, -- Percentage
    
    -- Engagement Metrics
    avg_time_on_page REAL DEFAULT 0, -- Seconds
    avg_scroll_depth REAL DEFAULT 0, -- Percentage
    bounce_rate REAL DEFAULT 0, -- Percentage
    
    -- Traffic Sources
    organic_count INTEGER DEFAULT 0,
    paid_count INTEGER DEFAULT 0,
    social_count INTEGER DEFAULT 0,
    direct_count INTEGER DEFAULT 0,
    referral_count INTEGER DEFAULT 0,
    
    -- Device Breakdown
    desktop_count INTEGER DEFAULT 0,
    mobile_count INTEGER DEFAULT 0,
    tablet_count INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(time_bucket, bucket_type, event_name)
);

-- ====================================
-- INSERT DEFAULT EVENT CONFIGURATIONS
-- ====================================

INSERT OR REPLACE INTO event_tracking_config (
    event_name, event_category, ga4_event_name, ga4_parameters,
    fb_event_name, fb_parameters, is_conversion, conversion_value, description
) VALUES 
-- Form Events (High Priority Conversions)
('service_request_submit', 'conversion', 'generate_lead', 
 '{"service_type": "custom", "form_location": "main_page", "value": 50}',
 'Lead', '{"content_category": "service_request", "value": 50, "currency": "TRY"}', 
 1, 50.0, 'Hizmet talep formu gönderimi - Ana conversion event'),

('newsletter_signup', 'conversion', 'sign_up',
 '{"method": "newsletter", "value": 10}',
 'Subscribe', '{"content_category": "newsletter", "value": 10, "currency": "TRY"}',
 1, 10.0, 'Newsletter kayıt - Lead generation'),

('contact_form_submit', 'conversion', 'generate_lead',
 '{"form_type": "contact", "value": 25}', 
 'Contact', '{"content_category": "contact_form", "value": 25, "currency": "TRY"}',
 1, 25.0, 'İletişim formu gönderimi'),

-- Button Click Events (Engagement Tracking)
('phone_click', 'engagement', 'click',
 '{"link_class": "phone_link", "link_text": "phone_number"}',
 'Contact', '{"content_category": "phone_call"}',
 0, 0, 'Telefon numarası tıklama'),

('whatsapp_click', 'engagement', 'click',
 '{"link_class": "whatsapp_link", "link_text": "whatsapp"}',
 'Contact', '{"content_category": "whatsapp_message"}',
 0, 0, 'WhatsApp butonu tıklama'),

('service_category_click', 'engagement', 'select_content',
 '{"content_type": "service_category"}',
 'ViewContent', '{"content_category": "service_selection"}',
 0, 0, 'Hizmet kategorisi seçimi'),

('cta_button_click', 'engagement', 'click',
 '{"button_type": "cta", "button_location": "custom"}',
 'ClickButton', '{"content_category": "cta_engagement"}',
 0, 0, 'Call-to-Action butonu tıklama'),

-- Page Interaction Events
('scroll_milestone', 'engagement', 'scroll',
 '{"percent_scrolled": "custom"}',
 'PageView', '{"content_category": "page_engagement"}',
 0, 0, 'Sayfa kaydırma milestone'),

('video_play', 'engagement', 'video_start',
 '{"video_title": "custom", "video_provider": "youtube"}',
 'VideoPlay', '{"content_category": "video_engagement"}',
 0, 0, 'Video oynatma başlatma'),

('file_download', 'engagement', 'file_download',
 '{"file_name": "custom", "file_type": "custom"}',
 'Download', '{"content_category": "file_download"}',
 0, 0, 'Dosya indirme'),

-- E-commerce Style Events
('service_view', 'ecommerce', 'view_item',
 '{"item_category": "service", "item_name": "custom", "value": "custom"}',
 'ViewContent', '{"content_type": "service", "content_category": "service_catalog"}',
 0, 0, 'Hizmet detay görüntüleme'),

('quote_request', 'ecommerce', 'add_to_cart',
 '{"item_category": "service", "item_name": "custom", "value": "custom"}',
 'AddToCart', '{"content_type": "service", "value": "custom", "currency": "TRY"}',
 0, 0, 'Fiyat teklifi isteme'),

-- Page Performance Events
('page_load_complete', 'technical', 'page_view',
 '{"page_load_time": "custom", "page_title": "custom"}',
 'PageView', '{}',
 0, 0, 'Sayfa yükleme tamamlama'),

('error_occurred', 'technical', 'exception',
 '{"description": "custom", "fatal": false}',
 '', '{}',
 0, 0, 'Hata oluşması'),

-- Search Events  
('site_search', 'engagement', 'search',
 '{"search_term": "custom", "search_results": "custom"}',
 'Search', '{"content_category": "site_search"}',
 0, 0, 'Site içi arama yapma');

-- ====================================
-- INSERT DEFAULT CONVERSION FUNNELS
-- ====================================

INSERT OR REPLACE INTO conversion_funnels (
    funnel_name, funnel_description, funnel_steps, conversion_window_hours
) VALUES 
-- Service Request Funnel
('service_request_funnel', 'Hizmet talep süreci conversion funnel',
 '[
   {"step": 1, "event": "page_view", "page": "/", "name": "Landing Page Visit"},
   {"step": 2, "event": "service_category_click", "name": "Service Selection"},
   {"step": 3, "event": "service_view", "name": "Service Details View"},
   {"step": 4, "event": "service_request_submit", "name": "Request Submission", "conversion": true}
 ]', 24),

-- Newsletter Signup Funnel
('newsletter_funnel', 'Newsletter kayıt conversion funnel',
 '[
   {"step": 1, "event": "page_view", "name": "Page Visit"},
   {"step": 2, "event": "scroll_milestone", "data": {"scroll_depth": ">= 50"}, "name": "Engaged Reading"},
   {"step": 3, "event": "newsletter_signup", "name": "Newsletter Signup", "conversion": true}
 ]', 2),

-- Contact Funnel
('contact_funnel', 'İletişim conversion funnel',
 '[
   {"step": 1, "event": "page_view", "name": "Page Visit"},
   {"step": 2, "event": "phone_click", "name": "Phone Interest", "alternative": "whatsapp_click"},
   {"step": 3, "event": "contact_form_submit", "name": "Contact Form Submit", "conversion": true}
 ]', 1);

-- ====================================
-- CREATE INDEXES FOR PERFORMANCE
-- ====================================

CREATE INDEX IF NOT EXISTS idx_user_event_logs_user ON user_event_logs(user_identifier);
CREATE INDEX IF NOT EXISTS idx_user_event_logs_session ON user_event_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_event_logs_event ON user_event_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_user_event_logs_timestamp ON user_event_logs(server_timestamp);
CREATE INDEX IF NOT EXISTS idx_user_event_logs_conversion ON user_event_logs(is_conversion);
CREATE INDEX IF NOT EXISTS idx_user_event_logs_page ON user_event_logs(page_url);

CREATE INDEX IF NOT EXISTS idx_user_journeys_user ON user_journeys(user_identifier);
CREATE INDEX IF NOT EXISTS idx_user_journeys_session ON user_journeys(session_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_converted ON user_journeys(converted);
CREATE INDEX IF NOT EXISTS idx_user_journeys_start ON user_journeys(journey_start);

CREATE INDEX IF NOT EXISTS idx_realtime_metrics_bucket ON realtime_event_metrics(time_bucket, bucket_type);
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_event ON realtime_event_metrics(event_name, event_category);

-- ====================================
-- VIEWS FOR ANALYTICS QUERIES
-- ====================================

-- Recent Events View (Last 24 Hours)
CREATE VIEW IF NOT EXISTS recent_events_24h AS
SELECT 
    event_name,
    event_category,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_identifier) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    SUM(CASE WHEN is_conversion = 1 THEN 1 ELSE 0 END) as conversions,
    AVG(time_on_page) as avg_time_on_page,
    AVG(scroll_depth) as avg_scroll_depth
FROM user_event_logs 
WHERE server_timestamp >= datetime('now', '-24 hours')
GROUP BY event_name, event_category
ORDER BY event_count DESC;

-- Top Pages by Events
CREATE VIEW IF NOT EXISTS top_pages_by_events AS
SELECT 
    page_url,
    page_title,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_identifier) as unique_visitors,
    COUNT(DISTINCT session_id) as sessions,
    SUM(CASE WHEN is_conversion = 1 THEN 1 ELSE 0 END) as conversions,
    ROUND(AVG(time_on_page), 2) as avg_time_on_page,
    ROUND(AVG(scroll_depth), 2) as avg_scroll_depth
FROM user_event_logs 
WHERE server_timestamp >= datetime('now', '-7 days')
GROUP BY page_url, page_title
ORDER BY total_events DESC
LIMIT 50;

-- Conversion Events Summary
CREATE VIEW IF NOT EXISTS conversion_events_summary AS
SELECT 
    event_name,
    event_category,
    COUNT(*) as conversion_count,
    COUNT(DISTINCT user_identifier) as unique_converters,
    SUM(conversion_value) as total_value,
    AVG(conversion_value) as avg_value,
    MIN(server_timestamp) as first_conversion,
    MAX(server_timestamp) as last_conversion
FROM user_event_logs 
WHERE is_conversion = 1 
AND server_timestamp >= datetime('now', '-30 days')
GROUP BY event_name, event_category
ORDER BY conversion_count DESC;

-- ====================================
-- MIGRATION COMPLETED
-- ====================================