// Advanced Logging and Error Handling System
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  message: string;
  data?: any;
  userId?: number;
  userType?: 'bayi' | 'admin';
  ip?: string;
  userAgent?: string;
}

export class SystemLogger {
  static log(level: LogEntry['level'], module: string, message: string, data?: any, context?: { userId?: number, userType?: 'bayi' | 'admin', ip?: string, userAgent?: string }) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
      ...context
    };

    // Console logging (development)
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}] ${module}: ${message}`, data || '');

    // In production, this would send to external logging service
    // Example: Cloudflare Analytics, Sentry, etc.
    
    return logEntry;
  }

  static info(module: string, message: string, data?: any, context?: any) {
    return this.log('info', module, message, data, context);
  }

  static warn(module: string, message: string, data?: any, context?: any) {
    return this.log('warn', module, message, data, context);
  }

  static error(module: string, message: string, data?: any, context?: any) {
    return this.log('error', module, message, data, context);
  }

  static debug(module: string, message: string, data?: any, context?: any) {
    return this.log('debug', module, message, data, context);
  }
}

// Error response helper
export function createErrorResponse(message: string, statusCode: number = 500, details?: any) {
  return {
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    details: details || null
  };
}

// Success response helper  
export function createSuccessResponse(data: any, message?: string) {
  return {
    success: true,
    message: message || 'İşlem başarılı',
    data,
    timestamp: new Date().toISOString()
  };
}

// Database transaction helper with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  delay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      SystemLogger.warn('Database', `Operation failed, attempt ${attempt}/${maxRetries}`, { error: error.message });
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError!;
}

// Input validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^(\+90|0)?[1-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

export function validateAmount(amount: number): boolean {
  return amount > 0 && amount <= 10000 && Number.isFinite(amount);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>\"'&]/g, '');
}

// Rate limiting helper (simple in-memory for development)
const rateLimitStore = new Map<string, { count: number, resetTime: number }>();

export function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}