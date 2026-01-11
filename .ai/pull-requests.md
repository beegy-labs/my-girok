# AI Guide: Pull Requests

> Pull request conventions for AI assistants | **Last Updated**: 2026-01-06

This document outlines the conventions for creating Pull Requests (PRs) for AI assistants.

## PR Title

- **Format**: Must follow Conventional Commits: `<type>(<scope>): <subject>`.
- **Merge Strategy**: Feature branches (`feat/*`, `fix/*`) are **squash-merged** into `develop`. The PR title becomes the squashed commit message.
- **Example**: `fix(resume): correct preview scaling`

## PR Body

- **Structure**: Always use the following Markdown structure.
- **`## Summary`**: Briefly explain the "what" and "why" of the changes.
- **`## (Optional) Design Analysis`**: For UI or complex changes, include before/after analysis, diagrams, or code snippets.
- **`## Test plan`**: Provide a checklist for manual verification. This is crucial for reviewers.

## Workflow

1.  **Analyze Existing PRs**:
    - Use `gh pr list --state merged -L 5` to view recently merged PRs.
    - Use `gh pr view <ID> --json title,body` to inspect the title and body of a specific PR for style and formatting.

2.  **Create the PR**:
    - Construct your PR title and body to match the project's conventions discovered in the previous step.
    - Use the `gh pr create` command to create the pull request.

**SSOT**: `docs/llm/pull-requests.md`
