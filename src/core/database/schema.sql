-- ============================================================================
-- TV Servis Yönetim Sistemi - Optimized Database Schema
-- Sağlam iskelet yapı için profesyonel ilişkisel veritabanı
-- ============================================================================

-- Migration table for tracking schema versions
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT UNIQUE NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT
);

-- ============================================================================
-- CORE SYSTEM TABLES
-- ============================================================================

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  config_type TEXT DEFAULT 'string', -- string, number, boolean, json
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for system changes
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSON,
  new_values JSON,
  user_id INTEGER,
  user_type TEXT, -- admin, dealer, system
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RBAC (Role-Based Access Control) TABLES
-- ============================================================================

-- Roles definition
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSON NOT NULL, -- Array of permissions
  is_system_role BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin users with RBAC
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  last_login DATETIME,
  login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES admin_users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for security
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY, -- UUID or custom session ID
  user_id INTEGER NOT NULL,
  user_type TEXT NOT NULL, -- admin, dealer
  expires_at DATETIME NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  device_info TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- GEOGRAPHIC DATA
-- ============================================================================

-- Cities (İller)
CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL, -- Plaka kodu
  region TEXT, -- Bölge
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Districts (İlçeler)
CREATE TABLE IF NOT EXISTS districts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_id INTEGER NOT NULL REFERENCES cities(id),
  name TEXT NOT NULL,
  postal_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(city_id, name)
);

-- Neighborhoods (Mahalleler) - Optional for detailed addressing
CREATE TABLE IF NOT EXISTS neighborhoods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  district_id INTEGER NOT NULL REFERENCES districts(id),
  name TEXT NOT NULL,
  postal_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(district_id, name)
);

-- ============================================================================
-- BUSINESS ENTITIES
-- ============================================================================

-- Service types (Servis türleri)
CREATE TABLE IF NOT EXISTS service_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT, -- TV, Klima, Beyaz Eşya, etc.
  description TEXT,
  base_price DECIMAL(10,2),
  estimated_duration INTEGER, -- minutes
  required_skills JSON, -- Array of required specialties
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dealers (Bayiler) - Enhanced
CREATE TABLE IF NOT EXISTS dealers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL, -- IST001, ANK002, etc.
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  login_email TEXT UNIQUE,
  password_hash TEXT,
  address TEXT NOT NULL,
  city_id INTEGER NOT NULL REFERENCES cities(id),
  district_id INTEGER REFERENCES districts(id),
  neighborhood_id INTEGER REFERENCES neighborhoods(id),
  postal_code TEXT,
  coordinates TEXT, -- GPS coordinates as JSON
  
  -- Business info
  tax_number TEXT,
  tax_office TEXT,
  website TEXT,
  founded_date DATE,
  
  -- Service info
  specialties JSON NOT NULL, -- Array: ["Samsung", "LG", "Sony"]
  service_radius INTEGER DEFAULT 50, -- km
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_jobs INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  cancelled_jobs INTEGER DEFAULT 0,
  
  -- Financial
  credit_balance DECIMAL(10,2) DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 15.00, -- %15 commission
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  login_enabled BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verification_date DATETIME,
  
  -- Metadata
  last_login DATETIME,
  login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  created_by INTEGER REFERENCES admin_users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers (Müşteriler) - Enhanced
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city_id INTEGER NOT NULL REFERENCES cities(id),
  district_id INTEGER REFERENCES districts(id),
  neighborhood_id INTEGER REFERENCES neighborhoods(id),
  postal_code TEXT,
  coordinates TEXT, -- GPS coordinates as JSON
  
  -- Customer info
  customer_type TEXT DEFAULT 'individual', -- individual, corporate
  tax_number TEXT, -- For corporate customers
  company_name TEXT, -- For corporate customers
  
  -- History
  total_jobs INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  
  -- Privacy & Marketing
  gdpr_consent BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  
  -- Metadata
  created_by INTEGER, -- admin or dealer who created
  created_via TEXT, -- web, mobile, call, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- JOB MANAGEMENT
-- ============================================================================

