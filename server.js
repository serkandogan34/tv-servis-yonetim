// Node.js server for Coolify deployment
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import the Hono app (we need to modify the main app for Node.js compatibility)
let app

try {
  // Load the built app
  const appModule = await import('./dist/_worker.js')
  app = appModule.default
} catch (error) {
  console.error('Failed to load app:', error)
  process.exit(1)
}

// Database setup for production
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite')
let db

try {
  // Ensure database directory exists
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  
  db = new Database(dbPath)
  
  // Create tables if they don't exist (basic schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_code TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_city TEXT,
      customer_district TEXT,
      service_category TEXT NOT NULL,
      problem_description TEXT NOT NULL,
      urgency TEXT DEFAULT 'normal',
      contact_preference TEXT DEFAULT '["phone"]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'received',
      n8n_sent INTEGER DEFAULT 0,
      n8n_response TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_service_requests_code ON service_requests(request_code);
    CREATE INDEX IF NOT EXISTS idx_service_requests_date ON service_requests(created_at);
  `)
  
  console.log('✅ Database initialized:', dbPath)
} catch (error) {
  console.error('❌ Database setup failed:', error)
}

// Mock Cloudflare environment for Node.js
const mockEnv = {
  DB: {
    prepare: (sql) => ({
      bind: (...params) => ({
        run: () => {
          try {
            const stmt = db.prepare(sql)
            const result = stmt.run(...params)
            return { success: true, meta: { last_row_id: result.lastInsertRowid } }
          } catch (error) {
            console.error('DB Error:', error)
            throw error
          }
        },
        first: () => {
          try {
            const stmt = db.prepare(sql)
            return stmt.get(...params)
          } catch (error) {
            console.error('DB Error:', error)
            throw error
          }
        },
        all: () => {
          try {
            const stmt = db.prepare(sql)
            return { results: stmt.all(...params) }
          } catch (error) {
            console.error('DB Error:', error)
            throw error
          }
        }
      })
    })
  },
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || 'https://n8nwork.dtekai.com/webhook/04c07c0a-774f-4309-9437-9fed7a88cfcf'
}

// Middleware to inject mock environment
app.use('*', (c, next) => {
  c.env = mockEnv
  return next()
})

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/slider.js', serveStatic({ path: './public/slider.js' }))

// Start server
const port = process.env.PORT || 3000
const host = process.env.HOST || '0.0.0.0'

console.log(`🚀 Starting server on ${host}:${port}`)
console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`🗄️ Database: ${dbPath}`)
console.log(`🔗 N8N Webhook: ${mockEnv.N8N_WEBHOOK_URL}`)

serve({
  fetch: app.fetch,
  port: parseInt(port),
  hostname: host
})

console.log(`✅ Server running at http://${host}:${port}`)