import { createNestJsConfig } from '@my-girok/vitest-config/nestjs';

export default createNestJsConfig(__dirname, {
  // Use forks pool for ioredis compatibility
  useForks: true,
});
