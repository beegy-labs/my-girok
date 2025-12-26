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
}

/**
 * ClickHouse service for analytics and audit data
 * Shared across audit-service and analytics-service
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

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host =
      this.configService.get<string>('clickhouse.host') ||
      this.configService.get<string>('CLICKHOUSE_HOST');
    const port =
      this.configService.get<number>('clickhouse.port') ||
      this.configService.get<number>('CLICKHOUSE_PORT') ||
      8123;
    const database =
      this.configService.get<string>('clickhouse.database') ||
      this.configService.get<string>('CLICKHOUSE_DATABASE');
    const username =
      this.configService.get<string>('clickhouse.username') ||
      this.configService.get<string>('CLICKHOUSE_USERNAME');
    const password =
      this.configService.get<string>('clickhouse.password') ||
      this.configService.get<string>('CLICKHOUSE_PASSWORD');

    this.client = createClient({
      url: `http://${host}:${port}`,
      database,
      username,
      password,
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1,
      },
    });

    try {
      await this.client.ping();
      this.logger.log(`Connected to ClickHouse at ${host}:${port}/${database}`);
    } catch (error) {
      this.logger.error('Failed to connect to ClickHouse', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.client.close();
    this.logger.log('ClickHouse connection closed');
  }

  /**
   * Execute a query with optional parameters
   * @param sql - SQL query with parameter placeholders like {param:Type}
   * @param params - Parameter values
   * @returns Query result with data array and row count
   */
  async query<T>(sql: string, params?: Record<string, unknown>): Promise<QueryResult<T>> {
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
  }

  /**
   * Insert records into a table
   * @param table - Table name (e.g., 'audit_db.access_logs')
   * @param values - Array of records to insert
   */
  async insert<T extends Record<string, unknown>>(table: string, values: T[]): Promise<void> {
    await this.client.insert({
      table,
      values,
      format: 'JSONEachRow',
    });
  }

  /**
   * Execute a command (DDL, etc.)
   * @param sql - SQL command
   */
  async command(sql: string): Promise<void> {
    await this.client.command({ query: sql });
  }

  /**
   * Get the underlying ClickHouse client for advanced operations
   */
  getClient(): ClickHouseClient {
    return this.client;
  }
}
