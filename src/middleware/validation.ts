// Input Validation Middleware
import { Context, Next } from 'hono';
import { SystemLogger, validateEmail, validatePhone, validateAmount, sanitizeInput, checkRateLimit } from '../utils/logger';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'amount';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
}

export function validateInput(rules: ValidationRule[]) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const errors: string[] = [];

      for (const rule of rules) {
        const value = body[rule.field];

        // Check required fields
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(`${rule.field} gerekli bir alandır`);
          continue;
        }

        // Skip validation if field is not required and empty
        if (!rule.required && (value === undefined || value === null || value === '')) {
          continue;
        }

        // Type validations
        switch (rule.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`${rule.field} metin olmalıdır`);
              break;
            }
            if (rule.minLength && value.length < rule.minLength) {
              errors.push(`${rule.field} en az ${rule.minLength} karakter olmalıdır`);
            }
            if (rule.maxLength && value.length > rule.maxLength) {
              errors.push(`${rule.field} en fazla ${rule.maxLength} karakter olmalıdır`);
            }
            // Sanitize string inputs
            body[rule.field] = sanitizeInput(value);
            break;

          case 'number':
            const numValue = Number(value);
            if (isNaN(numValue)) {
              errors.push(`${rule.field} geçerli bir sayı olmalıdır`);
              break;
            }
            if (rule.min !== undefined && numValue < rule.min) {
              errors.push(`${rule.field} en az ${rule.min} olmalıdır`);
            }
            if (rule.max !== undefined && numValue > rule.max) {
              errors.push(`${rule.field} en fazla ${rule.max} olmalıdır`);
            }
            body[rule.field] = numValue;
            break;

          case 'email':
            if (!validateEmail(value)) {
              errors.push(`${rule.field} geçerli bir email adresi olmalıdır`);
            }
            break;

          case 'phone':
            if (!validatePhone(value)) {
              errors.push(`${rule.field} geçerli bir telefon numarası olmalıdır`);
            }
            break;

          case 'amount':
            const amount = Number(value);
            if (!validateAmount(amount)) {
              errors.push(`${rule.field} geçerli bir tutar olmalıdır (1-10000 TL)`);
            }
            body[rule.field] = amount;
            break;
        }

        // Pattern validation
        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
          errors.push(`${rule.field} geçersiz format`);
        }

        // Custom validation
        if (rule.custom && !rule.custom(value)) {
          errors.push(`${rule.field} geçersiz değer`);
        }
      }

      if (errors.length > 0) {
        SystemLogger.warn('Validation', 'Input validation failed', { 
          errors, 
          body: Object.keys(body) 
        });
        
        return c.json({
          error: 'Girdi doğrulama hatası',
          details: errors
        }, 400);
      }

      // Store validated and sanitized body
      c.set('validatedBody', body);
      await next();
      
    } catch (error) {
      SystemLogger.error('Validation', 'Validation middleware error', { 
        error: error.message 
      });
      
      return c.json({
        error: 'İstek işlenirken hata oluştu'
      }, 500);
    }
  };
}

// Rate limiting middleware
export function rateLimit(maxRequests: number = 10, windowMs: number = 60000) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 
                c.req.header('X-Forwarded-For') || 
                'unknown';
    
    if (!checkRateLimit(ip, maxRequests, windowMs)) {
      SystemLogger.warn('RateLimit', 'Rate limit exceeded', { ip });
      
      return c.json({
        error: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.'
      }, 429);
    }

    await next();
  };
}

// Security headers middleware
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next();
    
    // Add security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  };
}

// Request logging middleware
export function requestLogger() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const url = c.req.url;
    const userAgent = c.req.header('User-Agent') || '';
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;
    
    SystemLogger.info('Request', `${method} ${url}`, {
      status,
      duration,
      ip,
      userAgent: userAgent.substring(0, 100)
    });
  };
}

// Common validation rules
export const ValidationRules = {
  bayiLogin: [
    { field: 'email', required: true, type: 'email' as const },
    { field: 'password', required: true, type: 'string' as const, minLength: 6 }
  ],
  
  adminLogin: [
    { field: 'kullanici_adi', required: true, type: 'string' as const, minLength: 3, maxLength: 50 },
    { field: 'sifre', required: true, type: 'string' as const, minLength: 6 }
  ],
  
  transferNotify: [
    { field: 'amount', required: true, type: 'amount' as const },
    { field: 'reference', required: true, type: 'string' as const, minLength: 5, maxLength: 50 },
    { field: 'description', required: false, type: 'string' as const, maxLength: 200 },
    { field: 'transfer_date', required: true, type: 'string' as const }
  ],
  
  paymentApproval: [
    { field: 'action', required: true, type: 'string' as const, custom: (v) => ['approve', 'reject'].includes(v) },
    { field: 'aciklama', required: false, type: 'string' as const, maxLength: 500 }
  ]
};