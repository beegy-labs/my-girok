import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '@my-girok/nest-common/clickhouse';
import { ConfigService } from '@nestjs/config';
import type { AdminDeactivatedEvent } from '@my-girok/types';
import { AdminEventMapper } from '../mappers/admin-event.mapper';

@Injectable()
export class AdminDeactivatedHandler {
  private readonly logger = new Logger(AdminDeactivatedHandler.name);
  private readonly database: string;

  constructor(
    private readonly clickhouse: ClickHouseService,
    private readonly configService: ConfigService,
    private readonly mapper: AdminEventMapper,
  ) {
    this.database = this.configService.get<string>('clickhouse.database') || 'audit_db';
  }

  async handle(event: AdminDeactivatedEvent): Promise<void> {
    try {
      const auditLog = this.mapper.mapAdminDeactivatedToAuditLog(event);

      await this.clickhouse.insert(`${this.database}.admin_audit_logs`, [auditLog]);

      this.logger.debug(`Admin deactivated event logged: ${event.eventId}`);
    } catch (error) {
      this.logger.error(`Failed to log admin deactivated event: ${event.eventId}`, error);
      throw error;
    }
  }
}
