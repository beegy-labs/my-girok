# Task 07: Database Migration & Seed Execution

> Execute database migrations and seed my-girok service in dev environment

## Goal

Run Prisma migrations and seed scripts in Kubernetes dev environment to populate auth_db with my-girok service.

## Prerequisites

- [x] Task 06 completed (Services deployed)
- [ ] kubectl configured for cluster access
- [ ] Database credentials available (from Vault or K8s secrets)

## Execution Options

### Option A: Kubernetes Job (Recommended)

Create a one-time job to run migrations and seed.

#### A1. Create Migration Job YAML

Create file: `/tmp/auth-service-migration-job.yaml`

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: auth-service-migration
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: migration
          image: gitea.girok.dev/beegy-labs/auth-service:develop-<SHA>
          command:
            - /bin/sh
            - -c
            - |
              echo "Running Prisma migrations..."
              pnpm prisma migrate deploy

              echo "Running seed scripts..."
              cd prisma/seed
              npx ts-node services-seed.ts
              npx ts-node consent-requirements-seed.ts
              npx ts-node legal-documents-seed.ts

              echo "Migration and seed completed successfully"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auth-service-secret
                  key: database-url
            - name: NODE_ENV
              value: 'production'
      restartPolicy: Never
  backoffLimit: 3
```

#### A2. Apply Job

```bash
# Replace <SHA> with actual image tag
SHA=$(kubectl get deployment auth-service -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d: -f2)

# Update job YAML with actual SHA
sed "s/<SHA>/${SHA}/g" /tmp/auth-service-migration-job.yaml > /tmp/auth-service-migration-job-final.yaml

# Apply job
kubectl apply -f /tmp/auth-service-migration-job-final.yaml

# Watch job progress
kubectl logs -f job/auth-service-migration
```

### Option B: kubectl exec (Quick Method)

Execute directly in running pod.

#### B1. Find Pod

```bash
# Get auth-service pod name
POD=$(kubectl get pods -l app=auth-service -o jsonpath='{.items[0].metadata.name}')

echo "Using pod: ${POD}"
```

#### B2. Run Migrations

```bash
# Run Prisma migrate deploy
kubectl exec -it ${POD} -- pnpm prisma migrate deploy

# Expected output:
# Prisma Migrate applied the following migration(s):
#
# migrations/
#   └─ 20250128_init/
#      └─ migration.sql
```

#### B3. Run Seed Scripts

```bash
# Navigate to seed directory and run scripts
kubectl exec -it ${POD} -- /bin/sh -c "
  cd prisma/seed && \
  npx ts-node services-seed.ts && \
  npx ts-node consent-requirements-seed.ts && \
  npx ts-node legal-documents-seed.ts
"

# Expected output:
# Seeding services...
# Seeded service: my-girok
# Seeded config for: my-girok
# Seeded countries for: my-girok
# Seeded locales for: my-girok
# Seeded consent requirements for: my-girok
# Completed seeding 1 services
#
# Seeding consent requirements...
# (consent requirements output)
#
# Seeding legal documents...
# (legal documents output)
```

### Option C: psql Direct (Fallback)

If seed scripts fail, use direct SQL.

#### C1. Port-Forward to Database

```bash
# Port-forward to PostgreSQL (if accessible)
kubectl port-forward svc/postgres 5432:5432 &

# Or connect through auth-service pod
kubectl exec -it ${POD} -- /bin/sh
```

#### C2. Execute SQL

From inside pod or forwarded connection:

```sql
-- Check current services
SELECT slug, name FROM services;

-- Expected: Empty or old test services

-- Insert my-girok service (full SQL from Task 03)
-- (Use SQL from seed file modification)
```

## Verification

### 1. Check Services Table

```bash
# Query services table
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c \
  "SELECT slug, name, is_active FROM services WHERE slug='my-girok';"

# Expected output:
#    slug    |   name    | is_active
# -----------+-----------+-----------
#  my-girok  | My Girok  | t
```

### 2. Check Related Tables

```bash
# Service configs
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c \
  "SELECT s.slug, sc.jwt_validation, sc.domain_validation
   FROM service_configs sc
   JOIN services s ON s.id = sc.service_id
   WHERE s.slug='my-girok';"

# Expected:
#    slug    | jwt_validation | domain_validation
# -----------+----------------+-------------------
#  my-girok  | t              | t

# Countries
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c \
  "SELECT s.slug, ssc.country_code
   FROM service_supported_countries ssc
   JOIN services s ON s.id = ssc.service_id
   WHERE s.slug='my-girok';"

# Expected:
#    slug    | country_code
# -----------+--------------
#  my-girok  | KR
#  my-girok  | US
#  my-girok  | JP

# Locales
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c \
  "SELECT s.slug, ssl.locale
   FROM service_supported_locales ssl
   JOIN services s ON s.id = ssl.service_id
   WHERE s.slug='my-girok';"

# Expected:
#    slug    | locale
# -----------+--------
#  my-girok  | ko
#  my-girok  | en
#  my-girok  | ja

# Consent requirements
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c \
  "SELECT s.slug, scr.country_code, scr.consent_type, scr.is_required
   FROM service_consent_requirements scr
   JOIN services s ON s.id = scr.service_id
   WHERE s.slug='my-girok'
   ORDER BY scr.country_code, scr.consent_type;"

# Expected: 9 rows (3 countries × 3 consent types)
```

### 3. Test Service Lookup

```bash
# Port-forward auth-service
kubectl port-forward svc/auth-service 3002:3002 &

# Test domain endpoint
curl http://localhost:3002/v1/services/domain/dev.girok.dev | jq

# Expected:
# {
#   "id": "<uuid>",
#   "slug": "my-girok",
#   "name": "My Girok",
#   "domains": ["my-girok.com", "dev.girok.dev", ...],
#   ...
# }

# Stop port-forward
pkill -f "port-forward.*auth-service"
```

## Verification Checklist

- [ ] Prisma migrations applied successfully
- [ ] Seed scripts executed without errors
- [ ] my-girok service exists in services table
- [ ] Service config created (jwt_validation: true)
- [ ] 3 countries added (KR, US, JP)
- [ ] 3 locales added (ko, en, ja)
- [ ] 9 consent requirements added
- [ ] Domain lookup endpoint works

## Troubleshooting

### Issue: Migration Job Failed

Check job logs:

```bash
kubectl logs job/auth-service-migration
```

Delete and recreate:

```bash
kubectl delete job auth-service-migration
# Recreate with fixed configuration
```

### Issue: Seed Script Error

Common errors:

- **Duplicate key violation**: Service already exists
  - Solution: Skip or update instead of insert
- **Foreign key violation**: Missing parent record
  - Solution: Check service creation first
- **Database connection timeout**: DATABASE_URL incorrect
  - Solution: Verify secret contains correct connection string

### Issue: Database Connection Failed

Check database credentials:

```bash
# View secret (redacted)
kubectl get secret auth-service-secret -o yaml

# Test connection from pod
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c "SELECT 1;"
```

Verify database pod:

```bash
kubectl get pods -l app=postgres
kubectl logs -f deployment/postgres --tail=50
```

## Rollback

If seed creates incorrect data:

```bash
# Delete my-girok service (cascades to related tables)
kubectl exec -it ${POD} -- psql ${DATABASE_URL} -c \
  "DELETE FROM services WHERE slug='my-girok';"

# Re-run seed
kubectl exec -it ${POD} -- /bin/sh -c \
  "cd prisma/seed && npx ts-node services-seed.ts"
```

## Next Steps

→ Task 08: Admin UI Testing
