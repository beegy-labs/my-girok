# Task 08: Admin UI Testing

> Verify my-girok service management in web-admin

## Goal

Test service registration and configuration through web-admin UI in dev environment.

## Prerequisites

- [x] Task 07 completed (Database seeded)
- [ ] web-admin deployed to dev environment
- [ ] Admin account created

## Access Methods

### Option A: Port-Forward (Local Access)

```bash
# Port-forward web-admin service
kubectl port-forward svc/web-admin 5174:80

# Open in browser
open http://localhost:5174
```

### Option B: Ingress (Remote Access)

```bash
# If Ingress configured
open https://admin.dev.girok.dev
```

## Test Scenarios

### 1. Login to web-admin

```
URL: http://localhost:5174/login

Credentials:
- Email: (admin email)
- Password: (admin password)

Expected:
✅ Successful login
✅ Redirect to dashboard
```

### 2. Navigate to Services Page

```
Path: Services → Service List

Expected:
✅ Services page loads
✅ Service list displayed
✅ my-girok service visible in list
```

### 3. View my-girok Service Details

```
Action: Click on "my-girok" service

Expected:
✅ Service detail page opens
✅ Service metadata displayed:
   - Slug: my-girok
   - Name: My Girok
   - Description: Resume management platform for job seekers
   - Status: Active (green badge)
   - Created date
   - Updated date
```

### 4. Test Config Tab

```
Tab: Config

Expected fields:
✅ JWT Validation: Enabled (toggle on)
✅ Domain Validation: Enabled (toggle on)
✅ Rate Limit: Enabled (toggle on)
✅ Rate Limit Requests: 1000
✅ Rate Limit Window: 60 seconds
✅ Maintenance Mode: Disabled (toggle off)
✅ Audit Level: STANDARD (dropdown)

Actions:
- Toggle each setting
- Change values
- Click "Save"
- Verify changes persist (refresh page)
```

### 5. Test Countries Tab

```
Tab: Countries

Expected:
✅ List shows 3 countries:
   - KR (South Korea) - Active
   - US (United States) - Active
   - JP (Japan) - Active

Actions:
- Click "Add Country"
- Select new country (e.g., CN - China)
- Click "Save"
- Verify country added
- Toggle country status (Active/Inactive)
- Remove country
- Verify country removed
```

### 6. Test Locales Tab

```
Tab: Locales

Expected:
✅ List shows 3 locales:
   - ko (Korean) - Active
   - en (English) - Active
   - ja (Japanese) - Active

Actions:
- Click "Add Locale"
- Select new locale (e.g., zh - Chinese)
- Click "Save"
- Verify locale added
- Toggle locale status
- Remove locale
- Verify locale removed
```

### 7. Test Consents Tab

```
Tab: Consents

Expected:
✅ Grid view with countries and consent types:

| Country | TERMS_OF_SERVICE | PRIVACY_POLICY | MARKETING_EMAIL |
|---------|------------------|----------------|-----------------|
| KR      | Required ✓       | Required ✓     | Optional        |
| US      | Required ✓       | Required ✓     | Optional        |
| JP      | Required ✓       | Required ✓     | Optional        |

Actions:
- Toggle requirement (Required ↔ Optional)
- Click "Save"
- Verify changes persist
```

### 8. Test Domains Field

```
Tab: Config or Overview

Expected:
✅ Domains list displayed:
   - my-girok.com
   - www.my-girok.com
   - api.my-girok.com
   - dev.girok.dev
   - localhost:5173
   - localhost:4002

Actions:
- Click "Edit Domains"
- Add new domain: staging.my-girok.com
- Remove a domain
- Click "Save"
- Verify changes persist
```

## API Verification (Backend)

While testing UI, verify API calls:

### Check Network Tab (Browser DevTools)

```
Expected API calls:

GET /v1/admin/services/slug/my-girok
Response: 200 OK, service data

PUT /v1/admin/services/:id/config
Request: { jwtValidation: true, ... }
Response: 200 OK

POST /v1/admin/services/:id/countries
Request: { countryCode: 'CN', isActive: true }
Response: 201 Created

PUT /v1/admin/services/:id/consent-requirements/:id
Request: { isRequired: false }
Response: 200 OK
```

## Verification Checklist

### Service Display

- [ ] my-girok service appears in service list
- [ ] Service detail page loads correctly
- [ ] All metadata fields display correctly
- [ ] Status badge shows "Active"

### Config Tab

- [ ] All config options display
- [ ] Toggle switches work
- [ ] Input fields editable
- [ ] Save button works
- [ ] Changes persist after refresh

### Countries Tab

- [ ] All 3 countries display (KR, US, JP)
- [ ] Add country works
- [ ] Toggle status works
- [ ] Remove country works
- [ ] Changes persist

### Locales Tab

- [ ] All 3 locales display (ko, en, ja)
- [ ] Add locale works
- [ ] Toggle status works
- [ ] Remove locale works
- [ ] Changes persist

### Consents Tab

- [ ] Grid displays correctly
- [ ] All consent types shown
- [ ] Toggle required/optional works
- [ ] Changes persist

### Domains

- [ ] All domains display
- [ ] Add domain works
- [ ] Remove domain works
- [ ] Changes persist

## Troubleshooting

### Issue: web-admin not accessible

Check pod status:

```bash
kubectl get pods -l app=web-admin
kubectl logs -f deployment/web-admin
```

Check service:

```bash
kubectl get svc web-admin
kubectl describe svc web-admin
```

### Issue: Service not visible in list

Check auth-service:

```bash
# Verify service in database
POD=$(kubectl get pods -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c \
  "SELECT slug, name, is_active FROM services WHERE slug='my-girok';"
```

Check web-admin API calls:

```bash
# Browser DevTools → Network → Filter: admin/services
# Look for failed API calls
```

### Issue: Changes not persisting

Check logs for errors:

```bash
kubectl logs -f deployment/auth-service | grep ERROR
```

Verify database connection:

```bash
# Test write to database
POD=$(kubectl get pods -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c "SELECT 1;"
```

### Issue: Admin login fails

Check identity-service:

```bash
kubectl get pods -l app=identity-service
kubectl logs -f deployment/identity-service
```

Verify admin exists:

```bash
POD=$(kubectl get pods -l app=identity-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c \
  "SELECT email, role FROM admins LIMIT 5;"
```

## Test Report Template

```markdown
## Admin UI Test Report

Date: YYYY-MM-DD
Tester: Your Name
Environment: dev

### Results

| Test Case      | Status  | Notes |
| -------------- | ------- | ----- |
| Login          | ✅ Pass |       |
| Service List   | ✅ Pass |       |
| Service Detail | ✅ Pass |       |
| Config Tab     | ✅ Pass |       |
| Countries Tab  | ✅ Pass |       |
| Locales Tab    | ✅ Pass |       |
| Consents Tab   | ✅ Pass |       |
| Domains        | ✅ Pass |       |

### Issues Found

- None

### Screenshots

- [Service List](./screenshots/service-list.png)
- [Service Detail](./screenshots/service-detail.png)
- [Consents Tab](./screenshots/consents-tab.png)
```

## Next Steps

→ Task 09: Documentation Update
