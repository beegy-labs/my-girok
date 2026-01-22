# Proto Caching Implementation

> Workflow integration and troubleshooting | **Last Updated**: 2026-01-18

## Build Proto Workflow

**File**: `.github/workflows/build-proto.yml`

```yaml
triggers:
  - push: [develop, release, main] + paths: packages/proto/**
  - pull_request: [develop, release, main] + paths: packages/proto/**
  - workflow_dispatch

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

timing:
  build: ~33s (when generating)
  skip: <5s (cache hit)
```

## Service CI Workflow

**File**: `.github/workflows/_service-ci.yml`

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

timing: ~10-15s (vs ~45s for generation)
```

## Checksum Verification

```bash
# Build workflow: Generate checksum
echo "${HASH}" > /tmp/proto-generated.sha256

# Service CI: Verify checksum
EXPECTED_HASH="${HASH}"
ACTUAL_HASH=$(sha256sum /tmp/proto-generated.tar.gz | cut -c1-12)
[ "${EXPECTED_HASH}" = "${ACTUAL_HASH}" ] || exit 1
```

## Retention Policy

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

```yaml
- name: Proto cache summary
  run: |
    echo "## Proto Cache Metrics 📊" >> $GITHUB_STEP_SUMMARY
    echo "- Hash: \`${HASH}\`" >> $GITHUB_STEP_SUMMARY
    echo "- Source: Gitea package registry" >> $GITHUB_STEP_SUMMARY
    echo "- Download time: ${DOWNLOAD_TIME}s" >> $GITHUB_STEP_SUMMARY
```

## Concurrency Control

```yaml
concurrency:
  group: proto-build
  cancel-in-progress: false # Allow existing build to complete
```

## Troubleshooting

### Proto Download Fails (404)

```yaml
symptoms: curl (22) The requested URL returned error 404

causes:
  - Proto hash mismatch (files changed, package not built)
  - Gitea API endpoint incorrect
  - Package not uploaded yet

solutions:
  1_check_package:
    cmd: |
      HASH=$(find packages/proto ... | sha256sum | cut -c1-12)
      curl -I -H "Authorization: token ${GITEA_TOKEN}" \
        "https://gitea.girok.dev/.../proto-generated/${HASH}"

  2_trigger_build:
    ui: GitHub Actions → Build Proto → Run workflow

  3_local_fallback:
    cmd: pnpm --filter @my-girok/proto generate
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

```yaml
probability: ~1 in 281 trillion
solution_if_occurs: Increase hash length from 12 to 16 characters
  change: cut -c1-12 → cut -c1-16
```

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

---

_Related: `proto-caching.md` | `proto-caching-alternatives.md`_
