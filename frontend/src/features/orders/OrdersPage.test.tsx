import { screen } from "@testing-library/react";
import type { Order } from "../../api";
import OrdersPage from "./OrdersPage";
import { renderApp, routeGet } from "../../testUtils";

const ORDER: Order = {
  id: 7, userEmail: "a@b.com", status: "SHIPPED", createdAt: "2030-01-01T10:00:00Z", total: 1600,
  items: [
    { id: 1, productId: 1, name: "Mouse", unitPrice: 800, quantity: 2, sellerName: "Acme", status: "SHIPPED" },
    { id: 2, productId: 2, name: "Lamp", unitPrice: 500, quantity: 1, sellerName: "Zed", status: "PLACED" },
  ],
};

describe("OrdersPage", () => {
  it("asks guests to log in", () => {
    renderApp(<OrdersPage />);
    expect(screen.getByRole("link", { name: "login" })).toHaveAttribute("href", "/login?from=%2Forders");
    expect(screen.getByText(/to see your orders/i)).toBeInTheDocument();
  });

  it("lists orders with each line, its seller and its own status", async () => {
    localStorage.setItem("token", "t");
    routeGet({ "/orders": [ORDER] });
    renderApp(<OrdersPage />, { permissions: [] });
    expect(await screen.findByText("Order #7")).toBeInTheDocument();
    expect(screen.getByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText(/Sold by Acme/)).toBeInTheDocument();
    expect(screen.getByText(/Sold by Zed/)).toBeInTheDocument();
    expect(screen.getAllByText("SHIPPED")).toHaveLength(2);     // the order and the shipped line
    expect(screen.getByText("PLACED")).toBeInTheDocument();     // the line still waiting
  });

  it("shows line totals and the order total", async () => {
    localStorage.setItem("token", "t");
    routeGet({ "/orders": [ORDER] });
    renderApp(<OrdersPage />, { permissions: [] });
    await screen.findByText("Order #7");
    expect(screen.getByText(/Qty 2 x/)).toHaveTextContent("800");
    expect(screen.getAllByText(/1,600/).length).toBeGreaterThan(0);
  });

  it("invites the buyer to shop when there are no orders", async () => {
    localStorage.setItem("token", "t");
    routeGet({ "/orders": [] });
    renderApp(<OrdersPage />, { permissions: [] });
    expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start shopping/i })).toBeInTheDocument();
  });

  it("shows an error when the orders cannot be loaded", async () => {
    localStorage.setItem("token", "t");
    routeGet({ "/orders": new Error("boom") });
    renderApp(<OrdersPage />, { permissions: [] });
    expect(await screen.findByText(/could not load your orders/i)).toBeInTheDocument();
  });
});
