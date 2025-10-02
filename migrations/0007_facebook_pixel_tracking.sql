-- Facebook Pixel Enhanced Event Tracking Tables
-- Migration 0007: Facebook Pixel tracking system

-- Facebook Pixel Events tracking
CREATE TABLE IF NOT EXISTS facebook_pixel_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pixel_event_type TEXT NOT NULL,           -- Lead, Purchase, ViewContent, etc.
  event_data TEXT,                          -- JSON data for event parameters
  conversion_value REAL DEFAULT 0,          -- Monetary value of the conversion
  currency TEXT DEFAULT 'TRY',             -- Currency code
  audience_segment TEXT DEFAULT 'general',  -- Audience segmentation
  funnel_stage TEXT,                        -- awareness, interest, consideration, intent, conversion
  user_agent TEXT,                          -- User agent string
  ip_address TEXT,                          -- IP address for attribution
  page_url TEXT,                           -- Page URL where event occurred
  timestamp TEXT,                          -- Event timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Facebook Pixel Conversion Value Optimization
CREATE TABLE IF NOT EXISTS fb_conversion_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversion_type TEXT NOT NULL,           -- service_quote, service_booking, etc.
  conversion_value REAL NOT NULL,          -- Monetary value
  currency TEXT DEFAULT 'TRY',            -- Currency code
  service_category TEXT,                   -- Service category for the conversion
  customer_segment TEXT DEFAULT 'general', -- Customer segment
  optimization_target TEXT DEFAULT 'conversions', -- Facebook optimization target
  attribution_window TEXT DEFAULT '7_days', -- Attribution window
  conversion_timestamp TEXT,               -- When conversion occurred
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Facebook Pixel Audience Segmentation
CREATE TABLE IF NOT EXISTS fb_audience_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_type TEXT NOT NULL,              -- high_intent_users, repeat_visitors, etc.
  segment_criteria TEXT DEFAULT 'behavioral', -- Segmentation criteria
  engagement_score INTEGER DEFAULT 0,      -- 0-100 engagement score
  retargeting_priority TEXT DEFAULT 'medium', -- high, medium, low priority
  audience_data TEXT,                      -- JSON data for audience characteristics
  user_agent TEXT,                        -- User agent for device targeting
  ip_address TEXT,                        -- IP for geo-targeting
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_facebook_pixel_events_type ON facebook_pixel_events(pixel_event_type);
CREATE INDEX IF NOT EXISTS idx_facebook_pixel_events_created_at ON facebook_pixel_events(created_at);
CREATE INDEX IF NOT EXISTS idx_facebook_pixel_events_funnel_stage ON facebook_pixel_events(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_facebook_pixel_events_audience_segment ON facebook_pixel_events(audience_segment);

CREATE INDEX IF NOT EXISTS idx_fb_conversion_values_type ON fb_conversion_values(conversion_type);
CREATE INDEX IF NOT EXISTS idx_fb_conversion_values_created_at ON fb_conversion_values(created_at);
CREATE INDEX IF NOT EXISTS idx_fb_conversion_values_service_category ON fb_conversion_values(service_category);

CREATE INDEX IF NOT EXISTS idx_fb_audience_segments_type ON fb_audience_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_fb_audience_segments_created_at ON fb_audience_segments(created_at);
CREATE INDEX IF NOT EXISTS idx_fb_audience_segments_priority ON fb_audience_segments(retargeting_priority);
CREATE INDEX IF NOT EXISTS idx_fb_audience_segments_engagement ON fb_audience_segments(engagement_score);

-- Sample Facebook Pixel configuration data
INSERT OR IGNORE INTO tracking_config (config_key, config_value, config_category, is_active) VALUES
('facebook_pixel_id', 'YOUR_PIXEL_ID_HERE', 'facebook', 0),
('facebook_pixel_enabled', 'false', 'facebook', 0),
('facebook_access_token', '', 'facebook', 0),
('facebook_conversion_api_enabled', 'false', 'facebook', 0),
('facebook_custom_event_mappings', '{}', 'facebook', 0),
('facebook_audience_settings', '{"lookalike_countries": ["TR"], "retention_days": 30}', 'facebook', 1),
('facebook_optimization_goals', '{"primary": "conversions", "secondary": "lead_generation"}', 'facebook', 1);

-- Update tracking_config table with is_sensitive column if not exists
-- This allows secure storage of sensitive data like API keys
ALTER TABLE tracking_config ADD COLUMN is_sensitive INTEGER DEFAULT 0;

-- Mark sensitive configurations (only update existing ones)
UPDATE tracking_config SET is_sensitive = 1 WHERE config_key = 'facebook_access_token';
UPDATE tracking_config SET is_sensitive = 1 WHERE config_key LIKE '%api_key%';
UPDATE tracking_config SET is_sensitive = 1 WHERE config_key LIKE '%secret%';
UPDATE tracking_config SET is_sensitive = 1 WHERE config_key LIKE '%token%';