# Backend (Spring Boot API)

Java 21 · Spring Boot 3.3 · Spring Security sessions · Spring Session JDBC · Spring Data JPA · PostgreSQL · JUnit 5 / Mockito

## Run
```bash
docker compose up -d db        # start the local PostgreSQL container
cd backend
mvn spring-boot:run              # API on http://localhost:8080
mvn verify                       # compile + every test (in-memory H2, no database needed)
```
Requires JDK 21 and Maven (`brew install maven openjdk@21` on macOS).

To run the backend with Maven against your local PostgreSQL server and the Compose frontend:
```bash
docker compose stop backend
docker compose up -d db frontend
cd backend
mvn spring-boot:run
```
The database is PostgreSQL running in the Docker Compose `db` container; it is not a separately installed local database. When the backend runs with Maven on your machine, it connects through `localhost:5433`. When the backend runs as a Compose container, it connects to `db:5432`.

`mvn spring-boot:run` is enough for the local database defaults (`localhost:5433`, user/password `shop`). Spring Boot does not load `.env` automatically, so only source it if you need its overrides (for example, to enable S3):
```bash
set -a && source ../.env && set +a && mvn spring-boot:run
```
For local S3 image uploads with Maven, the host AWS CLI profile must be available; if it uses SSO, run `aws sso login --profile <profile>` before starting the app. The Compose backend mounts `~/.aws` read-only. Set the profile name, bucket and region in `.env` to match your AWS setup. The Compose database persists data in the `pgdata` volume. Do not commit real credentials.

`mvn verify` also generates the JaCoCo XML report at `target/site/jacoco/jacoco.xml` for SonarCloud. The backend project key is `akshaysidral_shop_backend`, configured in [`sonar-project.properties`](sonar-project.properties) under organization `akshaysidral`. Its analysis scope is backend services and the category-slug domain helper; this quality gate does not require a separate test for every controller or view. CI also runs the frontend SonarCloud project and waits for both quality gates.

## Database
For local Docker Compose development, PostgreSQL is available at `localhost:5433`, database `shop`, with the development credentials `shop` / `shop` from the root `.env`. For a separately installed PostgreSQL server, set `DB_URL`, `DB_USER`, and `DB_PASSWORD` to match that server.
```sql
CREATE DATABASE shop;
```
Tables are created or updated automatically (`spring.jpa.hibernate.ddl-auto: update`).
Check the Compose database login: `PGPASSWORD=shop psql -h localhost -p 5433 -U shop -d shop -c "select 1;"`.

## Configuration (environment variables)
| Variable | Default | Purpose |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | local Postgres, `shop` / `shop` | database |
| `APP_SESSION_COOKIE_SECURE` | `false` for local HTTP | set `true` when served over HTTPS |
| `APP_SESSION_COOKIE_SAME_SITE` | `Lax` | set `None` with `Secure=true` only when the frontend and API are cross-site |
| `server.servlet.session.timeout` | `30m` | server-side session lifetime |
| `APP_CORS_ORIGIN` | `http://localhost,http://localhost:3000,http://localhost:3001` | allowed browser origin(s) |
| `APP_COMMISSION_DEFAULT` | `5` | commission percent given to newly registered sellers |
| `APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD` | `admin@shop.local` / `Admin@12345` | first admin (blank email = none) |
| `APP_SELLER_EMAIL`, `APP_SELLER_PASSWORD`, `APP_SELLER_STORE` | `seller@bazario.local` / `Seller@12345` / `Bazario Mart` | demo seller at 5% (blank = none) |
| `APP_SELLER2_EMAIL`, `APP_SELLER2_PASSWORD`, `APP_SELLER2_STORE` | `seller2@bazario.local` / `Seller2@12345` / `Preferred Picks` | demo seller at 3% (blank = none) |
| `APP_S3_ENABLED` | `false` | enable S3-backed product image uploads and private image reads |
| `APP_S3_BUCKET` | `bazario-app` | private product-image bucket name |
| `APP_S3_REGION` | `ap-south-1` | AWS region for the bucket |
| `APP_S3_UPLOAD_URL_EXPIRATION_SECONDS` | `300` | presigned upload URL lifetime (1-900 seconds) |
| `APP_S3_READ_URL_EXPIRATION_SECONDS` | `3600` | presigned image read URL lifetime (1-604800 seconds) |

