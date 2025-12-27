import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClickHouseService } from './clickhouse.service';

/**
 * ClickHouse module for NestJS
 * Global module that provides ClickHouseService to all modules
 *
 * @example
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot(),
 *     ClickHouseModule,
 *   ],
 * })
 * export class AppModule {}
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [ClickHouseService],
  exports: [ClickHouseService],
})
export class ClickHouseModule {}
