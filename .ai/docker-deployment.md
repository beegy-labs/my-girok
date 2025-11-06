# Docker Deployment Quick Reference

## Files Structure

```
docker-compose.yml.example    # Git committed (example only)
docker-compose.yml           # Gitignored (user creates)
services/*/Dockerfile        # Multi-stage production builds
```

## User Workflow

```bash
# Setup
cp docker-compose.yml.example docker-compose.yml
nano docker-compose.yml  # Edit secrets, domains

# Run
docker compose up -d
docker compose logs -f

# Stop
docker compose down
```

## Key Points

- ✅ Example files in git
- ✅ Actual configs gitignored
- ✅ Users customize for their environment
- ✅ Single file for all environments (dev/staging/prod)

## Dockerfile Best Practices

- Multi-stage builds (builder + production)
- Non-root user (UID 1000)
- Health checks included
- Minimal production image
- Security: read-only filesystem, dropped capabilities
