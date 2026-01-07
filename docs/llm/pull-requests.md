# Pull Requests

## PR Title

Format: `<type>(<scope>): <subject>` (Conventional Commits)

Feature branches squash-merged -> PR title becomes commit message

Example: `fix(resume): correct preview scaling`

## PR Body

```markdown
## Summary

Brief explanation of what and why

## (Optional) Design Analysis

Before/after analysis, diagrams, code snippets

## Test plan

- [ ] Manual verification checklist
```

## Workflow

```bash
# Analyze existing PRs
gh pr list --state merged -L 5
gh pr view <ID> --json title,body

# Create PR
gh pr create --base develop --title "feat(scope): description" --body "..."
```
