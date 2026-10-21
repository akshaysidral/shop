# Marketplace guide

## 1. Roles and permissions
A **permission** is one allowed action, a **role** is a named set of permissions, a user can hold several roles.
Permissions are read from the database on every request, so changes apply immediately.

| Built-in role | Gets it how | Permissions |
|---|---|---|
| **BUYER** | default for self-registration | none (any logged-in user may shop, order and see their own orders) |
| **SELLER** | self-registration as a seller (store name required) | `PRODUCTS_CREATE/UPDATE/DELETE` (own products), `OFFERS_MANAGE` (own offers), `SELLER_ORDERS_READ/UPDATE` (own order lines, earnings) |
| **ADMIN** | created at startup / assigned by an admin | every permission (cannot be edited or deleted) |

| Area | Permissions |
|---|---|
| Access control | `ROLES_READ/CREATE/UPDATE/DELETE`, `USERS_READ/UPDATE/DELETE`, `STATS_READ` |
| Catalogue | `CATEGORIES_MANAGE`, `PRODUCTS_CREATE/UPDATE/DELETE` (own), `PRODUCTS_MANAGE_ALL` (any) |
| Offers | `OFFERS_MANAGE` (own), `OFFERS_MANAGE_ALL` (any) |
| Orders | `SELLER_ORDERS_READ/UPDATE` (own lines), `ORDERS_READ_ALL`, `ORDERS_UPDATE`, `ORDERS_DELETE` |
| Commission | `COMMISSION_MANAGE` (set seller rates, list sellers with their commission) |

Custom roles can be created in the Admin panel, for example a *finance* role with `COMMISSION_MANAGE` + `STATS_READ`.
Safety rules: you can only grant or revoke permissions you hold; built-in roles are protected; the last ADMIN cannot be
demoted or deleted; self-registration can never produce an ADMIN, and sellers can never set their own commission.

## 2. Buyer journey
Browse (category bar, list, search with category picker, filters), open a product (seller, list and sale price, offer
name), add to cart or Buy now, see price details with the offer discount, place the order (login required), follow each
line's status under My orders. The price paid is saved on the order line. A seller cannot buy their own product.

## 3. Seller journey (Seller Hub, `/seller`)
1. Register through **Sell on Bazario** (store name required). New sellers start on the standard commission rate.
2. **My products:** add, edit, delete (own products only), category and optional image URL.
3. **Festival offers:** pick a festival (Diwali, Holi, Eid, Christmas, New Year, Republic Day, Independence Day, Black
   Friday, End of Season or custom), a discount of 1 to 90%, start and end, and all products or selected ones.
   Offers can be paused or resumed.
4. **Orders to ship:** lines for the seller's products (buyer email masked). Mark shipped, delivered or cancelled;
   cancelling returns the stock. Each line shows the commission and what the seller earns.
5. **Earnings:** gross sales, commission paid, net earnings, payable and pending, with a line-by-line breakdown.

### How offers change prices
`price` is the list price; `finalPrice` is what the buyer pays: the list price minus the **best live offer** of that
product's seller (active, and now is between start and end). Offers never affect other sellers' products.

### Order status rules
Each line has its own status because each seller ships their own items. The order status summarises its lines: all
cancelled = CANCELLED, all remaining delivered = DELIVERED, anything past PLACED = SHIPPED, otherwise PLACED. Cancelled
lines and orders cannot be reopened; cancelling or deleting an active line returns its stock.

## 4. Seller commission (5% standard, 3% preferred)
Bazario earns a percentage of each sale. **Every seller has their own rate**, so different seller accounts pay different
percentages:

| Seller type | Default rate | Typical use |
|---|---|---|
| Standard | **5%** | every new seller |
| Preferred | **3%** | trusted or high-volume sellers, set by an admin |
| Custom | any 0 to 30% | special agreements |

How it works:
- **Snapshot per line.** At checkout the seller's current rate is copied to the order line together with the commission
  and the seller's earning. Example: 2 x INR 1,000 at 3% -> sale 2,000, commission 60, seller earns 1,940.
- **Rate changes affect future orders only.** Past lines keep the rate they were sold at.
- **Rounding:** commission is rounded half-up to 2 decimals and the seller earning is the rest, so the two always add
  up to the sale.
- **Cancelled lines pay no commission** and are excluded from sales, earnings and statistics.
- **Payable vs pending:** a seller's net earnings are *payable* once the line is delivered and *pending* before that.
- **Where to see it:** sellers see their rate, earnings and per-line commission (Seller Hub > Earnings and Orders to
  ship). Admins see every seller's rate, sales and commission earned (Admin > Sellers & commission) and the total on the
  overview. Only an admin (`COMMISSION_MANAGE`) can change a rate.
- The default for new sellers is `APP_COMMISSION_DEFAULT` (5). The two demo sellers are seeded at 5% and 3%.
- Lines created before commissions existed show 0% commission and the full amount as the seller's earning.

Not included: automatic tiers by sales volume, category-based rates, and the actual payout. These are natural next steps.

## 5. Admin journey (Admin panel, `/admin`)
Overview (users, buyers, sellers, products, orders, gross sales, **commission earned**), products, categories, offers,
orders, **sellers & commission**, users and role assignment, roles and permissions.

## 6. Categories
Flat categories with an icon key (`phone`, `fashion`, `home`, `books`, `beauty`, `sports`, `games`, `cafe`, `tools`,
`gem`, `car`, `basket`, `tag`). Public to read; only `CATEGORIES_MANAGE` can change them. A category with products
cannot be deleted. Products can be filtered with `GET /api/products?categoryId=..&q=..&sellerId=..`.

## 7. Brand
- **Name:** Bazario, tagline *Shop. Sell. Celebrate.* I could not check trademark or domain availability: do that
  before commercial use.
- **Logo:** a shopping bag in an indigo-to-violet rounded square with a saffron spark. React component
  `frontend/src/components/Logo.tsx`; files in `frontend/public/` (`favicon.svg`, `brand/*.svg`).
- **Colours** live in `frontend/src/theme.ts` (indigo `#4338ca`, violet `#7c3aed`, saffron `#ffb400`, coral `#ff6a3d`).
- **To rename:** change "Bazario" in `Logo.tsx`, `HeroBanner.tsx`, `Footer.tsx`, `index.html`, `public/brand/*.svg`,
  and the demo seller defaults in `backend/src/main/resources/application.yml`.

## 8. Upgrading an existing database
Run the new backend once (`ddl-auto: update`). It adds the new columns (`commission_percent` on users; commission
snapshot columns on order items), sets the commission of existing demo sellers (5%), renames the old `USER` role to
`BUYER`, gives old products to the first demo seller and the Electronics category, and shows old order lines as PLACED.
Existing sellers without a rate use the default (5%) until an admin changes it. For a clean start, drop and recreate the
`shop` database.
