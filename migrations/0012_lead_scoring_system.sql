-- Lead Scoring System Migration
-- This migration creates tables for advanced lead qualification and scoring

-- Lead profiles table for comprehensive lead information
CREATE TABLE IF NOT EXISTS lead_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_uuid TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  name TEXT,
  company TEXT,
  service_interest TEXT, -- TV tamiri, beyaz eşya, etc.
  location TEXT,
  source TEXT, -- organic, google_ads, facebook, referral
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  first_touch_url TEXT,
  first_touch_timestamp DATETIME,
  last_activity_timestamp DATETIME,
  total_sessions INTEGER DEFAULT 1,
  total_page_views INTEGER DEFAULT 1,
  total_time_spent INTEGER DEFAULT 0, -- in seconds
  lead_status TEXT DEFAULT 'new', -- new, contacted, qualified, converted, lost
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lead scoring events table for tracking individual scoring activities
CREATE TABLE IF NOT EXISTS lead_scoring_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_uuid TEXT NOT NULL,
  event_type TEXT NOT NULL, -- page_view, form_fill, email_open, phone_call, etc.
  event_category TEXT, -- engagement, interest, intent, fit
  score_change INTEGER, -- positive or negative score change
  score_reason TEXT, -- explanation for the score change
  event_data TEXT, -- JSON data for the event
  page_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_uuid) REFERENCES lead_profiles(lead_uuid)
);

-- Lead scores table for current lead scoring status
CREATE TABLE IF NOT EXISTS lead_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_uuid TEXT UNIQUE NOT NULL,
  demographic_score INTEGER DEFAULT 0, -- 0-25 points based on fit
  behavioral_score INTEGER DEFAULT 0, -- 0-40 points based on engagement
  interest_score INTEGER DEFAULT 0, -- 0-25 points based on interest level
  intent_score INTEGER DEFAULT 0, -- 0-10 points based on buying intent
  total_score INTEGER DEFAULT 0, -- sum of all scores (0-100)
  score_grade TEXT DEFAULT 'Cold', -- Cold, Warm, Hot, Qualified
  last_calculated DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_qualified BOOLEAN DEFAULT FALSE,
  qualification_timestamp DATETIME,
  notes TEXT,
  FOREIGN KEY (lead_uuid) REFERENCES lead_profiles(lead_uuid)
);

-- Lead scoring rules configuration
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_name TEXT NOT NULL,
  rule_category TEXT NOT NULL, -- demographic, behavioral, interest, intent
  trigger_event TEXT NOT NULL, -- what triggers this rule
  trigger_conditions TEXT, -- JSON conditions for the rule
  score_value INTEGER NOT NULL, -- points to add/subtract
  max_applications INTEGER DEFAULT 1, -- how many times this rule can be applied
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lead conversion tracking
CREATE TABLE IF NOT EXISTS lead_conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_uuid TEXT NOT NULL,
  conversion_type TEXT NOT NULL, -- service_booking, phone_call, form_submit, email_signup
  conversion_value DECIMAL(10,2) DEFAULT 0.00,
  service_category TEXT,
  conversion_data TEXT, -- JSON data for conversion details
  attribution_source TEXT,
  conversion_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_uuid) REFERENCES lead_profiles(lead_uuid)
);

-- Lead communication log
CREATE TABLE IF NOT EXISTS lead_communications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_uuid TEXT NOT NULL,
  communication_type TEXT NOT NULL, -- email, sms, phone_call, whatsapp
  direction TEXT NOT NULL, -- inbound, outbound
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'sent', -- sent, delivered, opened, clicked, replied, failed
  communication_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  response_timestamp DATETIME,
  metadata TEXT, -- JSON for additional data
  FOREIGN KEY (lead_uuid) REFERENCES lead_profiles(lead_uuid)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_lead_profiles_email ON lead_profiles(email);
CREATE INDEX IF NOT EXISTS idx_lead_profiles_phone ON lead_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_lead_profiles_service_interest ON lead_profiles(service_interest);
CREATE INDEX IF NOT EXISTS idx_lead_profiles_lead_status ON lead_profiles(lead_status);
CREATE INDEX IF NOT EXISTS idx_lead_profiles_source ON lead_profiles(source);
CREATE INDEX IF NOT EXISTS idx_lead_profiles_location ON lead_profiles(location);
CREATE INDEX IF NOT EXISTS idx_lead_profiles_created_at ON lead_profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_lead_scoring_events_lead_uuid ON lead_scoring_events(lead_uuid);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_events_event_type ON lead_scoring_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_events_created_at ON lead_scoring_events(created_at);

CREATE INDEX IF NOT EXISTS idx_lead_scores_total_score ON lead_scores(total_score);
CREATE INDEX IF NOT EXISTS idx_lead_scores_score_grade ON lead_scores(score_grade);
CREATE INDEX IF NOT EXISTS idx_lead_scores_is_qualified ON lead_scores(is_qualified);

CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_rule_category ON lead_scoring_rules(rule_category);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_trigger_event ON lead_scoring_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_is_active ON lead_scoring_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_lead_conversions_lead_uuid ON lead_conversions(lead_uuid);
CREATE INDEX IF NOT EXISTS idx_lead_conversions_conversion_type ON lead_conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_lead_conversions_conversion_timestamp ON lead_conversions(conversion_timestamp);

CREATE INDEX IF NOT EXISTS idx_lead_communications_lead_uuid ON lead_communications(lead_uuid);
CREATE INDEX IF NOT EXISTS idx_lead_communications_communication_type ON lead_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_lead_communications_status ON lead_communications(status);