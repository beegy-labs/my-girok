# Proto Caching Alternatives

> Alternative solutions and future migration paths | **Last Updated**: 2026-01-18

## Solutions Comparison

| Solution                   | Pros                                    | Cons                                        | Verdict         |
| -------------------------- | --------------------------------------- | ------------------------------------------- | --------------- |
| Wait for rate limit reset  | No changes                              | Unreliable, poor DX                         | ❌ Rejected     |
| Buf auth token             | Simple                                  | External dep, costs money, still has limits | ❌ Rejected     |
| Commit proto to Git        | Zero external deps                      | Large history, merge conflicts              | ❌ Rejected     |
| **Gitea Generic Packages** | Self-hosted, hash-based, 2026 compliant | +1MB storage, maintenance                   | ✅ **Selected** |
| GitHub Actions Cache       | Native integration                      | 7-day retention, rate limits, 10GB limit    | ⚠️ Viable       |
| Self-hosted Buf Registry   | Official solution                       | Enterprise license, operational overhead    | ❌ Rejected     |

## Fallback Mechanism - REJECTED

**Why rejected:**

1. Fallback to `buf generate` hits same rate limit (the problem we're solving)
2. Hides real issue (missing package should fail loudly)
3. False sense of security (only works if Buf rate limit NOT active)

**Better approach:** Fail fast with clear instructions

```yaml
on_download_fail:
  error_message: |
    ❌ Proto package not found in Gitea
    🔧 Fix: Manually trigger 'Build Proto' workflow
    ⚠️  Fallback NOT available (Buf rate limit)
  action: exit 1
```

## Buffrs/Protodex Evaluation

### Options Comparison

| Criterion    | Buffrs      | Confluent | Protodex | Current (Gitea+Buf) |
| ------------ | ----------- | --------- | -------- | ------------------- |
| Self-hosting | S3-based    | K8s + DB  | SQLite   | Gitea ✅            |
| Versioning   | Semantic    | Schema ID | Version  | Hash-based ✅       |
| Lock files   | ✅          | ❌        | ❌       | ❌                  |
| Checksums    | ✅ Built-in | ❌        | ❌       | ✅ Manual           |
| Monorepo     | ✅ Native   | ⚠️        | ⚠️       | ✅ pnpm workspace   |
| Maturity     | Early       | Mature    | Early    | Proven ✅           |

### Buffrs Migration Decision

**Migrate when ONE condition is met:**

1. Ecosystem maturity: 1000+ GitHub stars or CNCF Sandbox status
2. Enterprise adoption: Major companies publicly use Buffrs
3. Clear advantage: 2x+ performance or critical missing features
4. Current solution limits: Gitea fails to scale
5. Buf deprecation: Buf CLI/BSR end-of-life

**Current recommendation (2026-01):** Monitor quarterly, re-evaluate 2027-06-01

## Migration Paths

### To GitHub Actions Cache

```yaml
- uses: actions/cache@v5
  with:
    path: packages/types/src/generated
    key: proto-${{ hashFiles('packages/proto/**/*.proto', 'packages/proto/buf.*.yaml') }}

- if: steps.cache.outputs.cache-hit != 'true'
  run: pnpm --filter @my-girok/proto generate
```

**Trade-offs:** 7-day retention, rate limits, less control

### To Buffrs (Future)

```yaml
prerequisites:
  - Deploy buffrs-registry to K8s
  - Configure S3/Minio backend
  - Replace Buf CLI with Buffrs CLI

phases:
  1_poc: 1 week (Docker Compose, test one package)
  2_parallel: 2 weeks (K8s deploy, publish to both registries)
  3_migration: 1 week (Switch CI/CD to buffrs)
  4_cleanup: 1 week (Deprecate Gitea packages)

total_effort: 5 weeks (1 engineer)
```

## Industry References

- [GitHub Actions Cache Best Practices](https://dev.to/ken_mwaura1/optimizing-github-actions-performance-enhance-workflows-with-caching-4hla)
- [Google Cloud Artifact Registry Generic Format](https://medium.com/google-cloud/google-cloud-artifact-registry-goes-limitless-with-generic-format-support-b3b4752bbfd3)
- [Buf Schema Registry Docs](https://buf.build/docs/bsr/)
- [Bazel 9 Protobuf Optimizations](https://blog.aspect.build/bazel-9-protobuf)

## Monitoring Checklist (Quarterly)

- [ ] Buffrs GitHub stars and commit activity
- [ ] Helsing Blog for roadmap updates
- [ ] Production case studies
- [ ] CNCF project status
- [ ] Buf BSR feature parity

---

_Related: `proto-caching.md` | `proto-caching-impl.md`_
