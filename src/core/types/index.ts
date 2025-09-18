/**
 * TV Servis Yönetim Sistemi - Core Type Definitions
 * Tüm sistem genelinde kullanılan temel tip tanımları
 */

// ============================================================================
// DATABASE BINDINGS
// ============================================================================
export interface CloudflareBindings {
  DB: D1Database;
  KV?: KVNamespace;
  R2?: R2Bucket;
}

// ============================================================================
// USER ROLES & PERMISSIONS
// ============================================================================
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DEALER = 'dealer', 
  CUSTOMER = 'customer'
}

export enum Permission {
  // Job Management
  JOB_CREATE = 'job:create',
  JOB_READ = 'job:read',
  JOB_UPDATE = 'job:update', 
  JOB_DELETE = 'job:delete',
  JOB_PURCHASE = 'job:purchase',
  JOB_ASSIGN = 'job:assign',
  
  // Payment Management
  PAYMENT_APPROVE = 'payment:approve',
  PAYMENT_REJECT = 'payment:reject',
  PAYMENT_VIEW = 'payment:view',
  PAYMENT_CREATE = 'payment:create',
  
  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // System Management
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_BACKUP = 'system:backup'
}

// ============================================================================
// AUTHENTICATION
// ============================================================================
export interface JWTPayload {
  userId: number;
  role: UserRole;
  permissions: Permission[];
  sessionId?: string;
  exp: number;
  iat: number;
}

export interface AuthContext {
  user: JWTPayload;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
}

// ============================================================================
// ADMIN TYPES
// ============================================================================
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCreateRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

// ============================================================================
// DEALER TYPES  
// ============================================================================
export interface Dealer {
  id: number;
  code: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  loginEmail: string;
  address: string;
  cityId: number;
  districtId?: number;
  specialties: string[];
  rating: number;
  totalJobs: number;
  creditBalance: number;
  isActive: boolean;
  loginEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealerCreateRequest {
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  loginEmail: string;
  password: string;
  address: string;
  cityId: number;
  districtId?: number;
  specialties: string[];
}

// ============================================================================
// CUSTOMER TYPES
// ============================================================================
export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  cityId: number;
  districtId?: number;
  customerType: 'individual' | 'corporate';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCreateRequest {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  cityId: number;
  districtId?: number;
  customerType: 'individual' | 'corporate';
}

// ============================================================================
// JOB TYPES
// ============================================================================
export enum JobStatus {
  NEW = 'new',
  ASSIGNED = 'assigned', 
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Job {
  id: number;
  code: string;
  customerId: number;
  serviceTypeId: number;
  status: JobStatus;
  priority: JobPriority;
  description: string;
  deviceBrand?: string;
  deviceModel?: string;
  price: number;
  assignedDealerId?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  completionDate?: string;
  rating?: number;
  customerFeedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobCreateRequest {
  customerId: number;
  serviceTypeId: number;
  priority: JobPriority;
  description: string;
  deviceBrand?: string;
  deviceModel?: string;
  price: number;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================
export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved', 
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_DEDUCTION = 'credit_deduction',
  CASH = 'cash'
}

export interface Payment {
  id: number;
  dealerId?: number;
  jobId?: number;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  reference?: string;
  description?: string;
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================
export enum ErrorCode {
  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation Errors  
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Business Logic Errors
  INSUFFICIENT_CREDIT = 'INSUFFICIENT_CREDIT',
  JOB_ALREADY_ASSIGNED = 'JOB_ALREADY_ASSIGNED',
  DEALER_NOT_IN_CITY = 'DEALER_NOT_IN_CITY',
  
  // System Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================
export interface SystemConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  auth: {
    jwtSecret: string;
    tokenExpiry: number;
    refreshTokenExpiry: number;
  };
  database: {
    maxConnections: number;
    queryTimeout: number;
  };
  payment: {
    paytrConfig: {
      merchantId: string;
      merchantKey: string;
      merchantSalt: string;
    };
  };
  notifications: {
    n8nWebhookUrl?: string;
    emailConfig: {
      provider: string;
      apiKey: string;
    };
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// EXPORTS
// ============================================================================
export * from './hono';

// Re-export commonly used types
export type { Context } from 'hono';
export type { Env } from 'hono';