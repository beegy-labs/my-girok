# CDD (Context-Driven Development) Policy

> Context management system for LLM | **Last Updated**: 2026-01-22

## Definition

CDD is a **Constitution of Knowledge** - SSOT defining all rules and patterns for consistent, high-quality LLM output.

## CDD vs SDD

| Aspect     | CDD                     | SDD                       |
| ---------- | ----------------------- | ------------------------- |
| Focus      | How (context, patterns) | What (task, spec)         |
| Location   | `.ai/`, `docs/llm/`     | `.specs/`                 |
| History    | Git (document changes)  | Files → DB (task records) |
| Human Role | None                    | Direction, Approval       |

## 4-Tier Structure

```
.ai/        → docs/llm/     → docs/en/    → docs/kr/
(Pointer)     (SSOT)          (Generated)   (Translated)
```

| Tier | Path        | Purpose        | Audience | Editable | Format                    |
| ---- | ----------- | -------------- | -------- | -------- | ------------------------- |
| 1    | `.ai/`      | Indicators     | LLM      | **Yes**  | Tables, links, ≤50 lines  |
| 2    | `docs/llm/` | Full specs     | LLM      | **Yes**  | YAML, tables, code blocks |
| 3    | `docs/en/`  | Human-readable | Human    | Auto-gen | Prose, examples, guides   |
| 4    | `docs/kr/`  | Translation    | Human    | Auto-gen | Same as docs/en/          |

## Tier Purpose Details

**Tier 1, 2 (LLM-facing)**:

- Core technical reference
- Token-efficient, high-density
- Always up-to-date with current patterns

**Tier 3, 4 (Human-facing)**:

- External memory for context switching
- Reduce cognitive load of "deep context"
- Onboarding material for new members

### Tier 3/4 Generation Rules

When generating human-readable docs (Tier 3/4) from Tier 2:

| Tier 2 Pattern              | Tier 3 Output   | Rationale                      |
| --------------------------- | --------------- | ------------------------------ |
| `foo.md` + `foo-impl.md`    | Single `foo.md` | Humans prefer complete context |
| `foo.md` + `foo-testing.md` | Single `foo.md` | No token limits for humans     |
| Split companion files       | Merge into main | Readability over retrieval     |

**Why merge?**

- Tier 2 splits optimize for LLM token limits and RAG retrieval
- Humans read sequentially; fragmented docs hurt comprehension
- `docs:generate` script handles merge automatically

## Scope

| CDD Contains                     | CDD Does NOT Contain         |
| -------------------------------- | ---------------------------- |
| Service/package structure        | Current task details (→ SDD) |
| API patterns, rules              | Roadmap, progress (→ SDD)    |
| Coding conventions               | Task history (→ SDD)         |
| Policies (security, testing, DB) |                              |

## Directory Structure

```
my-girok/
├── CLAUDE.md           # Claude entry point
├── GEMINI.md           # Gemini entry point
├── .ai/                # Tier 1 - EDITABLE (LLM pointers)
│   ├── README.md       # Navigation hub
│   ├── rules.md        # Core DO/DON'T
│   ├── services/       # Service indicators
│   ├── packages/       # Package indicators
│   └── apps/           # App indicators
├── docs/
│   ├── llm/            # Tier 2 - EDITABLE (SSOT)
│   │   ├── policies/   # Policy definitions
│   │   ├── services/   # Service full specs
│   │   ├── guides/     # Development guides
│   │   └── packages/   # Package documentation
│   ├── en/             # Tier 3 - NOT EDITABLE (Generated)
│   └── kr/             # Tier 4 - NOT EDITABLE (Translated)
```

## Edit Rules

| DO                              | DO NOT                   |
| ------------------------------- | ------------------------ |
| Edit `.ai/` directly            | Edit `docs/en/` directly |
| Edit `docs/llm/` directly       | Edit `docs/kr/` directly |
| Run generate after llm/ changes | Skip generation step     |
| Run translate after en/ changes | Skip translation step    |

## History Management

**CDD History = Git**

| Item                      | Method                 |
| ------------------------- | ---------------------- |
| Document changes          | `git log`, `git blame` |
| Version tracking          | Git commits            |
| No separate history files | Use Git                |

