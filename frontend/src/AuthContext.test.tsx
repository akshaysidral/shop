import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";
import { api, refreshAccessToken } from "./api";
import { makeUser } from "./testUtils";

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
  it("is logged out and not loading when there is no token", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue(null);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("email")).toHaveTextContent("none");
    expect(api.get).not.toHaveBeenCalled();
    expect(refreshAccessToken).toHaveBeenCalledOnce();
  });

  it("loads the user from /me when a token exists", async () => {
    localStorage.setItem("token", "t");
    vi.mocked(api.get).mockResolvedValue({ data: makeUser({ email: "sam@shop.com", permissions: ["PRODUCTS_CREATE"] }) } as never);
    renderProvider();
    expect(await screen.findByText("sam@shop.com")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/me");
    expect(screen.getByTestId("can")).toHaveTextContent("true");
  });

  it("answers can() false for permissions the user lacks", async () => {
    localStorage.setItem("token", "t");
    vi.mocked(api.get).mockResolvedValue({ data: makeUser({ permissions: [] }) } as never);
    renderProvider();
    await screen.findByText("alice@shop.com");
    expect(screen.getByTestId("can")).toHaveTextContent("false");
  });

  it("forgets a token that /me rejects", async () => {
    localStorage.setItem("token", "stale");
    vi.mocked(api.get).mockRejectedValue(new Error("401"));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(localStorage.getItem("token")).toBeNull();
    expect(screen.getByTestId("email")).toHaveTextContent("none");
  });

  it("logs out", async () => {
    localStorage.setItem("token", "t");
    vi.mocked(api.get).mockResolvedValue({ data: makeUser() } as never);
    renderProvider();
    await screen.findByText("alice@shop.com");
    await userEvent.click(screen.getByRole("button", { name: "logout" }));
    expect(localStorage.getItem("token")).toBeNull();
    expect(screen.getByTestId("email")).toHaveTextContent("none");
    expect(api.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("drops the user when the API reports an expired token", async () => {
    localStorage.setItem("token", "t");
    vi.mocked(api.get).mockResolvedValue({ data: makeUser() } as never);
    renderProvider();
    await screen.findByText("alice@shop.com");
    act(() => { window.dispatchEvent(new Event("auth:expired")); });
    expect(screen.getByTestId("email")).toHaveTextContent("none");
  });

  it("refresh() reloads the user after a login", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    localStorage.setItem("token", "new");
    vi.mocked(api.get).mockResolvedValue({ data: makeUser({ email: "new@shop.com" }) } as never);
    await userEvent.click(screen.getByRole("button", { name: "refresh" }));
    expect(await screen.findByText("new@shop.com")).toBeInTheDocument();
  });

  it("useAuth throws outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});
