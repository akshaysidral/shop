# Frontend (Bazario storefront, Seller Hub and Admin panel)

React 18 · TypeScript · Vite · **Material UI (MUI) 7** + Emotion + MUI icons · React Router 6 · Axios ·
Vitest + Testing Library · ESLint 9

## Run
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173   (backend must run on :8080)
```
| Script | What it does |
|---|---|
| `npm run dev` | dev server with hot reload |
| `npm run build` | type-check + production build into `dist/` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm test` / `test:watch` | Vitest |

`VITE_API_URL` sets the API base URL (default `http://localhost:8080/api`), baked in at build time.

## Material UI
- Packages: `@mui/material ^7`, `@mui/icons-material ^7`, `@emotion/react`, `@emotion/styled`.
- **Version note:** MUI v7 is pinned on purpose. The project's security policy lists a newer major (v9, April 2026), but
  v7 is long-term supported and its API is the one this code was written against. Upgrade later with MUI's official
  codemods and re-run `npm run build && npm test`.
- Layout uses `Box` with CSS grid (`gridTemplateColumns: { xs, md, lg }`) instead of MUI's `Grid`, whose API changed
  between majors, so the pages are not tied to one version.
- Dropdowns are native selects (`components/SelectField.tsx`): good on phones and simple to test.
- Icons are re-exported from one file (`src/icons.ts`); change an icon there once.
- `main.tsx` wraps the app in `ThemeProvider` + `CssBaseline`.

## Design system (`src/theme.ts`)
| Token | Value | Used for |
|---|---|---|
| `palette.primary` | `#4338ca` indigo | header, links, primary buttons |
| `palette.secondary` | `#ffb400` saffron | "Add to cart", highlights |
| `brand.coral` | `#ff6a3d` | "Buy now", "Place order", "Login" (`BuyButton`) |
| `brand.gradient` / `heroGradient` | indigo to violet / to coral | header, banner, login panel |
| `brand.footer` | `#1e1b4b` | footer |

Change the colours there to rebrand. Logo: `components/Logo.tsx` (inline SVG, `light` for dark backgrounds); static
files in `public/` (`favicon.svg`, `brand/*.svg`).

## Screens and routes
| Route | File | Who |
|---|---|---|
| `/` | `ProductList.tsx` | everyone: category bar and list, search, filters, sale strip, product grid |
| `/product/:id` | `ProductDetail.tsx` | everyone: seller, sale price, quantity, Add to cart / Buy now |
| `/cart`, `/orders` | `CartPage.tsx`, `OrdersPage.tsx` | buyers |
| `/login` | `LoginPage.tsx` | login and register (buyer, or seller with store name and a note about commission) |
| `/seller` | `pages/seller/*` | `PRODUCTS_CREATE`: dashboard, products, festival offers, orders to ship, **earnings** |
| `/admin` | `pages/admin/*` | `STATS_READ`: overview, products, categories, offers, orders, **sellers and commission**, users, roles |

Sidebar items appear only for permissions the user holds; the server enforces everything regardless.

### Commission screens
- **Seller > Earnings:** commission rate, gross sales, commission paid, net earnings, payable (delivered), pending, and a
  per-line breakdown with the rate each line was sold at. **Orders to ship** shows commission and "you earn" per line.
- **Admin > Sellers & commission:** every seller with rate, units, gross sales and commission earned; **Change rate**
  opens a dialog with "Preferred 3%" and "Standard 5%" presets or any value from 0 to 30 (applies to new orders only).
- **Admin overview:** commission earned (links to the sellers page).

## Structure
```
src/
├── main.tsx, App.tsx          theme provider, providers, layout, routes (SELLER_LINKS / ADMIN_LINKS)
├── theme.ts, icons.ts         brand colours and the icon set
├── api.ts                     axios instance, DTO types (mirror backend Dtos.java), errMsg(), 401 handling
├── useFetch.ts                data hook: { data, loading, error, reload }
├── AuthContext.tsx            current user from /api/me, logout, can(permission)
├── CartContext.tsx            cart (add, setQty, remove, clear); totals use the offer price
├── format.ts                  money() and percent()
├── components/                Header, CategoryBar, Footer, Logo, ProductCard, PriceTag, ProductImage, OfferStrip,
│                              HeroBanner, Guards, PanelLayout, StatusChip, SelectField, Buttons, Loading, StatCard,
│                              CategoryIcon, ProductManager + ProductFormModal, OfferManager
├── pages/seller/, pages/admin/
├── setupTests.ts, testUtils.tsx
└── *.test.tsx                 one test file next to every component, page, hook and context
```

## Tests
`npm test` runs Vitest with jsdom. **Every component, page, hook and context has a test file beside it.**

| Helper (`src/testUtils.tsx`) | Use |
|---|---|
| `renderApp(ui, { route, path, permissions, user, auth })` | renders inside router, cart and a fake logged-in user (`permissions: null` = logged out) |
| `routeGet({ "/products": [...], "/x": new Error() })` | answers `api.get` by URL; an Error value makes that URL fail |
| `makeProduct()`, `makeUser()`, `makeAuth()` | complete fixtures |
| `apiError(message, status)` | a failed API call whose message the UI will show |
| `CartCount`, `SeedCart`, `LocationProbe` | read the cart / fill the cart / assert the current URL |

`setupTests.ts` replaces the API with fakes for every test and clears `localStorage`.
Confirm dialogs: `vi.spyOn(window, "confirm").mockReturnValue(true)`.

Notes:
- Write `beforeEach(() => { ... })` with braces. A `beforeEach` that returns a value (for example a mock) is run by Vitest
  as a cleanup after the test and causes confusing failures.
- `vite.config.ts` inlines `@mui/*` for Vitest (`server.deps.inline`) so icon and component imports resolve like in Vite.
- Responsive `display: { xs: "none" }` is evaluated by jsdom as hidden; do not hide interactive elements that tests need.

## How auth and permissions work in the UI
1. Login or register stores the JWT in `localStorage`; an axios interceptor sends it on every request.
2. `AuthContext` calls `GET /api/me`; `can("PRODUCTS_CREATE")` drives menus and links.
3. `RequirePermission` protects `/seller` and `/admin` (guests go to login, others see a notice).
4. A 401 clears the token and fires `auth:expired`, returning the UI to the logged-out state.

## Adding a page
1. Create it with MUI components (`Paper`, `Box`, `Table`, `Dialog`...), reusing `useFetch`, `errMsg`, `StatCard`.
2. Register a `<Route>` in `App.tsx` (wrap in `RequirePermission` if restricted) and a link in `SELLER_LINKS` / `ADMIN_LINKS`.
3. Add `MyPage.test.tsx` using `renderApp` and `routeGet`.

## Known limitations
- The cart is in memory only (lost on refresh).
- Category icons are a fixed set of keys; product images are URLs entered by the seller.
- No payment, addresses or reviews yet.
