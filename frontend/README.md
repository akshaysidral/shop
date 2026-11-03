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
| `npm run test:coverage` | Vitest plus LCOV coverage for configured business logic |

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
| `/` | `app/page.tsx` → `src/features/catalog/ProductList.tsx` | everyone: category bar and list, search, filters, sale strip, product grid |
| `/category/[slug]` | `app/category/[slug]/page.tsx` → `src/features/catalog/ProductList.tsx` | everyone: products filtered by a readable category slug, e.g. `/category/electronics` |
| `/product/[id]` | `app/product/[id]/page.tsx` → `src/features/product/ProductDetail.tsx` | everyone: seller, sale price, quantity, Add to cart / Buy now |
| `/cart`, `/orders` | `src/features/cart/CartPage.tsx`, `src/features/orders/OrdersPage.tsx` | buyers |
| `/login` | `src/features/auth/LoginPage.tsx` | login and register (buyer, or seller with store name and a note about commission) |
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
├── page.tsx                 thin route adapter (Next.js file-system routing)
├── category/, product/, cart/, login/, orders/
├── seller/*                 seller route adapters and permission-checked layout
└── admin/*                  admin route adapters and permission-checked layout
src/
├── features/                   screen code grouped by domain (catalog, product, cart, auth, orders)
│   └── <feature>/              screen, feature-specific components/hooks, tests, and CSS Modules
├── models/api.ts               API client and frontend DTO/domain types
├── controllers/                AuthContext, CartContext, useFetch, provider composition
├── views/admin/, views/seller/ admin and seller screens grouped by domain
├── components/                 shared UI (Header, Logo, forms, panels, etc.)
│   └── *.module.css            component-scoped static styles; MUI sx remains for theme/runtime styles
├── api.ts, AuthContext.tsx, CartContext.tsx, useFetch.ts
│                              compatibility exports for existing imports
└── testUtils.tsx               shared Vitest + Testing Library fixtures and render helpers
```

### MVC-inspired responsibilities
- **Model:** `src/models/api.ts` owns API communication and the client-side data contracts used for products, orders, users, and roles. The backend remains responsible for persistence and business rules.
- **Controller:** `src/controllers/` owns shared application state and behavior: authentication, cart operations, data fetching, and provider setup.
- **View:** `src/features/`, `src/views/`, and `src/components/` render feature screens and reusable UI. `app/` maps URLs to feature screens using Next.js App Router conventions.
- This is MVC-inspired rather than classic server MVC: Next.js owns routing and rendering, while API endpoints remain in the Spring Boot backend.
- Category slugs are generated by the backend, unique, and kept unchanged when a category is renamed so saved category URLs continue to resolve.

## Tests
`npm test` runs the full Vitest suite with jsdom. Feature and component tests are kept beside the code they cover; shared fixtures live in `src/testUtils.tsx`. `npm run test:coverage` additionally writes `coverage/lcov.info` for SonarCloud. The frontend project key is `akshaysidral_shop_frontend`, configured in [`sonar-project.properties`](sonar-project.properties) under organization `akshaysidral`. Its inclusion list limits analysis and coverage metrics to catalog, auth/cart state, data-fetching, and API-contract logic—not pages or presentation components. CI waits for this gate and the backend SonarCloud gate before passing the combined Sonar check.

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
1. Login or register stores the short-lived access JWT in `localStorage`; the server sets the rotating refresh token in a `Secure`/`HttpOnly` cookie.
2. Axios sends credentialed requests and the access JWT. On a 401 it refreshes once and retries the failed request.
3. On page load, `AuthContext` restores the session from the refresh cookie and calls `GET /api/me`; `can("PRODUCTS_CREATE")` drives menus and links.
4. `RequirePermission` protects `/seller` and `/admin` (guests go to login, others see a notice).
5. Logout revokes the refresh-token family and clears the cookie and access token.

## Adding a page
1. Add an App Router route at `app/<route>/page.tsx`. Keep it as a thin adapter that imports the feature screen.
2. Implement the screen and its feature-specific hooks/components in `src/features/<feature>/`. Keep shared UI in `src/components/` and shared application state in `src/controllers/`.
3. Seller and admin routes inherit their permission checks from `app/seller/layout.tsx` and `app/admin/layout.tsx`. Add panel navigation links in `src/views/navigation.tsx` when needed.
4. Put `MyPage.test.tsx` beside the feature screen and use `renderApp` and `routeGet` from `src/testUtils.tsx`.
5. Put static, component-scoped CSS in an adjacent `*.module.css`; use MUI `sx` for styles that depend on the theme or runtime state.

## Known limitations
- The cart is in memory only (lost on refresh).
- Category icons are a fixed set of keys; product images are URLs entered by the seller.
- No payment, addresses or reviews yet.
