// Admin Authentication Utilities
import { sign, verify } from 'hono/jwt'

export interface AdminUser {
  id: number;
  kullanici_adi: string;
  email: string;
  ad_soyad: string;
  yetki_seviyesi: number;
  aktif: boolean;
}

export interface AdminJWTPayload {
  adminId: number;
  kullanici_adi: string;
  yetki_seviyesi: number;
  exp: number;
}

const JWT_SECRET = 'admin-jwt-secret-key-2024' // In production, use environment variable
const TOKEN_EXPIRY = 8 * 60 * 60 // 8 hours in seconds

export async function generateAdminToken(admin: AdminUser): Promise<string> {
  const payload: AdminJWTPayload = {
    adminId: admin.id,
    kullanici_adi: admin.kullanici_adi,
    yetki_seviyesi: admin.yetki_seviyesi,
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY
  }
  
  return await sign(payload, JWT_SECRET)
}

export async function verifyAdminToken(token: string): Promise<AdminJWTPayload | null> {
  try {
    const payload = await verify(token, JWT_SECRET) as AdminJWTPayload
    
    // Check if token is expired
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    return payload
  } catch (error) {
    console.error('Admin token verification error:', error)
    return null
  }
}

export async function hashAdminPassword(password: string): Promise<string> {
  // Temporary implementation for development
  // In production, use proper bcrypt
  return `hashed_${password}`
}

export async function verifyAdminPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Temporary implementation for development
  return `hashed_${password}` === hashedPassword
}

export function requireAdminAuth(minYetkiSeviyesi: number = 1) {
  return async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Yetkilendirme başlığı eksik' }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyAdminToken(token)
    
    if (!payload) {
      return c.json({ error: 'Geçersiz veya süresi dolmuş token' }, 401)
    }

    if (payload.yetki_seviyesi < minYetkiSeviyesi) {
      return c.json({ error: 'Yetersiz yetki seviyesi' }, 403)
    }

    // Add admin info to context
    c.set('admin', payload)
    await next()
  }
}