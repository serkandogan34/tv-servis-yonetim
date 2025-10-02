-- Advanced Email Marketing System Migration
-- This migration creates tables for comprehensive email marketing automation

-- Email templates for different campaigns and triggers
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL,
  template_category TEXT NOT NULL, -- welcome, follow_up, promotional, transactional, nurture
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  template_variables TEXT, -- JSON array of variables like {{customer_name}}, {{service_type}}
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME,
  usage_count INTEGER DEFAULT 0
);

-- Email campaigns for batch sending and management
CREATE TABLE IF NOT EXISTS email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL, -- newsletter, promotional, drip, trigger-based, follow_up
  campaign_status TEXT DEFAULT 'draft', -- draft, scheduled, sending, sent, paused, cancelled
  template_id INTEGER NOT NULL,
  subject_line TEXT NOT NULL,
  sender_name TEXT DEFAULT 'GARANTOR360',
  sender_email TEXT DEFAULT 'info@garantor360.com',
  reply_to_email TEXT,
  target_segment TEXT, -- JSON criteria for audience targeting
  scheduled_send_time DATETIME,
  actual_send_time DATETIME,
  total_recipients INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_unsubscribed INTEGER DEFAULT 0,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  unsubscribe_rate DECIMAL(5,2) DEFAULT 0.00,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES email_templates(id)
);

-- Email sends for individual email tracking
CREATE TABLE IF NOT EXISTS email_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER,
  lead_uuid TEXT NOT NULL,
  template_id INTEGER NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject_line TEXT NOT NULL,
  send_status TEXT DEFAULT 'queued', -- queued, sent, delivered, failed, bounced
  send_timestamp DATETIME,
  delivery_timestamp DATETIME,
  open_timestamp DATETIME,
  click_timestamp DATETIME,
  unsubscribe_timestamp DATETIME,
  bounce_reason TEXT,
  error_message TEXT,
  email_service_id TEXT, -- External service message ID (SendGrid, etc.)
  tracking_pixel_viewed BOOLEAN DEFAULT FALSE,
  links_clicked INTEGER DEFAULT 0,
  user_agent TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id),
  FOREIGN KEY (template_id) REFERENCES email_templates(id),
  FOREIGN KEY (lead_uuid) REFERENCES lead_profiles(lead_uuid)
);

-- Email automation workflows for triggered campaigns
CREATE TABLE IF NOT EXISTS email_automations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  automation_name TEXT NOT NULL,
  automation_type TEXT NOT NULL, -- welcome_series, abandonment, nurture, follow_up, reactivation
  trigger_event TEXT NOT NULL, -- lead_created, form_submitted, page_visited, score_threshold, time_delay
  trigger_conditions TEXT, -- JSON conditions for when automation runs
  is_active BOOLEAN DEFAULT TRUE,
  sequence_steps TEXT NOT NULL, -- JSON array of automation steps
  total_triggered INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0.00,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email automation instances for tracking individual automation runs
CREATE TABLE IF NOT EXISTS email_automation_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  automation_id INTEGER NOT NULL,
  lead_uuid TEXT NOT NULL,
  instance_status TEXT DEFAULT 'active', -- active, completed, cancelled, paused
  current_step INTEGER DEFAULT 1,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  last_step_executed_at DATETIME,
  next_step_scheduled_at DATETIME,
  total_emails_sent INTEGER DEFAULT 0,
  metadata TEXT, -- JSON for additional tracking data
  FOREIGN KEY (automation_id) REFERENCES email_automations(id),
  FOREIGN KEY (lead_uuid) REFERENCES lead_profiles(lead_uuid)
);

