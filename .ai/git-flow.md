# Git Flow

> GitFlow branching strategy | **Last Updated**: 2026-01-11

## Branch Flow

```
feat/* ──squash──▶ develop ──merge──▶ release ──merge──▶ main
                    (Dev)    (Staging)   (Prod)
```

## Merge Strategy

| Source → Target   | Type   | Command                |
| ----------------- | ------ | ---------------------- |
| feat → develop    | Squash | `gh pr merge --squash` |
| develop → release | Merge  | `gh pr merge --merge`  |
| release → main    | Merge  | `gh pr merge --merge`  |

## Feature Workflow

```bash
git checkout -b feat/new-feature
git commit -m "feat(scope): description"
gh pr create --base develop
gh pr merge --squash --delete-branch
```

## Commit Format

```
<type>(<scope>): <subject>
```

Types: feat, fix, refactor, docs, test, chore

**SSOT**: `docs/llm/git-flow.md`
