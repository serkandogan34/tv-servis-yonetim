-- Analytics events tracking table for GA4 and digital tracking system
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  event_category TEXT,
  event_label TEXT,
  event_data TEXT, -- JSON format for event parameters
  page_location TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_ip TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics configuration table for storing GA4, Facebook Pixel, GTM settings
CREATE TABLE IF NOT EXISTS analytics_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_type TEXT NOT NULL, -- 'ga4', 'facebook_pixel', 'gtm'
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(config_type, config_key)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_config_type ON analytics_config(config_type);

-- Insert default analytics configurations
INSERT OR IGNORE INTO analytics_config (config_type, config_key, config_value, is_active) VALUES 
  ('ga4', 'measurement_id', 'G-XXXXXXXXXX', 0),
  ('facebook_pixel', 'pixel_id', 'YOUR_PIXEL_ID_HERE', 0),
  ('gtm', 'container_id', 'GTM-XXXXXXX', 0),
  ('general', 'analytics_enabled', '1', 1),
  ('general', 'cookie_consent_enabled', '1', 1);