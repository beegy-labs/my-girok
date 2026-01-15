# GeoIP Service

> IP address to geographic location lookup using MaxMind GeoLite2 database

## Service Info

| Property | Value                                    |
| -------- | ---------------------------------------- |
| Type     | Embedded module (not standalone service) |
| Database | MaxMind GeoLite2-City (MMDB format)      |
| Location | `services/auth-bff/src/common/services/` |
| Used By  | auth-bff for location-based security     |

## Domain Boundaries

| This Service Owns        | NOT This Service (Other Services) |
| ------------------------ | --------------------------------- |
| IP to country lookup     | User location storage             |
| IP to city lookup        | Location history                  |
| IP to coordinates lookup | Geofencing rules                  |
| Batch IP lookups         | Location-based policies           |

## API Methods

| Method                      | Return Type           | Description                     |
| --------------------------- | --------------------- | ------------------------------- |
| `getCountryCode(ip)`        | `string`              | Get ISO country code (e.g., US) |
| `getLocation(ip)`           | `GeoLocation`         | Get detailed location info      |
| `batchGetCountryCodes(ips)` | `Map<string, string>` | Batch lookup country codes      |
| `isReady()`                 | `boolean`             | Check if service is initialized |
| `getDatabaseInfo()`         | `DatabaseInfo`        | Get database metadata           |

## Response Types

### GeoLocation

```typescript
{
  countryCode: string; // 'US'
  countryName: string; // 'United States'
  city: string; // 'Mountain View'
  latitude: number; // 37.386
  longitude: number; // -122.0838
}
```

## Setup Options

### Option 1: MaxMind Account Download (Recommended)

1. Create free account at [MaxMind](https://www.maxmind.com/en/geolite2/signup)
2. Generate a license key
3. Download GeoLite2-City database in MMDB format
4. Extract the `.mmdb` file

### Option 2: geoipupdate Tool

```bash
# Install (Ubuntu/Debian)
sudo apt-get install geoipupdate

# Install (macOS)
brew install geoipupdate

# Configure
sudo tee /etc/GeoIP.conf > /dev/null <<EOF
AccountID YOUR_ACCOUNT_ID
LicenseKey YOUR_LICENSE_KEY
EditionIDs GeoLite2-City
DatabaseDirectory /var/lib/GeoIP
EOF

# Download
sudo geoipupdate
```

## Configuration

### Docker Setup

```yaml
# docker-compose.yml
services:
  auth-bff:
    volumes:
      - ./data/GeoLite2-City.mmdb:/var/lib/GeoIP/GeoLite2-City.mmdb:ro
```

### Kubernetes Setup

```yaml
# PersistentVolumeClaim (recommended)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: geoip-data
spec:
  accessModes:
    - ReadOnlyMany
  resources:
    requests:
      storage: 100Mi

---
# Mount in deployment
spec:
  containers:
    - name: auth-bff
      volumeMounts:
        - name: geoip-db
          mountPath: /var/lib/GeoIP
          readOnly: true
  volumes:
    - name: geoip-db
      persistentVolumeClaim:
        claimName: geoip-data
```

## Environment Variables

```bash
# Database path (optional, has default)
GEOIP_DATABASE_PATH=/var/lib/GeoIP/GeoLite2-City.mmdb

# Development override
GEOIP_DATABASE_PATH=./data/GeoLite2-City.mmdb
```

## Database Updates

MaxMind releases updates weekly. Set up automatic updates:

### Cron Job

```bash
# Every Wednesday at 2 AM
0 2 * * 3 /usr/bin/geoipupdate
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: geoip-updater
spec:
  schedule: '0 2 * * 3'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: updater
              image: maxmindinc/geoipupdate:latest
              env:
                - name: GEOIPUPDATE_ACCOUNT_ID
                  valueFrom:
                    secretKeyRef:
                      name: maxmind-credentials
                      key: account-id
                - name: GEOIPUPDATE_LICENSE_KEY
                  valueFrom:
                    secretKeyRef:
                      name: maxmind-credentials
                      key: license-key
                - name: GEOIPUPDATE_EDITION_IDS
                  value: 'GeoLite2-City'
              volumeMounts:
                - name: geoip-db
                  mountPath: /usr/share/GeoIP
          volumes:
            - name: geoip-db
              persistentVolumeClaim:
                claimName: geoip-data
          restartPolicy: OnFailure
```

## Usage Example

```typescript
import { GeoIPService } from './common/services';

@Injectable()
export class MyService {
  constructor(private readonly geoip: GeoIPService) {}

  async processRequest(ip: string) {
    // Get country code only
    const countryCode = this.geoip.getCountryCode(ip);
    // Returns: 'US'

    // Get detailed location
    const location = this.geoip.getLocation(ip);
    // Returns: { countryCode, countryName, city, latitude, longitude }

    // Batch lookup
    const ips = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];
    const results = this.geoip.batchGetCountryCodes(ips);
  }
}
```

## Error Handling

The service gracefully returns empty strings or null when:

| Condition                | Return Value  |
| ------------------------ | ------------- |
| Database file missing    | `''` / `null` |
| Invalid IP format        | `''` / `null` |
| Private IP (192.168.x.x) | `''` / `null` |
| Local IP (127.0.0.1)     | `''` / `null` |

## Performance

| Metric             | Value       |
| ------------------ | ----------- |
| Lookup latency     | ~1-5ms      |
| Memory usage       | ~50-70MB    |
| Concurrent lookups | Thread-safe |

For high-volume applications:

- Use `batchGetCountryCodes()` for multiple IPs
- Consider caching results per IP
- Monitor memory usage

---

**LLM Reference**: `docs/llm/services/geoip.md`
