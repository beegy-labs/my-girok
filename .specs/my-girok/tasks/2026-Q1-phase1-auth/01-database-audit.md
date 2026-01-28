# Task 01: Database Audit

> Analyze auth_db current state | Status: Pending

## Objective

Understand existing services, configs, and related data in auth_db before cleanup.

## Checklist

- [ ] Query existing services table
- [ ] Check service_configs
- [ ] Check service_consent_requirements
- [ ] Check service_supported_countries
- [ ] Check service_supported_locales
- [ ] Document findings

## Commands

```bash
# Connect to auth_db
psql -d auth_db

# Query services
SELECT id, slug, name, is_active, domains FROM services;

# Query configs
SELECT service_id, jwt_validation, domain_validation FROM service_configs;

# Query consent requirements
SELECT s.slug, scr.country_code, scr.consent_type, scr.is_required
FROM service_consent_requirements scr
JOIN services s ON scr.service_id = s.id;

# Query countries
SELECT s.slug, ssc.country_code
FROM service_supported_countries ssc
JOIN services s ON ssc.service_id = s.id;

# Query locales
SELECT s.slug, ssl.locale
FROM service_supported_locales ssl
JOIN services s ON ssl.service_id = s.id;
```

## Expected Findings

Based on seed files:

- 4 test services: homeshopping, ads, legal, dev
- ~20 consent requirements
- Multiple country/locale entries

## Output

Document findings in: `docs/llm/solutions/my-girok/recovery/phase1-database-audit.md`

## Next Task

→ 02-service-cleanup.md
