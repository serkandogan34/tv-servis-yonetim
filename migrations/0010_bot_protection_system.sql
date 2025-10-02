-- Bot Protection System Tables
-- Migration 0010: Advanced Bot Detection and IP Protection

-- IP Protection and Blocking Table
CREATE TABLE IF NOT EXISTS ip_protection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT UNIQUE NOT NULL,
  country_code TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  threat_level INTEGER DEFAULT 0, -- 0-100 threat score
  block_reason TEXT,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  request_count INTEGER DEFAULT 1,
  failed_attempts INTEGER DEFAULT 0,
  expires_at DATETIME,
  created_by TEXT DEFAULT 'system',
  notes TEXT
);

-- Request Logs for Pattern Analysis
CREATE TABLE IF NOT EXISTS request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_headers TEXT, -- JSON string
  request_body TEXT,
  response_status INTEGER,
  response_time INTEGER, -- milliseconds
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Bot Detection Metrics
  mouse_movements INTEGER DEFAULT 0,
  keyboard_events INTEGER DEFAULT 0,
  scroll_events INTEGER DEFAULT 0,
  click_events INTEGER DEFAULT 0,
  session_duration INTEGER DEFAULT 0, -- seconds
  page_views INTEGER DEFAULT 1,
  
  -- Behavioral Analysis
  human_score REAL DEFAULT 0, -- 0-100 human likelihood
  bot_indicators TEXT, -- JSON array of detected indicators
  is_suspicious BOOLEAN DEFAULT FALSE,
  
  -- Google Ads Protection
  gclid TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  ad_click_validated BOOLEAN DEFAULT FALSE
);

-- Bot Detection Events
CREATE TABLE IF NOT EXISTS bot_detections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  detection_type TEXT NOT NULL, -- 'behavioral', 'fingerprint', 'pattern', 'ad_fraud'
  confidence_score REAL NOT NULL, -- 0-100
  indicators TEXT NOT NULL, -- JSON array of specific indicators
  user_agent TEXT,
  request_fingerprint TEXT,
  
  -- Behavioral Data
  mouse_entropy REAL,
  click_patterns TEXT, -- JSON
  timing_patterns TEXT, -- JSON
  navigation_patterns TEXT, -- JSON
  
  -- Action Taken
  action_taken TEXT, -- 'logged', 'warned', 'blocked', 'challenged'
  blocked_duration INTEGER, -- minutes
  
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Schema.org Data Cache
CREATE TABLE IF NOT EXISTS schema_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_type TEXT NOT NULL, -- 'homepage', 'service', 'contact', 'about'
  service_key TEXT, -- for service-specific schemas
  schema_type TEXT NOT NULL, -- 'LocalBusiness', 'Service', 'FAQ', 'Organization'
  schema_data TEXT NOT NULL, -- JSON string
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  
  UNIQUE(page_type, service_key, schema_type)
);

