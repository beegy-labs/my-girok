# GitOps Setup Guide

This guide explains how to set up automated GitOps updates for the my-girok project.

## Overview

When code is pushed to `my-girok` repository, GitHub Actions will:

1. Build and test the application
2. Build and push Docker images to Harbor registry (environment-specific repositories)
3. Automatically update the `platform-gitops` repository with the new image tags
4. ArgoCD detects the changes and deploys the new version to the appropriate environment

### Multi-Environment Strategy

The my-girok project supports three environments:

| Environment     | Branch      | Namespace Prefix     | Domain Prefix            | ArgoCD Apps        |
| --------------- | ----------- | -------------------- | ------------------------ | ------------------ |
| **Development** | `develop`   | `dev-my-girok-*`     | `my-*-dev.girok.dev`     | 2 apps (auth, web) |
| **Staging**     | `release/*` | `staging-my-girok-*` | `my-*-staging.girok.dev` | 2 apps (auth, web) |
| **Production**  | `main`      | `prod-my-girok-*`    | `my-*.girok.dev`         | 2 apps (auth, web) |

Each environment has:

- Dedicated Kubernetes namespaces
- Separate values files in `platform-gitops`
- Independent ArgoCD Applications
- Environment-specific resource limits and configurations

## Architecture

```
my-girok (Application Code)
    |
    v
GitHub Actions CI/CD
    |
    |-- Build & Test
    |-- Build Docker Image
    |-- Push to Harbor Registry
    |
    v
Update platform-gitops Repository
    |
    v
ArgoCD (Detects changes)
    |
    v
Deploy to Kubernetes
```

## Prerequisites

### 1. Create GitHub Personal Access Token (PAT)

You need a Personal Access Token with access to the **private** `platform-gitops` repository.

**Steps:**

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Or visit: https://github.com/settings/tokens

2. Click **"Generate new token (classic)"**

3. Configure the token:
   - **Note**: `GitOps Repository Access for my-girok CI/CD`
   - **Expiration**: Choose appropriate expiration (90 days, 1 year, or no expiration)
   - **Scopes**: Select the following:
     - ✅ `repo` (Full control of private repositories)
       - ✅ `repo:status`
       - ✅ `repo_deployment`
       - ✅ `public_repo`
       - ✅ `repo:invite`
       - ✅ `security_events`

4. Click **"Generate token"**

