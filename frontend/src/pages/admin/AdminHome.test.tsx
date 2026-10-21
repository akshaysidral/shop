import { screen } from "@testing-library/react";
import { renderApp, routeGet } from "../../testUtils";
import AdminHome from "./AdminHome";

const STATS = { users: 10, buyers: 6, sellers: 3, products: 15, orders: 4, revenue: 5000, commission: 250 };
const stat = (label: string) => screen.getByText(label).parentElement;

describe("AdminHome", () => {
  it("shows the marketplace numbers", async () => {
    routeGet({ "/admin/stats": STATS });
    renderApp(<AdminHome />);
    expect(await screen.findByRole("heading", { name: "Marketplace overview" })).toBeInTheDocument();
    await screen.findByText("Buyers");
    expect(stat("Users")).toHaveTextContent("10");
    expect(stat("Buyers")).toHaveTextContent("6");
    expect(stat("Sellers")).toHaveTextContent("3");
    expect(stat("Products")).toHaveTextContent("15");
    expect(stat("Orders")).toHaveTextContent("4");
  });

  it("shows gross sales and the commission earned", async () => {
    routeGet({ "/admin/stats": STATS });
    renderApp(<AdminHome />);
    await screen.findByText("Buyers");
    expect(stat("Gross sales (cancelled excluded)")).toHaveTextContent("₹5,000");
    expect(screen.getByRole("link", { name: /commission earned/i })).toHaveTextContent("₹250");
  });

  it("links the commission card to the sellers page", async () => {
    routeGet({ "/admin/stats": STATS });
    renderApp(<AdminHome />);
    expect(await screen.findByRole("link", { name: /commission earned/i })).toHaveAttribute("href", "/admin/sellers");
  });

  it("shows an error when the numbers cannot be loaded", async () => {
    routeGet({ "/admin/stats": new Error("boom") });
    renderApp(<AdminHome />);
    expect(await screen.findByText("Request failed")).toBeInTheDocument();
  });

  it("shows a spinner while loading", () => {
    routeGet({ "/admin/stats": STATS });
    renderApp(<AdminHome />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