When S3 is enabled, the backend uses the AWS SDK default credentials provider chain (for example, an attached IAM role, environment-provided credentials, or a local AWS profile). Do not place AWS credentials in frontend variables or commit them. The backend identity needs `s3:PutObject` and `s3:GetObject` for `arn:aws:s3:::<APP_S3_BUCKET>/product/*`. Keep S3 Block Public Access enabled. No bucket ARN or IAM role ARN is configured in `application.yml`; only the bucket name and region are needed there.

If the upload endpoint returns `503 Image uploads are not configured`, enable S3 for the backend with `APP_S3_ENABLED=true`, set `APP_S3_BUCKET` and `APP_S3_REGION`, and restart/recreate the backend. In Docker Compose deployments, add these values to the Compose `.env` file; the Compose files pass them through to the backend. The backend must also have valid AWS credentials through the default credentials provider chain.

Configure S3 bucket CORS separately from the application. For local development, allow the exact frontend origin (adjust if using port 3001):
```json
[
  {
    "AllowedOrigins": ["http://localhost"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```
For deployment, add the exact HTTPS frontend origin to `AllowedOrigins`; do not use `*` with credentialed application requests.

## Authentication and authorisation
- `POST /api/auth/register` (BUYER by default, or SELLER with a `storeName`) and `POST /api/auth/login` create a server-side session. The browser receives only the `HttpOnly` `SHOP_SESSION` cookie; no JWT or identity claims are returned.
- `GET /api/auth/csrf` provides a CSRF token for the `X-XSRF-TOKEN` header on unsafe requests. Spring Session JDBC stores sessions in the database.
- `POST /api/auth/logout` invalidates the server-side session.
- Browser clients must use credentialed requests. Configure exact `APP_CORS_ORIGIN` values and set `APP_SESSION_COOKIE_SECURE=true` when served over HTTPS. For cross-site frontend/API hosting, also set `APP_SESSION_COOKIE_SAME_SITE=None`.
- **Permissions are loaded from the database on every request**, so role changes apply at once. Controllers use `@PreAuthorize("hasAuthority('...')")`; ownership rules (own products, offers, order
  lines) are checked in the services. See [`../docs/MARKETPLACE.md`](../docs/MARKETPLACE.md).

## Commission
- Each seller has `commissionPercent` (null = the marketplace default). New sellers are saved with the default (5).
- At checkout every order line stores a **snapshot**: `commissionPercent`, `commissionAmount` and `sellerEarning`
  (`Commission.split`: commission = line total x percent / 100, rounded half-up to 2 decimals; earning = the rest).
  Changing a rate later only affects future orders.
- Cancelled lines carry no commission. Lines from before commissions existed count as 0% (the seller keeps the total).
- `GET /api/seller/earnings` reports gross sales, commission, net earnings, **payable** (delivered lines) and
  **pending** (placed or shipped lines). `GET /api/admin/stats` includes platform `revenue` and `commission`.
- Only `COMMISSION_MANAGE` (admin) can set a rate; the allowed range is 0 to 30.