-- System Configuration for Security
CREATE TABLE IF NOT EXISTS security_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  config_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_ip_protection_ip ON ip_protection(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_protection_blocked ON ip_protection(is_blocked, threat_level);
CREATE INDEX IF NOT EXISTS idx_ip_protection_activity ON ip_protection(last_activity);

CREATE INDEX IF NOT EXISTS idx_request_logs_ip ON request_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_request_logs_suspicious ON request_logs(is_suspicious);
CREATE INDEX IF NOT EXISTS idx_request_logs_gclid ON request_logs(gclid);

CREATE INDEX IF NOT EXISTS idx_bot_detections_ip ON bot_detections(ip_address);
CREATE INDEX IF NOT EXISTS idx_bot_detections_type ON bot_detections(detection_type);
CREATE INDEX IF NOT EXISTS idx_bot_detections_confidence ON bot_detections(confidence_score);
CREATE INDEX IF NOT EXISTS idx_bot_detections_timestamp ON bot_detections(timestamp);

CREATE INDEX IF NOT EXISTS idx_schema_cache_page ON schema_cache(page_type, service_key);
CREATE INDEX IF NOT EXISTS idx_schema_cache_active ON schema_cache(is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_security_config_key ON security_config(config_key);
CREATE INDEX IF NOT EXISTS idx_security_config_active ON security_config(is_active);

-- Insert Default Security Configuration
INSERT OR IGNORE INTO security_config (config_key, config_value, config_type, description) VALUES
-- Bot Protection Thresholds
('bot_detection_threshold', '70', 'number', 'Minimum confidence score to flag as bot (0-100)'),
('auto_block_threshold', '85', 'number', 'Minimum confidence score for automatic IP blocking'),
('human_score_threshold', '40', 'number', 'Minimum human score to pass validation (0-100)'),

-- Request Rate Limits
('max_requests_per_minute', '60', 'number', 'Maximum requests per IP per minute'),
('max_requests_per_hour', '1000', 'number', 'Maximum requests per IP per hour'),
('suspicious_request_threshold', '100', 'number', 'Requests per minute to flag as suspicious'),

-- Ad Click Protection
('ad_click_validation_enabled', 'true', 'boolean', 'Enable Google Ads click validation'),
('max_ad_clicks_per_ip', '5', 'number', 'Maximum ad clicks per IP per day'),
('ad_click_cooldown_seconds', '30', 'number', 'Minimum seconds between ad clicks from same IP'),

-- Geographic Blocking
('blocked_countries', '[]', 'json', 'Array of country codes to block'),
('high_risk_countries', '[]', 'json', 'Array of country codes requiring extra validation'),

-- Behavioral Analysis
('mouse_movement_weight', '25', 'number', 'Weight of mouse movements in human score (0-100)'),
('keyboard_interaction_weight', '30', 'number', 'Weight of keyboard events in human score (0-100)'),
('scroll_behavior_weight', '20', 'number', 'Weight of scroll patterns in human score (0-100)'),
('timing_analysis_weight', '25', 'number', 'Weight of timing patterns in human score (0-100)'),

-- System Settings
('log_retention_days', '30', 'number', 'Days to keep request logs'),
('block_duration_minutes', '60', 'number', 'Default IP block duration in minutes'),
('challenge_enabled', 'false', 'boolean', 'Enable CAPTCHA challenges for suspicious users'),
('notification_webhook', '', 'string', 'Webhook URL for security notifications');

-- Insert Default Schema Templates
INSERT OR IGNORE INTO schema_cache (page_type, schema_type, schema_data, expires_at) VALUES
('homepage', 'Organization', '{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "GARANTOR360",
  "url": "https://garantor360.pages.dev",
  "logo": "https://garantor360.pages.dev/static/logo.png",
  "description": "Türkiye''nin en kapsamlı TV servisi ve ev hizmetleri analitik platformu",
  "foundingDate": "2024",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+90-xxx-xxx-xxxx",
    "contactType": "customer service",
    "availableLanguage": "Turkish"
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "İstanbul",
    "addressCountry": "TR"
  },
  "sameAs": [
    "https://facebook.com/garantor360",
    "https://instagram.com/garantor360"
  ]
}', datetime('now', '+30 days')),

('homepage', 'LocalBusiness', '{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "GARANTOR360 TV Servisi",
  "image": "https://garantor360.pages.dev/static/tv-repair.jpg",
  "description": "Profesyonel TV tamiri ve ev elektronik cihazları servisi",
  "telephone": "+90-xxx-xxx-xxxx",
  "priceRange": "₺₺",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Ana Cadde No:123",
    "addressLocality": "İstanbul",
    "postalCode": "34000",
    "addressCountry": "TR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "41.0082",
    "longitude": "28.9784"
  },
  "openingHours": "Mo-Fr 09:00-18:00, Sa 09:00-15:00",
  "serviceArea": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": "41.0082",
      "longitude": "28.9784"
    },
    "geoRadius": "50000"
  }
}', datetime('now', '+30 days'));