-- Job requests (İş talepleri) - Enhanced
CREATE TABLE IF NOT EXISTS job_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL, -- TV2025001, TV2025002, etc.
  
  -- Customer & Service
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  service_type_id INTEGER NOT NULL REFERENCES service_types(id),
  
  -- Job Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT DEFAULT 'new', -- new, assigned, in_progress, completed, cancelled
  
  -- Device Information
  device_brand TEXT,
  device_model TEXT,
  device_serial TEXT,
  device_age INTEGER, -- years
  warranty_status TEXT, -- in_warranty, out_of_warranty, unknown
  
  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  additional_costs DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  customer_budget DECIMAL(10,2),
  
  -- Assignment
  assigned_dealer_id INTEGER REFERENCES dealers(id),
  assignment_date DATETIME,
  assignment_price DECIMAL(10,2), -- Price paid by dealer to get this job
  
  -- Scheduling
  preferred_date DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  scheduled_date DATETIME,
  
  -- Completion
  started_at DATETIME,
  completed_at DATETIME,
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER, -- minutes
  
  -- Quality & Feedback
  dealer_rating INTEGER, -- 1-5 stars from customer
  customer_rating INTEGER, -- 1-5 stars from dealer
  dealer_feedback TEXT,
  customer_feedback TEXT,
  
  -- Technical details
  problem_category TEXT, -- electrical, mechanical, software, etc.
  solution_summary TEXT,
  parts_used JSON, -- Array of parts used
  
  -- Admin & System
  visibility_level TEXT DEFAULT 'limited', -- limited, full
  created_by INTEGER,
  created_via TEXT, -- web, mobile, phone, n8n, etc.
  n8n_workflow_id TEXT, -- N8N integration tracking
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Job history for tracking changes
CREATE TABLE IF NOT EXISTS job_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_request_id INTEGER NOT NULL REFERENCES job_requests(id),
  old_status TEXT,
  new_status TEXT,
  action TEXT NOT NULL, -- created, assigned, started, completed, cancelled, etc.
  description TEXT,
  changed_by INTEGER,
  changed_by_type TEXT, -- admin, dealer, system, customer
  metadata JSON, -- Additional context data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Job attachments (photos, documents)