5. **IMPORTANT**: Copy the token immediately (you won't be able to see it again)

### 2. Add Token to GitHub Secrets

1. Go to `my-girok` repository settings
   - Navigate to: `https://github.com/beegy-labs/my-girok/settings/secrets/actions`

2. Click **"New repository secret"**

3. Add the secret:
   - **Name**: `GITOPS_PAT`
   - **Value**: Paste the Personal Access Token you created
   - Click **"Add secret"**

### 3. Verify Repository Access

The GitHub Actions workflows are configured to access the private repository:

```yaml
- name: Checkout GitOps repository
  uses: actions/checkout@v4
  with:
    repository: beegy-labs/platform-gitops
    token: ${{ secrets.GITOPS_PAT }} # Uses the PAT
    path: gitops
```

## How It Works

### For `auth-service`

When code is pushed to `develop`, `main`, or `release/*` branches:

1. **Build Stage** (`.github/workflows/ci-auth-service.yml`):
   - Runs tests
   - Builds Docker image
   - Pushes to Harbor: `harbor.girok.dev/my-girok/auth-service/develop:<commit-hash>`

2. **Update GitOps Stage**:
   - Checks out `platform-gitops` repository
   - Updates `apps/my-girok/auth-service/values.yaml`
   - Changes the `image.tag` field to the new commit hash
   - Commits and pushes the change

3. **ArgoCD Stage** (automatic):
   - ArgoCD detects the change in `platform-gitops`
   - Syncs the new image tag to Kubernetes
   - Rolls out the new deployment

### For `web-girok`

Similar flow as `auth-service`, but updates:

- Image: `harbor.girok.dev/my-girok/web-girok/develop:<commit-hash>`
- GitOps file: `apps/my-girok/web-girok/values.yaml`

## Branch Strategy

| Branch         | Docker Tag        | Environment | GitOps Values File        | Namespace            |
| -------------- | ----------------- | ----------- | ------------------------- | -------------------- |
| `main`         | `latest`          | Production  | `my-girok-*-prod.yaml`    | `prod-my-girok-*`    |
| `develop`      | `<commit-hash>`   | Development | `my-girok-*-dev.yaml`     | `dev-my-girok-*`     |
| `release/*`    | `<commit-hash>`   | Staging     | `my-girok-*-staging.yaml` | `staging-my-girok-*` |
| Other branches | `<branch>-<hash>` | N/A         | ❌ No update              | N/A                  |

**Example for auth-service:**

**Develop Branch:**

- Push to `develop` with commit `abc1234567890`
- Docker repository: `harbor.girok.dev/my-girok/auth-service/develop`
- Docker tag: `abc1234` (first 7 chars)
- Updates: `clusters/home/values/my-girok-auth-service-dev.yaml` → `tag: "abc1234"`
- Deployed to: `dev-my-girok-service` namespace
- Domain: `my-api-dev.girok.dev/auth`

**Release Branch:**

- Push to `release/v1.0` with commit `def5678901234`
- Docker repository: `harbor.girok.dev/my-girok/auth-service/release`
- Docker tag: `def5678` (first 7 chars)
- Updates: `clusters/home/values/my-girok-auth-service-staging.yaml` → `tag: "def5678"`
- Deployed to: `staging-my-girok-service` namespace
- Domain: `my-api-staging.girok.dev/auth`

**Main Branch:**

- Push to `main` (after release merge)
- Docker repository: `harbor.girok.dev/my-girok/auth-service`
- Docker tag: `latest`
- Updates: `clusters/home/values/my-girok-auth-service-prod.yaml` → `tag: "latest"`
- Deployed to: `prod-my-girok-service` namespace
- Domain: `my-api.girok.dev/auth`

## GitOps Commit Format

The automated commits to `platform-gitops` follow this format:

**Development:**

```
chore(development): update auth-service image to abc1234

Updated by GitHub Actions from my-girok@abc1234567890abcdef1234567890abcdef12345
Branch: develop
Environment: development
```

**Staging:**

```
chore(staging): update auth-service image to def5678

Updated by GitHub Actions from my-girok@def5678901234567890abcdef1234567890abcdef
Branch: release/v1.0
Environment: staging
```

**Production:**

```
chore(production): update auth-service image to latest

Updated by GitHub Actions from my-girok@123456789abcdef01234567890abcdef12345678
Branch: main
Environment: production
```

## Troubleshooting

### Issue: "Permission denied" when pushing to GitOps repo

**Cause**: The `GITOPS_PAT` secret is missing or has insufficient permissions.

**Solution**:

1. Verify the secret exists: Settings → Secrets and variables → Actions
2. Check the PAT has `repo` scope
3. Ensure the PAT hasn't expired
4. Regenerate the PAT if necessary

### Issue: GitOps update job fails but image is pushed

**Cause**: The `platform-gitops` repository structure doesn't match expected paths.

**Solution**:

1. Check the environment-specific values files exist:
   - Development: `clusters/home/values/my-girok-auth-service-dev.yaml`
   - Staging: `clusters/home/values/my-girok-auth-service-staging.yaml`
   - Production: `clusters/home/values/my-girok-auth-service-prod.yaml`

2. Verify each file has the correct structure:

   ```yaml
   image:
     repository: harbor.girok.dev/my-girok/auth-service/develop # Environment-specific repository
     pullPolicy: Always
     tag: 'abc1234' # This line gets updated by CI/CD
   ```

3. Check the ApplicationSet references the correct values files:
   ```yaml
   - component: my-girok-auth-service-dev
     path: apps/my-girok/auth-service
     valuesFile: my-girok-auth-service-dev.yaml
     namespace: dev-my-girok-service
   ```

### Issue: ArgoCD doesn't detect changes

**Cause**: ArgoCD sync settings or repository connection.

**Solution**:

1. Check ArgoCD Application settings
2. Verify ArgoCD has access to `platform-gitops` repository
3. Check sync interval (default: 3 minutes)
4. Manually sync in ArgoCD UI if needed

## Manual Override

If you need to manually update the image tag for a specific environment:

**Development:**

```bash
# Clone platform-gitops
git clone git@github.com:beegy-labs/platform-gitops.git
cd platform-gitops

# Update the development values file
vim clusters/home/values/my-girok-auth-service-dev.yaml

# Change the tag:
# image:
#   tag: "new-dev-tag"

# Commit and push
git add clusters/home/values/my-girok-auth-service-dev.yaml
git commit -m "chore(development): manually update auth-service to new-dev-tag"
git push
```

**Staging:**

```bash
vim clusters/home/values/my-girok-auth-service-staging.yaml
# Update tag and commit with: chore(staging): ...
```

**Production:**

```bash
vim clusters/home/values/my-girok-auth-service-prod.yaml
# Update tag and commit with: chore(production): ...
```

## Security Best Practices

1. **Token Expiration**: Set an expiration date for PATs (90-180 days recommended)
2. **Token Rotation**: Rotate tokens periodically
3. **Least Privilege**: Only grant `repo` scope (no admin or workflow permissions needed)
4. **Audit Logs**: Monitor GitHub Actions logs for unauthorized access
5. **Secret Management**: Never commit tokens to the repository

## Monitoring

### Check GitHub Actions

```bash
# View recent workflow runs
gh run list --repo beegy-labs/my-girok

# View specific run
gh run view <run-id> --repo beegy-labs/my-girok

# Watch live logs
gh run watch <run-id> --repo beegy-labs/my-girok
```

### Check GitOps Repository

```bash
# View recent commits to platform-gitops
cd /path/to/platform-gitops
git log --oneline -10 -- apps/my-girok/
```

### Check ArgoCD

```bash
# View application status
argocd app get auth-service

# View sync history
argocd app history auth-service
```

## Adding New Services

To add GitOps automation for a new service:

1. **Create GitHub Actions workflow** in my-girok:

   ```yaml
   # .github/workflows/ci-new-service.yml
   # Copy from ci-auth-service.yml and modify service name
   ```

2. **Create Helm chart** in platform-gitops:

   ```bash
   mkdir -p apps/my-girok/new-service
   # Add Chart.yaml, values.yaml, templates/
   ```

3. **Update workflow** to point to correct values file:

   ```yaml
   VALUES_FILE="apps/my-girok/new-service/values.yaml"
   ```

4. **Test the workflow**:
   ```bash
   # Push a change to trigger CI/CD
   git push origin develop
   ```

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Creating a Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://opengitops.dev/)
