# CI/CD workflow guide

This guide explains [`ci-cd.yml`](./ci-cd.yml), how it protects changes, and how to adapt the same ideas for another project.

## What this pipeline does

The workflow has five jobs:

1. **Backend (build and test)** checks out the repository, sets up Java 21 with Maven caching, runs `mvn -B verify` in `backend/`, and uploads test reports, compiled classes, and JaCoCo coverage for SonarQube.
2. **Frontend (lint, test, build)** installs the locked npm dependencies with `npm ci`, then runs ESLint, Vitest with LCOV coverage, and the Next.js production build from `frontend/`.
3. **SonarQube (backend and frontend quality gates)** runs after both validation jobs when `SONAR_ENABLED` is `true`. It imports the coverage reports and runs separate scans against the backend and frontend project configurations. Each scan waits for its own server quality-gate result.
4. **Docker images** waits for backend and frontend validation and for SonarQube to pass when enabled. It builds backend and frontend images. On pull requests it builds without pushing. On a push to `main` it logs in to GitHub Container Registry (GHCR) and pushes images tagged with the commit SHA and `latest`.
5. **Deploy to server** runs only after publishing succeeds, only for a push to `main`, and only when the repository variable `DEPLOY_ENABLED` is exactly `true`. It copies the production Compose file to the server, pulls the images, and restarts the services.

The `concurrency` setting groups runs by Git ref and cancels older pull-request runs when a newer commit is pushed to that PR. The workflow starts with read-only repository permissions; the publish job separately grants package-write access.

## How a change flows through it

```text
feature/* or bugfix/*
        │
        └── Pull request to dev
              ├── Backend and frontend checks run
              ├── Docker images are built but not pushed
              └── GitHub ruleset requires checks and review
                       │
                       └── Merge to dev
                              │
                              └── Promote with a PR to tst → stg → main
                                     └── Push to main publishes images
                                          └── Optional production deployment
```

The workflow runs validation on pull requests regardless of their base branch. The current `push` trigger is limited to `main`; merging to `dev`, `tst`, or `stg` does not independently trigger a push run. Each protected branch needs a GitHub ruleset if merges into it must require reviews and successful checks.

## Configure this repository

### 1. Configure rulesets

In **Settings → Rules → Rulesets**, create or update an active branch ruleset for each protected environment branch:

- Require pull requests before merging.
- Require the relevant CI status checks to pass. For `dev`, the job names are **Backend (build and test)** and **Frontend (lint, test, build)**. After enabling SonarQube and seeing it run once, also require **SonarQube (backend and frontend quality gates)**.
- For a single-maintainer repository, set **Required approvals** to `0`: GitHub does not allow the PR author to approve their own pull request. Keep pull requests and CI checks required. In a team repository, require the number of independent approvals your policy needs.
- Require conversation resolution. If approvals are required, dismiss stale approvals and consider requiring approval of the latest push.
- Block force pushes and restrict deletions.
- Require branches to be up to date if you want checks against the latest target-branch commit.

Status checks must have run at least once before GitHub offers them in the required-check picker. Create a pull request, wait for the workflow to finish, then select the checks in the ruleset.

### 2. Configure SonarQube

The repository includes separate configurations: [`backend/sonar-project.properties`](../../backend/sonar-project.properties) and [`frontend/sonar-project.properties`](../../frontend/sonar-project.properties). Each scan has its own SonarQube project and quality gate. The inclusions limit analysis to backend services and category slug generation, and frontend catalog/auth/cart/data-access logic; page and presentation component files are excluded. The scans import backend JaCoCo XML and frontend Vitest LCOV coverage.

1. Create two SonarQube projects with keys `akshaysidral_shop_backend` and `akshaysidral_shop_frontend` (or update `sonar.projectKey` in each configuration to match the keys you create).
2. Create a SonarQube token with permission to analyze both projects.
3. In **Settings → Secrets and variables → Actions**, add the `SONAR_TOKEN` secret and these repository variables:

   | Name | Value |
   |---|---|
   | `SONAR_HOST_URL` | Your SonarQube server URL, for example `https://sonar.example.com` |
   | `SONAR_ENABLED` | `true` to enable the SonarQube job |

