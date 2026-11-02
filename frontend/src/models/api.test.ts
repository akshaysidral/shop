import { AxiosError, AxiosHeaders, type AxiosAdapter } from "axios";
import { api, errMsg } from "./api";

const originalAdapter = api.defaults.adapter;

function response(config: Parameters<AxiosAdapter>[0], status: number, data: unknown = {}) {
  return {
    data,
    status,
    statusText: status === 200 ? "OK" : "Request failed",
    headers: new AxiosHeaders(),
    config,
  };
}

describe("API client session behavior", () => {
  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("uses the HttpOnly-cookie session and adds a CSRF header to unsafe requests", async () => {
    const calls: string[] = [];
    let xsrfHeader: unknown;
    let authorization: unknown;
    api.defaults.adapter = async (config) => {
      calls.push(config.url ?? "");
      if (config.url === "/auth/csrf") return response(config, 200, { token: "csrf-value" });
      xsrfHeader = config.headers.get("X-XSRF-TOKEN");
      authorization = config.headers.get("Authorization");
      return response(config, 200);
    };

    await api.post("/private", {});

    expect(calls).toEqual(["/auth/csrf", "/private"]);
    expect(xsrfHeader).toBe("csrf-value");
    expect(authorization).toBeUndefined();
    expect(api.defaults.withCredentials).toBe(true);
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("emits the session-expired event on a protected 401 without retrying", async () => {
    api.defaults.adapter = async (config) => {
      const result = response(config, 401);
      return Promise.reject(new AxiosError("Unauthorized", undefined, config, undefined, result));
    };
    const onExpired = vi.fn();
    window.addEventListener("auth:expired", onExpired);

    await expect(api.get("/private")).rejects.toMatchObject({ response: { status: 401 } });

    expect(onExpired).toHaveBeenCalledOnce();
    window.removeEventListener("auth:expired", onExpired);
  });

  it("does not expire the session for permission errors", async () => {
    api.defaults.adapter = async (config) => {
      const result = response(config, 403);
      return Promise.reject(new AxiosError("Forbidden", undefined, config, undefined, result));
    };
    const onExpired = vi.fn();
    window.addEventListener("auth:expired", onExpired);

    await expect(api.get("/private")).rejects.toMatchObject({ response: { status: 403 } });

    expect(onExpired).not.toHaveBeenCalled();
    window.removeEventListener("auth:expired", onExpired);
  });

  it("uses the API error message when available and otherwise returns the fallback", () => {
    const result = {
      data: { message: "Category is in use" },
      status: 409,
      statusText: "Conflict",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
    const error = new AxiosError("Conflict", undefined, undefined, undefined, result);

    expect(errMsg(error, "Request failed")).toBe("Category is in use");
    expect(errMsg(new Error("network"), "Request failed")).toBe("Request failed");
  });
});
