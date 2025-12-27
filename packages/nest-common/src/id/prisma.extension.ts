import { ID as ULID_ID } from './ulid.generator';
import { ID as UUID_ID } from './uuidv7.generator';

/**
 * Prisma extension type definition (compatible with Prisma.defineExtension)
 * Avoids importing @prisma/client at module load time
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaExtension = any;

/**
 * Factory function to create Prisma extension for auto-generating IDs
 * Eliminates code duplication between ULID and UUIDv7 extensions
 *
 * Note: This implementation avoids using Prisma.defineExtension to prevent
 * loading @prisma/client at module initialization time. The extension
 * works identically at runtime.
 *
 * @param generator - ID generation function
 * @param name - Extension name for debugging
 */
const createIdExtension = (generator: () => string, name: string): PrismaExtension => ({
  name,
  query: {
    $allModels: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async create({ args, query }: any) {
        const data = args.data;
        if (data && typeof data === 'object' && !data.id) {
          data.id = generator();
        }
        return query(args);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async createMany({ args, query }: any) {
        const dataArray = args.data;
        if (Array.isArray(dataArray)) {
          for (const item of dataArray) {
            if (!item.id) {
              item.id = generator();
            }
          }
        }
        return query(args);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async upsert({ args, query }: any) {
        const create = args.create;
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