4. Configure each project to use the **Sonar way** quality gate (or an organization-approved equivalent). The workflow waits for each server result, so a failed backend or frontend gate fails the CI job.
5. Run a pull request to publish the check, then add **SonarQube (backend and frontend quality gates)** to the required checks for protected branches.

The Sonar job skips fork-originated pull requests because GitHub does not expose repository secrets to those workflows. For SonarCloud, use its host URL and create/configure the project in the correct organization before enabling the job.

### 3. Configure production deployment

### 2. Configure production deployment

The deploy job expects:

| Setting | Type | Purpose |
|---|---|---|
| `DEPLOY_ENABLED` | Repository variable | Must be `true` to enable deployment after a push to `main`. Keep unset or false to leave deployment disabled. |
| `PROD_API_URL` | Repository variable | Public API base URL embedded into the frontend image at build time. Set it to the deployed API URL ending in `/api`. |
| `SERVER_HOST` | Production environment secret | SSH hostname or IP address. |
| `SERVER_USER` | Production environment secret | SSH account for deployment. |
| `SERVER_SSH_KEY` | Production environment secret | Private SSH key used by the copy and SSH actions. |
| `GHCR_PAT` | Production environment secret | Token that allows the server to pull private GHCR images. Store a least-privilege token with package-read access. |

Add these in **Settings → Environments → production** for deployment secrets, and in **Settings → Secrets and variables → Actions → Variables** for repository variables. Protect the production environment with required reviewers if deployment approval is desired. Never put secret values in this file or commit them to Git.

The workflow uses `GITHUB_TOKEN` to push images. Ensure the repository's Actions settings permit the workflow to write packages. The deployment server must have Docker and the Compose plugin installed, be reachable by SSH from GitHub-hosted runners, and have access to pull the repository's GHCR packages.

## Adapt it to another project

Use the workflow as a pattern, not a copy-and-paste template:

1. **Map the project structure.** Update working directories, runtime versions, package managers, build commands, test commands, and Docker build contexts.
2. **Create fast validation jobs.** Separate independent backend/frontend checks so they can run in parallel. Make failures stop dependent jobs.
3. **Use lockfile-based installs.** Prefer reproducible commands such as `npm ci`; use the equivalent locked install for the project's package manager.
4. **Keep secrets out of YAML.** Store credentials in GitHub Environments or Actions secrets and use different credentials for each environment.
5. **Protect each target branch.** Require PRs, reviews, and passing status checks in GitHub rulesets; the workflow by itself does not prevent direct pushes or merges.
6. **Build once and promote the same artifact.** For mature deployment pipelines, publish immutable image tags (such as the commit SHA) and deploy that exact image through test, staging, and production instead of rebuilding separately in each environment.
7. **Add environment deployments deliberately.** Use separate GitHub Environments, approvals, variables, and secrets. Add deployment jobs only after the target environment and rollback procedure are ready.
8. **Run a trial PR.** Confirm the checks appear with stable names and that the branch rules block merging when a required check fails.

## Troubleshooting

| Symptom | Check |
|---|---|
| Required check is not selectable in a ruleset | Run a PR through the workflow first. Select the job check names, not an individual step such as `Lint`. |
| Frontend lint fails on generated Next.js files | Keep `.next/**` and `next-env.d.ts` excluded in `frontend/eslint.config.js`. |
| Docker images build but are not published | Publishing occurs on pushes to `main`; pull-request builds intentionally do not push. Check the `PUSH` condition and package permissions. |
| Deployment is skipped | Confirm the event is a push to `main`, `publish` succeeded, `DEPLOY_ENABLED` is exactly `true`, and the production environment is configured. |
| Deployment cannot pull from GHCR | Check that `GHCR_PAT` is valid and can read the packages, and that image access is allowed for the server. |
| Frontend calls the wrong API | `NEXT_PUBLIC_API_URL` is a Docker build argument and is embedded during the Next.js build. Set `PROD_API_URL` before publishing a new image. |
