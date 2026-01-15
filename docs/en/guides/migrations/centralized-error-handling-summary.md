# Centralized Error Handling Migration Summary

> Guide for migrating service pages to useApiError and useApiMutation hooks

## Introduction

This document summarizes the migration of service pages from manual error handling to the centralized `useApiError` and `useApiMutation` hooks. The migration standardizes error handling across the application, reduces boilerplate code, and improves user experience through consistent feedback.

## Completed Migrations

### ServiceDetailPage.tsx

The migration added the `useApiError` import from the hooks directory, removed the manual `error` state and `logger` import, replaced try-catch blocks in `fetchService` with `executeWithErrorHandling`, and updated error displays to use `errorMessage` instead of the raw error string.

### ServiceConsentsPage.tsx

This more complex migration added both `useApiError` and `useApiMutation` imports, removed the manual `error` state, `saving` state, and `logger` import, created three mutations (`createMutation`, `updateMutation`, `deleteMutation`), replaced try-catch blocks with mutation calls, added success toasts to all mutations, and updated error handling to use `errorMessage` and `clearError`.

### ServiceAnalyticsTab.tsx

The migration added the `useApiError` import, removed the manual `error` state and `logger` import, replaced try-catch blocks in `fetchMetrics` with `executeWithErrorHandling`, and updated error displays to use `errorMessage`.

### ServiceAuditTab.tsx

The migration added the `useApiError` import, removed the manual `error` state and `logger` import, replaced try-catch blocks in both `fetchLogs` and `handleSearch` with `executeWithErrorHandling`, and updated error displays to use `errorMessage`.

## Remaining Migrations

The following files require migration using the same patterns:

### ServiceConfigTab.tsx

This component fetches service configuration via `getServiceConfig` and `getServiceDomains`, and performs mutations for `updateServiceConfig`, `addServiceDomain`, and `removeServiceDomain`. Apply the useApiError hook for fetches and useApiMutation hook with success toasts for mutations.

### ServiceConsentsTab.tsx

This component fetches consent requirements via `listConsentRequirements` and performs mutations for `createConsentRequirement`, `updateConsentRequirement`, and `deleteConsentRequirement`. The pattern is identical to the completed ServiceConsentsPage.tsx.

### ServiceCountriesTab.tsx

This component fetches countries via `listServiceCountries` and performs mutations for `addServiceCountry` and `removeServiceCountry`. Apply the standard useApiError and useApiMutation patterns with success toasts.

### ServiceDocumentsTab.tsx

This component fetches documents via `listDocuments` and performs a `deleteDocument` mutation. Note that this component uses `legalApi` instead of `servicesApi`.

### ServiceFeaturesTab.tsx

This component fetches features via `listServiceFeatures` and performs mutations for `createServiceFeature`, `updateServiceFeature`, `deleteServiceFeature`, and toggling feature activation. Apply useApiError for fetches and useApiMutation with success toasts for all mutations.

### ServiceLocalesTab.tsx

This component fetches locales via `listServiceLocales` and performs mutations for `addServiceLocale` and `removeServiceLocale`. Apply the standard patterns with success toasts.

### ServiceTestersTab.tsx

This component fetches testers via `listUserTesters` and `listAdminTesters`, and performs mutations for `createUserTester`, `createAdminTester`, `deleteUserTester`, and `deleteAdminTester`. Apply useApiError for fetches and useApiMutation with success toasts.

### TenantEditPage.tsx

This component fetches tenant data via `tenantApi.get` and performs mutations for `tenantApi.create`, `tenantApi.update`, and `tenantApi.updateStatus`. Note that it uses `tenantApi` instead of `servicesApi`.

## Migration Patterns

### Data Fetching Pattern (useApiError)

Use this pattern for all data fetching operations:

```typescript
// 1. Add import
import { useApiError } from '../../hooks/useApiError';

// 2. Replace state
const { error, errorMessage, executeWithErrorHandling, clearError } = useApiError({
  context: 'ComponentName',
  showToast: false,
});

// 3. Wrap fetch
const result = await executeWithErrorHandling(async () => {
  return await api.someMethod();
});

if (result) {
  // Handle success
}

// 4. Update error display
{error && <span>{errorMessage}</span>}
```

### Mutation Pattern (useApiMutation)

Use this pattern for all create, update, and delete operations:

```typescript
// 1. Add import
import { useApiMutation } from '../../hooks/useApiMutation';

// 2. Create mutation
const someMutation = useApiMutation({
  mutationFn: (data) => api.someMethod(data),
  successToast: 'Operation successful',
  onSuccess: () => {
    // Refresh data
    fetchData();
  },
  context: 'SomeOperation',
});

// 3. Use mutation
await someMutation.mutate(data);

// 4. Access loading state
const saving = someMutation.isLoading || otherMutation.isLoading;
```

## Benefits of Migration

### Consistent Error Handling

All errors are now handled uniformly across pages using the same user-friendly message formats and retry logic.

### Automatic Retry

Transient errors such as network issues and server errors are automatically retried with exponential backoff.

### User Feedback

Success toasts are displayed for all mutations, giving users immediate confirmation that their actions completed.

### Reduced Boilerplate

Manual try-catch blocks, error state management, and logger imports are eliminated, resulting in cleaner, more maintainable code.

### Better UX

Loading states and error messages are handled consistently throughout the application.

### Cleaner Code

Logger imports and manual error logging are removed, simplifying the codebase.

## Testing Checklist

For each migrated page, verify the following:

**Data Fetching:**

- Loading states appear during fetch operations
- Errors display correctly with user-friendly messages
- Data refreshes properly after mutations

**Mutations:**

- Success toasts appear after successful operations
- Error messages display correctly on failure
- Loading states appear during mutation execution
- Data refreshes after successful mutations

**Error Scenarios:**

- Network errors are handled gracefully
- Validation errors display field-specific messages
- All business logic remains intact

## Migration Resources

The following resources are available to assist with the migration:

- **MIGRATION_SUMMARY.md**: Overview of completed migrations and patterns
- **MIGRATION_STATUS.md**: Detailed tracking of migration progress
- **REMAINING_MIGRATIONS_GUIDE.md**: Step-by-step instructions for each file
- **migration-complete-remaining-files.sh**: Helper script for applying changes

All resources are located in the project root directory.

---

**LLM Reference**: `docs/llm/guides/migrations/centralized-error-handling-summary.md`
