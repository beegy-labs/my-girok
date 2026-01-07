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

## Generation Commands

```bash
pnpm docs:generate                    # docs/llm → docs/en
pnpm docs:translate --locale kr       # docs/en → docs/kr
pnpm docs:translate --provider gemini # specific provider
```

## Supported Providers

| Task                | Providers              |
| ------------------- | ---------------------- |
| Generate (llm → en) | Gemini, Claude, OpenAI |
| Translate (en → kr) | Ollama, Gemini         |

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
