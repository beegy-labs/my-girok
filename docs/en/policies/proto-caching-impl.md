# Proto Caching Implementation

> Workflow integration and troubleshooting guide

## Overview

This document provides implementation details for the Protocol Buffer caching system, including workflow configurations, verification procedures, and troubleshooting steps.

## Build Proto Workflow

**File**: `.github/workflows/build-proto.yml`

### Triggers

```yaml
triggers:
  - push: [develop, release, main] + paths: packages/proto/**
  - pull_request: [develop, release, main] + paths: packages/proto/**
  - workflow_dispatch
```

### Steps

```yaml
steps:
  1_calculate_hash: find packages/proto ... | sha256sum | cut -c1-12
  2_check_existence: curl HEAD https://gitea.girok.dev/api/packages/.../proto-generated/${HASH}
  3_conditional_build:
    if_exists: Skip (saves ~30s)
    if_missing:
      - pnpm --filter @my-girok/proto generate
      - tar -czf proto-generated.tar.gz ...
      - curl PUT (upload to Gitea)
      - echo "${HASH}" > proto-generated.sha256
```

### Timing

| Scenario     | Duration |
| ------------ | -------- |
| Build (miss) | ~33s     |
| Skip (hit)   | <5s      |

## Service CI Workflow

**File**: `.github/workflows/_service-ci.yml`

### Proto Download Step

```yaml
proto_download_step:
  env: GITEA_TOKEN
  run: |
    HASH=$(find packages/proto ... | sha256sum | cut -c1-12)
    curl -f -L -H "Authorization: token ${GITEA_TOKEN}" \
      "https://gitea.girok.dev/.../proto-generated/${HASH}/proto-generated.tar.gz" \
      -o /tmp/proto-generated.tar.gz

    # Checksum verification
    ACTUAL_HASH=$(sha256sum /tmp/proto-generated.tar.gz | cut -c1-12)
    [ "${HASH}" = "${ACTUAL_HASH}" ] || exit 1

    tar -xzf /tmp/proto-generated.tar.gz -C packages/types/src/generated/
```

### Timing

Download takes ~10-15s compared to ~45s for generation.

## Checksum Verification

### Build Workflow

```bash
# Generate checksum file
echo "${HASH}" > /tmp/proto-generated.sha256
```

### Service CI

```bash
# Verify checksum matches
EXPECTED_HASH="${HASH}"
ACTUAL_HASH=$(sha256sum /tmp/proto-generated.tar.gz | cut -c1-12)
[ "${EXPECTED_HASH}" = "${ACTUAL_HASH}" ] || exit 1
```

## Retention Policy

Keep only the last 20 versions to manage storage:

```bash
# Keep last 20 versions, delete older
curl -s -H "Authorization: token ${GITEA_TOKEN}" \
  "https://gitea.girok.dev/api/packages/beegy-labs/generic/proto-generated" | \
  jq -r '.[] | "\(.created_at)|\(.version)"' | sort -r | tail -n +21 | \
  while IFS='|' read -r _ v; do
    curl -X DELETE -H "Authorization: token ${GITEA_TOKEN}" \
      "https://gitea.girok.dev/api/packages/beegy-labs/generic/proto-generated/${v}"
  done
```

## Cache Monitoring

Add summary to GitHub Actions job:

```yaml
- name: Proto cache summary
  run: |
    echo "## Proto Cache Metrics 📊" >> $GITHUB_STEP_SUMMARY
    echo "- Hash: \`${HASH}\`" >> $GITHUB_STEP_SUMMARY
    echo "- Source: Gitea package registry" >> $GITHUB_STEP_SUMMARY
    echo "- Download time: ${DOWNLOAD_TIME}s" >> $GITHUB_STEP_SUMMARY
```

## Concurrency Control

Prevent duplicate builds:

```yaml
concurrency:
  group: proto-build
  cancel-in-progress: false # Allow existing build to complete
```

## Troubleshooting

### Proto Download Fails (404)

**Symptoms**: `curl (22) The requested URL returned error 404`

**Causes**:

- Proto hash mismatch (files changed, package not built)
- Gitea API endpoint incorrect
- Package not uploaded yet

**Solutions**:

1. Check if package exists:

```bash
HASH=$(find packages/proto ... | sha256sum | cut -c1-12)
curl -I -H "Authorization: token ${GITEA_TOKEN}" \
  "https://gitea.girok.dev/.../proto-generated/${HASH}"
```

2. Trigger build via GitHub Actions: Actions → Build Proto → Run workflow

3. Local fallback:

```bash
pnpm --filter @my-girok/proto generate
```

### Proto Package Corrupted

```bash
# Delete corrupted package version
curl -X DELETE -H "Authorization: token ${GITEA_TOKEN}" \
  "https://gitea.girok.dev/api/packages/beegy-labs/generic/proto-generated/${HASH}"

# Trigger rebuild
git commit --allow-empty -m "chore: rebuild proto package"
git push
```

### Hash Collision (Extremely Rare)

| Aspect      | Detail                                   |
| ----------- | ---------------------------------------- |
| Probability | ~1 in 281 trillion                       |
| Solution    | Increase hash length from 12 to 16 chars |
| Change      | `cut -c1-12` → `cut -c1-16`              |

## Access Control

```yaml
gitea_token:
  scope: Generic package read/write
  storage: GitHub Actions secrets
  rotation: Quarterly (manual)

recommendations:
  - Use dedicated service account (not personal token)
  - Limit scope to proto-generated package only
```

## Related Documentation

- Main Policy: `docs/en/policies/proto-caching.md`
- Alternatives: `docs/en/policies/proto-caching-alternatives.md`

---

_This document is auto-generated from `docs/llm/policies/proto-caching-impl.md`_