CREATE TABLE IF NOT EXISTS job_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_request_id INTEGER NOT NULL REFERENCES job_requests(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- R2 storage URL
  file_type TEXT NOT NULL, -- image, document, video, etc.
  file_size INTEGER, -- bytes
  uploaded_by INTEGER,
  uploaded_by_type TEXT, -- admin, dealer, customer
  category TEXT, -- before, after, invoice, warranty, etc.
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PAYMENT SYSTEM
-- ============================================================================

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_code TEXT UNIQUE NOT NULL, -- PAY20250918001
  
  -- Parties
  dealer_id INTEGER REFERENCES dealers(id),
  customer_id INTEGER REFERENCES customers(id),
  job_request_id INTEGER REFERENCES job_requests(id),
  
  -- Payment Details
  payment_type TEXT NOT NULL, -- credit_purchase, job_payment, withdrawal, refund
  payment_method TEXT NOT NULL, -- credit_card, bank_transfer, credit_balance, cash
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0, -- Transaction fee
  net_amount DECIMAL(10,2) NOT NULL, -- Amount after fees
  
  -- Payment Provider Info
  provider TEXT, -- paytr, stripe, manual, etc.
  provider_transaction_id TEXT, -- External transaction ID
  provider_reference TEXT, -- External reference
  provider_response JSON, -- Full provider response
  
  -- Bank Transfer Details (if applicable)
  bank_name TEXT,
  account_number TEXT,
  reference_number TEXT,
  transfer_date DATE,
  
  -- Status & Processing
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, completed, failed, refunded
  processed_at DATETIME,
  processed_by INTEGER REFERENCES admin_users(id),
  approval_notes TEXT,
  
  -- Metadata
  created_by INTEGER,
  created_via TEXT, -- web, mobile, admin_panel, api, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Credit movements for dealers
CREATE TABLE IF NOT EXISTS credit_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id INTEGER NOT NULL REFERENCES dealers(id),
  transaction_id INTEGER REFERENCES payment_transactions(id),
  job_request_id INTEGER REFERENCES job_requests(id),
  
  -- Movement Details
  movement_type TEXT NOT NULL, -- purchase, deduction, bonus, penalty, adjustment
  amount DECIMAL(10,2) NOT NULL,
  previous_balance DECIMAL(10,2) NOT NULL,
  new_balance DECIMAL(10,2) NOT NULL,
  
  -- Description & Context
  description TEXT NOT NULL,
  reference_code TEXT, -- External reference
  category TEXT, -- job_purchase, credit_reload, admin_adjustment, etc.
  
  -- Admin info
  processed_by INTEGER REFERENCES admin_users(id),
  admin_notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- NOTIFICATION SYSTEM
-- ============================================================================

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- email, sms, push, webhook
  event_trigger TEXT NOT NULL, -- job_created, job_assigned, payment_approved, etc.
  
  -- Template content
  subject TEXT, -- For email
  title TEXT, -- For push notifications
  body_template TEXT NOT NULL, -- With placeholders: {{customer_name}}, {{job_code}}, etc.
  
  -- Recipients
  recipient_type TEXT NOT NULL, -- admin, dealer, customer, system
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  
  -- Metadata
  created_by INTEGER REFERENCES admin_users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notification queue
CREATE TABLE IF NOT EXISTS notification_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER REFERENCES notification_templates(id),
  
  -- Recipients
  recipient_type TEXT NOT NULL, -- admin, dealer, customer
  recipient_id INTEGER,
  recipient_email TEXT,
  recipient_phone TEXT,
  
  -- Content (rendered from template)
  subject TEXT,
  title TEXT,
  body TEXT,
  
  -- Delivery
  delivery_method TEXT NOT NULL, -- email, sms, push, webhook
  delivery_url TEXT, -- For webhooks (N8N)
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, cancelled
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_attempt DATETIME,
  sent_at DATETIME,
  delivered_at DATETIME,
  error_message TEXT,
  
  -- Context data for template rendering
  context_data JSON,
  
  -- Priority & Scheduling
  priority TEXT DEFAULT 'normal',
  scheduled_for DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ANALYTICS & REPORTING
-- ============================================================================

-- System metrics (daily aggregates)
CREATE TABLE IF NOT EXISTS system_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- jobs, payments, dealers, customers, etc.
  metric_category TEXT, -- new, completed, cancelled, etc.
  
  -- Counts
  count_value INTEGER DEFAULT 0,
  
  -- Financial values
  amount_value DECIMAL(10,2) DEFAULT 0,
  
  -- Additional context
  city_id INTEGER REFERENCES cities(id),
  dealer_id INTEGER REFERENCES dealers(id),
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(metric_date, metric_type, metric_category, city_id, dealer_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Authentication & Sessions
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Geographic
CREATE INDEX IF NOT EXISTS idx_districts_city ON districts(city_id);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_district ON neighborhoods(district_id);

-- Business entities
CREATE INDEX IF NOT EXISTS idx_dealers_city ON dealers(city_id);
CREATE INDEX IF NOT EXISTS idx_dealers_login_email ON dealers(login_email);
CREATE INDEX IF NOT EXISTS idx_dealers_active ON dealers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Jobs
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON job_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_dealer ON job_requests(assigned_dealer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON job_requests(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON job_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_code ON job_requests(code);
CREATE INDEX IF NOT EXISTS idx_job_history_job ON job_history(job_request_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_dealer ON payment_transactions(dealer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_movements_dealer ON credit_movements(dealer_id);
CREATE INDEX IF NOT EXISTS idx_credit_movements_created ON credit_movements(created_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notification_queue(recipient_type, recipient_id);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_metrics_date ON system_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON system_metrics(metric_type, metric_category);

-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default roles
INSERT OR IGNORE INTO roles (id, name, display_name, description, permissions, is_system_role) VALUES
(1, 'super_admin', 'Süper Yönetici', 'Tam sistem erişimi', '["*"]', true),
(2, 'admin', 'Yönetici', 'Genel yönetim erişimi', '["job:*", "payment:*", "user:read", "user:update", "system:config"]', true),
(3, 'dealer_manager', 'Bayi Yöneticisi', 'Bayi yönetimi', '["job:read", "job:assign", "payment:view", "user:read"]', true),
(4, 'finance', 'Mali İşler', 'Ödeme yönetimi', '["payment:*", "job:read", "user:read"]', true);

-- Insert default admin user (password: admin123 -> hashed)
INSERT OR IGNORE INTO admin_users (id, username, email, password_hash, full_name, role_id) VALUES
(1, 'admin', 'admin@tvservis.com', 'hashed_admin123', 'Sistem Yöneticisi', 1);

-- Insert system configuration
INSERT OR IGNORE INTO system_config (config_key, config_value, config_type, description, is_public) VALUES
('app.name', 'TV Servis Yönetim Sistemi', 'string', 'Uygulama adı', true),
('app.version', '1.0.0', 'string', 'Sistem versiyonu', true),
('app.environment', 'production', 'string', 'Çalışma ortamı', false),
('payment.commission_rate', '15.0', 'number', 'Varsayılan komisyon oranı (%)', false),
('payment.min_credit_purchase', '100', 'number', 'Minimum kredi yükleme tutarı (TL)', true),
('job.auto_assignment', 'false', 'boolean', 'Otomatik iş ataması', false),
('notification.email_enabled', 'true', 'boolean', 'E-posta bildirimleri aktif', false),
('notification.sms_enabled', 'true', 'boolean', 'SMS bildirimleri aktif', false);

-- ============================================================================
-- TRIGGERS FOR AUDIT LOG (Optional - if supported)
-- ============================================================================

-- Note: SQLite triggers would go here for automatic audit logging
-- But we'll handle this in application code for better control