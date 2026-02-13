# ForkArcade Client

## Dev

```bash
npm run dev
```

## Deploy to https://forkarcade.github.io/

Deploy runs automatically via GitHub Actions.
Every push to `main` that changes `client/` or `sdk/` builds and publishes the client.

### One-time setup

1. Create a Personal Access Token: https://github.com/settings/tokens
   -> "Generate new token (classic)", scope: **repo**

2. Add the token as a secret in the repo:
   ```bash
   gh secret set DEPLOY_TOKEN --repo ForkArcade/forkarcade-platform
   ```
   Paste the token when prompted.

3. Done. From now on `git push` = auto-deploy.

### Manual trigger (without code changes)

```bash
gh workflow run deploy-client.yml --repo ForkArcade/forkarcade-platform
```
