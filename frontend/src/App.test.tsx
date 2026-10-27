import { screen } from "@testing-library/react";
import AdminLayout from "../app/admin/layout";
import SellerLayout from "../app/seller/layout";
import { renderApp } from "./testUtils";
import { ADMIN_LINKS, SELLER_LINKS } from "./views/navigation";

describe("App Router panel layouts", () => {
  it("renders seller pages and permission-filtered navigation", () => {
    renderApp(<SellerLayout><div>Seller dashboard content</div></SellerLayout>,
      { route: "/seller", permissions: ["PRODUCTS_CREATE", "SELLER_ORDERS_READ"] });

    expect(screen.getByText("Seller dashboard content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My products" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders to ship" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Festival offers" })).not.toBeInTheDocument();
  });

  it("renders admin pages and hides sections without permission", () => {
    renderApp(<AdminLayout><div>Admin dashboard content</div></AdminLayout>,
      { route: "/admin", permissions: ["STATS_READ", "ORDERS_READ_ALL"] });

    expect(screen.getByText("Admin dashboard content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Products" })).not.toBeInTheDocument();
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
