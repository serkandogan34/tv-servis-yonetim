/**
 * Hono Framework Type Extensions
 * Custom Hono context and environment types
 */

import type { Context, Env } from 'hono';
import type { 
  CloudflareBindings, 
  AuthContext, 
  UserRole, 
  Permission 
} from './index';

// ============================================================================
// HONO ENVIRONMENT
// ============================================================================
export interface AppEnv extends Env {
  Bindings: CloudflareBindings;
  Variables: {
    auth?: AuthContext;
    user?: {
      id: number;
      role: UserRole;
      permissions: Permission[];
    };
    requestId?: string;
    startTime?: number;
  };
}

// ============================================================================
// EXTENDED CONTEXT
// ============================================================================
export interface AppContext extends Context<AppEnv> {
  // Helper methods for authentication
  getAuth(): AuthContext | null;
  getUserId(): number | null;
  getUserRole(): UserRole | null;
  hasPermission(permission: Permission): boolean;
  requireAuth(): AuthContext;
  requirePermission(permission: Permission): void;
  requireRole(role: UserRole): void;
  
  // Helper methods for responses
  success<T>(data: T, message?: string): Response;
  error(message: string, statusCode?: number): Response;
  validation(errors: Record<string, string>): Response;
  pagination<T>(data: T[], total: number, page: number, limit: number): Response;
}

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================
export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: UserRole[];
  permissions?: Permission[];
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

export interface ValidationSchema {
  body?: Record<string, any>;
  params?: Record<string, any>;
  query?: Record<string, any>;
  headers?: Record<string, any>;
}

// ============================================================================
// ROUTE HANDLER TYPES
// ============================================================================
export type RouteHandler<T = any> = (c: AppContext) => Promise<Response> | Response;

export interface RouteConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: RouteHandler;
  middleware?: any[];
  auth?: AuthMiddlewareOptions;
  validation?: ValidationSchema;
  rateLimit?: RateLimitOptions;
  description?: string;
  tags?: string[];
}

// ============================================================================
// MODULE TYPES
// ============================================================================
export interface ModuleConfig {
  name: string;
  version: string;
  routes: RouteConfig[];
  dependencies?: string[];
  middleware?: any[];
}

export interface ModuleContext {
  db: D1Database;
  kv?: KVNamespace;
  r2?: R2Bucket;
  config: any;
  logger: any;
}

// ============================================================================
// DATABASE HELPER TYPES
// ============================================================================
export interface QueryBuilder {
  select(fields?: string[]): QueryBuilder;
  from(table: string): QueryBuilder;
  join(table: string, condition: string): QueryBuilder;
  leftJoin(table: string, condition: string): QueryBuilder;
  where(condition: string, ...params: any[]): QueryBuilder;
  orderBy(field: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;
  build(): { sql: string; params: any[] };
}

export interface DatabaseTransaction {
  execute<T = any>(sql: string, params?: any[]): Promise<T>;
  prepare(sql: string): DatabaseStatement;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DatabaseStatement {
  bind(...params: any[]): DatabaseStatement;
  first<T = any>(): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[]; success: boolean; meta: any }>;
  run(): Promise<{ success: boolean; meta: any }>;
}

// ============================================================================
// SERVICE TYPES
// ============================================================================
export interface BaseService {
  readonly name: string;
  readonly version: string;
  initialize(context: ModuleContext): Promise<void>;
  destroy(): Promise<void>;
}

export interface CrudService<T, CreateT = Partial<T>, UpdateT = Partial<T>> extends BaseService {
  create(data: CreateT): Promise<T>;
  findById(id: number): Promise<T | null>;
  findAll(filters?: any): Promise<T[]>;
  update(id: number, data: UpdateT): Promise<T>;
  delete(id: number): Promise<boolean>;
  count(filters?: any): Promise<number>;
}

// ============================================================================
// EVENT TYPES
// ============================================================================
export interface SystemEvent {
  type: string;
  payload: any;
  timestamp: string;
  source: string;
  userId?: number;
}

export interface EventHandler<T = any> {
  handle(event: SystemEvent): Promise<void>;
}

export interface EventBus {
  emit(type: string, payload: any, source?: string): Promise<void>;
  on(type: string, handler: EventHandler): void;
  off(type: string, handler: EventHandler): void;
}

// ============================================================================
// CACHE TYPES
// ============================================================================
export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  serializer?: {
    serialize(data: any): string;
    deserialize(data: string): any;
  };
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(prefix?: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// ============================================================================
// LOGGING TYPES
// ============================================================================
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: number;
  requestId?: string;
  source?: string;
}

export interface Logger {
  error(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
}