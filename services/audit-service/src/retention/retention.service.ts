import { Injectable, Logger } from '@nestjs/common';
import { ClickHouseService } from '../shared/clickhouse/clickhouse.service';

export interface RetentionPolicy {
  id: string;
  databaseName: string;
  tableName: string;
  retentionDays: number;
  partitionUnit: 'month' | 'day';
  isActive: boolean;
  updatedAt: string;
}

// Default policies (in production, store in PostgreSQL)
const defaultPolicies: RetentionPolicy[] = [
  {
    id: '1',
    databaseName: 'audit_db',
    tableName: 'access_logs',
    retentionDays: 1825, // 5 years
    partitionUnit: 'month',
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    databaseName: 'audit_db',
    tableName: 'consent_history',
    retentionDays: 1825,
    partitionUnit: 'month',
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    databaseName: 'audit_db',
    tableName: 'admin_actions',
    retentionDays: 1825,
    partitionUnit: 'month',
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    databaseName: 'audit_db',
    tableName: 'data_exports',
    retentionDays: 1825,
    partitionUnit: 'month',
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Whitelist of allowed tables for retention operations
 * This prevents SQL injection by only allowing known table names
 */
const ALLOWED_TABLES = new Set([
  'audit_db.access_logs_local',
  'audit_db.consent_history_local',
  'audit_db.admin_actions_local',
  'audit_db.data_exports_local',
]);

/**
 * Whitelist of allowed database names
 */
const ALLOWED_DATABASES = new Set(['audit_db']);

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);
  private policies: RetentionPolicy[] = [...defaultPolicies];

  constructor(private readonly clickhouse: ClickHouseService) {}

  /**
   * Validate table name against whitelist to prevent SQL injection
   * @throws Error if table name is not in whitelist
   */
  private validateTableName(database: string, table: string): void {
    if (!ALLOWED_DATABASES.has(database)) {
      throw new Error(`Invalid database name: ${database}`);
    }

    const fullTableName = `${database}.${table}_local`;
    if (!ALLOWED_TABLES.has(fullTableName)) {
      throw new Error(`Invalid table name: ${fullTableName}`);
    }
  }

  /**
   * Validate cluster name to prevent SQL injection
   * Only alphanumeric and underscore allowed
   */
  private validateClusterName(cluster: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(cluster)) {
      throw new Error(`Invalid cluster name: ${cluster}`);
    }
    return cluster;
  }

  async getPolicies(): Promise<RetentionPolicy[]> {
    return this.policies;
  }

  async getPolicy(id: string): Promise<RetentionPolicy | undefined> {
    return this.policies.find((p) => p.id === id);
  }

  async updatePolicy(
    id: string,
    updates: Partial<Pick<RetentionPolicy, 'retentionDays' | 'isActive'>>,
  ): Promise<RetentionPolicy | null> {
    const index = this.policies.findIndex((p) => p.id === id);
    if (index === -1) return null;

    this.policies[index] = {
      ...this.policies[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return this.policies[index];
  }

  async cleanupExpiredPartitions(): Promise<{
    tablesProcessed: number;
    partitionsDropped: number;
  }> {
    let tablesProcessed = 0;
    let partitionsDropped = 0;

    const activePolicies = this.policies.filter((p) => p.isActive);
    const clusterName = this.validateClusterName('my_cluster');

    for (const policy of activePolicies) {
      // Validate table name against whitelist before any operations
      try {
        this.validateTableName(policy.databaseName, policy.tableName);
      } catch (error) {
        this.logger.error(`Skipping invalid table: ${policy.databaseName}.${policy.tableName}`);
        continue;
      }

      tablesProcessed++;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
      const cutoffPartition = this.formatPartition(cutoffDate, policy.partitionUnit);

      try {
        // Find expired partitions using parameterized query
        const partitionsSql = `
          SELECT DISTINCT partition
          FROM system.parts
          WHERE database = {database:String}
            AND table = {table:String}
            AND partition < {cutoff:String}
            AND active = 1
        `;

        const result = await this.clickhouse.query<{ partition: string }>(partitionsSql, {
          database: policy.databaseName,
          table: `${policy.tableName}_local`,
          cutoff: cutoffPartition,
        });

        for (const { partition } of result.data) {
          // Validate partition format (YYYYMM or YYYYMMDD) - only digits allowed
          if (!/^\d{6,8}$/.test(partition)) {
            this.logger.warn(`Invalid partition format: ${partition}, skipping`);
            continue;
          }

          try {
            // All values are now validated:
            // - database/table: whitelist validated
            // - cluster: alphanumeric validated
            // - partition: digits-only validated
            await this.clickhouse.command(
              `ALTER TABLE ${policy.databaseName}.${policy.tableName}_local ` +
                `ON CLUSTER '${clusterName}' DROP PARTITION '${partition}'`,
            );
            partitionsDropped++;
            this.logger.log(
              `Dropped partition ${partition} from ${policy.databaseName}.${policy.tableName}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to drop partition ${partition} from ${policy.tableName}`,
              error,
            );
          }
        }
      } catch (error) {
        this.logger.error(`Failed to process retention for ${policy.tableName}`, error);
      }
    }

    return { tablesProcessed, partitionsDropped };
  }

  private formatPartition(date: Date, unit: 'month' | 'day'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (unit === 'month') {
      return `${year}${month}`;
    }
    return `${year}${month}${day}`;
  }
}
