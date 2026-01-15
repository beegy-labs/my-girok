# Centralized Error Handling Migration Status

> Tracking progress of migrating service pages to useApiError and useApiMutation hooks

## Overview

This document tracks the migration of 12 service-related pages from manual error handling to the centralized `useApiError` and `useApiMutation` hooks. The migration provides consistent error handling, automatic retry logic, and improved user feedback through toast notifications.

## Current Progress: 4 of 12 Complete (33%)

## Completed Migrations

### 1. ServiceDetailPage.tsx

**Status:** Complete

The migration involved adding the `useApiError` hook import, removing manual error state management and logger imports, replacing try-catch blocks with `executeWithErrorHandling`, and updating error displays to use `errorMessage` instead of the raw error string.

Approximately 15 lines of boilerplate code were removed.

### 2. ServiceConsentsPage.tsx

**Status:** Complete

This migration was more extensive, requiring both `useApiError` and `useApiMutation` hooks. The changes included removing manual error and saving states, creating three mutations for create, update, and delete operations, adding success toasts to all mutations, removing all try-catch blocks, and updating error handling to use `errorMessage` and `clearError`.

Approximately 40 lines of boilerplate code were removed.

### 3. ServiceAnalyticsTab.tsx

**Status:** Complete

The migration added the `useApiError` hook, removed manual error state and logger imports, replaced try-catch blocks in `fetchMetrics` with `executeWithErrorHandling`, and updated error displays to use `errorMessage`.

Approximately 15 lines of boilerplate code were removed.

### 4. ServiceAuditTab.tsx

**Status:** Complete

This migration added the `useApiError` hook, removed manual error state and logger imports, replaced try-catch blocks in both `fetchLogs` and `handleSearch` functions, and updated error displays throughout the component.

Approximately 20 lines of boilerplate code were removed.

## Pending Migrations

### 5. ServiceConfigTab.tsx

**Complexity:** High

This component requires three mutations for `updateConfig`, `addDomain`, and `removeDomain` operations. The estimated change involves approximately 60 lines of code. A detailed migration guide is available in the remaining migrations guide document.

### 6. ServiceConsentsTab.tsx

**Complexity:** Medium

This component is similar in structure to the completed ServiceConsentsPage.tsx. It requires three mutations for create, update, and delete operations. The estimated change involves approximately 40 lines of code.

### 7. ServiceCountriesTab.tsx

**Complexity:** Low

This component requires two mutations for add and remove operations. The estimated change involves approximately 30 lines of code.

### 8. ServiceDocumentsTab.tsx

**Complexity:** Low

This component requires one delete mutation. Note that it uses `legalApi` instead of `servicesApi`. The estimated change involves approximately 25 lines of code.

### 9. ServiceFeaturesTab.tsx

**Complexity:** High

This component requires four mutations for create, update, delete, and toggleActive operations. The estimated change involves approximately 70 lines of code.

### 10. ServiceLocalesTab.tsx

**Complexity:** Low

This component requires two mutations for add and remove operations. The estimated change involves approximately 30 lines of code.

### 11. ServiceTestersTab.tsx

**Complexity:** High

This component requires four mutations for `createUser`, `createAdmin`, `deleteUser`, and `deleteAdmin` operations. The estimated change involves approximately 80 lines of code.

### 12. TenantEditPage.tsx

**Complexity:** Medium

This component uses `tenantApi` instead of `servicesApi` and includes navigation logic. It requires three mutations for create, update, and updateStatus operations. The estimated change involves approximately 50 lines of code.

## Resources Available

Several resources have been created to facilitate the remaining migrations:

1. **Migration Summary Document**: Contains overview of completed migrations, migration patterns and templates, benefits of the migration, and a testing checklist.

2. **Remaining Migrations Guide**: Provides detailed step-by-step instructions for each remaining file, code snippets for each change, common patterns documentation, and verification checklist.

3. **Helper Script**: Available at `migration-complete-remaining-files.sh` for automating import management and applying templates.

