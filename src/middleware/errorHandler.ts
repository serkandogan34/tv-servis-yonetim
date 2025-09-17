// Global Error Handler Middleware
import { Context, Next } from 'hono';
import { SystemLogger, createErrorResponse } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class BusinessError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean = true;
  code: string;

  constructor(message: string, statusCode: number = 400, code: string = 'BUSINESS_ERROR') {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class DatabaseError extends Error implements AppError {
  statusCode: number = 500;
  isOperational: boolean = true;
  code: string = 'DATABASE_ERROR';

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.stack = originalError?.stack || this.stack;
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode: number = 401;
  isOperational: boolean = true;
  code: string = 'AUTH_ERROR';

  constructor(message: string = 'Yetkilendirme başarısız') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  statusCode: number = 403;
  isOperational: boolean = true;
  code: string = 'AUTHORIZATION_ERROR';

  constructor(message: string = 'Bu işlem için yeterli yetkiniz yok') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error implements AppError {
  statusCode: number = 400;
  isOperational: boolean = true;
  code: string = 'VALIDATION_ERROR';
  details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode: number = 429;
  isOperational: boolean = true;
  code: string = 'RATE_LIMIT_ERROR';

  constructor(message: string = 'Çok fazla istek gönderildi') {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Global error handler middleware
export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      const appError = error as AppError;
      const requestId = c.req.header('X-Request-ID') || Math.random().toString(36);
      
      // Log the error
      const logContext = {
        requestId,
        method: c.req.method,
        url: c.req.url,
        userAgent: c.req.header('User-Agent'),
        ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
      };

      if (appError.isOperational) {
        SystemLogger.warn('Error', `Operational error: ${appError.message}`, {
          ...logContext,
          errorCode: appError.code,
          stack: appError.stack
        });
      } else {
        SystemLogger.error('Error', `System error: ${appError.message}`, {
          ...logContext,
          errorCode: appError.code,
          stack: appError.stack
        });
      }

      // Determine response based on error type
      let statusCode = appError.statusCode || 500;
      let message = appError.message;
      let details = null;

      // Handle specific error types
      if (appError instanceof ValidationError) {
        details = appError.details;
      } else if (appError instanceof DatabaseError) {
        message = 'Veritabanı hatası oluştu';
        statusCode = 500;
      } else if (!appError.isOperational) {
        // Don't leak internal error details
        message = 'Sistem hatası oluştu';
        statusCode = 500;
      }

      // Create error response
      const errorResponse = createErrorResponse(message, statusCode, details);
      errorResponse.requestId = requestId;

      return c.json(errorResponse, statusCode);
    }
  };
}

// Async wrapper to catch promise rejections
export function asyncHandler(fn: Function) {
  return (c: Context, next: Next) => {
    return Promise.resolve(fn(c, next)).catch(next);
  };
}

// Database operation wrapper
export async function dbOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Veritabanı işlemi başarısız'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new DatabaseError(errorMessage, error as Error);
  }
}

// Authentication wrapper
export function requireAuth(userType: 'bayi' | 'admin' = 'bayi') {
  return async (c: Context, next: Next) => {
    try {
      const authHeader = c.req.header('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Yetkilendirme başlığı eksik veya hatalı');
      }

      const token = authHeader.substring(7);
      
      if (!token) {
        throw new AuthenticationError('Token eksik');
      }

      // Token validation would happen here
      // For now, we'll use the existing auth logic
      
      await next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Token doğrulama başarısız');
    }
  };
}

// Business logic wrapper with automatic error conversion
export function businessLogic<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'İş mantığı hatası'
) {
  return async (): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new BusinessError(errorMessage, 400, 'BUSINESS_LOGIC_ERROR');
    }
  };
}