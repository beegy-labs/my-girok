# AI Documentation Changelog

All notable changes to the `.ai/` documentation are recorded here.

Format: `[YYYY-MM-DD] category: description`

Categories: `added`, `changed`, `removed`, `fixed`, `consolidated`

---

## 2026-01-09

- **added**: `docs/test-coverage.md` - Test coverage status tracking document
- **changed**: `services/auth-bff.md` - Updated with Phase 6 test completion
- **added**: Integration tests (61) for auth-bff gRPC communication
- **added**: E2E tests (87) for authentication flows (Playwright)
- **added**: Security tests (38) based on OWASP Top 10
- **milestone**: Enterprise Auth System Epic (#496) completed - All 6 phases done

## 2026-01-06

- **added**: `manifest.yaml` - Machine-readable document contract for LLM agents
- **added**: `CHANGELOG.md` - Version tracking for AI documentation
- **changed**: All docs - Added `last_updated` metadata headers
- **changed**: All docs - Standardized `Full guide` links to `docs/`
- **consolidated**: `docs/policies/LLM_GUIDELINES.md` → `rules.md` (SSOT violation fix)
- **changed**: `GEMINI.md` - Enhanced to match CLAUDE.md with Task-based Navigation

## 2026-01-05

- **changed**: `rules.md` - Added Resources section (fonts, external resources)
- **changed**: `packages/design-tokens.md` - Added self-hosted fonts documentation

## 2026-01-04

- **changed**: `README.md` - Added Documentation Policy and Writing Guidelines
- **changed**: `services/*.md` - Standardized to new service template format
- **added**: `templates/service.md` - Service document template
- **changed**: `best-practices.md` - Updated 2026 monthly checklist
- **changed**: `caching.md` - Simplified to quick reference format
- **changed**: `database.md` - Simplified to commands only
- **changed**: `testing.md` - Simplified to TDD patterns
- **changed**: `ci-cd.md` - Simplified to GitHub Actions quick ref

## 2026-01-02

- **changed**: `architecture.md` - Updated 2025 hybrid architecture
- **changed**: `packages/nest-common.md` - Updated utility documentation
- **changed**: `packages/types.md` - Updated type definitions

## 2026-01-01

- **changed**: `ssot.md` - Refined SSOT hierarchy documentation

## 2025-12-30

- **changed**: `otel.md` - Updated OpenTelemetry configuration
- **changed**: `apps/web-admin.md` - Updated admin dashboard guide

## 2025-12-26

- **changed**: `resume.md` - Updated resume feature documentation

## 2025-12-25

- **changed**: `apps/web-main.md` - Updated React 19 web app guide

## 2025-12-24

- **changed**: `i18n-locale.md` - Updated internationalization docs
- **changed**: `user-preferences.md` - Updated preferences API
- **changed**: `apps/storybook.md` - Updated Storybook configuration
- **changed**: `packages/ui-components.md` - Updated component docs

## 2025-12-12

- **changed**: `project-setup.md` - Updated project setup guide

## 2025-12-10

- **changed**: `pull-requests.md` - Updated PR guidelines

## 2025-11-29

- **added**: `GEMINI.md` - Initial Gemini entry point

## 2025-11-06

- **changed**: `docker-deployment.md` - Updated Docker Compose reference

---

> **Note**: For detailed git history, use:
>
> ```bash
> git log --oneline -- ".ai/"
> ```
