import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

@Injectable()
export class ClickHouseService implements OnModuleInit {
  private readonly logger = new Logger(ClickHouseService.name);
  private client!: ClickHouseClient;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('clickhouse.host', 'localhost');
    const port = this.configService.get<number>('clickhouse.port', 8123);
    const database = this.configService.get<string>('clickhouse.database', 'analytics_db');
    const username = this.configService.get<string>('clickhouse.username', 'default');
    const password = this.configService.get<string>('clickhouse.password', '');

    try {
      this.client = createClient({
        host: `http://${host}:${port}`,
        database,
        username,
        password,
      });

      this.isConnected = true;
      this.logger.log(`ClickHouse client initialized: ${host}:${port} (database: ${database})`);
    } catch (error) {
      this.logger.warn(`Failed to initialize ClickHouse client: ${error}`);
      this.isConnected = false;
    }
  }

  /**
   * Execute a query and return rows as objects
   */
  async query<T = unknown>(query: string, params?: Record<string, unknown>): Promise<T[]> {
    if (!this.isConnected || !this.client) {
      this.logger.warn('ClickHouse client not connected');
      return [];
    }

    try {
      const resultSet = await this.client.query({
        query,
        query_params: params,
        format: 'JSONEachRow',
      });

      const rows = await resultSet.json<T>();
      return rows;
    } catch (error) {
      this.logger.error(`ClickHouse query failed: ${error}`);
      throw error;
    }
  }

  /**
   * Execute a query and return a single row
   */
  async queryOne<T = unknown>(query: string, params?: Record<string, unknown>): Promise<T | null> {
    const rows = await this.query<T>(query, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Ping ClickHouse server
   */
  async ping(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.warn(`ClickHouse ping failed: ${error}`);
      return false;
    }
  }
}
