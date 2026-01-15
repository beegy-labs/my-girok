# Pull Requests

> Conventional Commits format for PR titles with structured body templates

## PR Title Format

Pull request titles follow the Conventional Commits specification:

```
<type>(<scope>): <subject>
```

Since feature branches are squash-merged, the PR title becomes the commit message in the develop branch. This makes it crucial to write clear, descriptive PR titles.

**Example**: `fix(resume): correct preview scaling`

## PR Body Template

```markdown
## Summary

Brief explanation of what and why

## (Optional) Design Analysis

Before/after analysis, diagrams, code snippets

## Test plan

- [ ] Manual verification checklist
```

### Section Guidelines

- **Summary**: Explain what changes were made and why they were necessary. Focus on the business value or problem being solved.
- **Design Analysis**: Include when making architectural decisions, showing alternatives considered and reasoning.
- **Test plan**: List specific steps for reviewers to verify the changes work correctly.

## Workflow

### Analyzing Existing PRs

Before creating a PR, review recent merged PRs to match the team's style:

```bash
# Analyze existing PRs
gh pr list --state merged -L 5
gh pr view <ID> --json title,body
```

### Creating a PR

```bash
# Create PR
gh pr create --base develop --title "feat(scope): description" --body "..."
```

## Best Practices

- Write the PR title as if it will be the only record of this change (because it will be after squash merge)
- Keep summaries concise but informative
- Include screenshots for UI changes
- Link related issues using GitHub keywords (`Fixes #123`, `Closes #456`)
- Request reviews from appropriate team members

---

**LLM Reference**: `docs/llm/pull-requests.md`
