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

```env
# Optional: Defaults to /var/lib/GeoIP/GeoLite2-City.mmdb
GEOIP_DATABASE_PATH=/var/lib/GeoIP/GeoLite2-City.mmdb
```

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
# Persistent Volume (recommended)
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

    // Get detailed location
    const location = this.geoip.getLocation(ip);
    // { countryCode: 'US', countryName: 'United States', city: 'Mountain View', latitude: 37.386, longitude: -122.0838 }

    // Batch lookup
    const results = this.geoip.batchGetCountryCodes(['8.8.8.8', '1.1.1.1', '9.9.9.9']);
  }
}
```

### Check Service Status

```typescript
if (this.geoip.isReady()) {
  const info = this.geoip.getDatabaseInfo();
  console.log('GeoIP database:', info);
}
```

## Related Documentation

- **Operations & Troubleshooting**: `geoip-operations.md`
- [MaxMind GeoLite2 Free Databases](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data)
