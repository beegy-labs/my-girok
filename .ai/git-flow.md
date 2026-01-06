# Git Flow Quick Reference

> GitFlow branching strategy | **Last Updated**: 2026-01-06

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
git push -u origin feat/new-feature
gh pr create --base develop
gh pr merge --squash --delete-branch
```

## Promote to Staging

```bash
gh pr create --base release --head develop
gh pr merge --merge
```

## Release to Production

```bash
gh pr create --base main --head release
gh pr merge --merge
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

## Commit Format

```
<type>(<scope>): <subject>
```

Types: feat, fix, refactor, docs, test, chore

---

**Full guide**: `docs/policies/GIT_WORKFLOW.md`
