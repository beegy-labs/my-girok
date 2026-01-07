# Documentation Architecture (2026)

> SSOT documentation strategy with 4-tier structure

## 4-Tier Structure

```
.ai/        → docs/llm/     → docs/en/    → docs/kr/
(Pointer)     (SSOT)          (Generated)   (Translated)
```

| Tier | Path        | Type       | Editable | Format                      |
| ---- | ----------- | ---------- | -------- | --------------------------- |
| 1    | `.ai/`      | Pointer    | **Yes**  | Tables, links, max 50 lines |
| 2    | `docs/llm/` | **SSOT**   | **Yes**  | YAML, tables, code blocks   |
| 3    | `docs/en/`  | Generated  | **No**   | Prose, examples, guides     |
| 4    | `docs/kr/`  | Translated | **No**   | Same as docs/en/            |

## Edit Rules

| DO                              | DO NOT                   |
| ------------------------------- | ------------------------ |
| Edit `.ai/` directly            | Edit `docs/en/` directly |
| Edit `docs/llm/` directly       | Edit `docs/kr/` directly |
| Run generate after llm/ changes | Skip generation step     |
| Run translate after en/ changes | Skip translation step    |

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

## Supported Providers

| Provider | Generate | Translate | Default Model |
| -------- | -------- | --------- | ------------- |
| Ollama   | ✓        | ✓         | gpt-oss:20b   |
| Gemini   | ✓        | ✓         | gemini-pro    |

## Format Guidelines

### .ai/ (Pointer)

```yaml
max_lines: 50
content: [tables, links]
exclude: [prose, examples]
purpose: quick navigation for LLM
```

### docs/llm/ (SSOT)

```yaml
optimization: token_efficiency
human_readable: false
format: [yaml, tables, code_blocks]
prose: minimal (only when necessary)
```

### docs/en/ (Generated)

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

### Basic Workflow

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

### With Error Recovery

```bash
# 1. Generate - some files may fail
pnpm docs:generate
# Output: Success: 40, Failed: 2

# 2. Retry failed files
pnpm docs:generate --retry-failed
# Output: Success: 2, Failed: 0

# 3. Translate - some files may fail
pnpm docs:translate --locale kr
# Output: Success: 38, Failed: 4

# 4. Retry failed translations
pnpm docs:translate --locale kr --retry-failed
# Output: Success: 4, Failed: 0

# 5. If still failing, restart clean
pnpm docs:translate --locale kr --clean
```

## Directory Structure

```
my-girok/
├── CLAUDE.md           # Claude entry point
├── GEMINI.md           # Gemini entry point
├── .ai/                # EDITABLE - LLM pointers
├── docs/
│   ├── llm/            # EDITABLE - SSOT
│   ├── en/             # NOT EDITABLE - Generated
│   └── kr/             # NOT EDITABLE - Translated
```
