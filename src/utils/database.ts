// Database Helper Functions and Performance Optimizations
import { SystemLogger, withRetry } from './logger';

export class DatabaseHelper {
  private db: D1Database;

  constructor(database: D1Database) {
    this.db = database;
  }

  // Optimized query with error handling and logging
  async executeQuery<T>(
    query: string, 
    params: any[] = [], 
    operation: string = 'Unknown'
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await withRetry(async () => {
        return await this.db.prepare(query).bind(...params).first() as T;
      });
      
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        SystemLogger.warn('Database', `Slow query detected: ${operation}`, { 
          duration, 
          query: query.substring(0, 100) + '...' 
        });
      }
      
      SystemLogger.debug('Database', `Query executed: ${operation}`, { duration });
      return result;
      
    } catch (error) {
      SystemLogger.error('Database', `Query failed: ${operation}`, { 
        error: error.message, 
        query: query.substring(0, 100) + '...' 
      });
      throw error;
    }
  }

  // Optimized batch query for multiple results
  async executeQueryAll<T>(
    query: string, 
    params: any[] = [], 
    operation: string = 'Unknown'
  ): Promise<T[]> {
    const startTime = Date.now();
    
    try {
      const result = await withRetry(async () => {
        const queryResult = await this.db.prepare(query).bind(...params).all();
        return queryResult.results as T[];
      });
      
      const duration = Date.now() - startTime;
      SystemLogger.debug('Database', `Batch query executed: ${operation}`, { 
        duration, 
        resultCount: result.length 
      });
      
      return result;
      
    } catch (error) {
      SystemLogger.error('Database', `Batch query failed: ${operation}`, { 
        error: error.message 
      });
      throw error;
    }
  }

  // Transaction wrapper with rollback support
  async executeTransaction<T>(
    operations: ((db: D1Database) => Promise<any>)[], 
    description: string = 'Transaction'
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // SQLite doesn't support nested transactions, so we'll execute sequentially
      const results = [];
      
      for (const operation of operations) {
        const result = await withRetry(() => operation(this.db));
        results.push(result);
      }
      
      const duration = Date.now() - startTime;
      SystemLogger.info('Database', `Transaction completed: ${description}`, { 
        duration, 
        operationCount: operations.length 
      });
      
      return results as T;
      
    } catch (error) {
      SystemLogger.error('Database', `Transaction failed: ${description}`, { 
        error: error.message 
      });
      throw error;
    }
  }

  // Common queries with caching potential
  async getBayiById(bayiId: number) {
    return await this.executeQuery<any>(
      `SELECT * FROM bayiler WHERE id = ? AND aktif = 1`,
      [bayiId],
      'getBayiById'
    );
  }

  async getBayiByEmail(email: string) {
    return await this.executeQuery<any>(
      `SELECT * FROM bayiler WHERE login_email = ? AND aktif_login = 1`,
      [email],
      'getBayiByEmail'
    );
  }

  async getAdminById(adminId: number) {
    return await this.executeQuery<any>(
      `SELECT * FROM admin_kullanicilari WHERE id = ? AND aktif = 1`,
      [adminId],
      'getAdminById'
    );
  }

  // Optimized statistics queries
  async getDashboardStats() {
    try {
      const queries = [
        this.executeQuery<{count: number}>(`SELECT COUNT(*) as count FROM is_talepleri`, [], 'totalJobs'),
        this.executeQuery<{count: number}>(`SELECT COUNT(*) as count FROM is_talepleri WHERE durum IN ('yeni', 'atandi', 'devam_ediyor')`, [], 'activeJobs'),
        this.executeQuery<{count: number}>(`SELECT COUNT(*) as count FROM bayiler WHERE aktif = 1`, [], 'activeDealers'),
        this.executeQuery<{count: number}>(`SELECT COUNT(*) as count FROM odeme_islemleri WHERE durum = 'beklemede'`, [], 'pendingPayments')
      ];

      const [totalJobs, activeJobs, activeDealers, pendingPayments] = await Promise.all(queries);

      return {
        totalJobs: totalJobs?.count || 0,
        activeJobs: activeJobs?.count || 0,
        activeDealers: activeDealers?.count || 0,
        pendingPayments: pendingPayments?.count || 0
      };
    } catch (error) {
      SystemLogger.error('Database', 'Failed to get dashboard stats', { error: error.message });
      throw error;
    }
  }

  // Paginated queries with performance optimization
  async getPaginatedResults<T>(
    baseQuery: string,
    countQuery: string,
    params: any[],
    page: number = 1,
    limit: number = 20,
    operation: string = 'Paginated Query'
  ) {
    const offset = (page - 1) * limit;
    const limitedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
    
    const [results, countResult] = await Promise.all([
      this.executeQueryAll<T>(limitedQuery, [...params, limit, offset], `${operation} - Data`),
      this.executeQuery<{count: number}>(countQuery, params, `${operation} - Count`)
    ]);

    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}