**Note**: Task history is managed by SDD (`.specs/history/`), not CDD.

## CLI Commands

### docs:generate (docs/llm → docs/en)

```bash
pnpm docs:generate                    # Generate all (incremental)
pnpm docs:generate --force            # Regenerate all files
pnpm docs:generate --file <path>      # Generate specific file
pnpm docs:generate --retry-failed     # Retry only failed files
pnpm docs:generate --clean            # Clear history + generate all
pnpm docs:generate --provider gemini  # Use Gemini provider
```

| Option           | Description                                  |
| ---------------- | -------------------------------------------- |
| `--provider, -p` | LLM provider: ollama (default), gemini       |
| `--model, -m`    | Specific model name                          |
| `--file, -f`     | Generate single file (relative to docs/llm/) |
| `--force`        | Regenerate even if up-to-date                |
| `--retry-failed` | Process only previously failed files         |
| `--clean`        | Clear failed history and restart all         |

### docs:translate (docs/en → docs/kr)

```bash
pnpm docs:translate --locale kr             # Translate all
pnpm docs:translate --locale kr --file <p>  # Translate specific file
pnpm docs:translate --locale kr --retry-failed  # Retry failed only
pnpm docs:translate --locale kr --clean     # Clear history + translate all
pnpm docs:translate --provider gemini       # Use Gemini provider
```

| Option           | Description                                     |
| ---------------- | ----------------------------------------------- |
| `--locale, -l`   | Target locale: kr (default), ja, zh, es, fr, de |
| `--provider, -p` | LLM provider: ollama (default), gemini          |
| `--model, -m`    | Specific model name                             |
| `--file, -f`     | Translate single file (relative to docs/en/)    |
| `--retry-failed` | Process only previously failed files            |
| `--clean`        | Clear failed history and restart all            |

## Supported Providers

| Provider | Generate | Translate | Default Model |
| -------- | -------- | --------- | ------------- |
| Ollama   | ✓        | ✓         | gpt-oss:20b   |
| Gemini   | ✓        | ✓         | gemini-pro    |

## Failed Files Recovery

Scripts track failed files for retry:

| Script    | Failed Files Location         |
| --------- | ----------------------------- |
| generate  | `.docs-generate-failed.json`  |
| translate | `.docs-translate-failed.json` |

### Recovery Workflow

```bash
# 1. First run - some files fail
pnpm docs:translate --locale kr
# Output: Success: 45, Failed: 5

# 2. Retry only failed files
pnpm docs:translate --locale kr --retry-failed
# Output: Retrying 5 failed files...

# 3. Or restart everything
pnpm docs:translate --locale kr --clean
# Output: 🧹 Cleared failed files history
```

## Line Limits (RAG Optimized)

Based on 128k context window optimization and RAG best practices.

### Tier 1 (.ai/)

```yaml
max_lines: 50
tokens: ~500
purpose: Quick navigation, pointers to Tier 2
```

### Tier 2 (docs/llm/) - By Document Type

| Path              | Max Lines | Tokens | Rationale                     |
| ----------------- | --------- | ------ | ----------------------------- |
| `*.md` (root)     | 200       | ~2,000 | Core reference documents      |
| `policies/`       | 200       | ~2,000 | Core rules, frequently loaded |
| `services/`       | 200       | ~2,000 | Per-service SSOT              |
| `guides/`         | 150       | ~1,500 | Focused how-to, splittable    |
| `apps/`           | 150       | ~1,500 | Per-app specification         |
| `packages/`       | 150       | ~1,500 | Package documentation         |
| `components/`     | 100       | ~1,000 | Single component spec         |
| `templates/`      | 100       | ~1,000 | Small templates               |
| `features/`       | 100       | ~1,000 | Feature specifications        |
| `infrastructure/` | 150       | ~1,500 | Infra documentation           |
| `references/`     | 300       | ~3,000 | External knowledge, complete  |

### Tolerance (Minor Over-Limit)

Files exceeding limit by **1-10 lines** are acceptable:

- Splitting would cause excessive fragmentation
- No significant RAG retrieval impact
- Review during major updates

