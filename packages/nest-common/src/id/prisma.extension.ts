import { Prisma } from '@prisma/client';
import { ID } from './ulid.generator';

/**
 * Prisma extension that auto-generates ULID for id field
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
          data.id = ID.generate();
        }
        return query(args);
      },
      async createMany({ args, query }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataArray = args.data as any[];
        if (Array.isArray(dataArray)) {
          for (const item of dataArray) {
            if (!item.id) {
              item.id = ID.generate();
            }
          }
        }
        return query(args);
      },
      async upsert({ args, query }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const create = args.create as any;
        if (create && typeof create === 'object' && !create.id) {
          create.id = ID.generate();
        }
        return query(args);
      },
    },
  },
});
