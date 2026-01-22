# GeoIP Service Operations Guide

> Testing, database updates, troubleshooting, and performance optimization for the GeoIP service.

## Overview

The GeoIP service provides IP geolocation capabilities using MaxMind's GeoLite2 database. This guide covers operational aspects including testing, database maintenance, troubleshooting, and performance considerations.

---

## Testing

### Graceful Handling

The service gracefully handles missing databases and returns empty strings or null values when:

- Database file doesn't exist
- IP address is invalid
- IP address is private/local (127.0.0.1, 192.168.x.x, etc.)

### Test Scenarios

When testing the GeoIP service, ensure coverage for:

1. Valid public IP addresses
2. Private IP ranges (should return empty)
3. Local addresses (127.0.0.1, localhost)
4. Invalid IP format strings
5. Missing database file scenarios

---

## Database Updates

MaxMind releases GeoLite2 database updates weekly. Setting up automatic updates ensures your geolocation data stays current.

### Using geoipupdate Cron Job

Add to crontab for automatic weekly updates:

```bash
# Add to crontab (runs every Wednesday at 2 AM)
0 2 * * 3 /usr/bin/geoipupdate
```

### Using Kubernetes CronJob

For Kubernetes deployments, use a CronJob to update the database:

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

---

## Troubleshooting

### Service Not Initializing

**Symptom:** Service fails to start with GeoIP functionality.

**Check logs for:**

```
GeoIP database not found at /var/lib/GeoIP/GeoLite2-City.mmdb
```

**Solution:**

1. Verify database file exists at the configured path
2. Check file permissions (service must have read access)
3. Ensure the database file is not corrupted

### Empty Country Codes

**Symptom:** API returns empty strings for country codes.

**Possible Causes:**

- **Private IP addresses**: 192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x
- **Local addresses**: 127.0.0.1, localhost, ::1
- **Invalid IP format**: Malformed IP strings

**Solution:**

1. Verify the IP being queried is a public IP
2. Check IP format validity before querying
3. Log incoming IPs to identify patterns

### Database File Issues

**Symptom:** Inconsistent or outdated results.

**Checks:**

1. Verify database file modification date
2. Check if cron job/CronJob is running successfully
3. Verify MaxMind credentials are valid

---

## Performance Considerations

### Lookup Performance

The service uses MaxMind's in-memory reader for fast lookups:

- **Typical latency**: 1-5ms per query
- **Memory usage**: ~50-70MB for GeoLite2-City database

### Optimization Tips

For high-volume applications:

1. **Batch Processing**: Use `batchGetCountryCodes()` for multiple IPs instead of individual calls

2. **Result Caching**: Consider caching results per IP address
   - Cache TTL: 24-48 hours (IP geolocation rarely changes)
   - Use Valkey/Redis for distributed caching

3. **Memory Monitoring**: Monitor service memory usage
   - Database is loaded entirely into memory
   - Account for ~70MB additional memory per instance

### Performance Metrics to Monitor

| Metric         | Description        | Alert Threshold |
| -------------- | ------------------ | --------------- |
| Lookup latency | Time per IP lookup | > 10ms          |
| Memory usage   | Service memory     | > 200MB         |
| Error rate     | Failed lookups     | > 1%            |
| Cache hit rate | If caching enabled | < 80%           |

---

## Resources

- [MaxMind GeoLite2 Free Databases](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data)
- [geoipupdate Documentation](https://github.com/maxmind/geoipupdate)
- [MaxMind GeoIP2 Node.js API](https://github.com/maxmind/GeoIP2-node)

---

## Related Documentation

- **Main Documentation**: `geoip.md`

---

_This document is auto-generated from `docs/llm/services/geoip-operations.md`_
