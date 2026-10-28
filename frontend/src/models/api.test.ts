import { AxiosError, AxiosHeaders, type AxiosAdapter } from "axios";
import { api, errMsg } from "./api";

const originalAdapter = api.defaults.adapter;

function respondWith(status: number, data: unknown = {}) {
  const adapter: AxiosAdapter = async (config) => {
    const response = {
      data,
      status,
      statusText: status === 200 ? "OK" : "Unauthorized",
      headers: new AxiosHeaders(),
      config,
    };
    if (status >= 400) {
      return Promise.reject(new AxiosError("Request failed", undefined, config, undefined, response));
    }
    return response;
  };
  api.defaults.adapter = adapter;
}

describe("API client business logic", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("adds the bearer token to authenticated requests", async () => {
    localStorage.setItem("token", "session-token");
    let authorization: unknown;
    api.defaults.adapter = async (config) => {
      authorization = config.headers.get("Authorization");
      return {
        data: {},
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders(),
        config,
      };
    };

    await api.get("/private");

    expect(authorization).toBe("Bearer session-token");
  });

  it("clears an expired token and emits the session-expired event", async () => {
    localStorage.setItem("token", "expired-token");
    respondWith(401);
    const onExpired = vi.fn();
    window.addEventListener("auth:expired", onExpired);

    await expect(api.get("/private")).rejects.toMatchObject({ response: { status: 401 } });

    expect(localStorage.getItem("token")).toBeNull();
    expect(onExpired).toHaveBeenCalledOnce();
    window.removeEventListener("auth:expired", onExpired);
  });

  it("keeps the session token for non-401 failures", async () => {
    localStorage.setItem("token", "session-token");
    respondWith(403);

    await expect(api.get("/private")).rejects.toMatchObject({ response: { status: 403 } });

    expect(localStorage.getItem("token")).toBe("session-token");
  });

  it("uses the API error message when available and otherwise returns the fallback", () => {
    const response = {
      data: { message: "Category is in use" },
      status: 409,
      statusText: "Conflict",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
    const error = new AxiosError("Conflict", undefined, undefined, undefined, response);

    expect(errMsg(error, "Request failed")).toBe("Category is in use");
    expect(errMsg(new Error("network"), "Request failed")).toBe("Request failed");
  });
});
