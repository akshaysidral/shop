# Postman collection

File: `bazario.postman_collection.json` (67 requests, example bodies and automatic tests).
Import: Postman > **Import** > choose the file. The backend must run on `http://localhost:8080`.

## Run order
| Folder | Purpose |
|---|---|
| 00 Health | app is up |
| 01 Auth | **run "Login as ADMIN" first** (saves `token`); register/login the customer (`customerToken`) and a seller (`sellerToken`) |
| 02 Roles, 03 Users | role CRUD and assignment (admin) |
| 04 Products | public reads; create, update, delete as admin |
| 05 Orders | customer places an order; admin lists, ships, cancels, deletes |
| 06 Categories | list, create, rename, filter products, delete |
| 07 Seller Hub | seller products, **earnings and commission**, orders to ship, mark shipped / delivered |
| 08 Festival offers | seller creates a sale, `finalPrice` drops, pause, delete |
| 09 Admin | stats, all offers, **list sellers with commission, set 3% / 5%, invalid rate** |
| 10 Permission checks | requests that **should fail** (401 / 403), including a seller trying to set their own commission |

Test scripts save `token`, `customerToken`, `sellerToken`, `categoryId`, `sellerProductId`, `offerId`, `lineOrderId`,
`lineItemId`, `sellerUserId`, ... so you never copy ids or tokens by hand.

## Trying the commission flow
1. 01 Auth: login as admin, register the seller (`sellerEmail`) and the customer.
2. 07 Seller Hub: create a product, place the order as the customer, then **My earnings and commission** (5% by default).
3. 09 Admin: **List sellers with commission** (saves `sellerUserId`), **Set seller to the preferred 3% rate**.
4. Place another order: new lines are charged 3%, earlier lines keep 5% (check **Orders to ship**).

## Variables (collection > Variables)
`baseUrl`, `adminEmail`/`adminPassword`, `customerEmail`/`customerPassword`, `sellerEmail`/`sellerPassword`/`sellerStore`.
The demo sellers also work: `seller@bazario.local` / `Seller@12345` (5%) and `seller2@bazario.local` / `Seller2@12345` (3%).

## Dependencies between requests
- 07 needs a category (run 06 "Create category" first, or delete `categoryId` from the body).
- 07 "Place order" needs the seller's product; 08 and 09 commission requests need the seller registered; run 08 before 07 "Delete my product".
- "Delete role"/"Delete category" return 409 while still in use (expected).
- Folder 10 expects the customer to have no extra roles.

## Manual authentication
Login at `POST /api/auth/login`, copy the token, then choose **Authorization > Bearer Token** and paste only the token.
