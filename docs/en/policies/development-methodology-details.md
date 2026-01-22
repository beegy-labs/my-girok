# Development Methodology - Details

> Advanced concepts, future roadmap, and long-term vision

## Overview

This document expands on the development methodology with advanced concepts, future plans, and the long-term vision for LLM-assisted development.

## Ultimate Goal: Vibe Coding

The ultimate goal is to protect senior developers from productivity killers and enable them to focus exclusively on high-value creative work.

| Threat                     | Protection                    |
| -------------------------- | ----------------------------- |
| Context switching          | Single-project focus sessions |
| Repetitive tasks           | Full LLM delegation           |
| Implementation constraints | High-level thinking only      |
| Unpredictable interrupts   | Self-resolving LLM agents     |

**Result**: Developers focus exclusively on direction, design, and creative problem-solving.

## Interaction Principles

### Architect Actions

```yaml
architect_actions:
  - 'Set direction (what to build)'
  - 'Review and approve plans'
  - 'Code review final output'
  - 'Update policy (CDD) when patterns emerge'
  - 'Update design (SDD) when architecture changes'

architect_does_not:
  - 'Write implementation code'
  - 'Debug routine issues'
  - 'Handle repetitive tasks'

llm_actions:
  - 'Generate detailed plans from intent'
  - 'Implement approved plans'
  - 'Self-resolve problems (consensus)'
  - 'Request help only on consensus failure'
```

## ADD: Human Intervention Protocol

When escalation to the architect is necessary, the LLM must provide:

| Requirement       | Description                     |
| ----------------- | ------------------------------- |
| Context Summary   | Concise problem description     |
| Attempts Made     | What self-resolution was tried  |
| Specific Question | Focused, actionable question    |
| Options           | Present choices with trade-offs |

### Response Types

The architect responds with one of:

- **Update SDD**: Design change needed
- **Update CDD**: New pattern to document
- **Direct guidance**: One-time instruction

## Multi-LLM Consensus (Roadmap)

**Status**: 🗓️ Roadmap | **Phase**: Medium-term

When the primary LLM encounters uncertainty, it can summon peer LLMs for verification:

```yaml
process:
  1: 'Problem occurs during implementation'
  2: 'Summon peer LLMs for verification'
  3: 'Each LLM independently evaluates'
  4: 'Consensus reached → proceed'
  5: 'Consensus failed → escalate to Architect'

validation_requirement:
  - 'Consensus alone is insufficient'
  - 'Must include execution-based verification'
  - 'Tests, linting, compilation required'
```

### Why Consensus Isn't Enough

Multiple LLMs agreeing on a solution doesn't guarantee correctness. The consensus must be validated through:

- Running tests
- Lint checks
- Type checking
- Compilation
- Integration tests

## Experience Distillation (Roadmap)

**Status**: 🗓️ Roadmap | **Phase**: Long-term

The system learns from experience by distilling patterns:

```yaml
process:
  1_record: 'All trial-and-error, resolutions, escalations'
  2_analyze: 'Identify patterns worth preserving'
  3_distill: 'Extract abstracted principles → CDD candidates'
  4_apply: 'Update CDD (Tier 1, 2) with Architect approval'

benefit:
  - 'System learns from experience'
  - 'Prevents repeated mistakes'
  - 'Keeps active context lean'
```

### Distillation Criteria

Patterns become CDD candidates when they:

- Occur more than 3 times
- Affect multiple services
- Have clear resolution patterns
- Would benefit future development

## Long-Term Vision: Data as Asset

Every interaction produces valuable data:

| Data Type      | Source                  | Value           |
| -------------- | ----------------------- | --------------- |
| Intent         | Human goal statements   | What we want    |
| Plans          | LLM-generated plans     | How we plan     |
| Modifications  | Architect's plan edits  | Tacit knowledge |
| Implementation | Final code              | How we build    |
| Resolutions    | Problem-solving records | How we fix      |

This data enables:

- Training domain-specific models
- Building institutional knowledge
- Automating common patterns
- Reducing onboarding time

## Phased Approach

### Phase 1: Current

```yaml
approach: 'External LLM + CDD/SDD/ADD framework'
focus: 'Process optimization, data collection'
benefit: 'Immediate productivity gains'
```

### Phase 2: Medium-term

```yaml
approach: 'RAG + Fine-tuned adapters'
focus: 'Domain-specialized responses'
benefit: 'Better context understanding'
```

### Phase 3: Long-term

```yaml
approach: 'Custom LLM ecosystem'
focus: 'Full independence from external LLMs'
benefit: 'Competitive advantage, IP protection'
```

## Success Metrics

| Metric                      | Current | Target |
| --------------------------- | ------- | ------ |
| Architect projects/person   | 1-2     | 3-5    |
| Code review time per PR     | 30min   | 15min  |
| Self-resolved issues        | 60%     | 90%    |
| Pattern capture rate        | Manual  | Auto   |
| Time to productive new hire | 2 weeks | 3 days |

## Related Documentation

- Main Summary: `docs/en/policies/development-methodology.md`
- CDD Policy: `docs/en/policies/cdd.md`
- SDD Policy: `docs/en/policies/sdd.md`

---

_This document is auto-generated from `docs/llm/policies/development-methodology-details.md`_
