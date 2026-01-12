/**
 * Tuple Repository
 *
 * Handles CRUD operations for authorization tuples.
 * Implements soft-delete using transaction IDs for consistency.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ulid } from 'ulid';
import { TupleKey, TupleUtils, RelationTuple } from '../types';

/**
 * Options for finding tuples
 */
export interface FindTuplesOptions {
  userType?: string;
  userId?: string;
  userRelation?: string;
  relation?: string;
  objectType?: string;
  objectId?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Result of write operations
 */
export interface WriteResult {
  success: boolean;
  txid: bigint;
  writtenCount: number;
  deletedCount: number;
}

@Injectable()
export class TupleRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Write tuples (create or update)
   */
  async write(writes: TupleKey[], deletes: TupleKey[] = []): Promise<WriteResult> {
    const txid = await this.getCurrentTxid();

    return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let writtenCount = 0;
      let deletedCount = 0;

      // Process deletes (soft delete by setting deletedTxid)
      for (const key of deletes) {
        const parsed = TupleUtils.tupleKeyToPartial(key);
        const result = await tx.authorizationTuple.updateMany({
          where: {
            userType: parsed.userType,
            userId: parsed.userId,
            userRelation: parsed.userRelation ?? null,
            relation: parsed.relation,
            objectType: parsed.objectType,
            objectId: parsed.objectId,
            deletedTxid: null, // Only delete non-deleted tuples
          },
          data: {
            deletedTxid: txid,
          },
        });
        deletedCount += result.count;

        // Log to changelog
        if (result.count > 0) {
          const existing = await tx.authorizationTuple.findFirst({
            where: {
              userType: parsed.userType,
              userId: parsed.userId,
              userRelation: parsed.userRelation ?? null,
              relation: parsed.relation,
              objectType: parsed.objectType,
              objectId: parsed.objectId,
              deletedTxid: txid,
            },
          });
          if (existing) {
            await tx.authorizationChangelog.create({
              data: {
                operation: 'DELETE',
                tupleId: existing.id,
                txid,
              },
            });
          }
        }
      }

      // Process writes
      for (const key of writes) {
        const parsed = TupleUtils.tupleKeyToPartial(key);

        // Check if tuple already exists
        const existing = await tx.authorizationTuple.findFirst({
          where: {
            userType: parsed.userType,
            userId: parsed.userId,
            userRelation: parsed.userRelation ?? null,
            relation: parsed.relation,
            objectType: parsed.objectType,
            objectId: parsed.objectId,
            deletedTxid: null,
          },
        });

        if (!existing) {
          const id = ulid();
          await tx.authorizationTuple.create({
            data: {
              id,
              userType: parsed.userType,
              userId: parsed.userId,
              userRelation: parsed.userRelation,
              relation: parsed.relation,
              objectType: parsed.objectType,
              objectId: parsed.objectId,
              createdTxid: txid,
            },
          });
          writtenCount++;

          // Log to changelog
          await tx.authorizationChangelog.create({
            data: {
              operation: 'WRITE',
              tupleId: id,
              txid,
            },
          });
        }
      }

      return {
        success: true,
        txid,
        writtenCount,
        deletedCount,
      };
    });
  }

  /**
   * Check if a direct tuple exists
   */
  async exists(key: TupleKey): Promise<boolean> {
    const parsed = TupleUtils.tupleKeyToPartial(key);

    const count = await this.prisma.authorizationTuple.count({
      where: {
        userType: parsed.userType,
        userId: parsed.userId,
        userRelation: parsed.userRelation ?? null,
        relation: parsed.relation,
        objectType: parsed.objectType,
        objectId: parsed.objectId,
        deletedTxid: null,
      },
    });

    return count > 0;
  }

  /**
   * Find tuples by user (for ListObjects)
   */
  async findByUser(
    userType: string,
    userId: string,
    relation: string,
    objectType?: string,
  ): Promise<RelationTuple[]> {
    const tuples = await this.prisma.authorizationTuple.findMany({
      where: {
        userType,
        userId,
        relation,
        ...(objectType && { objectType }),
        deletedTxid: null,
      },
    });

    return tuples.map(this.toRelationTuple);
  }

  /**
   * Find tuples by object (for ListUsers and CheckTupleToUserset)
   */
  async findByObject(
    objectType: string,
    objectId: string,
    relation?: string,
  ): Promise<RelationTuple[]> {
    const tuples = await this.prisma.authorizationTuple.findMany({
      where: {
        objectType,
        objectId,
        ...(relation && { relation }),
        deletedTxid: null,
      },
    });

    return tuples.map(this.toRelationTuple);
  }

  /**
   * Find tuples by object and relation (for TupleToUserset evaluation)
   */
  async findByObjectAndRelation(object: string, relation: string): Promise<RelationTuple[]> {
    const parsed = TupleUtils.parseObject(object);

    return this.findByObject(parsed.type, parsed.id, relation);
  }

  /**
   * Find tuples matching a userset (e.g., team:dev#member)
   */
  async findByUserset(
    userType: string,
    userId: string,
    userRelation: string,
  ): Promise<RelationTuple[]> {
    const tuples = await this.prisma.authorizationTuple.findMany({
      where: {
        userType,
        userId,
        userRelation,
        deletedTxid: null,
      },
    });

    return tuples.map(this.toRelationTuple);
  }

  /**
   * Find all tuples matching criteria
   */
  async find(options: FindTuplesOptions): Promise<RelationTuple[]> {
    const tuples = await this.prisma.authorizationTuple.findMany({
      where: {
        ...(options.userType && { userType: options.userType }),
        ...(options.userId && { userId: options.userId }),
        ...(options.userRelation !== undefined && { userRelation: options.userRelation }),
        ...(options.relation && { relation: options.relation }),
        ...(options.objectType && { objectType: options.objectType }),
        ...(options.objectId && { objectId: options.objectId }),
        ...(options.includeDeleted ? {} : { deletedTxid: null }),
      },
      take: options.limit,
      skip: options.offset,
      orderBy: { createdAt: 'desc' },
    });

    return tuples.map(this.toRelationTuple);
  }

  /**
   * Delete a specific tuple
   */
  async delete(key: TupleKey): Promise<boolean> {
    const result = await this.write([], [key]);
    return result.deletedCount > 0;
  }

  /**
   * Get current transaction ID
   */
  private async getCurrentTxid(): Promise<bigint> {
    const result = await this.prisma.$queryRaw<[{ txid_current: bigint }]>`SELECT txid_current()`;
    return result[0].txid_current;
  }

  /**
   * Convert Prisma model to RelationTuple
   */
  private toRelationTuple(tuple: {
    id: string;
    userType: string;
    userId: string;
    userRelation: string | null;
    relation: string;
    objectType: string;
    objectId: string;
    conditionName: string | null;
    conditionContext: unknown;
    createdTxid: bigint;
    deletedTxid: bigint | null;
    createdAt: Date | null;
  }): RelationTuple {
    return {
      id: tuple.id,
      userType: tuple.userType,
      userId: tuple.userId,
      userRelation: tuple.userRelation ?? undefined,
      relation: tuple.relation,
      objectType: tuple.objectType,
      objectId: tuple.objectId,
      conditionName: tuple.conditionName ?? undefined,
      conditionContext: tuple.conditionContext as Record<string, unknown> | undefined,
      createdTxid: tuple.createdTxid,
      deletedTxid: tuple.deletedTxid ?? undefined,
      createdAt: tuple.createdAt ?? new Date(),
    };
  }
}
