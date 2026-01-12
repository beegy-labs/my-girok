/**
 * Changelog Repository
 *
 * Handles operations for the authorization changelog.
 * Used for cache invalidation and event propagation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Changelog entry
 */
export interface ChangelogEntry {
  id: bigint;
  operation: 'WRITE' | 'DELETE';
  tupleId: string;
  txid: bigint;
  timestamp: Date;
  processed: boolean;
}

@Injectable()
export class ChangelogRepository {
  private readonly logger = new Logger(ChangelogRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find unprocessed changelog entries
   */
  async findUnprocessed(limit: number = 100): Promise<ChangelogEntry[]> {
    const entries = await this.prisma.authorizationChangelog.findMany({
      where: { processed: false },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });

    return entries.map(this.toChangelogEntry);
  }

  /**
   * Mark entries as processed
   */
  async markProcessed(ids: bigint[]): Promise<number> {
    const result = await this.prisma.authorizationChangelog.updateMany({
      where: { id: { in: ids } },
      data: { processed: true },
    });

    return result.count;
  }

  /**
   * Mark a single entry as processed
   */
  async markOneProcessed(id: bigint): Promise<boolean> {
    try {
      await this.prisma.authorizationChangelog.update({
        where: { id },
        data: { processed: true },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get entries after a specific transaction ID
   */
  async getAfterTxid(txid: bigint, limit: number = 100): Promise<ChangelogEntry[]> {
    const entries = await this.prisma.authorizationChangelog.findMany({
      where: {
        txid: { gt: txid },
      },
      orderBy: { txid: 'asc' },
      take: limit,
    });

    return entries.map(this.toChangelogEntry);
  }

  /**
   * Get the latest transaction ID
   */
  async getLatestTxid(): Promise<bigint | null> {
    const entry = await this.prisma.authorizationChangelog.findFirst({
      orderBy: { txid: 'desc' },
    });

    return entry?.txid ?? null;
  }

  /**
   * Clean up old processed entries
   */
  async cleanup(olderThan: Date): Promise<number> {
    const result = await this.prisma.authorizationChangelog.deleteMany({
      where: {
        processed: true,
        timestamp: { lt: olderThan },
      },
    });

    return result.count;
  }

  /**
   * Get changelog statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    unprocessedCount: number;
    latestTxid: bigint | null;
  }> {
    const [total, unprocessed, latest] = await Promise.all([
      this.prisma.authorizationChangelog.count(),
      this.prisma.authorizationChangelog.count({ where: { processed: false } }),
      this.getLatestTxid(),
    ]);

    return {
      totalEntries: total,
      unprocessedCount: unprocessed,
      latestTxid: latest,
    };
  }

  /**
   * Convert Prisma model to ChangelogEntry
   */
  private toChangelogEntry(entry: {
    id: bigint;
    operation: string;
    tupleId: string;
    txid: bigint;
    timestamp: Date;
    processed: boolean;
  }): ChangelogEntry {
    return {
      id: entry.id,
      operation: entry.operation as 'WRITE' | 'DELETE',
      tupleId: entry.tupleId,
      txid: entry.txid,
      timestamp: entry.timestamp,
      processed: entry.processed,
    };
  }
}
