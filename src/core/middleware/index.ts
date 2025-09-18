/**
 * Advanced Middleware System
 * Comprehensive security, logging, validation, and performance middleware
 */

import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';

import type { 
  AppContext,
  AppEnv,
  AuthMiddlewareOptions,
  Permission,
  UserRole,
  AppError,
  ErrorCode
} from '../types';
import { TokenVerifier } from '../auth/jwt';
import { DatabaseHelper } from '../database/connection';

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================
export class AuthenticationMiddleware {
  private tokenVerifier = new TokenVerifier();

  // Main authentication middleware
  authenticate(options: AuthMiddlewareOptions = {}) {
    return async (c: AppContext, next: Next) => {
      const authHeader = c.req.header('Authorization');
      const token = this.tokenVerifier.extractToken(authHeader);

      // If authentication is not required and no token provided, continue
      if (!options.required && !token) {
        await next();
        return;
      }

      // If authentication is required but no token provided, return error
      if (options.required && !token) {
        throw new HTTPException(401, { message: 'Yetkilendirme token\'ı gerekli' });
      }

      // Verify token if provided
      if (token) {
        const payload = await this.tokenVerifier.verifyToken(token);
        
        if (!payload) {
          throw new HTTPException(401, { message: 'Geçersiz veya süresi dolmuş token' });
        }

        // Create auth context
        const authContext = this.tokenVerifier.createAuthContext(payload);
        c.set('auth', authContext);
        c.set('user', {
          id: payload.userId,
          role: payload.role,
          permissions: payload.permissions
        });

        // Check role requirements
        if (options.roles && !options.roles.includes(payload.role)) {
          throw new HTTPException(403, { message: 'Yetersiz yetki seviyesi' });
        }

        // Check permission requirements
        if (options.permissions) {
          const hasAllPermissions = options.permissions.every(
            permission => payload.permissions.includes(permission)
          );
          
          if (!hasAllPermissions) {
            throw new HTTPException(403, { message: 'Yetersiz yetkiler' });
          }
        }
      }

      await next();
    };
  }

  // Require specific permission
  requirePermission(permission: Permission) {
    return this.authenticate({
      required: true,
      permissions: [permission]
    });
  }

  // Require specific role
  requireRole(role: UserRole) {
    return this.authenticate({
      required: true,
      roles: [role]
    });
  }

  // Admin only access
  adminOnly() {
    return this.requireRole(UserRole.ADMIN);
  }

  // Dealer only access
  dealerOnly() {
    return this.requireRole(UserRole.DEALER);
  }
}

// ============================================================================
// RATE LIMITING MIDDLEWARE
// ============================================================================
export class RateLimitingMiddleware {
  private static requests = new Map<string, { count: number; resetTime: number }>();

  static rateLimit(options: {
    windowMs: number;
    max: number;
    message?: string;
    keyGenerator?: (c: Context) => string;
  }) {
    return async (c: Context, next: Next) => {
      const key = options.keyGenerator ? options.keyGenerator(c) : this.getClientKey(c);
      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Clean up old entries
      this.cleanup(windowStart);

      // Get current count for this key
      const current = this.requests.get(key);
      
      if (!current || current.resetTime <= now) {
        // New window or expired window
        this.requests.set(key, { count: 1, resetTime: now + options.windowMs });
      } else {
        // Within current window
        if (current.count >= options.max) {
          throw new HTTPException(429, { 
            message: options.message || 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.' 
          });
        }
        
        current.count++;
        this.requests.set(key, current);
      }

      // Add rate limit headers
      const remaining = Math.max(0, options.max - (this.requests.get(key)?.count || 0));
      c.res.headers.set('X-RateLimit-Limit', options.max.toString());
      c.res.headers.set('X-RateLimit-Remaining', remaining.toString());
      c.res.headers.set('X-RateLimit-Reset', this.requests.get(key)?.resetTime.toString() || '');

      await next();
    };
  }

  private static getClientKey(c: Context): string {
    // Try to get IP from various headers
    const forwardedFor = c.req.header('x-forwarded-for');
    const realIP = c.req.header('x-real-ip');
    const cfConnectingIP = c.req.header('cf-connecting-ip');
    
    return cfConnectingIP || realIP || forwardedFor?.split(',')[0] || 'unknown';
  }

