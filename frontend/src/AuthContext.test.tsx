import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AUTH_SESSION_HINT_KEY, AuthProvider, useAuth } from "./AuthContext";
import { api } from "./api";
import { makeUser } from "./testUtils";
import { AxiosError } from "axios";

function Probe() {
  const a = useAuth();
  return (
    <div>
      <span data-testid="email">{a.user?.email ?? "none"}</span>
      <span data-testid="loading">{String(a.loading)}</span>
      <span data-testid="can">{String(a.can("PRODUCTS_CREATE"))}</span>
      <button onClick={a.logout}>logout</button>
      <button onClick={() => void a.refresh()}>refresh</button>
    </div>
  );
}

const renderProvider = () => render(<AuthProvider><Probe /></AuthProvider>);

describe("AuthProvider", () => {
  it("does not request /me for a visitor without a known session", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("email")).toHaveTextContent("none");
    expect(api.get).not.toHaveBeenCalled();
  });

  it("loads the user and permissions from /me", async () => {
    localStorage.setItem(AUTH_SESSION_HINT_KEY, "true");
    vi.mocked(api.get).mockResolvedValue({ data: makeUser({ email: "sam@shop.com", permissions: ["PRODUCTS_CREATE"] }) } as never);
    renderProvider();
    expect(await screen.findByText("sam@shop.com")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/me");
    expect(screen.getByTestId("can")).toHaveTextContent("true");
  });

  it("answers can() false for permissions the user lacks", async () => {
    localStorage.setItem(AUTH_SESSION_HINT_KEY, "true");
    vi.mocked(api.get).mockResolvedValue({ data: makeUser({ permissions: [] }) } as never);
    renderProvider();
    await screen.findByText("alice@shop.com");
    expect(screen.getByTestId("can")).toHaveTextContent("false");
  });

  it("clears any legacy localStorage token when /me rejects", async () => {
    localStorage.setItem(AUTH_SESSION_HINT_KEY, "true");
    localStorage.setItem("token", "stale");
    vi.mocked(api.get).mockRejectedValue(new AxiosError("Unauthorized", undefined, undefined, undefined, {
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: { headers: {} },
      data: {},
    } as never));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_HINT_KEY)).toBeNull();
    expect(screen.getByTestId("email")).toHaveTextContent("none");
  });

  it("logs out", async () => {
    localStorage.setItem(AUTH_SESSION_HINT_KEY, "true");
    vi.mocked(api.get).mockResolvedValue({ data: makeUser() } as never);
    renderProvider();
    await screen.findByText("alice@shop.com");
    await userEvent.click(screen.getByRole("button", { name: "logout" }));
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem(AUTH_SESSION_HINT_KEY)).toBeNull();
    expect(screen.getByTestId("email")).toHaveTextContent("none");
    expect(api.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("drops the user when the API reports an expired token", async () => {
    localStorage.setItem(AUTH_SESSION_HINT_KEY, "true");
    vi.mocked(api.get).mockResolvedValue({ data: makeUser() } as never);
    renderProvider();
    await screen.findByText("alice@shop.com");
    act(() => { window.dispatchEvent(new Event("auth:expired")); });
    expect(screen.getByTestId("email")).toHaveTextContent("none");
    expect(localStorage.getItem(AUTH_SESSION_HINT_KEY)).toBeNull();
  });

  it("refresh() reloads the user after a login", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    vi.mocked(api.get).mockResolvedValue({ data: makeUser({ email: "new@shop.com" }) } as never);
    await userEvent.click(screen.getByRole("button", { name: "refresh" }));
    expect(await screen.findByText("new@shop.com")).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_SESSION_HINT_KEY)).toBe("true");
  });

  it("useAuth throws outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});
