/**
 * Database Connection & Query Helpers
 * Cloudflare D1 için gelişmiş database yönetimi
 */

import type { 
  CloudflareBindings,
  AppError,
  ErrorCode,
  QueryBuilder as IQueryBuilder,
  DatabaseStatement,
  DatabaseTransaction
} from '../types';

// ============================================================================
// QUERY BUILDER
// ============================================================================
export class QueryBuilder implements IQueryBuilder {
  private selectFields: string[] = ['*'];
  private fromTable: string = '';
  private joins: string[] = [];
  private whereConditions: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private offsetClause: string = '';
  private params: any[] = [];

  select(fields: string[] = ['*']): QueryBuilder {
    this.selectFields = fields;
    return this;
  }

  from(table: string): QueryBuilder {
    this.fromTable = table;
    return this;
  }

  join(table: string, condition: string): QueryBuilder {
    this.joins.push(`JOIN ${table} ON ${condition}`);
    return this;
  }

  leftJoin(table: string, condition: string): QueryBuilder {
    this.joins.push(`LEFT JOIN ${table} ON ${condition}`);
    return this;
  }

  where(condition: string, ...params: any[]): QueryBuilder {
    this.whereConditions.push(condition);
    this.params.push(...params);
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause = `ORDER BY ${field} ${direction}`;
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  build(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.fromTable}`;
    
    if (this.joins.length > 0) {
      sql += ` ${this.joins.join(' ')}`;
    }
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.orderByClause) {
      sql += ` ${this.orderByClause}`;
    }
    
    if (this.limitClause) {
      sql += ` ${this.limitClause}`;
    }
    
    if (this.offsetClause) {
      sql += ` ${this.offsetClause}`;
    }

    return { sql, params: this.params };
  }
}

// ============================================================================
// DATABASE HELPER CLASS
// ============================================================================
export class DatabaseHelper {
  constructor(private db: D1Database) {}

  // Query Builder factory
  query(): QueryBuilder {
    return new QueryBuilder();
  }

  // Prepared statement helper
  prepare(sql: string): DatabaseStatement {
    return this.db.prepare(sql) as DatabaseStatement;
  }

  // Transaction helper (D1 doesn't support transactions, simulate with batch)
  async transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    // D1'de gerçek transaction yoktu, batch kullanacağız
    const statements: Array<{ sql: string; params: any[] }> = [];
    
    const mockTransaction: DatabaseTransaction = {
      execute: async <T>(sql: string, params: any[] = []) => {
        statements.push({ sql, params });
        return null as T; // Mock return
      },
      prepare: (sql: string) => ({
        bind: (...params: any[]) => ({ sql, params })
      }) as any,
      commit: async () => {
        // Execute all statements in batch
        if (statements.length > 0) {
          await this.db.batch(statements.map(stmt => 
            this.db.prepare(stmt.sql).bind(...stmt.params)
          ));
        }
      },
      rollback: async () => {
        // D1'de rollback yoktu, loglama yapabiliriz
        console.warn('Transaction rollback called - D1 does not support rollback');
      }
    };

    try {
      const result = await callback(mockTransaction);
      await mockTransaction.commit();
      return result;
    } catch (error) {
      await mockTransaction.rollback();
      throw error;
    }
  }

  // CRUD Operations
  async findById<T>(table: string, id: number): Promise<T | null> {
    const result = await this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`)
      .bind(id)
      .first<T>();
    return result || null;
  }

  async findOne<T>(table: string, conditions: Record<string, any>): Promise<T | null> {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(conditions);
    
    const result = await this.db.prepare(`SELECT * FROM ${table} WHERE ${whereClause}`)
      .bind(...values)
      .first<T>();
    return result || null;
  }

  async findMany<T>(
    table: string, 
    conditions: Record<string, any> = {},
    options: {
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    const result = await this.db.prepare(sql).bind(...params).all<T>();
    return result.results || [];
  }

  async create<T>(table: string, data: Record<string, any>): Promise<T> {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await this.db.prepare(sql).bind(...values).run();

    if (!result.success) {
      throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to create record');
    }

    // Return created record
    return this.findById<T>(table, result.meta.last_row_id);
  }

  async update<T>(table: string, id: number, data: Record<string, any>): Promise<T | null> {
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(data), id];

    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const result = await this.db.prepare(sql).bind(...values).run();

    if (!result.success) {
      throw new AppError(ErrorCode.DATABASE_ERROR, 'Failed to update record');
    }

    return this.findById<T>(table, id);
  }

  async delete(table: string, id: number): Promise<boolean> {
    const result = await this.db.prepare(`DELETE FROM ${table} WHERE id = ?`)
      .bind(id)
      .run();
    
    return result.success && result.meta.changes > 0;
  }

  async count(table: string, conditions: Record<string, any> = {}): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    const result = await this.db.prepare(sql).bind(...params).first<{ count: number }>();
    return result?.count || 0;
  }

  async exists(table: string, conditions: Record<string, any>): Promise<boolean> {
    const count = await this.count(table, conditions);
    return count > 0;
  }

  // Pagination helper
  async paginate<T>(
    table: string,
    page: number = 1,
    limit: number = 10,
    conditions: Record<string, any> = {},
    orderBy: string = 'id',
    orderDirection: 'ASC' | 'DESC' = 'ASC'
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const offset = (page - 1) * limit;
    const total = await this.count(table, conditions);
    const totalPages = Math.ceil(total / limit);

    const data = await this.findMany<T>(table, conditions, {
      orderBy,
      orderDirection,
      limit,
      offset
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // Raw query execution
  async execute<T>(sql: string, params: any[] = []): Promise<T> {
    const result = await this.db.prepare(sql).bind(...params).all<T>();
    return result as T;
  }

  // Batch operations
  async batch(operations: Array<{ sql: string; params: any[] }>): Promise<void> {
    const statements = operations.map(op => this.db.prepare(op.sql).bind(...op.params));
    await this.db.batch(statements);
  }
}

// ============================================================================
// DATABASE CONNECTION FACTORY
// ============================================================================
export class DatabaseManager {
  private static instances = new Map<string, DatabaseHelper>();

  static getInstance(db: D1Database, instanceName: string = 'default'): DatabaseHelper {
    if (!this.instances.has(instanceName)) {
      this.instances.set(instanceName, new DatabaseHelper(db));
    }
    return this.instances.get(instanceName)!;
  }

  static createHelper(bindings: CloudflareBindings): DatabaseHelper {
    return new DatabaseHelper(bindings.DB);
  }
}

// ============================================================================
// MIGRATION HELPER
// ============================================================================
export class MigrationRunner {
  constructor(private db: DatabaseHelper) {}

  async runMigration(migrationSql: string, version: string): Promise<void> {
    try {
      // Check if migration already applied
      const applied = await this.isMigrationApplied(version);
      if (applied) {
        console.log(`Migration ${version} already applied, skipping...`);
        return;
      }

      // Execute migration
      await this.db.execute(migrationSql);
      
      // Record migration
      await this.recordMigration(version);
      
      console.log(`Migration ${version} applied successfully`);
    } catch (error) {
      console.error(`Migration ${version} failed:`, error);
      throw error;
    }
  }

  private async isMigrationApplied(version: string): Promise<boolean> {
    try {
      const result = await this.db.execute<any>(
        'SELECT COUNT(*) as count FROM migrations WHERE version = ?',
        [version]
      );
      return result.results?.[0]?.count > 0;
    } catch {
      // Migration table doesn't exist, create it
      await this.createMigrationTable();
      return false;
    }
  }

  private async createMigrationTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async recordMigration(version: string): Promise<void> {
    await this.db.execute(
      'INSERT INTO migrations (version) VALUES (?)',
      [version]
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
export { QueryBuilder, DatabaseHelper, DatabaseManager, MigrationRunner };
export type { DatabaseStatement, DatabaseTransaction };