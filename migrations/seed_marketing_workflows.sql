-- =====================================================================
-- Marketing Automation Workflows - Seed Data
-- =====================================================================

-- Predefined Marketing Automation Workflows
INSERT OR IGNORE INTO marketing_automation_workflows (
  id, workflow_name, workflow_description, workflow_type, trigger_conditions, 
  target_segments, workflow_steps, workflow_settings, created_by
) VALUES 

-- 1. Welcome Series - Yeni müşteriler için hoşgeldin serisi
(1, 'Welcome Series - New Customer', 
 'Yeni kayıt olan müşterilere 5 günlük hoşgeldin email serisi',
 'lifecycle',
 '{"trigger_event": "customer_registered", "conditions": {"days_since_registration": {"max": 1}}}',
 '[3]', -- New Customers segment
 '[
   {
     "step_index": 0,
     "step_type": "email",
     "step_name": "Welcome Email",
     "delay_hours": 1,
     "email_template_id": 6,
     "personalization": {
       "customer_name": "{{customer.name}}",
       "service_interest": "{{customer.interest}}"
     }
   },
   {
     "step_index": 1,
     "step_type": "delay",
     "step_name": "Wait 2 Days",
     "delay_hours": 48
   },
   {
     "step_index": 2,
     "step_type": "email",
     "step_name": "Service Overview",
     "email_template_id": 10,
     "conditions": {"email_opened": {"step": 0, "required": true}}
   },
   {
     "step_index": 3,
     "step_type": "delay",
     "step_name": "Wait 3 Days",
     "delay_hours": 72
   },
   {
     "step_index": 4,
     "step_type": "email",
     "step_name": "Special Offer",
     "email_template_id": 7,
     "conditions": {"no_service_booked": true}
   }
 ]',
 '{"timezone": "Europe/Istanbul", "send_time": "09:00", "max_emails_per_day": 1}',
 'system'),

-- 2. Re-engagement Campaign - Pasif müşterileri geri kazanma
(2, 'Re-engagement Campaign', 
 'Son 60 günde aktivite göstermeyen müşteriler için geri kazanma kampanyası',
 'behavioral_trigger',
 '{"trigger_event": "customer_inactive", "conditions": {"days_since_last_activity": {"min": 60}, "email_engagement": {"max": 0.1}}}',
 '[4, 5]', -- At-Risk and Lost Customers
 '[
   {
     "step_index": 0,
     "step_type": "email",
     "step_name": "We Miss You",
     "delay_hours": 0,
     "email_template_id": 7,
     "personalization": {
       "customer_name": "{{customer.name}}",
       "discount_code": "COMEBACK15"
     }
   },
   {
     "step_index": 1,
     "step_type": "delay",
     "step_name": "Wait 1 Week",
     "delay_hours": 168
   },
   {
     "step_index": 2,
     "step_type": "condition",
     "step_name": "Check Engagement",
     "conditions": {"email_opened": {"step": 0, "required": false}}
   },
   {
     "step_index": 3,
     "step_type": "email",
     "step_name": "Last Chance Offer",
     "email_template_id": 8,
     "conditions": {"no_engagement": true},
     "personalization": {
       "discount_code": "LASTCHANCE25"
     }
   }
 ]',
 '{"max_attempts": 2, "cooldown_days": 90}',
 'system'),

