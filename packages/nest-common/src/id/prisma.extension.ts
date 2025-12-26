import { Prisma } from '@prisma/client';
import { ID as ULID_ID } from './ulid.generator';
import { ID as UUID_ID } from './uuidv7.generator';

/**
 * Factory function to create Prisma extension for auto-generating IDs
 * Eliminates code duplication between ULID and UUIDv7 extensions
 *
 * @param generator - ID generation function
 * @param name - Extension name for debugging
 */
const createIdExtension = (generator: () => string, name: string) =>
  Prisma.defineExtension({
    name,
    query: {
      $allModels: {
        async create({ args, query }) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = args.data as any;
          if (data && typeof data === 'object' && !data.id) {
            data.id = generator();
          }
          return query(args);
        },
        async createMany({ args, query }) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dataArray = args.data as any[];
          if (Array.isArray(dataArray)) {
            for (const item of dataArray) {
              if (!item.id) {
                item.id = generator();
              }
            }
          }
          return query(args);
        },
        async upsert({ args, query }) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const create = args.create as any;
          if (create && typeof create === 'object' && !create.id) {
            create.id = generator();
          }
          return query(args);
        },
      },
    },
  });

/**
 * Prisma extension that auto-generates ULID for id field
 * @deprecated Use uuidv7Extension for new projects
 *
 * @example
 * import { PrismaClient } from '@prisma/client';
 * import { ulidExtension } from '@my-girok/nest-common';
 *
 * const prisma = new PrismaClient().$extends(ulidExtension);
 */
export const ulidExtension = createIdExtension(ULID_ID.generate, 'ulid-extension');

/**
 * Prisma extension that auto-generates UUIDv7 for id field
 * RFC 9562 compliant, time-sortable, DB-native uuid type compatible
 *
 * @example
 * import { PrismaClient } from '@prisma/client';
 * import { uuidv7Extension } from '@my-girok/nest-common';
 *
 * const prisma = new PrismaClient().$extends(uuidv7Extension);
 */
export const uuidv7Extension = createIdExtension(UUID_ID.generate, 'uuidv7-extension');
