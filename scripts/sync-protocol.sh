#!/bin/bash
# Sync from llm-dev-protocol repository
# Usage: pnpm sync:protocol [--check]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROTOCOL_REPO="https://github.com/beegy-labs/llm-dev-protocol.git"
TEMP_DIR=$(mktemp -d)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cleanup() {
  rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

echo ""
echo "📦 Syncing from llm-dev-protocol..."
echo ""

# Clone repository
git clone --depth 1 --quiet "${PROTOCOL_REPO}" "${TEMP_DIR}/llm-dev-protocol"
SOURCE_DIR="${TEMP_DIR}/llm-dev-protocol"

# Check mode: only show diff
if [ "$1" = "--check" ]; then
  echo "🔍 Check mode: showing differences only"
  echo ""

  HAS_DIFF=0

  # Check policies
  for file in cdd.md sdd.md add.md development-methodology.md development-methodology-details.md agents-customization.md; do
    if [ -f "${SOURCE_DIR}/docs/llm/policies/${file}" ]; then
      if [ -f "${PROJECT_ROOT}/docs/llm/policies/${file}" ]; then
        if ! diff -q "${SOURCE_DIR}/docs/llm/policies/${file}" "${PROJECT_ROOT}/docs/llm/policies/${file}" > /dev/null 2>&1; then
          echo -e "${YELLOW}  ≠ docs/llm/policies/${file}${NC}"
          HAS_DIFF=1
        fi
      else
        echo -e "${RED}  + docs/llm/policies/${file} (missing locally)${NC}"
        HAS_DIFF=1
      fi
    fi
  done

  # Check scripts
  for file in generate.ts translate.ts utils.ts tsconfig.json; do
    if [ -f "${SOURCE_DIR}/scripts/docs/${file}" ]; then
      if [ -f "${PROJECT_ROOT}/scripts/docs/${file}" ]; then
        if ! diff -q "${SOURCE_DIR}/scripts/docs/${file}" "${PROJECT_ROOT}/scripts/docs/${file}" > /dev/null 2>&1; then
          echo -e "${YELLOW}  ≠ scripts/docs/${file}${NC}"
          HAS_DIFF=1
        fi
      else
        echo -e "${RED}  + scripts/docs/${file} (missing locally)${NC}"
        HAS_DIFF=1
      fi
    fi
  done

  # Check providers
  for file in index.ts ollama.ts gemini.ts claude.ts openai.ts; do
    if [ -f "${SOURCE_DIR}/scripts/docs/providers/${file}" ]; then
      if [ -f "${PROJECT_ROOT}/scripts/docs/providers/${file}" ]; then
        if ! diff -q "${SOURCE_DIR}/scripts/docs/providers/${file}" "${PROJECT_ROOT}/scripts/docs/providers/${file}" > /dev/null 2>&1; then
          echo -e "${YELLOW}  ≠ scripts/docs/providers/${file}${NC}"
          HAS_DIFF=1
        fi
      else
        echo -e "${RED}  + scripts/docs/providers/${file} (missing locally)${NC}"
        HAS_DIFF=1
      fi
    fi
  done

  # Check prompts
  for file in generate.txt translate.txt; do
    if [ -f "${SOURCE_DIR}/scripts/docs/prompts/${file}" ]; then
      if [ -f "${PROJECT_ROOT}/scripts/docs/prompts/${file}" ]; then
        if ! diff -q "${SOURCE_DIR}/scripts/docs/prompts/${file}" "${PROJECT_ROOT}/scripts/docs/prompts/${file}" > /dev/null 2>&1; then
          echo -e "${YELLOW}  ≠ scripts/docs/prompts/${file}${NC}"
          HAS_DIFF=1
        fi
      else
        echo -e "${RED}  + scripts/docs/prompts/${file} (missing locally)${NC}"
        HAS_DIFF=1
      fi
    fi
  done

  echo ""
  if [ $HAS_DIFF -eq 1 ]; then
    echo -e "${YELLOW}⚠ Differences found. Run 'pnpm sync:protocol' to sync.${NC}"
    exit 1
  else
    echo -e "${GREEN}✅ All files are in sync.${NC}"
    exit 0
  fi
fi

# Sync mode: copy files
echo "📄 Syncing policies..."
mkdir -p "${PROJECT_ROOT}/docs/llm/policies"
for file in cdd.md sdd.md add.md development-methodology.md development-methodology-details.md agents-customization.md; do
  if [ -f "${SOURCE_DIR}/docs/llm/policies/${file}" ]; then
    cp "${SOURCE_DIR}/docs/llm/policies/${file}" "${PROJECT_ROOT}/docs/llm/policies/${file}"
    echo -e "${GREEN}   ✓ ${file}${NC}"
  else
    echo -e "${YELLOW}   ⚠ ${file} not found in source${NC}"
  fi
done

echo ""
echo "📄 Syncing scripts..."
mkdir -p "${PROJECT_ROOT}/scripts/docs/providers"
mkdir -p "${PROJECT_ROOT}/scripts/docs/prompts"

for file in generate.ts translate.ts utils.ts tsconfig.json; do
  if [ -f "${SOURCE_DIR}/scripts/docs/${file}" ]; then
    cp "${SOURCE_DIR}/scripts/docs/${file}" "${PROJECT_ROOT}/scripts/docs/${file}"
    echo -e "${GREEN}   ✓ ${file}${NC}"
  else
    echo -e "${YELLOW}   ⚠ ${file} not found in source${NC}"
  fi
done

for file in index.ts ollama.ts gemini.ts claude.ts openai.ts; do
  if [ -f "${SOURCE_DIR}/scripts/docs/providers/${file}" ]; then
    cp "${SOURCE_DIR}/scripts/docs/providers/${file}" "${PROJECT_ROOT}/scripts/docs/providers/${file}"
    echo -e "${GREEN}   ✓ providers/${file}${NC}"
  else
    echo -e "${YELLOW}   ⚠ providers/${file} not found in source${NC}"
  fi
done

for file in generate.txt translate.txt; do
  if [ -f "${SOURCE_DIR}/scripts/docs/prompts/${file}" ]; then
    cp "${SOURCE_DIR}/scripts/docs/prompts/${file}" "${PROJECT_ROOT}/scripts/docs/prompts/${file}"
    echo -e "${GREEN}   ✓ prompts/${file}${NC}"
  else
    echo -e "${YELLOW}   ⚠ prompts/${file} not found in source${NC}"
  fi
done

echo ""
echo -e "${GREEN}✅ Sync complete${NC}"
echo ""
echo "📝 Next steps:"
echo "   git diff                    # Review changes"
echo "   git add -A && git commit    # Commit if satisfied"
