import "@testing-library/jest-dom/vitest";
import { api } from "./api";

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
