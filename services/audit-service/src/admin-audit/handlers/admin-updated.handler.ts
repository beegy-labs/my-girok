import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '@my-girok/nest-common/clickhouse';
import { ConfigService } from '@nestjs/config';
import type { AdminUpdatedEvent } from '@my-girok/types';
import { AdminEventMapper } from '../mappers/admin-event.mapper';

@Injectable()
export class AdminUpdatedHandler {
  private readonly logger = new Logger(AdminUpdatedHandler.name);
  private readonly database: string;

  constructor(
    private readonly clickhouse: ClickHouseService,
    private readonly configService: ConfigService,
    private readonly mapper: AdminEventMapper,
  ) {
    this.database = this.configService.get<string>('clickhouse.database') || 'audit_db';
  }

  async handle(event: AdminUpdatedEvent): Promise<void> {
    try {
      const auditLog = this.mapper.mapAdminUpdatedToAuditLog(event);

      await this.clickhouse.insert(`${this.database}.admin_audit_logs`, [auditLog]);

      this.logger.debug(`Admin updated event logged: ${event.eventId}`);
    } catch (error) {
      this.logger.error(`Failed to log admin updated event: ${event.eventId}`, error);
      throw error;
    }
  }
}
