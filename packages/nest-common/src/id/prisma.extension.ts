import { Prisma } from '@prisma/client';
import { ID as ULID_ID } from './ulid.generator';
import { ID as UUID_ID } from './uuidv7.generator';

/**
 * Prisma extension that auto-generates ULID for id field
 * @deprecated Use uuidv7Extension for new projects
 *
 * @example
 * import { PrismaClient } from '@prisma/client';
 * import { ulidExtension } from '@my-girok/nest-common';
 *
 * const prisma = new PrismaClient().$extends(ulidExtension);
 *
 * // ID auto-generated
 * await prisma.user.create({
 *   data: { email: 'user@example.com' },
 * });
 */
export const ulidExtension = Prisma.defineExtension({
  name: 'ulid-extension',
  query: {
    $allModels: {
      async create({ args, query }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = args.data as any;
        if (data && typeof data === 'object' && !data.id) {
          data.id = ULID_ID.generate();
        }
        return query(args);
      },
      async createMany({ args, query }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataArray = args.data as any[];
        if (Array.isArray(dataArray)) {
          for (const item of dataArray) {
            if (!item.id) {
              item.id = ULID_ID.generate();
            }
          }
        }
        return query(args);
      },
      async upsert({ args, query }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const create = args.create as any;
        if (create && typeof create === 'object' && !create.id) {
          create.id = ULID_ID.generate();
        }
        return query(args);
      },
    },
  },
});

/**
 * Prisma extension that auto-generates UUIDv7 for id field
 * RFC 9562 compliant, time-sortable, DB-native uuid type compatible
 *
 * @example
 * import { PrismaClient } from '@prisma/client';
 * import { uuidv7Extension } from '@my-girok/nest-common';
 *
 * const prisma = new PrismaClient().$extends(uuidv7Extension);
 *
 * // ID auto-generated as UUIDv7
 * await prisma.user.create({
 *   data: { email: 'user@example.com' },
 * });
 */
export const uuidv7Extension = Prisma.defineExtension({
  name: 'uuidv7-extension',
  query: {
    $allModels: {
      async create({ args, query }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = args.data as any;
        if (data && typeof data === 'object' && !data.id) {
          data.id = UUID_ID.generate();
        }
        return query(args);
      },
      async createMany({ args, query }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataArray = args.data as any[];
        if (Array.isArray(dataArray)) {
          for (const item of dataArray) {
            if (!item.id) {
              item.id = UUID_ID.generate();
            }
          }
        }
        return query(args);
      },
      async upsert({ args, query }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const create = args.create as any;
        if (create && typeof create === 'object' && !create.id) {
          create.id = UUID_ID.generate();
        }
        return query(args);
      },
    },
  },
});
