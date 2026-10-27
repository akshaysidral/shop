import "@testing-library/jest-dom/vitest";
import React from "react";
import { api } from "./api";

vi.mock("next/link", () => ({
  default: React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
    ({ href, ...props }, ref) => React.createElement("a", { href, ...props, ref }),
  ),
}));

vi.mock("next/navigation", () => {
  const navigate = (href: string) => {
    window.localStorage.setItem("__test_navigation", href);
    window.dispatchEvent(new Event("test:navigation"));
  };
  const router = {
    push: vi.fn(navigate),
    replace: vi.fn(navigate),
    back: vi.fn(() => window.history.back()),
    forward: vi.fn(() => window.history.forward()),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };
  return {
    useRouter: () => router,
    usePathname: () => window.location.pathname,
    useSearchParams: () => new URLSearchParams(window.location.search),
    useParams: () => {
      const id = window.location.pathname.match(/\/product\/([^/]+)/)?.[1];
      return id ? { id } : {};
    },
  };
});

// Every test talks to a fake API. Use routeGet() from testUtils to answer GET requests by URL.
vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => {
  for (const fn of [api.get, api.post, api.put, api.patch, api.delete]) {
    vi.mocked(fn).mockReset();
  }
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});
