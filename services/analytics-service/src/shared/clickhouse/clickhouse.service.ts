import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

export interface QueryResult<T> {
  data: T[];
  rows: number;
}

@Injectable()
export class ClickHouseService implements OnModuleInit, OnModuleDestroy {
  private client!: ClickHouseClient;
  private readonly logger = new Logger(ClickHouseService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('clickhouse.host');
    const port = this.configService.get<number>('clickhouse.port');
    const database = this.configService.get<string>('clickhouse.database');
    const username = this.configService.get<string>('clickhouse.username');
    const password = this.configService.get<string>('clickhouse.password');

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

  async insert<T extends Record<string, unknown>>(table: string, values: T[]): Promise<void> {
    await this.client.insert({
      table,
      values,
      format: 'JSONEachRow',
    });
  }

  async command(sql: string): Promise<void> {
    await this.client.command({ query: sql });
  }

  getClient(): ClickHouseClient {
    return this.client;
  }
}