## Endpoints
| Method | Path | Needs |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET | `/actuator/health` | public |
| GET | `/api/me` | logged in |
| GET | `/api/products` (`?q=&categoryId=&sellerId=`), `/api/products/{id}` | public |
| POST / PUT / DELETE | `/api/products`, `/api/products/{id}` | `PRODUCTS_CREATE` / `_UPDATE` / `_DELETE`; own product unless `PRODUCTS_MANAGE_ALL` |
| GET | `/api/categories` | public |
| POST / PUT / DELETE | `/api/categories`, `/api/categories/{id}` | `CATEGORIES_MANAGE` |
| GET | `/api/offers/active` | public |
| GET | `/api/offers` | `OFFERS_MANAGE` (own) or `OFFERS_MANAGE_ALL` (all) |
| POST | `/api/offers` | `OFFERS_MANAGE` |
| PUT / DELETE | `/api/offers/{id}` | owner with `OFFERS_MANAGE`, or `OFFERS_MANAGE_ALL` |
| POST / GET | `/api/orders` | logged in (place / list own orders) |
| GET | `/api/seller/products` | `PRODUCTS_CREATE` |
| POST | `/api/seller/products/{productId}/image-upload-url` | `PRODUCTS_CREATE`; product owner (or `PRODUCTS_MANAGE_ALL`); returns a 5-minute presigned PUT URL for JPEG, PNG, or WebP images up to 5 MiB; call once per image, with no image-count limit |
| GET | `/api/seller/orders` | `SELLER_ORDERS_READ` |
| GET | `/api/seller/earnings` | `SELLER_ORDERS_READ` |
| PATCH | `/api/seller/orders/{orderId}/items/{itemId}/status` | `SELLER_ORDERS_UPDATE` and owner of the line (or `ORDERS_UPDATE`) |
| GET | `/api/orders/all` | `ORDERS_READ_ALL` |
| PATCH / DELETE | `/api/orders/{id}/status`, `/api/orders/{id}` | `ORDERS_UPDATE` / `ORDERS_DELETE` |
| GET | `/api/admin/stats` | `STATS_READ` |
| GET | `/api/admin/sellers` | `COMMISSION_MANAGE` |
| PUT | `/api/admin/sellers/{id}/commission` | `COMMISSION_MANAGE` |
| GET | `/api/permissions`, `/api/roles`, `/api/roles/{id}` | `ROLES_READ` |
| POST / PUT / DELETE | `/api/roles`, `/api/roles/{id}` | `ROLES_CREATE` / `_UPDATE` / `_DELETE` |
| GET | `/api/users`, `/api/users/{id}` | `USERS_READ` |
| PUT | `/api/users/{id}/roles` | `USERS_UPDATE` |
| DELETE | `/api/users/{id}` | `USERS_DELETE` |

### Request and response shapes (see `web/Dtos.java`)
```
register       {"email","password","accountType":"BUYER|SELLER","storeName":"required for SELLER"}  -> {"token"} + HttpOnly refresh cookie
login          {"email","password"}                                                                  -> {"token"} + HttpOnly refresh cookie
refresh        refresh cookie                                                                       -> {"token"} + rotated HttpOnly refresh cookie
logout         refresh cookie                                                                       -> 204 + cleared cookie
product req    {"name","description","price":1000,"stock":10,"categoryId":3,"imageUrls":["<object-key-1>","<object-key-2>"]}
product        {"id","name","description","price":1000,"finalPrice":800,"discountPercent":20,"offerName":"Diwali Sale",
                "stock","images":[{"url":"<signed-url>","key":"<object-key>"}],
                "categoryId","categoryName","sellerId","sellerName"}
category       {"id","name","icon":"phone","productCount"}      request: {"name","icon"}     (icon = a short key)
offer req      {"name","discountPercent":20,"startsAt":"2026-10-20T00:00:00Z","endsAt":"...","active":true,
                "appliesToAll":false,"productIds":[7,8]}
offer          the request + {"id","sellerId","sellerName","status":"LIVE|SCHEDULED|ENDED|PAUSED"}
checkout       {"items":[{"productId":1,"quantity":2}]}
order          {"id","userEmail","status","createdAt","total","items":[{"id","productId","name","unitPrice","quantity","sellerName","status"}]}
seller line    {"orderId","itemId","createdAt","buyer":"a***@b.com","productId","productName","unitPrice","quantity","status",
                "commissionPercent":5,"commission":50.00,"earning":950.00}
earnings       {"commissionPercent","grossSales","commission","netEarnings","payable","pending","unitsSold"}
seller summary {"id","email","storeName","commissionPercent","unitsSold","grossSales","commission"}
image upload  POST /api/seller/products/{productId}/image-upload-url once per image with {"contentType":"image/png","fileSizeBytes":1024}
              -> {"objectKey":"product/{productId}_{product-name}/{uuid}.png","uploadUrl","expiresAt","requiredHeaders"}
              PUT each file to its uploadUrl, then save all objectKeys in imageUrls. The first entry is the primary image.
              Product responses include temporary private-S3 URLs and keys for each image.
set commission {"percent":3}           (0 to 30)
user           {"id","email","storeName","commissionPercent","roles":[...],"permissions":[...]}
stats          {"users","buyers","sellers","products","orders","revenue","commission"}
```
Errors: `400` invalid body/rules, `401` no or invalid token, `403` missing permission / not the owner, `404` unknown id,
`409` conflict (duplicate, in use, protected, last admin, insufficient stock, own product, not a seller).

