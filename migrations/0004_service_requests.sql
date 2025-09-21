-- Customer Service Requests Table for n8n Integration
-- This table stores direct customer service requests from the website form

CREATE TABLE IF NOT EXISTS service_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_city TEXT,
  customer_district TEXT,
  service_category TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  urgency TEXT DEFAULT 'normal', -- yuksek, normal, dusuk
  contact_preference TEXT, -- JSON array: ["phone", "whatsapp"]
  status TEXT DEFAULT 'received', -- received, in_progress, completed, cancelled
  n8n_sent INTEGER DEFAULT 0, -- 0: not sent, 1: sent successfully
  n8n_response TEXT, -- n8n webhook response (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created ON service_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_service_requests_code ON service_requests(request_code);
CREATE INDEX IF NOT EXISTS idx_service_requests_phone ON service_requests(customer_phone);