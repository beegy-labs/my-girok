import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '@my-girok/nest-common/clickhouse';
import { ConfigService } from '@nestjs/config';
import type { AdminReactivatedEvent } from '@my-girok/types';
import { AdminEventMapper } from '../mappers/admin-event.mapper';

@Injectable()
export class AdminReactivatedHandler {
  private readonly logger = new Logger(AdminReactivatedHandler.name);
  private readonly database: string;

  constructor(
    private readonly clickhouse: ClickHouseService,
    private readonly configService: ConfigService,
    private readonly mapper: AdminEventMapper,
  ) {
    this.database = this.configService.get<string>('clickhouse.database') || 'audit_db';
  }

  async handle(event: AdminReactivatedEvent): Promise<void> {
    try {
      const auditLog = this.mapper.mapAdminReactivatedToAuditLog(event);

      await this.clickhouse.insert(`${this.database}.admin_audit_logs`, [auditLog]);

      this.logger.debug(`Admin reactivated event logged: ${event.eventId}`);
    } catch (error) {
      this.logger.error(`Failed to log admin reactivated event: ${event.eventId}`, error);
      throw error;
    }
  }
}
