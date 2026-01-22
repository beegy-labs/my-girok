# Development Methodology - Details

> Advanced concepts and roadmap details

## Ultimate Goal: Vibe Coding

Protect senior developers from:

| Threat                     | Protection                    |
| -------------------------- | ----------------------------- |
| Context switching          | Single-project focus sessions |
| Repetitive tasks           | Full LLM delegation           |
| Implementation constraints | High-level thinking only      |
| Unpredictable interrupts   | Self-resolving LLM agents     |

**Result**: Focus exclusively on direction, design, and creative problem-solving.

## Interaction Principles

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

When escalation is necessary:

| Requirement       | Description                     |
| ----------------- | ------------------------------- |
| Context Summary   | Concise problem description     |
| Attempts Made     | What self-resolution was tried  |
| Specific Question | Focused, actionable question    |
| Options           | Present choices with trade-offs |

**Response Types**: Update SDD (design), Update CDD (pattern), Direct guidance (one-time)

## Multi-LLM Consensus (Roadmap)

```yaml
status: '🗓️ Roadmap'
phase: 'Medium-term'

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

## Experience Distillation (Roadmap)

```yaml
status: '🗓️ Roadmap'
phase: 'Long-term'

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

## Long-Term Vision: Data as Asset

| Data Type      | Source                  | Value           |
| -------------- | ----------------------- | --------------- |
| Intent         | Human goal statements   | What we want    |
| Plans          | LLM-generated plans     | How we plan     |
| Modifications  | Architect's plan edits  | Tacit knowledge |
| Implementation | Final code              | How we build    |
| Resolutions    | Problem-solving records | How we fix      |

## Phased Approach

```yaml
phase_1_current:
  approach: 'External LLM + CDD/SDD/ADD framework'
  focus: 'Process optimization, data collection'

phase_2_medium:
  approach: 'RAG + Fine-tuned adapters'
  benefit: 'Domain-specialized responses'

phase_3_long:
  approach: 'Custom LLM ecosystem'
  benefit: 'Full independence, competitive advantage'
```

---

_Summary: `development-methodology.md`_
