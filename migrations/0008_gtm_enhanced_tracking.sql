-- Google Tag Manager Enhanced Tracking Tables
-- Migration 0008: GTM container, events, tags, and dataLayer management

-- GTM Events tracking for dataLayer pushes
CREATE TABLE IF NOT EXISTS gtm_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,                -- service_request_submit, contact_interaction, etc.
  event_data TEXT,                         -- JSON data for event parameters
  datalayer_push TEXT,                     -- Complete dataLayer push object
  gtm_event_id TEXT,                       -- Unique GTM event identifier
  user_agent TEXT,                         -- User agent string
  ip_address TEXT,                         -- IP address for attribution
  page_url TEXT,                          -- Page URL where event occurred
  timestamp TEXT,                         -- Event timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GTM Tags configuration management
CREATE TABLE IF NOT EXISTS gtm_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_name TEXT NOT NULL,                  -- Tag name in GTM
  tag_type TEXT NOT NULL,                  -- GA4, Facebook Pixel, Custom HTML, etc.
  tag_config TEXT,                         -- JSON configuration for the tag
  triggers TEXT,                           -- JSON array of trigger configurations
  variables TEXT,                          -- JSON object of variable configurations
  is_enabled INTEGER DEFAULT 1,           -- Whether tag is active
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GTM Triggers configuration
CREATE TABLE IF NOT EXISTS gtm_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_name TEXT NOT NULL,              -- Trigger name in GTM
  trigger_type TEXT NOT NULL,              -- Page View, Click, Form Submit, etc.
  trigger_config TEXT,                     -- JSON trigger configuration
  conditions TEXT,                         -- JSON conditions for trigger firing
  is_enabled INTEGER DEFAULT 1,           -- Whether trigger is active
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GTM Variables configuration  
CREATE TABLE IF NOT EXISTS gtm_variables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variable_name TEXT NOT NULL,             -- Variable name in GTM
  variable_type TEXT NOT NULL,             -- Data Layer Variable, Constant, etc.
  variable_config TEXT,                    -- JSON variable configuration
  default_value TEXT,                      -- Default value if variable not found
  is_enabled INTEGER DEFAULT 1,           -- Whether variable is active
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GTM DataLayer Events for advanced tracking
CREATE TABLE IF NOT EXISTS gtm_datalayer_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  push_id TEXT,                           -- Unique identifier for dataLayer push
  event_sequence INTEGER,                 -- Order of events in session
  event_category TEXT,                    -- lead_generation, engagement, etc.
  event_properties TEXT,                  -- JSON properties pushed to dataLayer
  user_session_id TEXT,                   -- Session identifier
  conversion_value REAL DEFAULT 0,        -- Associated conversion value
  attribution_data TEXT,                  -- JSON attribution information
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_gtm_events_name ON gtm_events(event_name);
CREATE INDEX IF NOT EXISTS idx_gtm_events_created_at ON gtm_events(created_at);
CREATE INDEX IF NOT EXISTS idx_gtm_events_gtm_id ON gtm_events(gtm_event_id);

CREATE INDEX IF NOT EXISTS idx_gtm_tags_name ON gtm_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_gtm_tags_type ON gtm_tags(tag_type);
CREATE INDEX IF NOT EXISTS idx_gtm_tags_enabled ON gtm_tags(is_enabled);

CREATE INDEX IF NOT EXISTS idx_gtm_triggers_name ON gtm_triggers(trigger_name);
CREATE INDEX IF NOT EXISTS idx_gtm_triggers_type ON gtm_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_gtm_triggers_enabled ON gtm_triggers(is_enabled);

CREATE INDEX IF NOT EXISTS idx_gtm_variables_name ON gtm_variables(variable_name);
CREATE INDEX IF NOT EXISTS idx_gtm_variables_type ON gtm_variables(variable_type);

CREATE INDEX IF NOT EXISTS idx_gtm_datalayer_events_push_id ON gtm_datalayer_events(push_id);
CREATE INDEX IF NOT EXISTS idx_gtm_datalayer_events_created_at ON gtm_datalayer_events(created_at);
CREATE INDEX IF NOT EXISTS idx_gtm_datalayer_events_category ON gtm_datalayer_events(event_category);

-- Sample GTM configuration data
INSERT OR IGNORE INTO tracking_config (config_key, config_value, config_category, is_active) VALUES
('gtm_container_id', 'GTM-XXXXXXX', 'gtm', 0),
('gtm_container_name', 'GARANTOR360 Container', 'gtm', 0),
('gtm_enabled', 'false', 'gtm', 0),
('gtm_datalayer_config', '{"enhanced_ecommerce": true, "custom_events": true, "user_journey_tracking": true}', 'gtm', 1),
('gtm_tag_settings', '{"ga4_config": true, "facebook_pixel": true, "custom_html": true}', 'gtm', 1),
('gtm_trigger_settings', '{"page_view": true, "form_submit": true, "click_tracking": true, "scroll_tracking": true}', 'gtm', 1),
('gtm_variable_settings', '{"datalayer_variables": true, "custom_javascript": true, "constants": true}', 'gtm', 1);