-- 3. Service Follow-up - Hizmet sonrası takip
(3, 'Service Follow-up Sequence', 
 'Hizmet tamamlandıktan sonra müşteri memnuniyeti ve tekrar satış kampanyası',
 'event_based',
 '{"trigger_event": "service_completed", "conditions": {"service_status": "completed"}}',
 '[1, 2]', -- VIP and Regular Customers
 '[
   {
     "step_index": 0,
     "step_type": "delay",
     "step_name": "Wait 1 Day",
     "delay_hours": 24
   },
   {
     "step_index": 1,
     "step_type": "email",
     "step_name": "Service Feedback Request",
     "email_template_id": 9,
     "personalization": {
       "service_type": "{{service.type}}",
       "technician_name": "{{service.technician}}"
     }
   },
   {
     "step_index": 2,
     "step_type": "delay",
     "step_name": "Wait 1 Week",
     "delay_hours": 168
   },
   {
     "step_index": 3,
     "step_type": "email",
     "step_name": "Maintenance Tips",
     "email_template_id": 10,
     "conditions": {"rating": {"min": 4}}
   },
   {
     "step_index": 4,
     "step_type": "delay",
     "step_name": "Wait 1 Month",
     "delay_hours": 720
   },
   {
     "step_index": 5,
     "step_type": "email",
     "step_name": "Maintenance Reminder",
     "email_template_id": 8,
     "personalization": {
       "next_service_discount": "15%"
     }
   }
 ]',
 '{"follow_up_duration_days": 60}',
 'system'),

-- 4. Lead Nurturing - Prospekt geliştirme
(4, 'Lead Nurturing Campaign', 
 'Yüksek skorlu prospektleri müşteriye dönüştürme kampanyası',
 'behavioral_trigger',
 '{"trigger_event": "lead_score_threshold", "conditions": {"lead_score": {"min": 60}, "no_service_booked": true}}',
 '[6, 7]', -- High-Value and Engaged Prospects
 '[
   {
     "step_index": 0,
     "step_type": "email",
     "step_name": "Educational Content",
     "delay_hours": 2,
     "email_template_id": 10
   },
   {
     "step_index": 1,
     "step_type": "delay",
     "step_name": "Wait 3 Days",
     "delay_hours": 72
   },
   {
     "step_index": 2,
     "step_type": "email",
     "step_name": "Case Study",
     "email_template_id": 6,
     "conditions": {"email_opened": {"step": 0, "required": true}}
   },
   {
     "step_index": 3,
     "step_type": "delay",
     "step_name": "Wait 5 Days",
     "delay_hours": 120
   },
   {
     "step_index": 4,
     "step_type": "email",
     "step_name": "Special Offer",
     "email_template_id": 7,
     "personalization": {
       "offer_discount": "20%",
       "urgency_days": "3"
     }
   }
 ]',
 '{"nurturing_period_days": 14}',
 'system'),

-- 5. Seasonal Campaign - Mevsimlik kampanyalar
(5, 'Winter Maintenance Campaign', 
 'Kış aylarında kombi ve klima bakım hatırlatması',
 'time_based',
 '{"trigger_event": "seasonal_trigger", "conditions": {"months": [10, 11, 12], "services_interest": ["kombi", "klima"]}}',
 '[9, 10]', -- Kombi and Klima Specialists
 '[
   {
     "step_index": 0,
     "step_type": "email",
     "step_name": "Winter Prep Reminder",
     "delay_hours": 0,
     "email_template_id": 8,
     "personalization": {
       "season": "winter",
       "service_focus": "{{customer.primary_service}}"
     }
   },
   {
     "step_index": 1,
     "step_type": "delay",
     "step_name": "Wait 2 Weeks",
     "delay_hours": 336
   },
   {
     "step_index": 2,
     "step_type": "email",
     "step_name": "Last Chance Winter Discount",
     "email_template_id": 8,
     "conditions": {"no_booking": true},
     "personalization": {
       "discount_code": "WINTER25"
     }
   }
 ]',
 '{"seasonal_active_months": [10, 11, 12], "yearly_repeat": true}',
 'system'),

-- 6. VIP Customer Journey - VIP müşteri yolculuğu
(6, 'VIP Customer Experience', 
 'VIP müşteriler için özel deneyim ve sadakat programı',
 'lifecycle',
 '{"trigger_event": "vip_segment_entry", "conditions": {"segment_id": 1}}',
 '[1]', -- VIP Customers only
 '[
   {
     "step_index": 0,
     "step_type": "email",
     "step_name": "VIP Welcome",
     "delay_hours": 1,
     "email_template_id": 6,
     "personalization": {
       "vip_benefits": "priority_service,extended_warranty,exclusive_discounts"
     }
   },
   {
     "step_index": 1,
     "step_type": "delay",
     "step_name": "Wait 1 Month",
     "delay_hours": 720
   },
   {
     "step_index": 2,
     "step_type": "email",
     "step_name": "VIP Monthly Newsletter",
     "email_template_id": 10,
     "personalization": {
       "exclusive_content": "true"
     }
   }
 ]',
 '{"vip_perks": "enabled", "priority_support": "enabled"}',
 'system');

