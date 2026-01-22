# GeoIP Service Operations

> Testing, database updates, troubleshooting, and performance

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

---

_Main: `geoip.md`_
