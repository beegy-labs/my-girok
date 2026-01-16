# Resume Management

> Quick reference for resume feature | **Last Updated**: 2026-01-11

## Data Structure

```
Resume
├── Basic Info (name, email, phone, birthDate, gender)
├── Korean Fields (militaryService, coverLetter, applicationReason)
├── Key Achievements (keyAchievements: string[])
└── Dynamic Sections (Skills, Experience, Education, Certificates)
```

## API Endpoints

| Method | Path                            | Purpose           |
| ------ | ------------------------------- | ----------------- |
| CRUD   | `/v1/resume/*`                  | Basic operations  |
| PATCH  | `/v1/resume/:id/sections/order` | Reorder sections  |
| GET    | `/v1/resume/public/:username`   | Public resume     |
| POST   | `/v1/share/resume/:id`          | Create share link |

## Key Patterns

```typescript
// ❌ DON'T - corrupts nested JSON
await tx.skill.createMany({ data: skills });

// ✅ DO - properly serializes JSON
for (const skill of skills) {
  await tx.skill.create({ data: skill });
}
```

## File Locations

| Purpose   | Path                                                     |
| --------- | -------------------------------------------------------- |
| Schema    | `services/personal-service/prisma/schema.prisma`         |
| API Types | `apps/web-girok/src/api/resume.ts`                       |
| Service   | `services/personal-service/src/resume/resume.service.ts` |
| UI        | `apps/web-girok/src/components/resume/`                  |

**SSOT**: `docs/llm/resume.md`
