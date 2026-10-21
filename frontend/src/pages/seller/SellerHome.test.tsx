import { screen } from "@testing-library/react";
import { makeProduct, renderApp, routeGet } from "../../testUtils";
import SellerHome from "./SellerHome";

const OFFER = { id: 1, name: "A", discountPercent: 10, startsAt: "2030-01-01T00:00:00Z", endsAt: "2030-02-01T00:00:00Z",
  active: true, appliesToAll: true, productIds: [], sellerId: 7, sellerName: "Acme", status: "LIVE" };
const LINE = { orderId: 5, itemId: 9, createdAt: "2030-01-01T00:00:00Z", buyer: "a***@b.com", productId: 1, productName: "Mouse",
  unitPrice: 1000, quantity: 2, status: "PLACED", commissionPercent: 3, commission: 60, earning: 1940 };
const EARNINGS = { commissionPercent: 3, grossSales: 2000, commission: 60, netEarnings: 1940, payable: 0, pending: 1940, unitsSold: 2 };

const home = (data: Record<string, unknown> = {}) => {
  routeGet({
    "/seller/products": [makeProduct({ id: 1, stock: 3 }), makeProduct({ id: 2, stock: 10 })],
    "/offers": [OFFER, { ...OFFER, id: 2, status: "PAUSED" }],
    "/seller/orders": [LINE, { ...LINE, itemId: 10, status: "DELIVERED" }],
    "/seller/earnings": EARNINGS,
    ...data,
  });
  return renderApp(<SellerHome />, { permissions: [], user: { storeName: "Acme Store", commissionPercent: 3 } });
};

describe("SellerHome", () => {
  it("welcomes the seller by store name", async () => {
    home();
    expect(await screen.findByRole("heading", { name: "Welcome, Acme Store" })).toBeInTheDocument();
  });

  it("counts products, low stock, live offers and orders to ship", async () => {
    home();
    expect(await screen.findByRole("link", { name: /products$/i })).toHaveTextContent("2Products");
    expect(screen.getByRole("link", { name: /low stock/i })).toHaveTextContent("1Low stock");
    expect(screen.getByRole("link", { name: /live offers/i })).toHaveTextContent("1Live offers");
    expect(screen.getByRole("link", { name: /orders to ship/i })).toHaveTextContent("1Orders to ship");
  });

  it("shows the commission rate and the net earnings", async () => {
    home();
    expect(await screen.findByRole("link", { name: /your commission rate/i })).toHaveTextContent("3%Your commission rate");
    expect(screen.getByRole("link", { name: /net earnings/i })).toHaveTextContent("1,940Net earnings");
  });

  it("falls back to the rate on the account when earnings cannot be loaded", async () => {
    home({ "/seller/earnings": new Error("boom") });
    expect(await screen.findByRole("link", { name: /your commission rate/i })).toHaveTextContent("3%");
  });

  it("links every card to its page", async () => {
    home();
    expect(await screen.findByRole("link", { name: /orders to ship/i })).toHaveAttribute("href", "/seller/orders");
    expect(screen.getByRole("link", { name: /live offers/i })).toHaveAttribute("href", "/seller/offers");
    expect(screen.getByRole("link", { name: /net earnings/i })).toHaveAttribute("href", "/seller/earnings");
  });
});
