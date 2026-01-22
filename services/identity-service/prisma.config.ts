import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: [],
  schema: './prisma/identity/schema.prisma',
  migrate: {
    adapter: async () => {
      const { Pool } = await import('pg');
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const pool = new Pool({ connectionString: process.env.IDENTITY_DATABASE_URL });
      return new PrismaPg(pool);
    },
  },
});
