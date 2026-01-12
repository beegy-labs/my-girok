/**
 * Configuration for Authorization Service
 */

export default () => ({
  // Server ports
  grpc: {
    port: parseInt(process.env.GRPC_PORT || '50055', 10),
  },
  http: {
    port: parseInt(process.env.HTTP_PORT || '3012', 10),
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/authorization_db',
  },

  // Cache
  cache: {
    l1MaxItems: parseInt(process.env.CACHE_L1_MAX_ITEMS || '10000', 10),
    l1TtlMs: parseInt(process.env.CACHE_L1_TTL_MS || '30000', 10),
    l2TtlSec: parseInt(process.env.CACHE_L2_TTL_SEC || '300', 10),
    bloomExpectedItems: parseInt(process.env.CACHE_BLOOM_EXPECTED_ITEMS || '100000', 10),
    bloomFalsePositiveRate: parseFloat(process.env.CACHE_BLOOM_FPR || '0.01'),
  },

  // Check engine
  check: {
    maxDepth: parseInt(process.env.CHECK_MAX_DEPTH || '25', 10),
  },
});