  private static cleanup(cutoff: number): void {
    for (const [key, data] of this.requests.entries()) {
      if (data.resetTime <= cutoff) {
        this.requests.delete(key);
      }
    }
  }
}

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================
export class ValidationMiddleware {
  static validateJSON() {
    return async (c: Context, next: Next) => {
      const contentType = c.req.header('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const body = await c.req.json();
          c.set('validatedBody', body);
        } catch (error) {
          throw new HTTPException(400, { message: 'Geçersiz JSON formatı' });
        }
      }
      
      await next();
    };
  }

  static validateSchema(schema: {
    body?: any;
    params?: any;
    query?: any;
  }) {
    return async (c: Context, next: Next) => {
      try {
        // Validate body if schema provided
        if (schema.body) {
          const body = c.get('validatedBody') || await c.req.json();
          const errors = this.validateObject(body, schema.body);
          
          if (errors.length > 0) {
            throw new HTTPException(400, { 
              message: 'Doğrulama hataları',
              cause: { errors }
            });
          }
          
          c.set('validatedBody', body);
        }

        // Validate query parameters if schema provided
        if (schema.query) {
          const query = Object.fromEntries(new URL(c.req.url).searchParams);
          const errors = this.validateObject(query, schema.query);
          
          if (errors.length > 0) {
            throw new HTTPException(400, { 
              message: 'Query parametreleri geçersiz',
              cause: { errors }
            });
          }
          
          c.set('validatedQuery', query);
        }

        await next();
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(400, { message: 'Doğrulama hatası' });
      }
    };
  }

  private static validateObject(obj: any, schema: any): string[] {
    const errors: string[] = [];

    // Basic validation - extend with more sophisticated validation library if needed
    for (const [field, rules] of Object.entries(schema)) {
      const value = obj[field];
      const fieldRules = rules as any;

      // Required field check
      if (fieldRules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} alanı gereklidir`);
        continue;
      }

      // Skip further validation if field is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (fieldRules.type) {
        const expectedType = fieldRules.type;
        const actualType = typeof value;
        
        if (expectedType === 'number' && isNaN(Number(value))) {
          errors.push(`${field} geçerli bir sayı olmalıdır`);
        } else if (expectedType === 'email' && !this.isValidEmail(value)) {
          errors.push(`${field} geçerli bir e-posta adresi olmalıdır`);
        } else if (expectedType === 'string' && actualType !== 'string') {
          errors.push(`${field} metin olmalıdır`);
        }
      }

      // Length validation
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        errors.push(`${field} en az ${fieldRules.minLength} karakter olmalıdır`);
      }
      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        errors.push(`${field} en fazla ${fieldRules.maxLength} karakter olabilir`);
      }

      // Numeric range validation
      if (fieldRules.min && Number(value) < fieldRules.min) {
        errors.push(`${field} en az ${fieldRules.min} olmalıdır`);
      }
      if (fieldRules.max && Number(value) > fieldRules.max) {
        errors.push(`${field} en fazla ${fieldRules.max} olabilir`);
      }

      // Pattern validation
      if (fieldRules.pattern && !new RegExp(fieldRules.pattern).test(value)) {
        errors.push(`${field} geçerli formatta olmalıdır`);
      }

      // Enum validation
      if (fieldRules.enum && !fieldRules.enum.includes(value)) {
        errors.push(`${field} geçerli bir değer olmalıdır: ${fieldRules.enum.join(', ')}`);
      }
    }

    return errors;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================
export class ErrorHandlingMiddleware {
  static errorHandler() {
    return async (c: Context, next: Next) => {
      try {
        await next();
      } catch (error) {
        console.error('Request error:', error);

        // Handle HTTPException (from Hono)
        if (error instanceof HTTPException) {
          return c.json({
            success: false,
            error: error.message,
            code: error.status,
            ...(error.cause && { details: error.cause })
          }, error.status);
        }

        // Handle AppError (custom application errors)
        if (error instanceof Error && 'code' in error) {
          const appError = error as AppError;
          return c.json({
            success: false,
            error: appError.message,
            code: appError.code,
            ...(appError.details && { details: appError.details })
          }, appError.statusCode || 500);
        }

        // Handle generic errors
        return c.json({
          success: false,
          error: 'Sunucu hatası oluştu',
          code: 'INTERNAL_SERVER_ERROR'
        }, 500);
      }
    };
  }

  static notFoundHandler() {
    return (c: Context) => {
      return c.json({
        success: false,
        error: 'Endpoint bulunamadı',
        code: 'NOT_FOUND'
      }, 404);
    };
  }
}

// ============================================================================
// LOGGING MIDDLEWARE
// ============================================================================
export class LoggingMiddleware {
  static requestLogger() {
    return logger((message: string, ...rest: string[]) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${message}`, ...rest);
    });
  }

  static auditLogger(db: DatabaseHelper) {
    return async (c: AppContext, next: Next) => {
      const startTime = Date.now();
      c.set('startTime', startTime);

      // Generate request ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      c.set('requestId', requestId);

      // Log request start
      const method = c.req.method;
      const url = c.req.url;
      const userAgent = c.req.header('user-agent');
      const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

      try {
        await next();

        // Log successful completion
        const duration = Date.now() - startTime;
        const user = c.get('user');
        
        console.log(`[${requestId}] ${method} ${url} - ${c.res.status} - ${duration}ms - User: ${user?.id || 'anonymous'}`);
        
        // Store audit log for important operations
        if (this.shouldAudit(method, url)) {
          await this.storeAuditLog(db, {
            requestId,
            method,
            url,
            statusCode: c.res.status,
            duration,
            userId: user?.id,
            userRole: user?.role,
            ipAddress: ip,
            userAgent
          });
        }
      } catch (error) {
        // Log error
        const duration = Date.now() - startTime;
        const user = c.get('user');
        
        console.error(`[${requestId}] ${method} ${url} - ERROR - ${duration}ms - User: ${user?.id || 'anonymous'} - Error:`, error);
        
        throw error;
      }
    };
  }

  private static shouldAudit(method: string, url: string): boolean {
    // Audit important operations
    const auditPaths = [
      '/api/admin/',
      '/api/payment/',
      '/api/bayi/buy-job',
      '/api/job/create'
    ];
    
    const nonGetMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    
    return nonGetMethods.includes(method) && 
           auditPaths.some(path => url.includes(path));
  }

  private static async storeAuditLog(db: DatabaseHelper, logData: any): Promise<void> {
    try {
      await db.create('audit_log', {
        table_name: 'api_request',
        action: logData.method,
        old_values: null,
        new_values: JSON.stringify({
          url: logData.url,
          duration: logData.duration,
          status_code: logData.statusCode
        }),
        user_id: logData.userId,
        user_type: logData.userRole || 'unknown',
        ip_address: logData.ipAddress,
        user_agent: logData.userAgent
      });
    } catch (error) {
      console.error('Failed to store audit log:', error);
      // Don't throw - audit logging failure shouldn't break the request
    }
  }
}

