# 🚀 GARANTOR360 - Quick Access Guide

## 📱 **INSTANT ACCESS LINKS**

### **🏠 Main Dashboards**
```
🏡 Ana Dashboard:     /admin
🎯 Lead Scoring:      /admin/lead-scoring-dashboard  
📧 Email Marketing:   /admin/email-marketing-dashboard
👥 Segmentation:      /admin/customer-segmentation-dashboard
🤖 Automation:        /admin/marketing-automation-dashboard
```

### **🔑 Login & Auth**
```
🔐 Admin Login:       /admin/login
👤 Bayi Panel:        /bayi-panel
🔓 Logout:            /admin/logout
```

---

## ⚡ **QUICK API COMMANDS**

### **💰 Test Payment (PayTR)**
```bash
curl -X POST "http://localhost:3000/api/payment/paytr/init" \
  -H "Authorization: Bearer BAYI_TOKEN" \
  -d '{"amount": 100}'
```

### **📧 Get Email Templates**
```bash
curl -X GET "http://localhost:3000/api/email-marketing/templates" \
  -H "Authorization: Bearer test-token-123"
```

### **👥 Get Customer Segments**
```bash
curl -X GET "http://localhost:3000/api/customer-segmentation/segments" \
  -H "Authorization: Bearer test-token-123"
```

### **🤖 Trigger Workflow**
```bash
curl -X POST "http://localhost:3000/api/marketing-automation/trigger-workflow" \
  -H "Authorization: Bearer test-token-123" \
  -d '{"workflow_id": 1, "customer_identifier": "test@example.com"}'
```

---

## 🎛️ **SYSTEM CONTROLS**

### **🔄 Restart System**
```bash
cd /home/user/webapp
npm run build
pm2 restart tv-servis-yonetim
```

### **📊 Check System Status**
```bash
pm2 list
pm2 logs tv-servis-yonetim --nostream
curl http://localhost:3000/api/health
```

### **🗄️ Database Commands**
```bash
# Apply migrations
npx wrangler d1 migrations apply tvservis-production --local

# Database console
npx wrangler d1 execute tvservis-production --local

# Reset database
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local
```

---

## 🚨 **EMERGENCY PROCEDURES**

### **🔧 Quick Fix Commands**
```bash
# Kill port 3000
fuser -k 3000/tcp 2>/dev/null || true

# Clean restart
pm2 delete all && pm2 start ecosystem.config.cjs

# Check logs for errors
tail -f ~/.pm2/logs/tv-servis-yonetim-error.log
```

### **🔍 Debug Mode**
```bash
# Start with debug
NODE_ENV=development npm run dev:sandbox

# Test specific endpoint
curl -v http://localhost:3000/api/health
```

---

## 🔐 **DEFAULT CREDENTIALS**

### **Admin Access**
```
Username: admin
Password: admin123456
Token: test-token-123
```

### **Test Data**
```
Test Email: test@example.com
Test Phone: +905551234567
Test Customer: Test Müşteri
```

---

## 📊 **FEATURE QUICK CHECK**

### **✅ Core Systems (All Working)**
- [x] Admin Panel & Auth
- [x] Service Management  
- [x] Payment System (PayTR)
- [x] Security & IP Blocking
- [x] Analytics & Tracking

### **✅ Marketing Systems (All Working)**
- [x] Lead Scoring (30+ rules)
- [x] Email Marketing (5 templates)
- [x] Customer Segmentation (15 segments)  
- [x] Marketing Automation (6 workflows)
- [x] Behavioral Tracking

### **📈 Performance Stats**
```
🗄️ Database Tables: 20+
🚀 API Endpoints: 50+
📧 Email Templates: 5
👥 Customer Segments: 15  
🤖 Workflows: 6
🎛️ Admin Dashboards: 5
```

---

## 🎯 **MOST USED FEATURES**

### **📧 Email Marketing**
1. Create template: POST `/api/email-marketing/templates`
2. Send campaign: POST `/api/email-marketing/campaigns`
3. View analytics: GET `/api/email-marketing/analytics`

### **👥 Customer Management**
1. Track behavior: POST `/api/customer-segmentation/track-behavior`
2. Auto-segment: POST `/api/customer-segmentation/auto-segment`
3. View segments: GET `/api/customer-segmentation/segments`

### **🤖 Automation**
1. List workflows: GET `/api/marketing-automation/workflows`
2. Trigger workflow: POST `/api/marketing-automation/trigger-workflow`
3. Execute pending: POST `/api/marketing-automation/execute-pending`

---

## 🔧 **MAINTENANCE SCHEDULE**

### **Daily (5 min)**
- [ ] Check system status: `pm2 list`
- [ ] Check error logs: `pm2 logs --nostream`
- [ ] Test main endpoints

### **Weekly (15 min)**  
- [ ] Review analytics dashboards
- [ ] Check email campaign performance
- [ ] Update customer segments
- [ ] Execute pending automations

### **Monthly (30 min)**
- [ ] Database cleanup
- [ ] Security audit
- [ ] Performance optimization
- [ ] Backup system data

---

## 🚀 **PUBLIC ACCESS**

### **Live System URL**
```
🌐 Production URL: https://3000-i9quaqabu83e1ygd769z4-6532622b.e2b.dev
🔗 Admin Panel: https://3000-i9quaqabu83e1ygd769z4-6532622b.e2b.dev/admin
📊 Health Check: https://3000-i9quaqabu83e1ygd769z4-6532622b.e2b.dev/api/health
```

---

## 📞 **SUPPORT CHECKLIST**

### **Before Asking for Help**
1. [ ] Check this guide first
2. [ ] Try system restart
3. [ ] Check error logs
4. [ ] Test with curl commands
5. [ ] Review recent changes

### **When Reporting Issues**
- Include error messages
- Specify what you were trying to do
- Mention which dashboard/API
- Share relevant logs
- Note system environment

---

**💡 Pro Tip:** Bookmark this page and the full checklist for quick reference!

**📅 Last Updated:** 2025-10-02  
**🔄 Version:** v1.0 - Complete Marketing Automation Platform