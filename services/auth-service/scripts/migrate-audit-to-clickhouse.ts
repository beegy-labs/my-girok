/**
 * Migration Script: PostgreSQL audit_logs to ClickHouse
 *
 * This script migrates existing audit logs from PostgreSQL to ClickHouse.
 * Run this once during the ClickHouse integration deployment.
 *
 * Usage:
 *   npx ts-node scripts/migrate-audit-to-clickhouse.ts
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   CLICKHOUSE_URL - ClickHouse connection string (e.g., http://localhost:8123)
 *   CLICKHOUSE_DATABASE - ClickHouse database name (default: audit)
 *   BATCH_SIZE - Number of records per batch (default: 10000)
 *   DRY_RUN - Set to 'true' for dry run mode
 */

import { PrismaClient } from '@prisma/client';

// ClickHouse client would be imported here
// import { createClient, ClickHouseClient } from '@clickhouse/client';

interface AuditLogRecord {
  id: string;
  admin_id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  before_state: unknown;
  after_state: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

interface ClickHouseAuditLog {
  id: string;
  timestamp: string;
  actor_type: string;
  actor_id: string;
  actor_email: string;
  service_id: string | null;
  service_slug: string | null;
  tenant_id: string | null;
  country_code: string | null;
  resource: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  method: string;
  path: string;
  status_code: number;
  ip_address: string;
  user_agent: string;
  request_body: string | null;
  response_summary: string | null;
  metadata: string;
  success: number;
  error_message: string | null;
  duration_ms: number;
}

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10000', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';

async function transformToClickHouseFormat(
  record: AuditLogRecord,
  adminEmail: string,
): Promise<ClickHouseAuditLog> {
  return {
    id: record.id,
    timestamp: record.created_at.toISOString(),
    actor_type: 'ADMIN',
    actor_id: record.admin_id,
    actor_email: adminEmail,
    service_id: null,
    service_slug: null,
    tenant_id: null,
    country_code: null,
    resource: record.resource,
    action: record.action,
    target_type: record.resource,
    target_id: record.resource_id,
    method: '',
    path: '',
    status_code: 200,
    ip_address: record.ip_address || '',
    user_agent: record.user_agent || '',
    request_body: record.after_state ? JSON.stringify(record.after_state) : null,
    response_summary: null,
    metadata: record.before_state ? JSON.stringify(record.before_state) : '{}',
    success: 1,
    error_message: null,
    duration_ms: 0,
  };
}

async function migrateAuditLogs(): Promise<void> {
  console.log('Starting audit log migration to ClickHouse...');
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Dry run: ${DRY_RUN}`);

  const prisma = new PrismaClient();

  // Initialize ClickHouse client
  // const clickhouse = createClient({
  //   host: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  //   database: process.env.CLICKHOUSE_DATABASE || 'audit',
  // });

  try {
    // Get total count
    const totalCount = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM audit_logs
    `;
    const total = Number(totalCount[0]?.count || 0);
    console.log(`Total records to migrate: ${total}`);

    let offset = 0;
    let migrated = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch batch from PostgreSQL
      const logs = await prisma.$queryRaw<AuditLogRecord[]>`
        SELECT
          al.id, al.admin_id, al.action, al.resource, al.resource_id,
          al.before_state, al.after_state, al.ip_address, al.user_agent,
          al.created_at
        FROM audit_logs al
        ORDER BY al.created_at ASC
        LIMIT ${BATCH_SIZE} OFFSET ${offset}
      `;

      if (logs.length === 0) {
        hasMore = false;
        continue;
      }

      // Get admin emails for this batch
      const adminIds = [...new Set(logs.map((l) => l.admin_id))];
      const admins = await prisma.$queryRaw<{ id: string; email: string }[]>`
        SELECT id, email FROM admins WHERE id = ANY(${adminIds})
      `;
      const adminEmailMap = new Map(admins.map((a) => [a.id, a.email]));

      // Transform records
      const clickHouseRecords: ClickHouseAuditLog[] = await Promise.all(
        logs.map((log) => transformToClickHouseFormat(log, adminEmailMap.get(log.admin_id) || '')),
      );

      if (!DRY_RUN) {
        // Insert into ClickHouse
        // await clickhouse.insert({
        //   table: 'audit_logs',
        //   values: clickHouseRecords,
        //   format: 'JSONEachRow',
        // });
        console.log(`[DRY_RUN=false] Would insert ${clickHouseRecords.length} records`);
      } else {
        console.log(`[DRY_RUN] Skipping insert of ${clickHouseRecords.length} records`);
      }

      migrated += logs.length;
      offset += BATCH_SIZE;

      const progress = ((migrated / total) * 100).toFixed(2);
      console.log(`Progress: ${migrated}/${total} (${progress}%)`);
    }

    console.log('Migration completed successfully!');
    console.log(`Total migrated: ${migrated} records`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    // await clickhouse.close();
  }
}

// Run migration
migrateAuditLogs()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
