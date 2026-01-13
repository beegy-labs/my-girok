# Service Pages Migration to useApiError and useApiMutation

## Completed Migrations (4/12)

### 1. ServiceDetailPage.tsx ✅

**Changes:**

- Added `useApiError` import
- Removed manual `error` state and `logger` import
- Replaced try-catch in `fetchService` with `executeWithErrorHandling`
- Updated error display to use `errorMessage` instead of `error`

### 2. ServiceConsentsPage.tsx ✅

**Changes:**

- Added `useApiError` and `useApiMutation` imports
- Removed manual `error` state, `saving` state, and `logger` import
- Created mutations: `createMutation`, `updateMutation`, `deleteMutation`
- Replaced try-catch blocks with mutation calls
- Added success toasts to all mutations
- Updated error handling to use `errorMessage` and `clearError`

### 3. ServiceAnalyticsTab.tsx ✅

**Changes:**

- Added `useApiError` import
- Removed manual `error` state and `logger` import
- Replaced try-catch in `fetchMetrics` with `executeWithErrorHandling`
- Updated error display to use `errorMessage`

### 4. ServiceAuditTab.tsx ✅

**Changes:**

- Added `useApiError` import
- Removed manual `error` state and `logger` import
- Replaced try-catch in `fetchLogs` and `handleSearch` with `executeWithErrorHandling`
- Updated error display to use `errorMessage`

## Remaining Migrations (8/12)

The following files follow the same pattern and need to be migrated:

### 5. ServiceConfigTab.tsx

- **Fetches:** `getServiceConfig`, `getServiceDomains`
- **Mutations:** `updateServiceConfig`, `addServiceDomain`, `removeServiceDomain`
- **Pattern:** useApiError + useApiMutation with success toasts

### 6. ServiceConsentsTab.tsx

- **Fetches:** `listConsentRequirements`
- **Mutations:** `createConsentRequirement`, `updateConsentRequirement`, `deleteConsentRequirement`
- **Pattern:** useApiError + useApiMutation with success toasts

### 7. ServiceCountriesTab.tsx

- **Fetches:** `listServiceCountries`
- **Mutations:** `addServiceCountry`, `removeServiceCountry`
- **Pattern:** useApiError + useApiMutation with success toasts

### 8. ServiceDocumentsTab.tsx

- **Fetches:** `listDocuments`
- **Mutations:** `deleteDocument`
- **Pattern:** useApiError + useApiMutation with success toasts
- **Note:** Uses legalApi instead of servicesApi

### 9. ServiceFeaturesTab.tsx

- **Fetches:** `listServiceFeatures`
- **Mutations:** `createServiceFeature`, `updateServiceFeature`, `deleteServiceFeature`, `updateServiceFeature` (toggle)
- **Pattern:** useApiError + useApiMutation with success toasts

### 10. ServiceLocalesTab.tsx

- **Fetches:** `listServiceLocales`
- **Mutations:** `addServiceLocale`, `removeServiceLocale`
- **Pattern:** useApiError + useApiMutation with success toasts

### 11. ServiceTestersTab.tsx

- **Fetches:** `listUserTesters`, `listAdminTesters`
- **Mutations:** `createUserTester`, `createAdminTester`, `deleteUserTester`, `deleteAdminTester`
- **Pattern:** useApiError + useApiMutation with success toasts

### 12. TenantEditPage.tsx

- **Fetches:** `tenantApi.get`
- **Mutations:** `tenantApi.create`, `tenantApi.update`, `tenantApi.updateStatus`
- **Pattern:** useApiError + useApiMutation with success toasts
- **Note:** Uses tenantApi instead of servicesApi

## Migration Pattern

### For Fetches (useApiError):

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

### For Mutations (useApiMutation):

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

## Benefits

1. **Consistent Error Handling:** All errors handled uniformly across pages
2. **Automatic Retry:** Transient errors automatically retried
3. **User Feedback:** Success toasts for all mutations
4. **Less Boilerplate:** No manual try-catch blocks or error state management
5. **Better UX:** Loading states and error messages handled consistently
6. **Cleaner Code:** Removed logger imports and manual error logging

## Testing Checklist

For each migrated page:

- [ ] Verify fetch operations show loading states
- [ ] Verify fetch errors display correctly
- [ ] Verify mutations show success toasts
- [ ] Verify mutation errors display correctly
- [ ] Verify loading states during mutations
- [ ] Verify data refresh after mutations
- [ ] Check that all business logic remains intact
- [ ] Test error scenarios (network errors, validation errors)
