-- Dynamic Meta Tags System
-- Migration 0011: SEO Optimization with Dynamic Meta Tag Management

-- Dynamic Meta Tags Configuration Table
CREATE TABLE IF NOT EXISTS dynamic_meta_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_type TEXT NOT NULL,
  page_identifier TEXT,
  language_code TEXT DEFAULT 'tr',
  
  -- Basic Meta Tags
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  canonical_url TEXT,
  
  -- Open Graph Meta Tags
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  og_url TEXT,
  og_type TEXT DEFAULT 'website',
  og_site_name TEXT DEFAULT 'GARANTOR360',
  og_locale TEXT DEFAULT 'tr_TR',
  
  -- Twitter Card Meta Tags
  twitter_card TEXT DEFAULT 'summary_large_image',
  twitter_site TEXT DEFAULT '@garantor360',
  twitter_creator TEXT DEFAULT '@garantor360',
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT,
  
  -- Advanced SEO Meta Tags
  robots_meta TEXT DEFAULT 'index,follow',
  viewport_meta TEXT DEFAULT 'width=device-width, initial-scale=1.0',
  author TEXT DEFAULT 'GARANTOR360',
  generator TEXT DEFAULT 'GARANTOR360 Smart Analytics Platform',
  
  -- Hreflang for Multi-language/Multi-location
  hreflang_data TEXT,
  
  -- Business-specific Meta Tags
  business_hours TEXT,
  service_area TEXT,
  price_range TEXT,
  contact_phone TEXT,
  
  -- Performance and Tracking
  priority_score INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  auto_generate BOOLEAN DEFAULT FALSE,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Admin tracking
  created_by TEXT DEFAULT 'system',
  updated_by TEXT DEFAULT 'system',
  notes TEXT,
  
  UNIQUE(page_type, page_identifier, language_code)
);

-- SEO Performance Tracking Table
CREATE TABLE IF NOT EXISTS seo_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meta_tag_id INTEGER REFERENCES dynamic_meta_tags(id),
  page_url TEXT NOT NULL,
  
  -- Performance Metrics
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  bounce_rate REAL DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0,
  
  -- SEO Metrics
  search_impressions INTEGER DEFAULT 0,
  search_clicks INTEGER DEFAULT 0,
  average_position REAL DEFAULT 0,
  click_through_rate REAL DEFAULT 0,
  
  -- Social Sharing Metrics
  facebook_shares INTEGER DEFAULT 0,
  twitter_shares INTEGER DEFAULT 0,
  linkedin_shares INTEGER DEFAULT 0,
  whatsapp_shares INTEGER DEFAULT 0,
  
  -- Date tracking
  date_recorded DATE DEFAULT (DATE('now')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(meta_tag_id, date_recorded)
);

-- Meta Tag Templates for Auto-generation
CREATE TABLE IF NOT EXISTS meta_tag_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT UNIQUE NOT NULL,
  page_type TEXT NOT NULL,
  
  -- Template Patterns (using {variables})
  title_template TEXT,
  description_template TEXT,
  keywords_template TEXT,
  
  og_title_template TEXT,
  og_description_template TEXT,
  
  twitter_title_template TEXT,
  twitter_description_template TEXT,
  
  -- Variable definitions for templates
  available_variables TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Meta Tag Variables/Content Source
CREATE TABLE IF NOT EXISTS meta_variables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variable_key TEXT UNIQUE NOT NULL,
  variable_type TEXT DEFAULT 'list',
  variable_data TEXT NOT NULL,
  description TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Site-wide SEO Configuration
CREATE TABLE IF NOT EXISTS seo_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  config_type TEXT DEFAULT 'string',
  config_category TEXT DEFAULT 'general',
  description TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_meta_tags_page ON dynamic_meta_tags(page_type, page_identifier);
CREATE INDEX IF NOT EXISTS idx_meta_tags_active ON dynamic_meta_tags(is_active, priority_score);
CREATE INDEX IF NOT EXISTS idx_meta_tags_language ON dynamic_meta_tags(language_code);

CREATE INDEX IF NOT EXISTS idx_seo_performance_meta ON seo_performance(meta_tag_id);
CREATE INDEX IF NOT EXISTS idx_seo_performance_date ON seo_performance(date_recorded);
CREATE INDEX IF NOT EXISTS idx_seo_performance_url ON seo_performance(page_url);

CREATE INDEX IF NOT EXISTS idx_meta_templates_type ON meta_tag_templates(page_type);
CREATE INDEX IF NOT EXISTS idx_meta_templates_active ON meta_tag_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_meta_variables_key ON meta_variables(variable_key);
CREATE INDEX IF NOT EXISTS idx_seo_config_key ON seo_config(config_key);
CREATE INDEX IF NOT EXISTS idx_seo_config_category ON seo_config(config_category);