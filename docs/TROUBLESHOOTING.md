# Troubleshooting

## Backend will not start
| Symptom | Cause and fix |
|---|---|
| `Could not find or load main class ...ShopApplication` | The project did not compile. Run `mvn clean compile` and read the first `[ERROR]` line. Often a mix of old and new files: replace the whole `backend/src` folder. In VS Code also run **Java: Clean Java Language Server Workspace**. |
| `mvn: command not found` | `brew install maven openjdk@21`, then open a new terminal and check `mvn -v`. |
| `FATAL: password authentication failed for user "shop"` | The database user is missing or has another password. In `psql` as a superuser: `CREATE USER shop WITH PASSWORD 'shop';` (or `ALTER USER shop WITH PASSWORD 'shop';`) and `CREATE DATABASE shop OWNER shop;`. Also check `echo $DB_USER $DB_PASSWORD`; those env vars override the defaults. |
| `psql: command not found` (macOS EDB installer) | `/Library/PostgreSQL/<version>/bin/psql -U postgres -h localhost`, or add that folder to `PATH`. |
| `syntax error at or near "default"` on `alter table ... orders` | An old `columnDefinition = "... default ..."` on an entity column. Remove `columnDefinition` (the `status` field is `@Enumerated(EnumType.STRING) @Column(length = 20)`). |
| Ran a shell command inside `psql` (prompt shows `postgres-#`) | Type `\r` to clear the buffer, `\q` to leave, then run shell commands in the normal terminal. |

## API returns errors
| Symptom | Cause and fix |
|---|---|
| `401` on `/api/me` or any protected URL | No valid token. Log in at `POST /api/auth/login`, then send `Authorization: Bearer <token>` (Postman: Authorization tab > Bearer Token, paste only the token). Credentials are never sent to `/api/me`. |
| `401` on login | Wrong email/password, or the admin account was not created (check `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD`). |
| `403` | Token is valid but the user lacks the permission, or tried to grant a permission they do not hold. Check `GET /api/me`. |
| Empty 401 hiding the real error | `/error` must be permitted in `SecurityConfig` (it is in this project). |
| Postman sees nothing in the terminal | Spring does not log requests by default. Add `logging.level.org.springframework.security=DEBUG` temporarily. |

## Frontend
| Symptom | Cause and fix |
|---|---|
| `npm: ... uv_cwd` / `no such file or directory` | The terminal's folder was deleted/replaced. `cd /path/to/shop/frontend` again. |
| `eslint: command not found` | Broken install: `rm -rf node_modules package-lock.json && npm install`. |
| "Could not load products. Is the backend running?" | Start the backend; open exactly `http://localhost:5173` (CORS allows that origin). |
| CORS error with another port | Set `APP_CORS_ORIGIN=http://localhost:<port>` and restart the backend. |
| A Vitest test fails with an error that is not an assertion | Check for a `beforeEach(() => mock.mockReset())` that returns the mock. Use braces so nothing is returned. |
| `npm audit` reports vulnerabilities | Check `npm audit --omit=dev` for what reaches production; avoid `npm audit fix --force`. |

## Tests
- Backend: `cd backend && mvn verify`
- Frontend: `cd frontend && npm test`
- Both run in CI; open the failing job's log in the GitHub **Actions** tab.

## Marketplace specifics
| Symptom | Cause and fix |
|---|---|
| Seller Hub / Admin panel link missing | The user lacks `PRODUCTS_CREATE` (seller) or `STATS_READ` (admin). Check `GET /api/me`. Log in again after role changes only if the UI looks stale; permissions apply server-side immediately. |
| `409 You cannot buy your own product` | Sellers cannot buy their own items. Use a buyer account. |
| `403 You can only change your own products` | The product belongs to another seller. Only owners (or `PRODUCTS_MANAGE_ALL`) can change it. |
| Offer returns 400 | End must be after start, discount 1-90, at least one product (or apply to all), and only your own products. |
| Sale price not showing | The offer must be active and currently between its start and end; check its status (LIVE / SCHEDULED / ENDED / PAUSED). |
| Sample products missing a seller/category after upgrading | Start the backend once with the demo seller configured (`APP_SELLER_EMAIL`); it adopts old products. |
| `ProductList` test: "unexpected request" | The mocked `api.get` must answer every URL the page calls (`/products`, `/categories`, `/offers/active`). |

## Commission
| Symptom | Cause and fix |
|---|---|
| Seller Earnings shows 0% commission | The account was created before commissions existed or has no rate; the marketplace default (5%) applies to new orders. An admin can set the rate under Admin > Sellers & commission. |
| Old order lines show 0% commission | Lines sold before commissions existed have no snapshot; they count as 0% and the seller keeps the full amount. |
| `409 That user is not a seller` | Only users with the SELLER role can have a commission rate. |
| `400` when setting a rate | The rate must be between 0 and 30. |
| Rate change did not alter old orders | By design: each line keeps the rate it was sold at; only new orders use the new rate. |
| Admin sidebar has no "Sellers & commission" | The user lacks `COMMISSION_MANAGE`. |

## Material UI and tests
| Symptom | Cause and fix |
|---|---|
| Vitest: "Element type is invalid" for an `@mui/icons-material` icon | `vite.config.ts` must inline `@mui/*` (`test.server.deps.inline: [/@mui\//]`); it does in this project. |
| `getByRole` cannot find an element that looks visible | jsdom treats `display: { xs: "none" }` as hidden; query with `getByLabelText` or avoid hiding it at the base breakpoint. |
| Tests are slow on the first run | MUI is large; the first import is cached afterwards. |
| TypeScript error about `Grid` | This project does not use MUI `Grid` (its API changed between majors); use `Box` with `display: "grid"`. |
| Category icons show a tag | Older databases stored Bootstrap icon names; they are mapped automatically. Unknown names fall back to the tag icon. |
