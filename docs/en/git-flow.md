# Git Flow

> GitFlow branching strategy with squash merges for features and regular merges for releases

## Branch Flow

The project follows a standard GitFlow branching model with three main environments:

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

**Rationale**:

- **Squash for features**: Combines all feature commits into a single clean commit, keeping develop history readable
- **Merge for releases**: Preserves complete history from develop, making it easier to track changes in production

## Workflow Examples

### Feature Development

```bash
# Feature
git checkout -b feat/new-feature
git commit -m "feat(scope): description"
git push -u origin feat/new-feature
gh pr create --base develop
gh pr merge --squash --delete-branch
```

### Staging Deployment

```bash
# Staging
gh pr create --base release --head develop
gh pr merge --merge
```

### Production Deployment

```bash
# Production
gh pr create --base main --head release
gh pr merge --merge
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

## Commit Format

All commits should follow the Conventional Commits specification:

```
<type>(<scope>): <subject>
```

**Available Types**:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring without functionality change
- `docs`: Documentation changes
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

**Examples**:

- `feat(auth): add OAuth2 login support`
- `fix(resume): correct preview scaling issue`
- `docs(readme): update installation instructions`

---

**LLM Reference**: `docs/llm/git-flow.md`
