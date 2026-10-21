import { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import type { AuthValue } from "./AuthContext";
import { AxiosError } from "axios";
import { CartProvider, useCart } from "./CartContext";
import { api } from "./api";
import type { Me, Product } from "./api";

/** A complete Product for tests; override only what the test cares about. */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Mouse",
    description: "Wireless",
    price: 800,
    finalPrice: 800,
    discountPercent: 0,
    offerName: null,
    stock: 3,
    imageUrl: null,
    categoryId: 1,
    categoryName: "Electronics",
    sellerId: 7,
    sellerName: "Acme",
    ...overrides,
  };
}

export function makeUser(overrides: Partial<Me> = {}): Me {
  return { id: 1, email: "alice@shop.com", storeName: null, commissionPercent: null, roles: [], permissions: [], ...overrides };
}

/** permissions = null means "logged out". */
export function makeAuth(permissions: string[] | null, user: Partial<Me> = {}, extra: Partial<AuthValue> = {}): AuthValue {
  const me = permissions === null ? null : makeUser({ permissions, ...user });
  return {
    user: me,
    loading: false,
    refresh: vi.fn(),
    logout: vi.fn(),
    can: (p: string) => !!me?.permissions.includes(p),
    ...extra,
  };
}

/** Answers api.get by URL. Unknown URLs return an empty list. An Error value makes that URL fail. */
export function routeGet(routes: Record<string, unknown>) {
  vi.mocked(api.get).mockImplementation(((url: string) => {
    if (url in routes) {
      const value = routes[url];
      return value instanceof Error ? Promise.reject(value) : Promise.resolve({ data: value });
    }
    return Promise.resolve({ data: [] });
  }) as never);
}

/** Shows the current URL so tests can assert navigation. */
export function LocationProbe() {
  const l = useLocation();
  return <div data-testid="location">{l.pathname + l.search}</div>;
}

type Options = {
  route?: string | { pathname: string; state?: unknown };   // initial URL (and optional router state)
  path?: string;                     // route pattern when the page needs params, e.g. "/product/:id"
  permissions?: string[] | null;     // null = logged out (default)
  user?: Partial<Me>;
  auth?: Partial<AuthValue>;
};

/** Renders a component inside router, cart and a fake logged-in user. */
export function renderApp(ui: ReactElement, { route = "/", path, permissions = null, user, auth }: Options = {}) {
  const value = makeAuth(permissions, user, auth);
  const content = path ? <Routes><Route path={path} element={ui} /></Routes> : ui;
  const utils = render(
    <AuthContext.Provider value={value}>
      <CartProvider>
        <MemoryRouter initialEntries={[route]}>
          {content}
          <LocationProbe />
        </MemoryRouter>
      </CartProvider>
    </AuthContext.Provider>,
  );
  return { ...utils, auth: value };
}

/** An error shaped like a failed API call: errMsg() will show `message`. */
export function apiError(message: string, status = 409) {
  const e = new AxiosError(message);
  e.response = { status, data: { message } } as never;
  return e;
}

/** Shows how many items are in the cart. */
export function CartCount() {
  return <span data-testid="count">{useCart().count}</span>;
}

/** A button that puts products into the cart: [[product, quantity], ...]. */
export function SeedCart({ items }: { items: [Product, number][] }) {
  const { add } = useCart();
  return <button onClick={() => items.forEach(([p, q]) => add(p, q))}>seed cart</button>;
}
