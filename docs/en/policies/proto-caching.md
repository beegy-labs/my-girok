# Protocol Buffer Caching Policy

> Protobuf build caching strategy using Gitea Generic Package Registry

**Last Updated**: 2026-01-18 | **Status**: Active

## Overview

This policy defines the Protocol Buffer caching strategy to avoid Buf Schema Registry rate limits while maintaining efficient CI/CD pipelines.

**Problem**: 10+ concurrent CI jobs exhaust Buf rate limits
**Solution**: Build once, cache in Gitea, download in service CI jobs
**Result**: 59-67% CI time reduction, zero external rate limits

## Architecture

The caching follows a "Build Once, Download Many" pattern:

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

The hash uniquely identifies a proto generation based on all input files:

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

### Why No Fallback?

A fallback to `buf generate` would hit the same Buf rate limit we're avoiding. Instead, we fail fast with clear instructions when the package is missing.

## Security

| Risk              | Mitigation                      |
| ----------------- | ------------------------------- |
| Compromised Gitea | HTTPS + token auth              |
| MITM attack       | HTTPS, hash verification        |
| Malicious proto   | Checksum verification           |
| Package overwrite | Immutable hash-based versioning |

## Workflow Integration

### Build Proto Workflow

Triggered on proto file changes:

1. Calculate hash from proto files
2. Check if package exists in Gitea
3. If missing: generate, compress, upload
4. If exists: skip (saves ~30s)

### Service CI Workflow

For each service build:

1. Calculate same hash
2. Download tarball from Gitea
3. Verify checksum
4. Extract to generated directory

## Related Documentation

| Topic          | Document                                         |
| -------------- | ------------------------------------------------ |
| Implementation | `docs/en/policies/proto-caching-impl.md`         |
| Alternatives   | `docs/en/policies/proto-caching-alternatives.md` |
| CI/CD          | `docs/en/policies/github-actions-workflows.md`   |

---

**Policy Owner**: DevOps Team | **Review Cycle**: Quarterly

_This document is auto-generated from `docs/llm/policies/proto-caching.md`_
