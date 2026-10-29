# Backend (Spring Boot API)

Java 21 · Spring Boot 3.3 · Spring Security + JWT · Spring Data JPA · PostgreSQL · JUnit 5 / Mockito

## Run
```bash
cd backend
mvn spring-boot:run              # API on http://localhost:8080
mvn verify                       # compile + every test (in-memory H2, no database needed)
```
Requires JDK 21 and Maven (`brew install maven openjdk@21` on macOS).

`mvn verify` also generates the JaCoCo XML report at `target/site/jacoco/jacoco.xml` for SonarCloud. The backend project key is `akshaysidral_shop_backend`, configured in [`sonar-project.properties`](sonar-project.properties) under organization `akshaysidral`. Its analysis scope is backend services and the category-slug domain helper; this quality gate does not require a separate test for every controller or view. CI also runs the frontend SonarCloud project and waits for both quality gates.

## Database
PostgreSQL at `localhost:5432`, database `shop`, user `shop`, password `shop`.
```sql
CREATE USER shop WITH PASSWORD 'shop';
CREATE DATABASE shop OWNER shop;
```
Tables are created or updated automatically (`spring.jpa.hibernate.ddl-auto: update`).
Check the login: `PGPASSWORD=shop psql -h localhost -U shop -d shop -c "select 1;"`.

## Configuration (environment variables)
| Variable | Default | Purpose |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | local Postgres, `shop` / `shop` | database |
| `APP_JWT_SECRET` | dev-only string | JWT signing key, **32+ characters, change in production** |
| `APP_CORS_ORIGIN` | `http://localhost:3000,http://localhost:3001` | allowed browser origin(s) |
| `APP_COMMISSION_DEFAULT` | `5` | commission percent given to newly registered sellers |
| `APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD` | `admin@shop.local` / `Admin@12345` | first admin (blank email = none) |
| `APP_SELLER_EMAIL`, `APP_SELLER_PASSWORD`, `APP_SELLER_STORE` | `seller@bazario.local` / `Seller@12345` / `Bazario Mart` | demo seller at 5% (blank = none) |
| `APP_SELLER2_EMAIL`, `APP_SELLER2_PASSWORD`, `APP_SELLER2_STORE` | `seller2@bazario.local` / `Seller2@12345` / `Preferred Picks` | demo seller at 3% (blank = none) |

## Authentication and authorisation
- `POST /api/auth/register` (BUYER by default, or SELLER with a `storeName`) and `POST /api/auth/login` return a JWT.
- Send `Authorization: Bearer <token>`. **Permissions are loaded from the database on every request**, so role changes
  apply at once. Controllers use `@PreAuthorize("hasAuthority('...')")`; ownership rules (own products, offers, order
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
register       {"email","password","accountType":"BUYER|SELLER","storeName":"required for SELLER"}  -> {"token"}
login          {"email","password"}                                                                  -> {"token"}
product req    {"name","description","price":1000,"stock":10,"categoryId":3,"imageUrl":"https://..."}
product        {"id","name","description","price":1000,"finalPrice":800,"discountPercent":20,"offerName":"Diwali Sale",
                "stock","imageUrl","categoryId","categoryName","sellerId","sellerName"}
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
set commission {"percent":3}          (0 to 30)
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
| `security` | `SecurityConfig`, `JwtService`, `JwtFilter`, `AccessGuard`, `CurrentUser` |
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
| `ShopFlowTest`, `AuthFlowTest` | integration | public vs secured, register, login, validation |
| `RbacFlowTest` | integration | role CRUD, grant / revoke on the same token, escalation, protected roles, last admin |
| `MarketplaceFlowTest` | integration | seller / buyer registration, ownership, categories, search, offers, fulfilment, stats |
| `CommissionFlowTest` | integration | rates per seller, earnings, snapshot on rate change, cancellations, two sellers in one order, stats |
| `EndpointSecurityTest` | integration | every protected endpoint: 401 anonymous, 403 buyer |
| `SeederTest` | integration | roles, categories, two demo sellers at 5% / 3%, sample products |

Integration tests run on H2 with the `test` profile (admin `root@test.local` / `Root@12345`, sellers `seller@test.local`
(5%) and `seller2@test.local` (3%)).

## Production checklist
Flyway migrations, strong `APP_JWT_SECRET`, real DB credentials, HTTPS, no default admin or seller credentials,
admin approval for new sellers, rate limiting on login, refresh tokens / `HttpOnly` cookies, payouts.
