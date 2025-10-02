-- =====================================================================
-- Customer Segmentation System Database Schema
-- =====================================================================

-- Customer Segments Table - Segment tanımlamaları
CREATE TABLE IF NOT EXISTS customer_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_name TEXT NOT NULL UNIQUE,
  segment_description TEXT,
  segment_criteria TEXT NOT NULL, -- JSON criteria for automatic assignment
  segment_color TEXT DEFAULT '#3B82F6', -- UI için renk kodu
  is_active INTEGER DEFAULT 1,
  is_automated INTEGER DEFAULT 1, -- Otomatik atama aktif mi?
  priority_score INTEGER DEFAULT 100, -- Segment öncelik skoru (yüksek = öncelikli)
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customer Segment Assignments - Müşteri-segment eşleştirmeleri
CREATE TABLE IF NOT EXISTS customer_segment_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_identifier TEXT NOT NULL, -- Email, phone, user_id vs.
  customer_type TEXT DEFAULT 'email', -- 'email', 'phone', 'user_id'
  segment_id INTEGER NOT NULL,
  assignment_source TEXT DEFAULT 'automatic', -- 'automatic', 'manual', 'rule'
  assignment_confidence REAL DEFAULT 1.0, -- 0.0-1.0 güven skoru
  assignment_reason TEXT, -- Atama nedeni açıklaması
  is_active INTEGER DEFAULT 1,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME, -- Segmentin sona erme tarihi (opsiyonel)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (segment_id) REFERENCES customer_segments(id),
  UNIQUE(customer_identifier, segment_id) -- Aynı müşteri aynı segmente tekrar atanamaz
);

-- Segment Rules Table - Segmentasyon kuralları
CREATE TABLE IF NOT EXISTS segment_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  segment_id INTEGER NOT NULL,
  rule_type TEXT NOT NULL, -- 'behavioral', 'demographic', 'transactional', 'engagement'
  rule_conditions TEXT NOT NULL, -- JSON conditions
  rule_weight REAL DEFAULT 1.0, -- Kuralın ağırlığı (0.0-1.0)
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (segment_id) REFERENCES customer_segments(id)
);

-- Customer Behavioral Data - Müşteri davranış verileri
CREATE TABLE IF NOT EXISTS customer_behavioral_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_identifier TEXT NOT NULL,
  customer_type TEXT DEFAULT 'email',
  behavior_type TEXT NOT NULL, -- 'page_visit', 'email_open', 'link_click', 'form_submit', 'service_request'
  behavior_data TEXT, -- JSON - davranış detayları
  behavior_value REAL, -- Sayısal değer (opsiyonel)
  behavior_category TEXT, -- 'engagement', 'interest', 'intent', 'conversion'
  session_id TEXT,
  page_url TEXT,
  referrer_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Segment Performance Metrics - Segment performans metrikleri
CREATE TABLE IF NOT EXISTS segment_performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL,
  metric_type TEXT NOT NULL, -- 'email_open_rate', 'conversion_rate', 'engagement_score'
  metric_value REAL NOT NULL,
  metric_period TEXT DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly', 'yearly'
  calculation_date DATE NOT NULL,
  sample_size INTEGER DEFAULT 0, -- Hesaplamada kullanılan müşteri sayısı
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (segment_id) REFERENCES customer_segments(id),
  UNIQUE(segment_id, metric_type, calculation_date)
);

-- Segment History - Segment değişim geçmişi
CREATE TABLE IF NOT EXISTS segment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_identifier TEXT NOT NULL,
  old_segment_id INTEGER,
  new_segment_id INTEGER,
  change_reason TEXT,
  change_source TEXT DEFAULT 'automatic', -- 'automatic', 'manual', 'rule_update'
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (old_segment_id) REFERENCES customer_segments(id),
  FOREIGN KEY (new_segment_id) REFERENCES customer_segments(id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_customer_segments_active ON customer_segments(is_active, is_automated);
CREATE INDEX IF NOT EXISTS idx_segment_assignments_customer ON customer_segment_assignments(customer_identifier, is_active);
CREATE INDEX IF NOT EXISTS idx_segment_assignments_segment ON customer_segment_assignments(segment_id, is_active);
CREATE INDEX IF NOT EXISTS idx_segment_rules_segment ON segment_rules(segment_id, is_active);
CREATE INDEX IF NOT EXISTS idx_behavioral_data_customer ON customer_behavioral_data(customer_identifier, behavior_type);
CREATE INDEX IF NOT EXISTS idx_behavioral_data_timestamp ON customer_behavioral_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_segment_performance_date ON segment_performance_metrics(segment_id, calculation_date);
CREATE INDEX IF NOT EXISTS idx_segment_history_customer ON segment_history(customer_identifier, changed_at);