# GeoIP Service

> IP geolocation with MaxMind GeoLite2 | Part of auth-bff (Port 4005)

| Feature       | Implementation             |
| ------------- | -------------------------- |
| Database      | MaxMind GeoLite2-City      |
| Lookup        | Country code, city, coords |
| Batch support | Yes                        |
| Auto-updates  | Kubernetes CronJob         |

## Key Methods

```typescript
getCountryCode(ip: string): string
getLocation(ip: string): GeoIPResult | null
batchGetCountryCodes(ips: string[]): Map<string, string>
getDatabaseInfo(): GeoIPDatabaseInfo
```

**SSOT**: `docs/llm/services/geoip.md`
