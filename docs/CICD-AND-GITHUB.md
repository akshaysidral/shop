# CI/CD and GitHub

## 1. Push the project to GitHub
From the repo root:

```bash
# optional: create the lockfile once (CI works without it, committing it gives repeatable installs)
cd frontend && npm install && cd ..

git init -b main
git add .
git commit -m "Initial commit: Bazario marketplace"
```
**GitHub CLI (easiest):**
```bash
gh auth login
gh repo create shop --private --source=. --remote=origin --push
```
**Website:** create an *empty* repository on github.com, then:
```bash
git remote add origin https://github.com/<your-username>/shop.git
git push -u origin main
```
GitHub does not accept account passwords for git. Use `gh auth login`, SSH, or a Personal Access Token with the
`repo` and `workflow` scopes.

## 2. What the pipeline does (`.github/workflows/ci-cd.yml`)
| Job | Runs on | What |
|---|---|---|
| `backend` | every push and PR | `mvn verify` (unit and integration tests), uploads test reports |
| `frontend` | every push and PR | `npm run lint`, `npm test`, `npm run build` |
| `publish` | every push and PR | builds both Docker images; **pushes to ghcr.io only from `main`** |
| `deploy` | push to `main`, only if `DEPLOY_ENABLED=true` | copies the prod compose file to your server and restarts it |

The first three need no secrets: push and watch the **Actions** tab.

## 3. Enable deployment (optional)
1. **Server:** install Docker, `mkdir /opt/shop`, copy `.env.example` to `/opt/shop/.env` and fill it in
   (DB password, JWT secret, CORS origin, first admin).
2. **Repo > Settings > Secrets and variables > Actions**
   - Secrets: `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, `GHCR_PAT` (a token with `read:packages`)
   - Variables: `PROD_API_URL` (for example `http://YOUR_SERVER_IP:8080/api`), `DEPLOY_ENABLED` = `true`
3. **Repo > Settings > Environments:** create `production` (add required reviewers for manual approval).
4. Push to `main`.

## 4. Recommended repo settings
- Protect `main` and require the `backend` and `frontend` checks before merging.
- Work on feature branches and open pull requests; the checks run on every PR.

## 5. Before real production
Flyway migrations, HTTPS in front (Nginx/Caddy/ALB), strong secrets, no default admin password, rate limiting.
