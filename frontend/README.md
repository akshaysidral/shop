# Frontend (Bazario storefront, Seller Hub and Admin panel)

React 18 · TypeScript · Next.js App Router · **Material UI (MUI) 7** + Emotion + MUI icons · Axios ·
Vitest + Testing Library · ESLint 9

## Run
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000   (backend must run on :8080)
```
| Script | What it does |
|---|---|
| `npm run dev` | dev server with hot reload |
| `npm run build` | type-check + production build into `.next/` |
| `npm start` | starts the production Next.js server |
| `npm run lint` / `lint:fix` | ESLint |
| `npm test` / `test:watch` | Vitest |

`NEXT_PUBLIC_API_URL` sets the browser API base URL (default `http://localhost:8080/api`), baked in at build time.

## Material UI
- Packages: `@mui/material ^7`, `@mui/icons-material ^7`, `@emotion/react`, `@emotion/styled`.
- **Version note:** MUI v7 is pinned on purpose. The project's security policy lists a newer major (v9, April 2026), but
  v7 is long-term supported and its API is the one this code was written against. Upgrade later with MUI's official
  codemods and re-run `npm run build && npm test`.
- Layout uses `Box` with CSS grid (`gridTemplateColumns: { xs, md, lg }`) instead of MUI's `Grid`, whose API changed
  between majors, so the pages are not tied to one version.
- Dropdowns are native selects (`components/SelectField.tsx`): good on phones and simple to test.
- Icons are re-exported from one file (`src/icons.ts`); change an icon there once.
- `app/layout.tsx` provides document metadata and the App Router Emotion cache; `src/controllers/AppProviders.tsx` wraps the UI in `ThemeProvider` + `CssBaseline`.

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
| `/product/[id]` | `app/product/[id]/page.tsx` → `ProductDetail.tsx` | everyone: seller, sale price, quantity, Add to cart / Buy now |
| `/cart`, `/orders` | `CartPage.tsx`, `OrdersPage.tsx` | buyers |
| `/login` | `LoginPage.tsx` | login and register (buyer, or seller with store name and a note about commission) |
| `/seller` | `app/seller/*` → `src/views/seller/*` | `PRODUCTS_CREATE`: dashboard, products, festival offers, orders to ship, **earnings** |
| `/admin` | `app/admin/*` → `src/views/admin/*` | `STATS_READ`: overview, products, categories, offers, orders, **sellers and commission**, users, roles |

Sidebar items appear only for permissions the user holds; the server enforces everything regardless.

### Commission screens
- **Seller > Earnings:** commission rate, gross sales, commission paid, net earnings, payable (delivered), pending, and a
  per-line breakdown with the rate each line was sold at. **Orders to ship** shows commission and "you earn" per line.
- **Admin > Sellers & commission:** every seller with rate, units, gross sales and commission earned; **Change rate**
  opens a dialog with "Preferred 3%" and "Standard 5%" presets or any value from 0 to 30 (applies to new orders only).
- **Admin overview:** commission earned (links to the sellers page).

## Structure
```
app/
├── layout.tsx               document metadata and global provider shell
├── page.tsx                 route adapters (Next.js file-system routing)
├── product/[id]/page.tsx
├── seller/*                 seller route adapters and permission-checked layout
└── admin/*                  admin route adapters and permission-checked layout
src/
├── models/api.ts               API client and frontend DTO/domain types
├── controllers/                AuthContext, CartContext, useFetch, provider composition
├── views/                      reusable UI, storefront screens, seller and admin screens
├── components/                 shared view components (Header, ProductCard, forms, panels, etc.)
├── api.ts, AuthContext.tsx, CartContext.tsx, useFetch.ts
│                              compatibility exports for existing imports
└── *.test.tsx                  Vitest + Testing Library tests alongside the UI/controller code
```

### MVC-inspired responsibilities
- **Model:** `src/models/api.ts` owns API communication and the client-side data contracts used for products, orders, users, and roles. The backend remains responsible for persistence and business rules.
- **Controller:** `src/controllers/` owns shared application state and behavior: authentication, cart operations, data fetching, and provider setup.
- **View:** `src/views/` and `src/components/` render screens and reusable UI. `app/` maps URLs to those views using Next.js App Router conventions.
- This is MVC-inspired rather than classic server MVC: Next.js owns routing and rendering, while API endpoints remain in the Spring Boot backend.

## Tests
`npm test` runs Vitest with jsdom. **Every component, page, hook and context has a test file beside it.**

| Helper (`src/testUtils.tsx`) | Use |
|---|---|
| `renderApp(ui, { route, permissions, user, auth })` | renders with mocked Next navigation, cart and a fake logged-in user (`permissions: null` = logged out) |
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
1. Add an App Router route at `app/<route>/page.tsx`. Keep the route file focused on composing the screen from `src/views/`.
2. Implement the screen in `src/views/` (or `src/views/seller/` / `src/views/admin/` for panel pages), reusing shared components and controller hooks such as `useFetch`.
3. Seller and admin routes inherit their permission checks from `app/seller/layout.tsx` and `app/admin/layout.tsx`. Add panel navigation links in `src/views/navigation.tsx` when needed.
4. Add `MyPage.test.tsx` using `renderApp` and `routeGet`.

## Known limitations
- The cart is in memory only (lost on refresh).
- Category icons are a fixed set of keys; product images are URLs entered by the seller.
- No payment, addresses or reviews yet.
