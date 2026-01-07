# Git Flow

## Branch Flow

```
feat/* --squash--> develop --merge--> release --merge--> main
          (Dev)     (Staging)    (Prod)
```

## Merge Strategy

| Source -> Target   | Type   | Command                |
| ------------------ | ------ | ---------------------- |
| feat -> develop    | Squash | `gh pr merge --squash` |
| develop -> release | Merge  | `gh pr merge --merge`  |
| release -> main    | Merge  | `gh pr merge --merge`  |

## Workflow

```bash
# Feature
git checkout -b feat/new-feature
git commit -m "feat(scope): description"
git push -u origin feat/new-feature
gh pr create --base develop
gh pr merge --squash --delete-branch

# Staging
gh pr create --base release --head develop
gh pr merge --merge

# Production
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