-- Sample GTM Tags configuration
INSERT OR IGNORE INTO gtm_tags (tag_name, tag_type, tag_config, triggers, variables, is_enabled) VALUES
('GA4 Configuration Tag', 'google_analytics_ga4_config', 
 '{"measurement_id": "G-XXXXXXXXXX", "enhanced_measurement": true, "page_view": true}',
 '["All Pages"]', 
 '{"ga4_measurement_id": "{{GA4 Measurement ID}}"}', 1),

('Facebook Pixel Base Code', 'custom_html',
 '{"html": "<script>fbq(\"init\", \"{{Facebook Pixel ID}}\"); fbq(\"track\", \"PageView\");</script>"}',
 '["All Pages"]',
 '{"facebook_pixel_id": "{{Facebook Pixel ID}}"}', 1),

('Service Request Event Tag', 'google_analytics_ga4_event',
 '{"event_name": "service_request_submit", "parameters": {"event_category": "lead_generation"}}',
 '["Service Form Submit"]',
 '{"service_category": "{{DLV - Service Category}}", "conversion_value": "{{DLV - Conversion Value}}"}', 1),

('Contact Interaction Tag', 'google_analytics_ga4_event',
 '{"event_name": "contact_interaction", "parameters": {"event_category": "engagement"}}',
 '["Contact Button Click"]',
 '{"contact_method": "{{DLV - Contact Method}}"}', 1),

('Enhanced E-commerce Purchase Tag', 'google_analytics_ga4_event',
 '{"event_name": "purchase", "parameters": {"currency": "TRY", "value": "{{DLV - Purchase Value}}"}}',
 '["Purchase Trigger"]',
 '{"transaction_id": "{{DLV - Transaction ID}}", "items": "{{DLV - Items}}"}', 1);

-- Sample GTM Triggers configuration
INSERT OR IGNORE INTO gtm_triggers (trigger_name, trigger_type, trigger_config, conditions, is_enabled) VALUES
('All Pages', 'page_view', 
 '{"type": "PAGE_VIEW", "filter": []}', 
 '{"page_path": {"matches": ".*"}}', 1),

('Service Form Submit', 'form_submit',
 '{"type": "FORM_SUBMIT", "wait_for_tags": true, "check_validation": true}',
 '{"form_id": {"equals": "serviceRequestForm"}}', 1),

('Contact Button Click', 'click_all_elements',
 '{"type": "CLICK", "wait_for_tags": true}',
 '{"click_url": {"matches": "(tel:|whatsapp|wa.me|mailto:).*"}}', 1),

('Scroll Depth 75%', 'scroll_depth',
 '{"type": "SCROLL_DEPTH", "vertical_threshold_percentage": 75}',
 '{"page_path": {"matches": ".*"}}', 1),

('AI Chat Button Click', 'click_all_elements',
 '{"type": "CLICK", "wait_for_tags": true}',
 '{"element_id": {"equals": "aiChatButton"}}', 1),

('Purchase Trigger', 'custom_event',
 '{"type": "CUSTOM_EVENT", "event_name": "purchase"}',
 '{"event_category": {"equals": "ecommerce"}}', 1);

-- Sample GTM Variables configuration
INSERT OR IGNORE INTO gtm_variables (variable_name, variable_type, variable_config, default_value, is_enabled) VALUES
('GA4 Measurement ID', 'constant', 
 '{"value": "G-XXXXXXXXXX"}', 'G-XXXXXXXXXX', 1),

('Facebook Pixel ID', 'constant',
 '{"value": "123456789012345"}', '123456789012345', 1),

('DLV - Service Category', 'data_layer_variable',
 '{"data_layer_variable_name": "service_category", "default_value": "unknown"}', 'unknown', 1),

('DLV - Contact Method', 'data_layer_variable',
 '{"data_layer_variable_name": "contact_method", "default_value": "unknown"}', 'unknown', 1),

('DLV - Conversion Value', 'data_layer_variable',
 '{"data_layer_variable_name": "conversion_value", "default_value": "0"}', '0', 1),

('DLV - Transaction ID', 'data_layer_variable',
 '{"data_layer_variable_name": "transaction_id", "default_value": ""}', '', 1),

('DLV - Items', 'data_layer_variable',
 '{"data_layer_variable_name": "items", "default_value": "[]"}', '[]', 1),

('Page Path', 'url',
 '{"component_type": "PATH"}', '', 1),

('Page URL', 'url',
 '{"component_type": "URL"}', '', 1),

('Referrer', 'referrer',
 '{"component_type": "URL"}', '', 1);