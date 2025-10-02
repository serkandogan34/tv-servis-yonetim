-- =====================================================================
-- Customer Segmentation System - Seed Data
-- =====================================================================

-- Predefined Customer Segments
INSERT OR IGNORE INTO customer_segments (
  id, segment_name, segment_description, segment_criteria, segment_color, priority_score, created_by
) VALUES 

-- 1. VIP Customers - Yüksek değerli müşteriler
(1, 'VIP Customers', 'Yüksek harcama yapan, sadık müşteriler', 
 '{"total_spent": {"min": 1000}, "service_count": {"min": 3}, "last_service_days": {"max": 60}, "satisfaction_score": {"min": 4.5}}',
 '#FFD700', 100, 'system'),

-- 2. Regular Customers - Düzenli müşteriler
(2, 'Regular Customers', 'Düzenli olarak hizmet alan müşteriler',
 '{"service_count": {"min": 2, "max": 2}, "last_service_days": {"max": 180}, "satisfaction_score": {"min": 3.5}}',
 '#4CAF50', 90, 'system'),

-- 3. New Customers - Yeni müşteriler
(3, 'New Customers', 'İlk kez hizmet alan müşteriler',
 '{"service_count": {"max": 1}, "registration_days": {"max": 30}}',
 '#2196F3', 80, 'system'),

-- 4. At-Risk Customers - Risk altındaki müşteriler
(4, 'At-Risk Customers', 'Uzun süredir hizmet almayan müşteriler',
 '{"last_service_days": {"min": 180}, "service_count": {"min": 1}, "email_engagement": {"max": 0.2}}',
 '#FF9800', 95, 'system'),

-- 5. Lost Customers - Kaybedilen müşteriler
(5, 'Lost Customers', 'Uzun süredir hiç aktivite göstermeyen müşteriler',
 '{"last_activity_days": {"min": 365}, "email_engagement": {"max": 0.1}}',
 '#F44336', 70, 'system'),

-- 6. High-Value Prospects - Yüksek potansiyelli prospektler
(6, 'High-Value Prospects', 'Yüksek değerli hizmet ilgisi gösteren prospektler',
 '{"lead_score": {"min": 70}, "service_interest": "high_value", "engagement_level": {"min": 0.6}}',
 '#9C27B0', 85, 'system'),

-- 7. Engaged Prospects - Aktif prospektler
(7, 'Engaged Prospects', 'Email ve web sitesi ile aktif etkileşim kuran prospektler',
 '{"email_engagement": {"min": 0.5}, "website_visits": {"min": 3}, "lead_score": {"min": 40, "max": 69}}',
 '#00BCD4', 75, 'system'),

-- 8. Cold Prospects - Soğuk prospektler
(8, 'Cold Prospects', 'Düşük etkileşim gösteren prospektler',
 '{"email_engagement": {"max": 0.2}, "website_visits": {"max": 1}, "lead_score": {"max": 39}}',
 '#607D8B', 60, 'system'),

-- 9. Service-Specific Segments
(9, 'Kombi Specialists', 'Kombi hizmeti ile ilgilenen müşteriler',
 '{"service_interests": ["kombi"], "service_frequency": "seasonal"}',
 '#FF5722', 65, 'system'),

(10, 'Klima Specialists', 'Klima hizmeti ile ilgilenen müşteriler',
 '{"service_interests": ["klima"], "service_frequency": "seasonal"}',
 '#03DAC6', 65, 'system'),

(11, 'Multi-Service Users', 'Çoklu hizmet alan müşteriler',
 '{"service_variety": {"min": 3}, "service_count": {"min": 5}}',
 '#673AB7', 88, 'system'),

-- 12. Behavioral Segments
(12, 'Price Sensitive', 'Fiyat odaklı müşteriler',
 '{"discount_usage": {"min": 0.8}, "price_comparison_behavior": true}',
 '#795548', 70, 'system'),

(13, 'Quality Seekers', 'Kalite odaklı müşteriler',
 '{"premium_service_rate": {"min": 0.6}, "satisfaction_score": {"min": 4.0}}',
 '#E91E63', 85, 'system'),

-- 13. Geographic Segments
(14, 'Istanbul Metro', 'İstanbul metropoliten alan müşterileri',
 '{"location": ["Istanbul"], "service_density": "high"}',
 '#3F51B5', 80, 'system'),

(15, 'Regional Cities', 'Bölgesel şehir müşterileri',
 '{"location_type": "regional", "service_availability": "standard"}',
 '#009688', 75, 'system');

-- Segment Rules for Automated Assignment
INSERT OR IGNORE INTO segment_rules (
  segment_id, rule_name, rule_description, rule_type, rule_conditions, rule_weight
) VALUES

-- VIP Customers Rules
(1, 'High Spender', 'Total spending > 1000 TL', 'transactional', 
 '{"field": "total_spent", "operator": ">=", "value": 1000}', 0.4),
(1, 'Frequent User', 'Service count >= 3', 'behavioral', 
 '{"field": "service_count", "operator": ">=", "value": 3}', 0.3),
(1, 'Recent Activity', 'Last service within 60 days', 'behavioral', 
 '{"field": "last_service_days", "operator": "<=", "value": 60}', 0.3),

-- Regular Customers Rules
(2, 'Moderate Usage', 'Service count between 2-5', 'behavioral', 
 '{"field": "service_count", "operator": "between", "value": [2, 5]}', 0.5),
(2, 'Active User', 'Last service within 180 days', 'behavioral', 
 '{"field": "last_service_days", "operator": "<=", "value": 180}', 0.5),

-- New Customers Rules
(3, 'First Timer', 'Service count <= 1', 'behavioral', 
 '{"field": "service_count", "operator": "<=", "value": 1}', 0.6),
(3, 'Recent Registration', 'Registered within 30 days', 'demographic', 
 '{"field": "registration_days", "operator": "<=", "value": 30}', 0.4),

-- At-Risk Customers Rules
(4, 'Long Inactive', 'Last service > 180 days ago', 'behavioral', 
 '{"field": "last_service_days", "operator": ">", "value": 180}', 0.5),
(4, 'Low Engagement', 'Email engagement < 0.2', 'engagement', 
 '{"field": "email_engagement", "operator": "<", "value": 0.2}', 0.5),

-- High-Value Prospects Rules
(6, 'High Lead Score', 'Lead score >= 70', 'behavioral', 
 '{"field": "lead_score", "operator": ">=", "value": 70}', 0.6),
(6, 'Premium Interest', 'Interest in high-value services', 'behavioral', 
 '{"field": "service_interest", "operator": "includes", "value": ["premium", "enterprise"]}', 0.4),

-- Engaged Prospects Rules
(7, 'Good Engagement', 'Email engagement >= 0.5', 'engagement', 
 '{"field": "email_engagement", "operator": ">=", "value": 0.5}', 0.4),
(7, 'Website Activity', 'Website visits >= 3', 'behavioral', 
 '{"field": "website_visits", "operator": ">=", "value": 3}', 0.3),
(7, 'Medium Lead Score', 'Lead score 40-69', 'behavioral', 
 '{"field": "lead_score", "operator": "between", "value": [40, 69]}', 0.3),

-- Cold Prospects Rules
(8, 'Low Engagement', 'Email engagement <= 0.2', 'engagement', 
 '{"field": "email_engagement", "operator": "<=", "value": 0.2}', 0.5),
(8, 'Low Lead Score', 'Lead score <= 39', 'behavioral', 
 '{"field": "lead_score", "operator": "<=", "value": 39}', 0.5);