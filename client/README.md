# ForkArcade Client

## Dev

```bash
npm run dev
```

## Deploy na https://forkarcade.github.io/

Deploy działa automatycznie przez GitHub Actions.
Każdy push do `main` który zmienia `client/` lub `sdk/` buduje i publikuje klient.

### Jednorazowy setup

1. Stwórz Personal Access Token: https://github.com/settings/tokens
   → "Generate new token (classic)", scope: **repo**

2. Dodaj token jako secret w repo:
   ```bash
   gh secret set DEPLOY_TOKEN --repo ForkArcade/forkarcade-platform
   ```
   Wklej token gdy zapyta.

3. Gotowe. Od teraz `git push` = auto-deploy.

### Ręczny trigger (bez zmian w kodzie)

```bash
gh workflow run deploy-client.yml --repo ForkArcade/forkarcade-platform
```
