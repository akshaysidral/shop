# Bazario: a multi-seller marketplace (React + Material UI + Spring Boot)

**Bazario: Shop. Sell. Celebrate.** Buyers browse by category and buy; sellers list products, run their own festival
offers, ship their own orders and pay the marketplace a small **commission per sale (5% standard, 3% preferred)**;
admins run the marketplace. React + Material UI on a Spring Boot REST API with JWT login, role- and permission-based
access control, PostgreSQL, Docker and a GitHub Actions CI/CD pipeline.

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, **Material UI (MUI) 7**, React Router, Axios, Vitest + Testing Library, ESLint |
| Backend | Java 21, Spring Boot 3.3, Spring Security (JWT), Spring Data JPA, PostgreSQL, JUnit 5 + Mockito |
| DevOps | Docker, Docker Compose, GitHub Actions, GitHub Container Registry |

## Who can do what
| | Buyer | Seller | Admin |
|---|---|---|---|
| Browse, search, filter by category, see sale prices | yes | yes | yes |
| Cart, checkout, own order history | yes | yes (not their own products) | yes |
| Register themselves | yes | yes (store name required) | no (created by an admin) |
| Add / edit / delete **their own** products | no | yes | any product |
| Create festival offers for their products | no | yes (their discount and dates) | view, pause, delete any |
| See and ship orders for their products | no | yes | all orders |
| See earnings and the commission they pay | no | yes | all sellers |
| **Set a seller's commission rate** | no | no | yes |
| Manage categories, users, roles and permissions | no | no | yes |

## Seller commission
Bazario keeps a percentage of every sale. Each seller has their own rate: **5% standard**, **3% preferred**, or any
value from 0 to 30. The rate is copied onto each order line when it is sold, so changing a rate never rewrites history.
Sellers see gross sales, commission paid, net earnings, what is payable (delivered) and what is pending.
Admins set rates on **Admin panel > Sellers & commission** and see the commission earned. Details in
[`docs/MARKETPLACE.md`](docs/MARKETPLACE.md).

## Documentation map
| Read this | For |
|---|---|
| **This file** | overview and quick start |
| [`docs/MARKETPLACE.md`](docs/MARKETPLACE.md) | roles, journeys, offers, categories, **commission**, brand |
| [`frontend/README.md`](frontend/README.md) | Material UI, screens, theming, tests |
| [`backend/README.md`](backend/README.md) | database, configuration, API, permissions, tests |
| [`postman/README.md`](postman/README.md) | the Postman collection |
| [`docs/CICD-AND-GITHUB.md`](docs/CICD-AND-GITHUB.md) | GitHub, the pipeline, deployment |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | fixes for the errors people actually hit |

## Repository layout
```
shop/
├── backend/                Spring Boot API (Maven)
├── frontend/               React storefront, Seller Hub and Admin panel (Vite + MUI)
├── postman/                Postman collection
├── docs/                   extra documentation
├── .github/workflows/      CI/CD pipeline
├── docker-compose.yml      local stack (db + backend + frontend)
├── docker-compose.prod.yml server stack (pulls images from GHCR)
└── .env.example            variables for the production server
```

## Quick start (local development)
You need **JDK 21**, **Maven**, **Node 20+** and a **PostgreSQL** server.

1. **Database** (once): `CREATE USER shop WITH PASSWORD 'shop'; CREATE DATABASE shop OWNER shop;`
2. **Backend:** `cd backend && mvn spring-boot:run` (http://localhost:8080)
3. **Frontend:** `cd frontend && npm install && npm run dev` (http://localhost:3000)

Docker alternative: `docker compose up --build` (UI http://localhost, API http://localhost:8080).

### Default accounts (development only)
| Account | Email | Password | Commission |
|---|---|---|---|
| Admin | `admin@shop.local` | `Admin@12345` | n/a |
| Seller "Bazario Mart" | `seller@bazario.local` | `Seller@12345` | 5% (standard) |
| Seller "Preferred Picks" | `seller2@bazario.local` | `Seller2@12345` | 3% (preferred) |
| Buyer | register on the Login page | 6+ characters | n/a |

Bazario Mart sells Electronics, Fashion and Home & Kitchen and runs a live "Festive Bonanza" 15% sale. Preferred Picks
sells Books & Stationery, Beauty & Care and Sports & Fitness. **Change or blank these credentials in any real
environment** (`APP_ADMIN_*`, `APP_SELLER_*`, `APP_SELLER2_*`).

## Screens
- **Storefront:** search with category picker, category bar, left filters (category, price, sort, on offer, in stock),
  festival-sale strip, product cards with discount badges and "Sold by", product page, cart with price details, orders
  with per-line status.
- **Seller Hub (`/seller`):** dashboard (including commission rate and net earnings), my products, festival offers,
  orders to ship (with commission and "you earn" per line), earnings and commission.
- **Admin panel (`/admin`):** overview (including commission earned), products, categories, offers, orders,
  **sellers & commission**, users and roles.

## Common commands
| Task | Command |
|---|---|
| Run backend / tests | `cd backend && mvn spring-boot:run` / `mvn verify` |
| Run frontend | `cd frontend && npm run dev` |
| Frontend lint / tests / build | `npm run lint` / `npm test` / `npm run build` |
| Full stack in Docker | `docker compose up --build` |

## Testing
Every layer has tests: backend model, DTOs, security guard, every service (Mockito), pricing and commission maths,
and integration tests for each controller flow (including one table that checks the security of every protected
endpoint); frontend tests next to every component, page, hook and context. See the backend and frontend READMEs.

## Known gaps
- No payment step, shipping addresses or product reviews. Commission is calculated and reported; paying sellers out
  is outside this demo.
- Seller self-registration is open (no admin approval yet); product images are URLs entered by the seller.
- `ddl-auto: update` builds the schema; use Flyway migrations before production.
- The name "Bazario" and the logo were created for this project; run a trademark and domain search before commercial use.
