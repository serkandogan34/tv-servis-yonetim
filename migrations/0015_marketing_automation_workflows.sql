-- =====================================================================
-- Marketing Automation Workflows Database Schema
-- =====================================================================

-- Marketing Automation Workflows - Ana workflow tanımlamaları
CREATE TABLE IF NOT EXISTS marketing_automation_workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_name TEXT NOT NULL UNIQUE,
  workflow_description TEXT,
  workflow_type TEXT NOT NULL, -- 'drip_campaign', 'behavioral_trigger', 'lifecycle', 'event_based'
  trigger_conditions TEXT NOT NULL, -- JSON - Tetikleme koşulları
  target_segments TEXT, -- JSON array - Hedef segment ID'leri (null = tüm müşteriler)
  workflow_steps TEXT NOT NULL, -- JSON - Workflow adımları dizisi
  workflow_settings TEXT, -- JSON - Genel ayarlar (timezone, delay_rules, etc.)
  
  -- Status and control
  is_active INTEGER DEFAULT 1,
  is_paused INTEGER DEFAULT 0,
  priority_level INTEGER DEFAULT 50, -- 1-100 öncelik seviyesi
  
  -- Performance tracking
  total_triggered INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0.0,
  
  -- Metadata
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_triggered_at DATETIME
);

-- Workflow Executions - Çalışan workflow örnekleri
CREATE TABLE IF NOT EXISTS workflow_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER NOT NULL,
  customer_identifier TEXT NOT NULL,
  customer_type TEXT DEFAULT 'email', -- 'email', 'phone', 'user_id'
  
  -- Execution status
  execution_status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'failed', 'cancelled'
  current_step_index INTEGER DEFAULT 0,
  next_action_at DATETIME,
  
  -- Execution data
  execution_data TEXT, -- JSON - Müşteri verisi snapshot
  step_history TEXT, -- JSON - Tamamlanan adım geçmişi
  personalization_data TEXT, -- JSON - Kişiselleştirme verileri
  
  -- Timestamps
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  last_action_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workflow_id) REFERENCES marketing_automation_workflows(id),
  UNIQUE(workflow_id, customer_identifier) -- Bir müşteri aynı workflow'da sadece bir kez olabilir
);

-- Workflow Steps - Workflow adım detayları (normalizasyon için)
CREATE TABLE IF NOT EXISTS workflow_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER NOT NULL,
  step_index INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_type TEXT NOT NULL, -- 'email', 'delay', 'condition', 'segment_update', 'webhook'
  step_config TEXT NOT NULL, -- JSON - Adım konfigürasyonu
  
  -- Conditional logic
  conditions TEXT, -- JSON - Adım için koşullar
  success_actions TEXT, -- JSON - Başarı durumunda yapılacaklar
  failure_actions TEXT, -- JSON - Başarısızlık durumunda yapılacaklar
  
  -- Performance
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workflow_id) REFERENCES marketing_automation_workflows(id),
  UNIQUE(workflow_id, step_index)
);

-- Workflow Triggers - Tetikleme kuralları
CREATE TABLE IF NOT EXISTS workflow_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER NOT NULL,
  trigger_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'event', 'time_based', 'behavior', 'segment_change'
  trigger_event TEXT, -- Tetikleme event'i ('user_registered', 'email_opened', 'service_completed')
  trigger_conditions TEXT NOT NULL, -- JSON - Detaylı tetikleme koşulları
  
  -- Frequency control
  max_triggers_per_customer INTEGER DEFAULT 1, -- Müşteri başına max tetikleme
  cooldown_period_hours INTEGER DEFAULT 24, -- Tekrar tetikleme için bekleme süresi
  
  -- Performance
  trigger_count INTEGER DEFAULT 0,
  last_triggered_at DATETIME,
  
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workflow_id) REFERENCES marketing_automation_workflows(id)
);

-- Email Campaign Performance - Email kampanya detay metrikleri
CREATE TABLE IF NOT EXISTS email_campaign_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_execution_id INTEGER,
  workflow_step_id INTEGER,
  email_send_id INTEGER, -- email_sends tablosuna referans
  
  -- Performance metrics
  sent_at DATETIME,
  delivered_at DATETIME,
  opened_at DATETIME,
  clicked_at DATETIME,
  converted_at DATETIME,
  unsubscribed_at DATETIME,
  
  -- Interaction details
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  conversion_value REAL DEFAULT 0.0,
  
  -- Tracking data
  tracking_data TEXT, -- JSON - Detaylı tracking bilgisi
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workflow_execution_id) REFERENCES workflow_executions(id),
  FOREIGN KEY (workflow_step_id) REFERENCES workflow_steps(id)
);

-- A/B Testing for Workflows - Workflow A/B test desteği
CREATE TABLE IF NOT EXISTS workflow_ab_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER NOT NULL,
  test_name TEXT NOT NULL,
  test_description TEXT,
  
  -- Test configuration
  variant_a_config TEXT NOT NULL, -- JSON - A variant konfigürasyonu
  variant_b_config TEXT NOT NULL, -- JSON - B variant konfigürasyonu
  traffic_split_percent INTEGER DEFAULT 50, -- A variant'a gidecek trafik yüzdesi
  
  -- Test status
  test_status TEXT DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed'
  test_duration_days INTEGER DEFAULT 30,
  confidence_level REAL DEFAULT 0.95,
  
  -- Results
  variant_a_conversions INTEGER DEFAULT 0,
  variant_b_conversions INTEGER DEFAULT 0,
  variant_a_participants INTEGER DEFAULT 0,
  variant_b_participants INTEGER DEFAULT 0,
  winning_variant TEXT, -- 'A', 'B', 'no_difference'
  statistical_significance REAL DEFAULT 0.0,
  
  -- Timestamps
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workflow_id) REFERENCES marketing_automation_workflows(id)
);

-- Workflow Analytics Summary - Günlük/haftalık özet analytics
CREATE TABLE IF NOT EXISTS workflow_analytics_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER NOT NULL,
  analytics_date DATE NOT NULL,
  period_type TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  
  -- Volume metrics
  executions_started INTEGER DEFAULT 0,
  executions_completed INTEGER DEFAULT 0,
  executions_failed INTEGER DEFAULT 0,
  
  -- Email metrics
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  unsubscribes INTEGER DEFAULT 0,
  
  -- Conversion metrics
  conversions INTEGER DEFAULT 0,
  conversion_value REAL DEFAULT 0.0,
  revenue_generated REAL DEFAULT 0.0,
  
  -- Calculated rates
  completion_rate REAL DEFAULT 0.0,
  open_rate REAL DEFAULT 0.0,
  click_rate REAL DEFAULT 0.0,
  conversion_rate REAL DEFAULT 0.0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workflow_id) REFERENCES marketing_automation_workflows(id),
  UNIQUE(workflow_id, analytics_date, period_type)
);

-- Performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(execution_status, next_action_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_customer ON workflow_executions(customer_identifier, workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id, step_index);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_type ON workflow_triggers(trigger_type, trigger_event);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_workflow ON email_campaign_performance(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_date ON workflow_analytics_summary(workflow_id, analytics_date);
CREATE INDEX IF NOT EXISTS idx_workflow_automation_active ON marketing_automation_workflows(is_active, is_paused);