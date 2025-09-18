/**
 * JWT Authentication System
 * Güvenli token yönetimi ve doğrulama
 */

import { sign, verify } from 'hono/jwt';
import type { 
  JWTPayload, 
  UserRole, 
  Permission, 
  AuthContext,
  AppError,
  ErrorCode
} from '../types';

// ============================================================================
// JWT CONFIGURATION
// ============================================================================
const JWT_CONFIG = {
  secret: 'tv-servis-jwt-secret-2024', // Production'da environment variable kullan
  accessTokenExpiry: 8 * 60 * 60, // 8 hours
  refreshTokenExpiry: 30 * 24 * 60 * 60, // 30 days
  issuer: 'tv-servis-system',
  audience: 'tv-servis-users'
};

// ============================================================================
// JWT TOKEN MANAGER
// ============================================================================
export class JWTManager {
  private static instance: JWTManager;

  static getInstance(): JWTManager {
    if (!this.instance) {
      this.instance = new JWTManager();
    }
    return this.instance;
  }

  // Generate access token
  async generateAccessToken(payload: {
    userId: number;
    role: UserRole;
    permissions: Permission[];
    sessionId?: string;
  }): Promise<string> {
    const tokenPayload: JWTPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + JWT_CONFIG.accessTokenExpiry,
      iat: Math.floor(Date.now() / 1000),
    };

    return await sign(tokenPayload, JWT_CONFIG.secret);
  }

  // Generate refresh token
  async generateRefreshToken(userId: number, sessionId: string): Promise<string> {
    const payload = {
      userId,
      sessionId,
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + JWT_CONFIG.refreshTokenExpiry,
      iat: Math.floor(Date.now() / 1000),
    };

    return await sign(payload, JWT_CONFIG.secret);
  }

  // Verify access token
  async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = await verify(token, JWT_CONFIG.secret) as JWTPayload;
      
      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  // Verify refresh token
  async verifyRefreshToken(token: string): Promise<{
    userId: number;
    sessionId: string;
  } | null> {
    try {
      const payload = await verify(token, JWT_CONFIG.secret) as any;
      
      if (payload.type !== 'refresh' || payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return {
        userId: payload.userId,
        sessionId: payload.sessionId
      };
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  // Create auth context from payload
  createAuthContext(payload: JWTPayload): AuthContext {
    return {
      user: payload,
      isAuthenticated: true,
      hasPermission: (permission: Permission) => payload.permissions.includes(permission),
      hasRole: (role: UserRole) => payload.role === role
    };
  }
}

// ============================================================================
// TEST TOKEN HANDLERS (Development Only)
// ============================================================================
export class TestTokenManager {
  private static testTokens = new Map<string, JWTPayload>();

  // Initialize test tokens
  static initializeTestTokens(): void {
    // Test admin token
    this.testTokens.set('test-admin-token', {
      userId: 1,
      role: UserRole.ADMIN,
      permissions: [
        Permission.JOB_CREATE,
        Permission.JOB_READ,
        Permission.JOB_UPDATE,
        Permission.JOB_DELETE,
        Permission.PAYMENT_APPROVE,
        Permission.PAYMENT_REJECT,
        Permission.PAYMENT_VIEW,
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.SYSTEM_CONFIG
      ],
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      iat: Math.floor(Date.now() / 1000),
    });

    // Test dealer token
    this.testTokens.set('test-dealer-token', {
      userId: 1,
      role: UserRole.DEALER,
      permissions: [
        Permission.JOB_READ,
        Permission.JOB_PURCHASE,
        Permission.PAYMENT_VIEW,
        Permission.PAYMENT_CREATE
      ],
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
    });

    // Legacy tokens for backward compatibility
    this.testTokens.set('test-token-123', {
      userId: 1,
      role: UserRole.ADMIN,
      permissions: [
        Permission.JOB_CREATE,
        Permission.JOB_READ,
        Permission.JOB_UPDATE,
        Permission.JOB_DELETE,
        Permission.PAYMENT_APPROVE,
        Permission.PAYMENT_REJECT,
        Permission.PAYMENT_VIEW,
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.SYSTEM_CONFIG
      ],
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
    });

    this.testTokens.set('test-bayi-token-123', {
      userId: 1,
      role: UserRole.DEALER,
      permissions: [
        Permission.JOB_READ,
        Permission.JOB_PURCHASE,
        Permission.PAYMENT_VIEW,
        Permission.PAYMENT_CREATE
      ],
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
    });
  }

  static verifyTestToken(token: string): JWTPayload | null {
    return this.testTokens.get(token) || null;
  }

  static isTestToken(token: string): boolean {
    return this.testTokens.has(token);
  }
}

// Initialize test tokens
TestTokenManager.initializeTestTokens();

// ============================================================================
// UNIFIED TOKEN VERIFIER
// ============================================================================
export class TokenVerifier {
  private jwtManager: JWTManager;

  constructor() {
    this.jwtManager = JWTManager.getInstance();
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    // First check if it's a test token (for development)
    if (TestTokenManager.isTestToken(token)) {
      return TestTokenManager.verifyTestToken(token);
    }

    // Otherwise, verify as JWT
    return await this.jwtManager.verifyAccessToken(token);
  }

  extractToken(authHeader: string | undefined): string | null {
    return this.jwtManager.extractTokenFromHeader(authHeader);
  }

  createAuthContext(payload: JWTPayload): AuthContext {
    return this.jwtManager.createAuthContext(payload);
  }
}

// ============================================================================
// SESSION MANAGER
// ============================================================================
export class SessionManager {
  constructor(private db: D1Database) {}

  // Create new session
  async createSession(userId: number, metadata: {
    userAgent?: string;
    ipAddress?: string;
    deviceInfo?: string;
  } = {}): Promise<string> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + JWT_CONFIG.accessTokenExpiry * 1000);

    await this.db.prepare(`
      INSERT INTO user_sessions (
        id, user_id, expires_at, user_agent, ip_address, device_info, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      sessionId,
      userId,
      expiresAt.toISOString(),
      metadata.userAgent || null,
      metadata.ipAddress || null,
      metadata.deviceInfo || null
    ).run();

    return sessionId;
  }

  // Validate session
  async validateSession(sessionId: string, userId: number): Promise<boolean> {
    const session = await this.db.prepare(`
      SELECT id FROM user_sessions 
      WHERE id = ? AND user_id = ? AND expires_at > datetime('now') AND is_active = 1
    `).bind(sessionId, userId).first();

    return !!session;
  }

  // Invalidate session
  async invalidateSession(sessionId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE user_sessions SET is_active = 0 WHERE id = ?
    `).bind(sessionId).run();
  }

  // Cleanup expired sessions
  async cleanupExpiredSessions(): Promise<void> {
    await this.db.prepare(`
      DELETE FROM user_sessions WHERE expires_at <= datetime('now')
    `).run();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================
export class PasswordManager {
  // Hash password (simplified for Cloudflare Workers)
  static async hashPassword(password: string): Promise<string> {
    // In production, use Web Crypto API for proper hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt-2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verify password
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const hashedInput = await this.hashPassword(password);
    return hashedInput === hashedPassword;
  }

  // Generate temporary password
  static generateTempPassword(length: number = 8): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Validate password strength
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Şifre en az 8 karakter olmalıdır');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Şifre en az bir büyük harf içermelidir');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Şifre en az bir küçük harf içermelidir');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Şifre en az bir rakam içermelidir');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
export { 
  JWTManager, 
  TestTokenManager, 
  TokenVerifier, 
  SessionManager, 
  PasswordManager,
  JWT_CONFIG 
};

export type { JWTPayload, AuthContext };