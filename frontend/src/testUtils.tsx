import { ReactElement, useSyncExternalStore } from "react";
import { render } from "@testing-library/react";
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
  const location = useSyncExternalStore(
    (notify) => {
      window.addEventListener("test:navigation", notify);
      return () => window.removeEventListener("test:navigation", notify);
    },
    () => window.localStorage.getItem("__test_navigation") ?? window.location.pathname + window.location.search,
    () => "/",
  );
  return <div data-testid="location">{location}</div>;
}

type Options = {
  route?: string | { pathname: string; state?: unknown };   // initial URL (and optional navigation state)
  permissions?: string[] | null;     // null = logged out (default)
  user?: Partial<Me>;
  auth?: Partial<AuthValue>;
};

/** Renders a component inside Next navigation mocks, cart and a fake logged-in user. */
export function renderApp(ui: ReactElement, { route = "/", permissions = null, user, auth }: Options = {}) {
  const initialRoute = typeof route === "string" ? route : routeWithState(route.pathname, route.state);
  window.history.replaceState({}, "", initialRoute);
  window.localStorage.setItem("__test_navigation", initialRoute);
  const value = makeAuth(permissions, user, auth);
  const utils = render(
    <AuthContext.Provider value={value}>
      <CartProvider>
        <>
          {ui}
          <LocationProbe />
        </>
      </CartProvider>
    </AuthContext.Provider>,
  );
  return { ...utils, auth: value };
}

function routeWithState(pathname: string, state: unknown): string {
  if (!state || typeof state !== "object") return pathname;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === "string") params.set(key, value);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
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
