import { screen } from "@testing-library/react";
import type { Category } from "../api";
import { renderApp, routeGet } from "../testUtils";
import CategoryBar from "./CategoryBar";

const CATEGORIES: Category[] = [
  { id: 1, name: "Electronics", icon: "phone", productCount: 5 },
  { id: 2, name: "Fashion", icon: "fashion", productCount: 3 },
];

describe("CategoryBar", () => {
  it("shows All plus every category as a link", async () => {
    routeGet({ "/categories": CATEGORIES });
    renderApp(<CategoryBar />);
    expect(await screen.findByRole("link", { name: "Electronics" })).toHaveAttribute("href", "/?category=1");
    expect(screen.getByRole("link", { name: "Fashion" })).toHaveAttribute("href", "/?category=2");
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/");
  });

  it("marks All as current when no category is chosen", async () => {
    routeGet({ "/categories": CATEGORIES });
    renderApp(<CategoryBar />);
    await screen.findByRole("link", { name: "Electronics" });
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Electronics" })).not.toHaveAttribute("aria-current");
  });

  it("marks the chosen category as current", async () => {
    routeGet({ "/categories": CATEGORIES });
    renderApp(<CategoryBar />, { route: "/?category=2" });
    await screen.findByRole("link", { name: "Fashion" });
    expect(screen.getByRole("link", { name: "Fashion" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current");
  });

  it.each(["/admin", "/admin/products", "/seller", "/seller/orders"])("is hidden on %s", (route) => {
    routeGet({ "/categories": CATEGORIES });
    renderApp(<CategoryBar />, { route });
    expect(screen.queryByRole("navigation", { name: "Categories" })).not.toBeInTheDocument();
  });
});