-- Email subscribers and preferences management
CREATE TABLE IF NOT EXISTS email_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_uuid TEXT UNIQUE,
  email_address TEXT UNIQUE NOT NULL,
  subscriber_name TEXT,
  subscription_status TEXT DEFAULT 'subscribed', -- subscribed, unsubscribed, bounced, complained
  subscription_source TEXT, -- website_form, import, api, manual
  subscription_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  unsubscription_date DATETIME,
  unsubscription_reason TEXT,
  preferences TEXT, -- JSON preferences for email types
  tags TEXT, -- JSON array of subscriber tags
  custom_fields TEXT, -- JSON for additional subscriber data
  email_frequency TEXT DEFAULT 'weekly', -- daily, weekly, monthly, as_needed
  last_engagement_date DATETIME,
  engagement_score INTEGER DEFAULT 0, -- 0-100 based on opens, clicks, etc.
  total_emails_received INTEGER DEFAULT 0,
  total_emails_opened INTEGER DEFAULT 0,
  total_emails_clicked INTEGER DEFAULT 0,
  FOREIGN KEY (lead_uuid) REFERENCES lead_profiles(lead_uuid)
);

-- Email performance analytics and A/B testing
CREATE TABLE IF NOT EXISTS email_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER,
  template_id INTEGER,
  automation_id INTEGER,
  metric_type TEXT NOT NULL, -- sent, delivered, opened, clicked, bounced, unsubscribed, converted
  metric_value INTEGER NOT NULL,
  metric_date DATE NOT NULL,
  segment_filter TEXT, -- JSON filter criteria for this metric
  ab_test_variant TEXT, -- A, B, C for A/B testing
  device_type TEXT, -- desktop, mobile, tablet, unknown
  email_client TEXT, -- gmail, outlook, apple_mail, etc.
  geographic_location TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id),
  FOREIGN KEY (template_id) REFERENCES email_templates(id),
  FOREIGN KEY (automation_id) REFERENCES email_automations(id)
);

-- Email bounce management and suppression list
CREATE TABLE IF NOT EXISTS email_suppressions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_address TEXT UNIQUE NOT NULL,
  suppression_type TEXT NOT NULL, -- bounce, complaint, unsubscribe, manual, global
  bounce_type TEXT, -- hard, soft, block, unknown
  suppression_reason TEXT,
  suppression_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_bounce_date DATETIME,
  bounce_count INTEGER DEFAULT 1,
  is_permanent BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(template_category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_usage ON email_templates(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(campaign_status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON email_campaigns(scheduled_send_time);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_performance ON email_campaigns(open_rate DESC, click_rate DESC);

CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_lead ON email_sends(lead_uuid);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(send_status);
CREATE INDEX IF NOT EXISTS idx_email_sends_timestamp ON email_sends(send_timestamp);
CREATE INDEX IF NOT EXISTS idx_email_sends_email ON email_sends(recipient_email);

CREATE INDEX IF NOT EXISTS idx_email_automations_type ON email_automations(automation_type);
CREATE INDEX IF NOT EXISTS idx_email_automations_trigger ON email_automations(trigger_event);
CREATE INDEX IF NOT EXISTS idx_email_automations_active ON email_automations(is_active);

CREATE INDEX IF NOT EXISTS idx_email_automation_instances_automation ON email_automation_instances(automation_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_instances_lead ON email_automation_instances(lead_uuid);
CREATE INDEX IF NOT EXISTS idx_email_automation_instances_status ON email_automation_instances(instance_status);
CREATE INDEX IF NOT EXISTS idx_email_automation_instances_scheduled ON email_automation_instances(next_step_scheduled_at);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email_address);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(subscription_status);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_engagement ON email_subscribers(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_last_engagement ON email_subscribers(last_engagement_date);

CREATE INDEX IF NOT EXISTS idx_email_analytics_campaign ON email_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_template ON email_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_metric ON email_analytics(metric_type, metric_date);
CREATE INDEX IF NOT EXISTS idx_email_analytics_date ON email_analytics(metric_date);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_email ON email_suppressions(email_address);
CREATE INDEX IF NOT EXISTS idx_email_suppressions_type ON email_suppressions(suppression_type);
CREATE INDEX IF NOT EXISTS idx_email_suppressions_permanent ON email_suppressions(is_permanent);