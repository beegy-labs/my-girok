import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

export interface QueryResult<T> {
  data: T[];
  rows: number;
}

export interface ClickHouseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  asyncInsert?: boolean;
  waitForAsyncInsert?: boolean;
  maxRetries?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * ClickHouse service for analytics and audit data
 * Shared across audit-service and analytics-service
 *
 * Environment variables:
 * - CLICKHOUSE_HOST: ClickHouse host
 * - CLICKHOUSE_PORT: ClickHouse port (default: 8123)
 * - CLICKHOUSE_DATABASE: Database name
 * - CLICKHOUSE_USERNAME: Username
 * - CLICKHOUSE_PASSWORD: Password
 * - CLICKHOUSE_ASYNC_INSERT: Enable async insert (default: true)
 * - CLICKHOUSE_WAIT_FOR_ASYNC_INSERT: Wait for async insert (default: true for audit, false for analytics)
 *
 * @example
 * const result = await this.clickhouse.query<MyType>(
 *   'SELECT * FROM table WHERE id = {id:UUID}',
 *   { id: someUuid }
 * );
 */
@Injectable()
export class ClickHouseService implements OnModuleInit, OnModuleDestroy {
  private client!: ClickHouseClient;
  private readonly logger = new Logger(ClickHouseService.name);
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.getConfig('clickhouse.host', 'CLICKHOUSE_HOST');
    const port = this.getConfigNumber('clickhouse.port', 'CLICKHOUSE_PORT', 8123);
    const database = this.getConfig('clickhouse.database', 'CLICKHOUSE_DATABASE');
    const username = this.getConfig('clickhouse.username', 'CLICKHOUSE_USERNAME');
    const password = this.getConfig('clickhouse.password', 'CLICKHOUSE_PASSWORD');

    // Async insert configuration - configurable per service
    const asyncInsert = this.getConfigBoolean(
      'clickhouse.asyncInsert',
      'CLICKHOUSE_ASYNC_INSERT',
      true,
    );
    const waitForAsyncInsert = this.getConfigBoolean(
      'clickhouse.waitForAsyncInsert',
      'CLICKHOUSE_WAIT_FOR_ASYNC_INSERT',
      true, // Default true for data integrity (audit use case)
    );

    const maxRetries = this.getConfigNumber(
      'clickhouse.maxRetries',
      'CLICKHOUSE_MAX_RETRIES',
      DEFAULT_MAX_RETRIES,
    );

    this.client = createClient({
      url: `http://${host}:${port}`,
      database,
      username,
      password,
      clickhouse_settings: {
        async_insert: asyncInsert ? 1 : 0,
        wait_for_async_insert: waitForAsyncInsert ? 1 : 0,
      },
      max_open_connections: 10,
      request_timeout: 30000,
    });

    await this.connectWithRetry(host, port, database, maxRetries);
  }

  private async connectWithRetry(
    host: string,
    port: number,
    database: string,
    maxRetries: number,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.client.ping();
        this.isConnected = true;
        this.logger.log(`Connected to ClickHouse at ${host}:${port}/${database}`);
        return;
      } catch (error) {
        this.logger.warn(`ClickHouse connection attempt ${attempt}/${maxRetries} failed`);
        if (attempt === maxRetries) {
          this.logger.error('Failed to connect to ClickHouse after all retries', error);
          throw error;
        }
        await this.sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  private getConfig(nestedKey: string, envKey: string, defaultValue?: string): string {
    return (
      this.configService.get<string>(nestedKey) ||
      this.configService.get<string>(envKey) ||
      defaultValue ||
      ''
    );
  }

  private getConfigNumber(nestedKey: string, envKey: string, defaultValue: number): number {
    return (
      this.configService.get<number>(nestedKey) ||
      this.configService.get<number>(envKey) ||
      defaultValue
    );
  }

  private getConfigBoolean(nestedKey: string, envKey: string, defaultValue: boolean): boolean {
    const nested = this.configService.get<boolean>(nestedKey);
    if (nested !== undefined) return nested;
    const env = this.configService.get<string>(envKey);
    if (env !== undefined) return env === 'true' || env === '1';
    return defaultValue;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.logger.log('ClickHouse connection closed');
    }
  }

  /**
   * Check if ClickHouse is connected
   * @returns boolean indicating connection status
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Execute a query with optional parameters
   * @param sql - SQL query with parameter placeholders like {param:Type}
   * @param params - Parameter values
   * @returns Query result with data array and row count
   * @throws Error if query fails
   */
  async query<T>(sql: string, params?: Record<string, unknown>): Promise<QueryResult<T>> {
    if (!this.isConnected) {
      throw new Error('ClickHouse is not connected');
    }

    try {
      const result = await this.client.query({
        query: sql,
        query_params: params,
        format: 'JSONEachRow',
      });

      const data = (await result.json()) as T[];
      return {
        data,
        rows: data.length,
      };
    } catch (error) {
      this.logger.error(`Query failed: ${sql.slice(0, 100)}...`, error);
      throw error;
    }
  }

  /**
   * Insert records into a table
   * @param table - Table name (e.g., 'audit_db.access_logs')
   * @param values - Array of records to insert
   * @throws Error if insert fails
   */
  async insert<T extends Record<string, unknown>>(table: string, values: T[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('ClickHouse is not connected');
    }

    if (values.length === 0) {
      return; // No-op for empty inserts
    }

    try {
      await this.client.insert({
        table,
        values,
        format: 'JSONEachRow',
      });
    } catch (error) {
      this.logger.error(`Insert failed for table ${table}`, error);
      throw error;
    }
  }

  /**
   * Batch insert with chunking for large datasets
   * @param table - Table name
   * @param values - Array of records to insert
   * @param chunkSize - Maximum records per batch (default: 10000)
   */
  async batchInsert<T extends Record<string, unknown>>(
    table: string,
    values: T[],
    chunkSize = 10000,
  ): Promise<void> {
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      await this.insert(table, chunk);
    }
  }

  /**
   * Execute a command (DDL, etc.)
   * @param sql - SQL command
   * @throws Error if command fails
   */
  async command(sql: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('ClickHouse is not connected');
    }

    try {
      await this.client.command({ query: sql });
    } catch (error) {
      this.logger.error(`Command failed: ${sql.slice(0, 100)}...`, error);
      throw error;
    }
  }

  /**
   * Get the underlying ClickHouse client for advanced operations
   */
  getClient(): ClickHouseClient {
    return this.client;
  }
}
