import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../../api";
import LoginPage from "./LoginPage";
import { apiError, renderApp } from "../../testUtils";

function setup(state?: unknown) {
  const onAuth = vi.fn();
  renderApp(<LoginPage onAuth={onAuth} />, { route: { pathname: "/login", state } });
  return onAuth;
}

const type = async (email: string, password: string) => {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
};
const switchToRegister = () => userEvent.click(screen.getByRole("button", { name: /switch to register/i }));

describe("LoginPage login", () => {
  it("logs in, stores the token, notifies the app and goes home", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: "abc123" } } as never);
    const onAuth = setup();
    await type("a@b.com", "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(api.post).toHaveBeenCalledWith("/auth/login", { email: "a@b.com", password: "secret1" });
    expect(localStorage.getItem("token")).toBe("abc123");
    expect(onAuth).toHaveBeenCalled();
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("returns to the page the visitor came from", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: "t" } } as never);
    setup({ from: "/cart" });
    await type("a@b.com", "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/cart");
  });

  it("shows an error and stores nothing when login fails", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("401"));
    const onAuth = setup();
    await type("a@b.com", "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText(/request failed/i)).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
    expect(onAuth).not.toHaveBeenCalled();
  });

  it("shows the server's message when there is one", async () => {
    vi.mocked(api.post).mockRejectedValue(apiError("Bad credentials", 401));
    setup();
    await type("a@b.com", "wrong1");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByText("Bad credentials")).toBeInTheDocument();
  });

  it("does not offer account types or a store name while logging in", () => {
    setup();
    expect(screen.queryByLabelText(/i want to sell/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Store name")).not.toBeInTheDocument();
  });
});

describe("LoginPage register", () => {
  it("registers a buyer by default", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: "t" } } as never);
    setup();
    await switchToRegister();
    await type("new@b.com", "secret1");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(api.post).toHaveBeenCalledWith("/auth/register", { email: "new@b.com", password: "secret1", accountType: "BUYER" });
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("registers a seller with a store name and opens the Seller Hub", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: "t" } } as never);
    setup();
    await switchToRegister();
    await userEvent.click(screen.getByLabelText(/i want to sell/i));
    await type("shop@b.com", "secret1");
    await userEvent.type(screen.getByLabelText("Store name"), "  My Store ");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(api.post).toHaveBeenCalledWith("/auth/register",
      { email: "shop@b.com", password: "secret1", accountType: "SELLER", storeName: "My Store" });
    expect(screen.getByTestId("location")).toHaveTextContent("/seller");
  });

  it("opens in seller registration mode from the Sell on Bazario link", () => {
    setup({ mode: "register", accountType: "SELLER" });
    expect(screen.getByLabelText("Store name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/i want to sell/i)).toBeChecked();
  });

  it("does not ask buyers for a store name", async () => {
    setup();
    await switchToRegister();
    expect(screen.getByLabelText(/i want to buy/i)).toBeChecked();
    expect(screen.queryByLabelText("Store name")).not.toBeInTheDocument();
  });

  it("tells sellers about the commission", () => {
    setup({ mode: "register", accountType: "SELLER" });
    expect(screen.getByText(/5% as standard, 3% for preferred sellers/i)).toBeInTheDocument();
  });

  it("switches back to login and clears the error", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("x"));
    setup();
    await switchToRegister();
    await type("a@b.com", "secret1");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    await screen.findByText(/request failed/i);
    await userEvent.click(screen.getByRole("button", { name: /switch to login/i }));
    expect(screen.queryByText(/request failed/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });
});
