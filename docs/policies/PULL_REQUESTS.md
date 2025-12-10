# Pull Request (PR) Guidelines

To maintain a clean, readable, and consistent git history, all pull requests should adhere to the following conventions.

## PR Title

The PR title is critical because it becomes the squashed commit message when merging into `develop`. It must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Format:**
```
<type>(<scope>): <subject>
```

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`.
- **scope**: The part of the codebase the changes affect (e.g., `resume`, `auth`, `ui`).
- **subject**: A concise, imperative-mood description of the change.

**Examples:**
- `fix(resume): correct preview scaling on mobile`
- `feat(auth): implement Google OAuth provider`
- `docs(git): update branching strategy diagram`

## PR Body

The PR body should provide context for the changes. A good PR body helps reviewers understand the "why" behind the changes and speeds up the review process.

**Structure:**

### Summary
A brief explanation of what the PR does and why the changes are necessary. If the PR addresses multiple points, list them out.

### (Optional) Design/Technical Analysis
For UI changes or complex refactors, it's helpful to include a brief analysis. This can include before/after screenshots, diagrams, or code snippets that illustrate the change.

### Test Plan
A checklist of manual verification steps the reviewer can take to confirm the changes are working as expected. This is especially important for UI and feature changes.

**Template:**
```markdown
## Summary

[Briefly explain the purpose of the PR and the changes made.]

## (Optional) Design Analysis

[Add any relevant diagrams, screenshots, or technical explanations.]

## Test plan

- [ ] [Verification step 1]
- [ ] [Verification step 2]
- [ ] [Test dark mode, mobile responsiveness, etc., if applicable]
```

By following these guidelines, we ensure that our project history is not only a log of changes but also a valuable, searchable documentation resource.