## Code map (`src/main/java/com/example/shop`)
| Package | Contents |
|---|---|
| `model` | `User`, `Role`, `Permission`, `AccountType`, `Category`, `Product`, `Offer`, `Order` (+ `recomputeStatus`), `OrderItem` (commission snapshot), `OrderStatus` |
| `repo` | Spring Data repositories (products use JPA Specifications) |
| `security` | `SecurityConfig`, `JwtService`, `JwtFilter`, `AuthTokenService`, `AccessGuard`, `CurrentUser` |
| `service` | `Commission` (maths), `CommissionService`, `PricingService`, `ProductService`, `OfferService`, `CategoryService`, `OrderService`, `RoleService`, `UserService`, `StatsService` |
| `web` | REST controllers (`Auth`, `Product`, `Category`, `Offer`, `Order`, `Seller`, `Admin`, `Role`, `User`) and `Dtos` |
| `DataSeeder` | roles, categories, first admin, two demo sellers (5% / 3%), sample products and a sale |

## Tests (`mvn verify`)
| Test | Layer | Covers |
|---|---|---|
| `CommissionTest` | unit | 5% / 3% splits, rounding, zero, always sums to the sale |
| `CommissionServiceTest` | unit | default and own rates, range and role rules, earnings (payable / pending / cancelled), seller list |
| `PricingServiceTest` | unit | list price, offers (all / listed), best of several, other sellers ignored, rounding |
| `OrderServiceTest` | unit | offer price, commission snapshot at 5% and 3%, stock, own-product rule, line ownership, statuses, cancel/delete |
| `ProductServiceTest`, `OfferServiceTest`, `CategoryServiceTest` | unit | create / update / delete rules, ownership, validation, offer status |
| `RoleServiceTest`, `UserServiceTest`, `StatsServiceTest` | unit | protected roles, escalation guard, last admin, totals |
| `ModelTest`, `DtosTest`, `AccessGuardTest`, `JwtServiceTest` | unit | entities, DTO mapping and masking, permission guard, tokens |
| `ShopFlowTest`, `AuthFlowTest` | integration | public vs secured, register, login, validation, refresh rotation/reuse, logout revocation |
| `RbacFlowTest` | integration | role CRUD, grant / revoke on the same token, escalation, protected roles, last admin |
| `MarketplaceFlowTest` | integration | seller / buyer registration, ownership, categories, search, offers, fulfilment, stats |
| `CommissionFlowTest` | integration | rates per seller, earnings, snapshot on rate change, cancellations, two sellers in one order, stats |
| `EndpointSecurityTest` | integration | every protected endpoint: 401 anonymous, 403 buyer |
| `SeederTest` | integration | roles, categories, two demo sellers at 5% / 3%, sample products |

Integration tests run on H2 with the `test` profile (admin `root@test.local` / `Root@12345`, sellers `seller@test.local`
(5%) and `seller2@test.local` (3%)).

## Production checklist
Flyway migrations, real DB credentials, HTTPS with secure session cookies, no default admin
or seller credentials, admin approval for new sellers, rate limiting on login, payouts.