### Exceptions (Framework Documents)

These documents define the methodology itself and are exempt from line limits:

| File                                  | Reason                                   |
| ------------------------------------- | ---------------------------------------- |
| `policies/cdd.md`                     | CDD framework definition (this document) |
| `policies/sdd.md`                     | SDD framework definition with templates  |
| `policies/development-methodology.md` | Core methodology (loads cdd.md, sdd.md)  |

**Criteria for exception:**

- Document defines the framework/methodology itself
- Requires full context to understand (splitting breaks comprehension)
- Loaded infrequently (onboarding, planning sessions only)

### Split Guidelines

**Minimum sizes after split:**

| Document Type | Main File | Companion File | Total Before Split |
| ------------- | --------- | -------------- | ------------------ |
| policies/     | ≥120      | ≥60            | >200               |
| services/     | ≥120      | ≥60            | >200               |
| guides/       | ≥90       | ≥50            | >150               |
| apps/         | ≥90       | ≥50            | >150               |
| packages/     | ≥90       | ≥50            | >150               |
| components/   | ≥60       | ≥40            | >100               |

**Split decision criteria:**

| Condition                      | Action                   |
| ------------------------------ | ------------------------ |
| Over limit by 1-10 lines       | Keep as-is (tolerance)   |
| Over limit by 11-30 lines      | Evaluate semantic split  |
| Over limit by >30 lines        | Split required           |
| Companion would be <50 lines   | Keep as-is (fragmented)  |
| Clear semantic boundary exists | Split (impl/testing/ops) |
| Independent lookup value       | Split (enums, tables)    |

**Split naming conventions:**

| Content Type   | Suffix Example              |
| -------------- | --------------------------- |
| Implementation | `-impl.md`                  |
| Testing        | `-testing.md`               |
| Operations     | `-operations.md`, `-ops.md` |
| Advanced       | `-advanced.md`              |
| Patterns       | `-patterns.md`              |
| Security       | `-security.md`              |
| Architecture   | `-arch.md`                  |

### Context Budget (128k)

```
128k context allocation:
├── System prompt:     ~5k tokens
├── Conversation:     ~20k tokens
├── Code context:     ~30k tokens
└── Documents:        ~70k tokens (35 × 2,000 avg)
```

### Format Rules

| Tier | Format                     | Optimization      |
| ---- | -------------------------- | ----------------- |
| 1    | Tables, links only         | Minimal tokens    |
| 2    | YAML, tables, code blocks  | Token efficiency  |
| 3    | Prose, examples (auto-gen) | Human readability |

### Language Policy

**All CDD documents MUST be written in English.**

- Code: English
- Documentation: English
- Comments: English
- Commits: English

## Update Requirements

| Change Type        | .ai/               | docs/llm/      |
| ------------------ | ------------------ | -------------- |
| New component/hook | apps/ or packages/ | -              |
| New API endpoint   | services/          | services/      |
| New pattern        | rules.md           | -              |
| Major feature      | relevant file      | guides/        |
| New policy         | rules.md summary   | policies/ full |

## AI Entry Points

| AI     | Entry File | First Read   |
| ------ | ---------- | ------------ |
| Claude | CLAUDE.md  | .ai/rules.md |
| Gemini | GEMINI.md  | .ai/rules.md |

## Workflow Example

```bash
# 1. Developer updates SSOT
vim docs/llm/services/auth-service.md

# 2. Generate English docs
pnpm docs:generate

# 3. Translate to Korean
pnpm docs:translate --locale kr

# 4. Commit all changes
git add docs/
git commit -m "docs: update auth-service documentation"
```

## Best Practices

| Practice              | Description                        |
| --------------------- | ---------------------------------- |
| Tier 1 = Pointer only | Never put full specs in .ai/       |
| Tier 2 = SSOT         | Single source of truth for LLM     |
| Git = History         | No separate changelog files in CDD |
| Token efficiency      | Tables > prose, YAML > JSON        |
| Cross-reference       | .ai/ always links to docs/llm/     |

## References

- Methodology: `docs/llm/policies/development-methodology.md`
- SDD Policy: `docs/llm/policies/sdd.md`
