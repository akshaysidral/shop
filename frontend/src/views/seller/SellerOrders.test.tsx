import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../../api";
import type { SellerLine } from "../../api";
import { apiError, renderApp, routeGet } from "../../testUtils";
import SellerOrders from "./SellerOrders";

const LINE: SellerLine = { orderId: 5, itemId: 9, createdAt: "2030-01-01T00:00:00Z", buyer: "a***@b.com", productId: 1,
  productName: "Mouse", unitPrice: 1000, quantity: 2, status: "PLACED", commissionPercent: 3, commission: 60, earning: 1940 };

const orders = (lines: SellerLine[]) => {
  routeGet({ "/seller/orders": lines });
  return renderApp(<SellerOrders />);
};

describe("SellerOrders", () => {
  it("shows each line with the sale, the commission and what the seller earns", async () => {
    orders([LINE]);
    expect(await screen.findByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("#5")).toBeInTheDocument();
    expect(screen.getByText("a***@b.com")).toBeInTheDocument();
    expect(screen.getByText("₹2,000")).toBeInTheDocument();                // 2 x 1000
    expect(screen.getByText(/₹60/)).toHaveTextContent("(3%)");
    expect(screen.getByText("₹1,940")).toBeInTheDocument();
  });

  it("offers Mark shipped and Cancel for a new line", async () => {
    orders([LINE]);
    await screen.findByText("Mouse");
    expect(screen.getByRole("button", { name: "Mark shipped" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("offers Mark delivered once shipped", async () => {
    orders([{ ...LINE, status: "SHIPPED" }]);
    await screen.findByText("Mouse");
    expect(screen.getByRole("button", { name: "Mark delivered" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark shipped" })).not.toBeInTheDocument();
  });

  it.each(["DELIVERED", "CANCELLED"] as const)("offers nothing for a %s line", async (status) => {
    orders([{ ...LINE, status }]);
    await screen.findByText("Mouse");
    expect(screen.queryByRole("button", { name: /mark|cancel/i })).not.toBeInTheDocument();
  });

  it("marks a line shipped and reloads", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} } as never);
    orders([LINE]);
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: "Mark shipped" }));
    expect(api.patch).toHaveBeenCalledWith("/seller/orders/5/items/9/status", { status: "SHIPPED" });
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.filter(([u]) => u === "/seller/orders")).toHaveLength(2));
  });

  it("marks a shipped line delivered", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} } as never);
    orders([{ ...LINE, status: "SHIPPED" }]);
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: "Mark delivered" }));
    expect(api.patch).toHaveBeenCalledWith("/seller/orders/5/items/9/status", { status: "DELIVERED" });
  });

  it("cancels after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.patch).mockResolvedValue({ data: {} } as never);
    orders([LINE]);
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(api.patch).toHaveBeenCalledWith("/seller/orders/5/items/9/status", { status: "CANCELLED" });
  });

  it("does not cancel when the seller changes their mind", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    orders([LINE]);
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("shows why an update failed", async () => {
    vi.mocked(api.patch).mockRejectedValue(apiError("Cancelled lines cannot be reopened"));
    orders([LINE]);
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: "Mark shipped" }));
    expect(await screen.findByText("Cancelled lines cannot be reopened")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    orders([]);
    expect(await screen.findByText("No orders yet.")).toBeInTheDocument();
  });

  it("shows a load error", async () => {
    routeGet({ "/seller/orders": new Error("boom") });
    renderApp(<SellerOrders />);
    expect(await screen.findByText("Request failed")).toBeInTheDocument();
  });
});
