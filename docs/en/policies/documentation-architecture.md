# Documentation Architecture

> Single Source of Truth (SSOT) documentation strategy with 4-tier structure for LLM optimization

## Overview

The my-girok project uses a 4-tier documentation architecture designed to optimize both human readability and AI assistant token efficiency.

## 4-Tier Documentation Structure

```
.ai/        → docs/llm/     → docs/en/    → docs/kr/
(Pointer)     (SSOT)          (Generated)   (Translated)
```

### Tier Breakdown

| Tier | Path        | Type       | Editable | Format             | Purpose              |
| ---- | ----------- | ---------- | -------- | ------------------ | -------------------- |
| 1    | `.ai/`      | Pointer    | **Yes**  | Tables, links      | Quick LLM navigation |
| 2    | `docs/llm/` | **SSOT**   | **Yes**  | YAML, tables, code | Source of truth      |
| 3    | `docs/en/`  | Generated  | **No**   | Prose, examples    | Human-readable docs  |
| 4    | `docs/kr/`  | Translated | **No**   | Same as en/        | Korean localization  |

## Edit Rules

### What You CAN Edit

- `.ai/` - Direct editing allowed for quick pointers and navigation
- `docs/llm/` - Direct editing allowed (this is the SSOT)

### What You CANNOT Edit

- `docs/en/` - Auto-generated from docs/llm
- `docs/kr/` - Auto-translated from docs/en

### Why This Matters

Editing `docs/en/` or `docs/kr/` directly will result in:

1. Changes being overwritten on next generation
2. Inconsistency between SSOT and generated docs
3. Translation drift between languages

## Generation Workflow

### Step 1: Edit the SSOT

```bash
# Edit the LLM-optimized source
vim docs/llm/services/auth-service.md
```

### Step 2: Generate English Docs

```bash
pnpm docs:generate
# Transforms: docs/llm/ → docs/en/
```

### Step 3: Translate to Korean

```bash
pnpm docs:translate --locale kr
# Transforms: docs/en/ → docs/kr/
```

### Step 4: Commit All Changes

```bash
git add docs/
git commit -m "docs: update auth-service documentation"
```

## Supported Providers

| Task      | Input     | Output   | Supported Providers    |
| --------- | --------- | -------- | ---------------------- |
| Generate  | docs/llm/ | docs/en/ | Gemini, Claude, OpenAI |
| Translate | docs/en/  | docs/kr/ | Ollama, Gemini         |

### Provider Selection

```bash
# Use default provider
pnpm docs:generate

# Use specific provider for translation
pnpm docs:translate --provider gemini
```

## Format Guidelines

### .ai/ Directory (Pointer Docs)

```yaml
max_lines: 50
allowed_content:
  - markdown tables
  - links to other docs
not_allowed:
  - long prose
  - detailed examples
  - code blocks over 10 lines
purpose: Quick navigation for LLM assistants
```

### docs/llm/ Directory (SSOT)

```yaml
optimization: token_efficiency
human_readable: false
allowed_content:
  - YAML blocks
  - markdown tables
  - code blocks
  - bullet lists
prose: minimal (only when absolutely necessary)
```

### docs/en/ Directory (Generated)

```yaml
optimization: human_readable
source: docs/llm/
editable: false
allowed_content:
  - explanatory prose
  - detailed examples
  - step-by-step guides
  - full code samples
```

## Update Requirements

When making changes, update the appropriate tier:

| Change Type            | .ai/ Update            | docs/llm/ Update     |
| ---------------------- | ---------------------- | -------------------- |
| New component/hook     | `apps/` or `packages/` | -                    |
| New API endpoint       | `services/`            | `services/`          |
| New pattern/convention | `rules.md`             | -                    |
| Major feature          | relevant file          | `guides/`            |
| New policy             | `rules.md` summary     | `policies/` full doc |

## AI Assistant Entry Points

| AI Assistant | Entry File  | First File to Read |
| ------------ | ----------- | ------------------ |
| Claude       | `CLAUDE.md` | `.ai/rules.md`     |
| Gemini       | `GEMINI.md` | `.ai/rules.md`     |

Both entry files contain the complete documentation policy to ensure AI assistants understand the 4-tier structure.

## Directory Structure

```
my-girok/
├── CLAUDE.md           # Claude AI entry point
├── GEMINI.md           # Gemini AI entry point
│
├── .ai/                # EDITABLE - LLM pointers (max 50 lines each)
│   ├── README.md       # Navigation guide
│   ├── rules.md        # Core rules
│   ├── services/       # Service pointers
│   ├── packages/       # Package pointers
│   └── apps/           # App pointers
│
├── docs/
│   ├── llm/            # EDITABLE - SSOT (token-optimized)
│   │   ├── policies/   # Policy definitions
│   │   ├── services/   # Service documentation
│   │   ├── guides/     # Technical guides
│   │   └── packages/   # Package documentation
│   │
│   ├── en/             # NOT EDITABLE - Generated (human-readable)
│   │   ├── policies/   # Detailed policies
│   │   ├── services/   # Service docs
│   │   ├── guides/     # Tutorials
│   │   └── packages/   # Package docs
│   │
│   └── kr/             # NOT EDITABLE - Translated
```

## Best Practices

1. **Always edit SSOT first**: Make changes in `docs/llm/` before regenerating
2. **Run generation after changes**: Never skip the generation step
3. **Keep .ai/ concise**: Maximum 50 lines per file
4. **Use tables in LLM docs**: Tables are token-efficient
5. **Minimal prose in SSOT**: Save detailed explanations for generated docs

---

**LLM Reference**: `docs/llm/policies/documentation-architecture.md`
