import { render, screen } from "@testing-library/react";
import App, { ADMIN_LINKS, SELLER_LINKS } from "./App";
import { makeUser, routeGet } from "./testUtils";

const visit = (path: string) => window.history.pushState({}, "", path);

afterEach(() => visit("/"));

const ADMIN_PERMISSIONS = ["STATS_READ", "COMMISSION_MANAGE", "USERS_READ", "ROLES_READ", "ORDERS_READ_ALL", "PRODUCTS_MANAGE_ALL",
  "CATEGORIES_MANAGE", "OFFERS_MANAGE_ALL"];

describe("App routing", () => {
  it("shows the storefront on the home page", async () => {
    routeGet({});
    visit("/");
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Shop. Sell. Celebrate." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bazario home" })).toBeInTheDocument();
  });

  it("shows the 404 page for unknown addresses", async () => {
    routeGet({});
    visit("/nowhere");
    render(<App />);
    expect(await screen.findByText("404")).toBeInTheDocument();
  });

  it("shows the login page", async () => {
    routeGet({});
    visit("/login");
    render(<App />);
    expect(await screen.findByLabelText("Email")).toBeInTheDocument();
  });

  it("sends guests away from the Seller Hub and the Admin panel", async () => {
    routeGet({});
    visit("/seller");
    const first = render(<App />);
    expect(await screen.findByLabelText("Email")).toBeInTheDocument();
    first.unmount();
    visit("/admin");
    render(<App />);
    expect(await screen.findByLabelText("Email")).toBeInTheDocument();
  });

  it("keeps buyers out of the Seller Hub", async () => {
    localStorage.setItem("token", "t");
    routeGet({ "/me": makeUser({ roles: ["BUYER"], permissions: [] }) });
    visit("/seller");
    render(<App />);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it("opens the Seller Hub for sellers", async () => {
    localStorage.setItem("token", "t");
    routeGet({
      "/me": makeUser({ storeName: "Acme Store", commissionPercent: 3, roles: ["SELLER"],
        permissions: ["PRODUCTS_CREATE", "OFFERS_MANAGE", "SELLER_ORDERS_READ"] }),
      "/seller/earnings": { commissionPercent: 3, grossSales: 0, commission: 0, netEarnings: 0, payable: 0, pending: 0, unitsSold: 0 },
    });
    visit("/seller");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Welcome, Acme Store" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Earnings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Festival offers" })).toBeInTheDocument();
  });

  it("opens the Admin panel for admins with every section they may use", async () => {
    localStorage.setItem("token", "t");
    routeGet({
      "/me": makeUser({ roles: ["ADMIN"], permissions: ADMIN_PERMISSIONS }),
      "/admin/stats": { users: 5, buyers: 3, sellers: 2, products: 15, orders: 4, revenue: 5000, commission: 200 },
    });
    visit("/admin");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Marketplace overview" })).toBeInTheDocument();
    for (const name of ["Products", "Categories", "Offers", "Orders", "Sellers & commission", "Users", "Roles & permissions"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("hides admin sections the user lacks permission for", async () => {
    localStorage.setItem("token", "t");
    routeGet({
      "/me": makeUser({ roles: ["SUPPORT"], permissions: ["STATS_READ", "ORDERS_READ_ALL"] }),
      "/admin/stats": { users: 1, buyers: 1, sellers: 0, products: 0, orders: 0, revenue: 0, commission: 0 },
    });
    visit("/admin");
    render(<App />);
    await screen.findByRole("heading", { name: "Marketplace overview" });
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sellers & commission" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Roles & permissions" })).not.toBeInTheDocument();
  });
});

describe("panel navigation", () => {
  it("each seller section needs the matching permission", () => {
    expect(SELLER_LINKS.map((l) => [l.label, l.permission])).toEqual([
      ["Dashboard", undefined],
      ["My products", "PRODUCTS_CREATE"],
      ["Festival offers", "OFFERS_MANAGE"],
      ["Orders to ship", "SELLER_ORDERS_READ"],
      ["Earnings", "SELLER_ORDERS_READ"],
    ]);
  });

  it("each admin section needs the matching permission", () => {
    const byLabel = Object.fromEntries(ADMIN_LINKS.map((l) => [l.label, l.permission]));
    expect(byLabel["Sellers & commission"]).toBe("COMMISSION_MANAGE");
    expect(byLabel["Roles & permissions"]).toBe("ROLES_READ");
    expect(byLabel["Users"]).toBe("USERS_READ");
    expect(byLabel["Dashboard"]).toBeUndefined();
  });
});