// ============================================================================
// PERFORMANCE MONITORING MIDDLEWARE
// ============================================================================
export class PerformanceMiddleware {
  private static metrics = new Map<string, {
    totalRequests: number;
    totalDuration: number;
    errors: number;
    lastUpdated: number;
  }>();

  static performanceMonitor() {
    return async (c: Context, next: Next) => {
      const startTime = Date.now();
      const endpoint = `${c.req.method} ${c.req.routePath || new URL(c.req.url).pathname}`;
      
      try {
        await next();
        
        const duration = Date.now() - startTime;
        this.updateMetrics(endpoint, duration, false);
        
        // Add performance headers
        c.res.headers.set('X-Response-Time', `${duration}ms`);
        
        // Warn about slow requests
        if (duration > 5000) { // 5 seconds
          console.warn(`Slow request detected: ${endpoint} took ${duration}ms`);
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        this.updateMetrics(endpoint, duration, true);
        throw error;
      }
    };
  }

  private static updateMetrics(endpoint: string, duration: number, isError: boolean): void {
    const current = this.metrics.get(endpoint) || {
      totalRequests: 0,
      totalDuration: 0,
      errors: 0,
      lastUpdated: Date.now()
    };

    current.totalRequests++;
    current.totalDuration += duration;
    if (isError) current.errors++;
    current.lastUpdated = Date.now();

    this.metrics.set(endpoint, current);

    // Clean up old metrics (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of this.metrics.entries()) {
      if (value.lastUpdated < oneHourAgo) {
        this.metrics.delete(key);
      }
    }
  }

  static getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [endpoint, metrics] of this.metrics.entries()) {
      result[endpoint] = {
        totalRequests: metrics.totalRequests,
        averageDuration: Math.round(metrics.totalDuration / metrics.totalRequests),
        errorRate: (metrics.errors / metrics.totalRequests * 100).toFixed(2) + '%',
        lastUpdated: new Date(metrics.lastUpdated).toISOString()
      };
    }
    
    return result;
  }
}

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================
export function setupSecurityMiddleware() {
  return [
    // CORS configuration
    cors({
      origin: ['http://localhost:3000', 'https://*.pages.dev', 'https://anındais.com', 'https://xn--anndais-sfb.com'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposeHeaders: ['X-Response-Time', 'X-Request-ID'],
      maxAge: 86400,
      credentials: true
    }),

    // Security headers
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.paytr.com"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
      },
      crossOriginEmbedderPolicy: false // Cloudflare Workers compatibility
    }),

    // Pretty JSON in development
    prettyJSON()
  ];
}

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================
export class MiddlewareFactory {
  static createAuthMiddleware() {
    return new AuthenticationMiddleware();
  }

  static createRateLimit(windowMs: number, max: number, message?: string) {
    return RateLimitingMiddleware.rateLimit({ windowMs, max, message });
  }

  static createValidation(schema: any) {
    return ValidationMiddleware.validateSchema(schema);
  }

  static createStandardMiddlewareChain(db: DatabaseHelper) {
    return [
      ...setupSecurityMiddleware(),
      LoggingMiddleware.requestLogger(),
      LoggingMiddleware.auditLogger(db),
      PerformanceMiddleware.performanceMonitor(),
      ValidationMiddleware.validateJSON(),
      ErrorHandlingMiddleware.errorHandler()
    ];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
export {
  AuthenticationMiddleware,
  RateLimitingMiddleware,
  ValidationMiddleware,
  ErrorHandlingMiddleware,
  LoggingMiddleware,
  PerformanceMiddleware,
  setupSecurityMiddleware
};

export default MiddlewareFactory;