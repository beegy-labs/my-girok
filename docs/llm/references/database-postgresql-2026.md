# Database (PostgreSQL) - 2026 Best Practices

> PostgreSQL 17/18, performance, pgvector | **Updated**: 2026-01-22

## PostgreSQL 17/18 Key Features

| Feature                | Impact                 | Version |
| ---------------------- | ---------------------- | ------- |
| Incremental VACUUM     | Up to 94% faster       | 17      |
| Bi-directional indexes | Improved range queries | 17      |
| Parallel execution     | Multi-core utilization | 17      |
| Asynchronous I/O (AIO) | Higher throughput      | 18      |
| Native UUIDv7          | Sortable, efficient    | 18      |

## UUIDv7 Best Practices

```sql
-- PostgreSQL 18+ native support
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuidv7(),
  created_at TIMESTAMPTZ(6) DEFAULT NOW()
);
```

| Use Case            | UUID Type | Rationale                    |
| ------------------- | --------- | ---------------------------- |
| Internal keys       | UUIDv7    | Sortable, B-tree friendly    |
| External/Public IDs | UUIDv4    | Privacy (v7 leaks timestamp) |

**Performance**: 60% better insert performance vs UUIDv4 random distribution

## Indexing Strategy

### Index Types

| Type   | Use Case                 |
| ------ | ------------------------ |
| B-tree | Default, equality, range |
| GIN    | JSONB, full-text, arrays |
| GiST   | Geometric, full-text     |
| BRIN   | Large sequential data    |

### Index Best Practices

```sql
-- Composite index: order matters (left-to-right)
CREATE INDEX idx_orders_user_date
ON orders (user_id, created_at DESC);

-- Partial index: filtered data
CREATE INDEX idx_active_users
ON users (email) WHERE status = 'active';

-- Covering index: include columns
CREATE INDEX idx_orders_covering
ON orders (user_id) INCLUDE (total, status);
```

## Query Optimization

### EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = $1;

-- Look for:
-- - Seq Scan on large tables (add index)
-- - High actual rows vs estimated (update statistics)
-- - Buffer hits vs reads (memory tuning)
```

### pg_stat_statements

```sql
-- Enable extension
CREATE EXTENSION pg_stat_statements;

-- Find slow queries
SELECT query, calls, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Memory Configuration

| Parameter            | Guideline          | Purpose              |
| -------------------- | ------------------ | -------------------- |
| shared_buffers       | 25% of RAM         | Shared memory cache  |
| work_mem             | 4MB per connection | Sort/hash operations |
| maintenance_work_mem | 512MB-1GB          | VACUUM, CREATE INDEX |
| effective_cache_size | 75% of RAM         | Query planner hint   |

## VACUUM Strategy

```sql
-- Regular VACUUM (concurrent, recommended)
VACUUM ANALYZE table_name;

-- VACUUM FULL (exclusive lock, use sparingly)
VACUUM FULL table_name;  -- Reclaims more space but locks table
```

| Setting                         | Production Value |
| ------------------------------- | ---------------- |
| autovacuum                      | on               |
| autovacuum_vacuum_scale_factor  | 0.1              |
| autovacuum_analyze_scale_factor | 0.05             |

## Partitioning

```sql
-- Range partitioning by date
CREATE TABLE orders (
  id UUID,
  created_at TIMESTAMPTZ,
  total DECIMAL
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2026_q1
PARTITION OF orders
FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

## Extensions (2026)

| Extension          | Purpose                          |
| ------------------ | -------------------------------- |
| pgvector           | AI embeddings, similarity search |
| pg_stat_statements | Query performance                |
| pgcrypto           | Encryption functions             |
| pg_trgm            | Fuzzy text search                |
| PL/Rust            | High-performance functions       |

### pgvector for AI

```sql
CREATE EXTENSION vector;

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  embedding vector(1536),  -- OpenAI dimension
  content TEXT
);

-- Similarity search
SELECT * FROM documents
ORDER BY embedding <-> $1  -- L2 distance
LIMIT 10;
```

## Sources

- [PostgreSQL 17 Performance](https://medium.com/@DevBoostLab/postgresql-17-performance-upgrade-2026-f4222e71f577)
- [PostgreSQL Best Practices 2025](https://www.instaclustr.com/education/postgresql/top-10-postgresql-best-practices-for-2025/)
- [PostgreSQL Resolutions 2026](https://www.postgresql.fastware.com/blog/postgresql-resolutions-for-2026)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/current/performance-tips.html)
