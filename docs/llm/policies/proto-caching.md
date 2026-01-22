# Protocol Buffer Caching Policy

> **Last Updated**: 2026-01-18 | **Status**: Active

## Overview

Protobuf build caching strategy using Gitea Generic Package Registry to avoid Buf Schema Registry rate limits.

**Problem**: 10+ concurrent CI jobs → Buf rate limit exhaustion
**Solution**: Build once, cache in Gitea, download in service CI jobs
**Result**: 59-67% CI time reduction, zero external rate limits

## Architecture

```yaml
pattern: Build Once, Download Many

flow:
  proto_changes:
    - Calculate hash from *.proto + buf.*.yaml
    - Check Gitea package existence
    - Generate & upload if missing (or skip if exists)

  service_ci:
    - Calculate same hash
    - Download tarball from Gitea
    - Extract to packages/types/src/generated/

storage:
  registry: Gitea Generic Package Registry
  package_name: proto-generated
  version_format: 12-char SHA256 hash
  format: tar.gz
  size: ~100KB compressed
```

## Hash Calculation

```bash
HASH=$(find packages/proto -type f \( -name "*.proto" -o -name "buf.gen.yaml" -o -name "buf.yaml" \) \
  -exec sha256sum {} \; | sort | sha256sum | cut -c1-12)
```

| Aspect         | Detail                                |
| -------------- | ------------------------------------- |
| Hash length    | 12 chars (48 bits, 281T combinations) |
| Collision risk | Negligible (<1000 versions)           |
| Included files | `*.proto`, `buf.gen.yaml`, `buf.yaml` |

## Performance Metrics

| Metric           | Before   | After (Cache Hit) | Improvement |
| ---------------- | -------- | ----------------- | ----------- |
| Proto generation | 450s     | 150s              | 67%         |
| CI time savings  | Baseline | 59-67% faster     | ✅          |

## Implemented Features

| Feature               | Status | Details                         |
| --------------------- | ------ | ------------------------------- |
| Checksum verification | ✅     | SHA256 checksum file uploaded   |
| Retention policy      | ✅     | Keep last 20 versions           |
| Cache monitoring      | ✅     | GitHub Actions job summaries    |
| Concurrency control   | ✅     | Prevent duplicate builds        |
| Fallback mechanism    | ❌     | Rejected - hits same rate limit |

## Security

| Risk              | Mitigation                      |
| ----------------- | ------------------------------- |
| Compromised Gitea | HTTPS + token auth              |
| MITM attack       | HTTPS, hash verification        |
| Malicious proto   | Checksum verification           |
| Package overwrite | Immutable hash-based versioning |

## Related Documents

| Topic          | Document                        |
| -------------- | ------------------------------- |
| Implementation | `proto-caching-impl.md`         |
| Alternatives   | `proto-caching-alternatives.md` |
| CI/CD          | `github-actions-workflows.md`   |

---

**Policy Owner**: DevOps Team | **Review Cycle**: Quarterly