## Migration Patterns

### Pattern for Data Fetching (useApiError)

```typescript
const { error, errorMessage, executeWithErrorHandling } = useApiError({
  context: 'ComponentName',
  showToast: false,
});

const result = await executeWithErrorHandling(() => api.method());
if (result) {
  /* handle success */
}
```

### Pattern for Mutations (useApiMutation)

```typescript
const mutation = useApiMutation({
  mutationFn: (data) => api.method(data),
  successToast: 'Success message',
  onSuccess: () => {
    /* refresh data */
  },
  context: 'OperationName',
});

await mutation.mutate(data);
```

## Benefits Realized

### From Completed Files (4 files)

The completed migrations have eliminated approximately 20 try-catch blocks, 20 logger.error calls, and 15 manual error state declarations. Six success toasts have been added, and approximately 120 lines of boilerplate code have been removed.

### Expected from Remaining Files (8 files)

The remaining migrations will eliminate approximately 45 try-catch blocks, 45 logger.error calls, and 30 manual error/loading state declarations. About 20 success toasts will be added, and an estimated 350 lines of boilerplate code will be removed, representing approximately 25% reduction in error handling logic.

## Recommended Migration Order

### Phase 1: Low Complexity (Approximately 2 hours)

Start with these files as they are easier to verify:

- ServiceCountriesTab.tsx
- ServiceLocalesTab.tsx
- ServiceDocumentsTab.tsx

### Phase 2: Medium Complexity (Approximately 2 hours)

Progress to these files next:

- ServiceConsentsTab.tsx
- TenantEditPage.tsx

### Phase 3: High Complexity (Approximately 4 hours)

Complete with these files:

- ServiceConfigTab.tsx
- ServiceFeaturesTab.tsx
- ServiceTestersTab.tsx

### Phase 4: Testing and Review (Approximately 2 hours)

Total estimated time: 10 hours

## Guidelines

### Requirements for Each Migration

Follow the exact patterns from the guide. Add success toasts to all mutations. Remove all try-catch blocks. Remove all logger imports. Test each file after migration. Keep business logic intact.

### Things to Avoid

Do not change business logic. Do not skip success toasts. Do not leave manual error state. Do not leave try-catch blocks. Do not forget to update error displays. Do not skip testing.

## File Locations

Migration resources are located in the project root:

```
/home/beegy/workspace/labs/my-girok/
├── MIGRATION_SUMMARY.md
├── MIGRATION_STATUS.md
├── REMAINING_MIGRATIONS_GUIDE.md
└── migration-complete-remaining-files.sh
```

Files to be migrated are in:

```
/home/beegy/workspace/labs/my-girok/apps/web-admin/src/pages/
├── services/
│   ├── ServiceDetailPage.tsx (Complete)
│   ├── ServiceConsentsPage.tsx (Complete)
│   ├── ServiceAnalyticsTab.tsx (Complete)
│   ├── ServiceAuditTab.tsx (Complete)
│   ├── ServiceConfigTab.tsx (Pending)
│   ├── ServiceConsentsTab.tsx (Pending)
│   ├── ServiceCountriesTab.tsx (Pending)
│   ├── ServiceDocumentsTab.tsx (Pending)
│   ├── ServiceFeaturesTab.tsx (Pending)
│   ├── ServiceLocalesTab.tsx (Pending)
│   └── ServiceTestersTab.tsx (Pending)
└── tenants/
    └── TenantEditPage.tsx (Pending)
```

## Success Criteria

The migration will be considered complete when all 12 files are migrated, all try-catch blocks are removed, all logger imports are removed, all manual error states are removed, all mutations have success toasts, all error displays use errorMessage, all tests pass, all pages function correctly, code review is complete, and documentation is updated.

---

**Status:** 4/12 Complete (33%)
**Last Updated:** 2026-01-13
**Next Review:** After completing remaining migrations

**LLM Reference**: `docs/llm/guides/migrations/centralized-error-handling-status.md`
