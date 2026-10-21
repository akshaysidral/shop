import { screen } from "@testing-library/react";
import type { SellerLine } from "../../api";
import { renderApp, routeGet } from "../../testUtils";
import SellerEarnings from "./SellerEarnings";

const EARNINGS = { commissionPercent: 3, grossSales: 3000, commission: 90, netEarnings: 2910, payable: 970, pending: 1940, unitsSold: 3 };
const line = (over: Partial<SellerLine>): SellerLine => ({
  orderId: 5, itemId: 9, createdAt: "2030-01-01T00:00:00Z", buyer: "a***@b.com", productId: 1, productName: "Mouse",
  unitPrice: 1000, quantity: 1, status: "DELIVERED", commissionPercent: 3, commission: 30, earning: 970, ...over,
});

const page = (data: Record<string, unknown> = {}) => {
  routeGet({
    "/seller/earnings": EARNINGS,
    "/seller/orders": [
      line({ itemId: 1, productName: "Delivered item" }),
      line({ itemId: 2, productName: "Placed item", status: "PLACED", commissionPercent: 5, commission: 50, earning: 950 }),
      line({ itemId: 3, productName: "Cancelled item", status: "CANCELLED" }),
    ],
    ...data,
  });
  return renderApp(<SellerEarnings />);
};

const stat = (label: string) => screen.getByText(label).parentElement;

describe("SellerEarnings", () => {
  it("shows the rate, the sales, the commission and what is left for the seller", async () => {
    page();
    expect(await screen.findByText("Gross sales")).toBeInTheDocument();
    expect(stat("Your commission rate")).toHaveTextContent("3%");
    expect(stat("Gross sales")).toHaveTextContent("₹3,000");
    expect(stat("Commission paid")).toHaveTextContent("₹90");
    expect(stat("Net earnings")).toHaveTextContent("₹2,910");
  });

  it("separates what is payable from what is pending", async () => {
    page();
    await screen.findByText("Gross sales");
    expect(stat("Payable (delivered)")).toHaveTextContent("₹970");
    expect(stat("Pending (not yet delivered)")).toHaveTextContent("₹1,940");
  });

  it("explains how the rate applies", async () => {
    page();
    expect(await screen.findByText(/past orders keep the rate they were sold at/i)).toBeInTheDocument();
  });

  it("breaks the sales down line by line with the rate each was sold at", async () => {
    page();
    expect(await screen.findByText("Delivered item")).toBeInTheDocument();
    const row = screen.getByText("Placed item").closest("tr") as HTMLElement;
    expect(row).toHaveTextContent("5%");
    expect(row).toHaveTextContent("₹50");
    expect(row).toHaveTextContent("₹950");
  });

  it("leaves cancelled lines out of the breakdown", async () => {
    page();
    await screen.findByText("Delivered item");
    expect(screen.queryByText("Cancelled item")).not.toBeInTheDocument();
  });

  it("shows an empty breakdown", async () => {
    page({ "/seller/orders": [] });
    expect(await screen.findByText("No sales yet.")).toBeInTheDocument();
  });

  it("shows an error when the earnings cannot be loaded", async () => {
    page({ "/seller/earnings": new Error("boom") });
    expect(await screen.findByText("Request failed")).toBeInTheDocument();
  });
});
