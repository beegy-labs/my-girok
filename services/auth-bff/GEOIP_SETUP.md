# GeoIP Service Setup Guide

## Overview

The GeoIP Service converts IP addresses to geographic locations (country codes, cities, coordinates) using MaxMind's GeoLite2 database.

## Prerequisites

You need to download the MaxMind GeoLite2-City database. There are two options:

### Option 1: Download via MaxMind Account (Recommended)

1. Create a free account at [MaxMind](https://www.maxmind.com/en/geolite2/signup)
2. Generate a license key
3. Download GeoLite2-City database in MMDB format
4. Extract the `.mmdb` file

### Option 2: Use geoipupdate Tool

Install and configure `geoipupdate`:

```bash
# Install geoipupdate (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install geoipupdate

# Install geoipupdate (macOS)
brew install geoipupdate

# Configure with your MaxMind account
sudo mkdir -p /etc/GeoIP
sudo tee /etc/GeoIP.conf > /dev/null <<EOF
AccountID YOUR_ACCOUNT_ID
LicenseKey YOUR_LICENSE_KEY
EditionIDs GeoLite2-City
DatabaseDirectory /var/lib/GeoIP
EOF

# Download database
sudo geoipupdate
```

## Configuration

### Environment Variables

Set the database path in your `.env` file:

```env
# Optional: Defaults to /var/lib/GeoIP/GeoLite2-City.mmdb
GEOIP_DATABASE_PATH=/var/lib/GeoIP/GeoLite2-City.mmdb
```

### Local Development

For local development, you can place the database in a custom location:

```env
# Development
GEOIP_DATABASE_PATH=./data/GeoLite2-City.mmdb
```

### Docker Setup

In Docker, mount the database as a volume:

```yaml
# docker-compose.yml
services:
  auth-bff:
    volumes:
      - ./data/GeoLite2-City.mmdb:/var/lib/GeoIP/GeoLite2-City.mmdb:ro
```

### Kubernetes Setup

Use a ConfigMap or persistent volume:

```yaml
# Option 1: ConfigMap (for small databases)
apiVersion: v1
kind: ConfigMap
metadata:
  name: geoip-database
binaryData:
  GeoLite2-City.mmdb: <base64-encoded-database>

---
# Option 2: Persistent Volume (recommended)
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
```

Mount in deployment:

```yaml
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

## Usage

### Inject Service

```typescript
import { GeoIPService } from './common/services';

@Injectable()
export class MyService {
  constructor(private readonly geoip: GeoIPService) {}

  async processRequest(ip: string) {
    // Get country code only
    const countryCode = this.geoip.getCountryCode(ip);
    console.log(`Country: ${countryCode}`); // US

    // Get detailed location
    const location = this.geoip.getLocation(ip);
    console.log(location);
    // {
    //   countryCode: 'US',
    //   countryName: 'United States',
    //   city: 'Mountain View',
    //   latitude: 37.386,
    //   longitude: -122.0838
    // }

    // Batch lookup
    const ips = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];
    const results = this.geoip.batchGetCountryCodes(ips);
    results.forEach((code, ip) => {
      console.log(`${ip} -> ${code}`);
    });
  }
}
```

### Check Service Status

```typescript
if (this.geoip.isReady()) {
  const info = this.geoip.getDatabaseInfo();
  console.log('GeoIP database:', info);
} else {
  console.warn('GeoIP service not available');
}
```

## Testing

The service gracefully handles missing databases and returns empty strings or null values when:

- Database file doesn't exist
- IP address is invalid
- IP address is private/local (127.0.0.1, 192.168.x.x, etc.)

## Database Updates

MaxMind releases GeoLite2 database updates weekly. Set up automatic updates:

### Using geoipupdate Cron Job

```bash
# Add to crontab (runs every Wednesday at 2 AM)
0 2 * * 3 /usr/bin/geoipupdate
```

### Using Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: geoip-updater
spec:
  schedule: '0 2 * * 3' # Every Wednesday at 2 AM
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

## Troubleshooting

### Service not initializing

Check logs for:

```
GeoIP database not found at /var/lib/GeoIP/GeoLite2-City.mmdb
```

Solution: Verify database path and file permissions.

### Empty country codes

Possible causes:

- Private IP addresses (192.168.x.x, 10.x.x.x)
- Local addresses (127.0.0.1, localhost)
- Invalid IP format

### Performance concerns

The service uses MaxMind's in-memory reader for fast lookups (~1-5ms per query). For high-volume applications:

- Use `batchGetCountryCodes()` for multiple IPs
- Consider caching results per IP
- Monitor memory usage (database is ~50-70MB in memory)

## Resources

- [MaxMind GeoLite2 Free Databases](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data)
- [geoipupdate Documentation](https://github.com/maxmind/geoipupdate)
- [MaxMind GeoIP2 Node.js API](https://github.com/maxmind/GeoIP2-node)
