// Authentication utilities for TV Servis Yönetim Sistemi
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// JWT Token Interface
export interface BayiTokenPayload {
  bayiId: number;
  email: string;
  firmaAdi: string;
  ilId: number;
  exp?: number;
}

// JWT Secret (in production, this should come from environment variables)
const JWT_SECRET = 'tv-servis-super-secret-key-2025';
const TOKEN_EXPIRY = '24h';

/**
 * Generate JWT token for bayi
 */
export function generateBayiToken(bayi: {
  id: number;
  login_email: string;
  firma_adi: string;
  il_id: number;
}): string {
  const payload: BayiTokenPayload = {
    bayiId: bayi.id,
    email: bayi.login_email,
    firmaAdi: bayi.firma_adi,
    ilId: bayi.il_id
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify and decode JWT token
 */
export function verifyBayiToken(token: string): BayiTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as BayiTokenPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate session token for database storage
 */
export function generateSessionToken(): string {
  return jwt.sign(
    { 
      random: Math.random(), 
      timestamp: Date.now() 
    }, 
    JWT_SECRET + '-session'
  );
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware to verify bayi authentication
 */
export async function verifyBayiAuth(
  authHeader: string | undefined,
  DB: D1Database
): Promise<BayiTokenPayload | null> {
  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    return null;
  }

  // Handle test token for development
  if (token === 'test-bayi-token-123') {
    // Get first active bayi for testing
    const bayi = await DB.prepare(`
      SELECT id, login_email, firma_adi, il_id
      FROM bayiler 
      WHERE aktif = 1 AND aktif_login = 1 
      LIMIT 1
    `).first();
    
    if (bayi) {
      return {
        bayiId: bayi.id,
        login_email: bayi.login_email,
        firma_adi: bayi.firma_adi,
        ilId: bayi.il_id
      };
    }
    return null;
  }

  const payload = verifyBayiToken(token);
  if (!payload) {
    return null;
  }

  // Check if session is still active in database
  const session = await DB.prepare(`
    SELECT s.*, b.aktif_login 
    FROM bayi_sessions s 
    JOIN bayiler b ON s.bayi_id = b.id 
    WHERE s.bayi_id = ? AND s.aktif = 1 AND s.expires_at > datetime('now')
    ORDER BY s.created_at DESC 
    LIMIT 1
  `).bind(payload.bayiId).first();

  if (!session || !session.aktif_login) {
    return null;
  }

  return payload;
}