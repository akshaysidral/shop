import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Category } from "../api";
import { CartCount, makeProduct, renderApp, routeGet } from "../testUtils";
import { useCart } from "../CartContext";
import Header from "./Header";

const CATEGORIES: Category[] = [
  { id: 1, name: "Electronics", icon: "phone", productCount: 5 },
  { id: 2, name: "Fashion", icon: "fashion", productCount: 3 },
];

function AddTwo() {
  const { add } = useCart();
  return <button onClick={() => add(makeProduct(), 2)}>add two</button>;
}

const header = (options: Parameters<typeof renderApp>[1] = {}) => {
  routeGet({ "/categories": CATEGORIES });
  return renderApp(<><Header /><AddTwo /><CartCount /></>, options);
};

describe("Header (logged out)", () => {
  it("shows the logo, Login and Sell on Bazario", () => {
    header();
    expect(screen.getByRole("link", { name: "Bazario home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /sell on bazario/i })).toBeInTheDocument();
  });

  it("has no account menu", () => {
    header();
    expect(screen.queryByRole("button", { name: /alice/i })).not.toBeInTheDocument();
  });

  it("links to the cart and shows how many items are in it", async () => {
    header();
    expect(screen.getByRole("link", { name: "Cart" })).toHaveAttribute("href", "/cart");
    await userEvent.click(screen.getByRole("button", { name: "add two" }));
    expect(screen.getByRole("link", { name: "Cart" })).toHaveTextContent("2");
  });
});

describe("Header (logged in)", () => {
  it("shows the person's name and role in the account menu", async () => {
    header({ permissions: [], user: { email: "alice@shop.com", roles: ["BUYER"] } });
    await userEvent.click(screen.getByRole("button", { name: /alice/i }));
    expect(screen.getByText("BUYER")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /my orders/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /seller hub/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /admin panel/i })).not.toBeInTheDocument();
  });

  it("shows the store name for sellers and offers the Seller Hub", async () => {
    header({ permissions: ["PRODUCTS_CREATE"], user: { storeName: "Acme Store", roles: ["SELLER"] } });
    await userEvent.click(screen.getByRole("button", { name: /acme store/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /seller hub/i }));
    expect(screen.getByTestId("location")).toHaveTextContent("/seller");
  });

  it("offers the Admin panel to admins", async () => {
    header({ permissions: ["STATS_READ"], user: { roles: ["ADMIN"] } });
    await userEvent.click(screen.getByRole("button", { name: /alice/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /admin panel/i }));
    expect(screen.getByTestId("location")).toHaveTextContent("/admin");
  });

  it("opens My orders", async () => {
    header({ permissions: [] });
    await userEvent.click(screen.getByRole("button", { name: /alice/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /my orders/i }));
    expect(screen.getByTestId("location")).toHaveTextContent("/orders");
  });

  it("logs out and goes home", async () => {
    const { auth } = header({ permissions: [] });
    await userEvent.click(screen.getByRole("button", { name: /alice/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /logout/i }));
    expect(auth.logout).toHaveBeenCalled();
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });

  it("does not show Login or Sell on Bazario", () => {
    header({ permissions: [] });
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sell on bazario/i })).not.toBeInTheDocument();
  });
});

describe("Header search", () => {
  it("searches by words", async () => {
    header();
    await userEvent.type(screen.getByLabelText("Search products"), "mouse");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/?q=mouse");
  });

  it("searches inside a category", async () => {
    header();
    await screen.findByRole("option", { name: "Fashion" });
    await userEvent.selectOptions(screen.getByLabelText("Search category"), "2");
    await userEvent.type(screen.getByLabelText("Search products"), "shirt");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/?q=shirt&category=2");
  });

  it("browses a whole category without words", async () => {
    header();
    await screen.findByRole("option", { name: "Electronics" });
    await userEvent.selectOptions(screen.getByLabelText("Search category"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/?category=1");
  });

  it("goes home when the search is empty", async () => {
    header({ route: "/cart" });
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("trims the words and encodes them", async () => {
    header();
    await userEvent.type(screen.getByLabelText("Search products"), "  tea cup ");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/?q=tea+cup");
  });

  it("lists every category in the picker", async () => {
    header();
    expect(await screen.findByRole("option", { name: "All categories" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Electronics" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fashion" })).toBeInTheDocument();
  });
});