-- Workflow Triggers
INSERT OR IGNORE INTO workflow_triggers (
  workflow_id, trigger_name, trigger_type, trigger_event, trigger_conditions, max_triggers_per_customer
) VALUES 

-- Welcome Series Triggers
(1, 'New Customer Registration', 'event', 'customer_registered', 
 '{"conditions": {"registration_source": ["web", "mobile"], "email_confirmed": true}}', 1),

-- Re-engagement Triggers
(2, 'Customer Inactivity Detection', 'behavior', 'customer_inactive', 
 '{"conditions": {"days_inactive": {"min": 60}, "last_email_open": {"days_ago": {"min": 30}}}}', 3),

-- Service Follow-up Triggers
(3, 'Service Completion', 'event', 'service_completed', 
 '{"conditions": {"service_status": "completed", "payment_status": "paid"}}', 1),

-- Lead Nurturing Triggers
(4, 'Lead Score Milestone', 'behavior', 'lead_score_threshold', 
 '{"conditions": {"lead_score": {"min": 60}, "segment": ["High-Value Prospects", "Engaged Prospects"]}}', 2),

-- Seasonal Triggers
(5, 'Winter Season Start', 'time_based', 'seasonal_trigger', 
 '{"conditions": {"month": 10, "day": 1, "customer_services": ["kombi", "klima"]}}', 1),

-- VIP Journey Triggers
(6, 'VIP Segment Assignment', 'event', 'segment_change', 
 '{"conditions": {"new_segment_id": 1, "previous_segment": {"not": 1}}}', 1);

-- Workflow Steps (Detailed breakdown for better management)
INSERT OR IGNORE INTO workflow_steps (
  workflow_id, step_index, step_name, step_type, step_config, conditions
) VALUES 

-- Welcome Series Steps
(1, 0, 'Welcome Email', 'email', '{"template_id": 6, "delay_hours": 1, "send_time": "09:00"}', '{}'),
(1, 1, 'Wait 2 Days', 'delay', '{"delay_hours": 48}', '{}'),
(1, 2, 'Service Overview', 'email', '{"template_id": 10, "personalized": true}', 
 '{"previous_email_opened": true}'),
(1, 3, 'Wait 3 Days', 'delay', '{"delay_hours": 72}', '{}'),
(1, 4, 'Special Offer', 'email', '{"template_id": 7, "urgency": true}', 
 '{"no_service_booked": true}'),

-- Re-engagement Steps
(2, 0, 'We Miss You', 'email', '{"template_id": 7, "emotional": true}', '{}'),
(2, 1, 'Wait 1 Week', 'delay', '{"delay_hours": 168}', '{}'),
(2, 2, 'Check Engagement', 'condition', '{"check_opens": true, "check_clicks": true}', '{}'),
(2, 3, 'Last Chance', 'email', '{"template_id": 8, "final_offer": true}', 
 '{"no_engagement": true}'),

-- Service Follow-up Steps
(3, 0, 'Wait After Service', 'delay', '{"delay_hours": 24}', '{}'),
(3, 1, 'Feedback Request', 'email', '{"template_id": 9, "survey_link": true}', '{}'),
(3, 2, 'Wait for Response', 'delay', '{"delay_hours": 168}', '{}'),
(3, 3, 'Maintenance Tips', 'email', '{"template_id": 10, "educational": true}', 
 '{"rating": {"min": 4}}'),
(3, 4, 'Monthly Wait', 'delay', '{"delay_hours": 720}', '{}'),
(3, 5, 'Maintenance Reminder', 'email', '{"template_id": 8, "reminder": true}', '{}');