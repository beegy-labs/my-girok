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

| Tier | Path        | Purpose                 | Audience | Editable | Format                      |
| ---- | ----------- | ----------------------- | -------- | -------- | --------------------------- |
| 1    | `.ai/`      | Indicators (≤50 lines)  | LLM      | **Yes**  | Tables, links, max 50 lines |
| 2    | `docs/llm/` | Full specs (≤300 lines) | LLM      | **Yes**  | YAML, tables, code blocks   |
| 3    | `docs/en/`  | Human-readable          | Human    | Auto-gen | Prose, examples, guides     |
| 4    | `docs/kr/`  | Translation             | Human    | Auto-gen | Same as docs/en/            |

## Tier Purpose Details

**Tier 1, 2 (LLM-facing)**:

- Core technical reference
- Token-efficient, high-density
- Always up-to-date with current patterns

**Tier 3, 4 (Human-facing)**:

- External memory for context switching
- Reduce cognitive load of "deep context"
- Onboarding material for new members

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

## Format Guidelines

### .ai/ (Tier 1 - Pointer)

```yaml
max_lines: 50
content: [tables, links]
exclude: [prose, examples]
purpose: quick navigation for LLM
```

### docs/llm/ (Tier 2 - SSOT)

```yaml
max_lines: 300
optimization: token_efficiency
human_readable: false
format: [yaml, tables, code_blocks]
prose: minimal (only when necessary)
```

### docs/en/ (Tier 3 - Generated)

```yaml
optimization: human_readable
source: docs/llm/
editable: false
format: [prose, examples, guides]
```

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
