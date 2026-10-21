import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../../api";
import type { Order } from "../../api";
import { apiError, renderApp, routeGet } from "../../testUtils";
import AdminOrders from "./AdminOrders";

const ORDER: Order = {
  id: 10, userEmail: "buyer@b.com", status: "PLACED", createdAt: "2030-01-01T10:00:00Z", total: 1600,
  items: [{ id: 1, productId: 1, name: "Mouse", unitPrice: 800, quantity: 2, sellerName: "Acme", status: "PLACED" }],
};

const orders = (list: Order[] = [ORDER]) => {
  routeGet({ "/orders/all": list });
  return renderApp(<AdminOrders />);
};

describe("AdminOrders", () => {
  it("lists every order with its buyer, total and lines", async () => {
    orders();
    expect(await screen.findByText("Order #10")).toBeInTheDocument();
    expect(screen.getByText(/buyer@b.com/)).toBeInTheDocument();
    expect(screen.getAllByText(/1,600/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Mouse x 2/)).toBeInTheDocument();
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
  });

  it("shows the order's current status in the dropdown", async () => {
    orders();
    expect(await screen.findByLabelText("Status")).toHaveValue("PLACED");
  });

  it("changes the status of the order", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} } as never);
    orders();
    await userEvent.selectOptions(await screen.findByLabelText("Status"), "SHIPPED");
    expect(api.patch).toHaveBeenCalledWith("/orders/10/status", { status: "SHIPPED" });
  });

  it("shows why a status change failed", async () => {
    vi.mocked(api.patch).mockRejectedValue(apiError("Cancelled orders cannot be reopened"));
    orders();
    await userEvent.selectOptions(await screen.findByLabelText("Status"), "SHIPPED");
    expect(await screen.findByText("Cancelled orders cannot be reopened")).toBeInTheDocument();
  });

  it("deletes after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockResolvedValue({} as never);
    orders();
    await userEvent.click(await screen.findByRole("button", { name: "Delete order 10" }));
    expect(api.delete).toHaveBeenCalledWith("/orders/10");
  });

  it("keeps the order when the delete is not confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    orders();
    await userEvent.click(await screen.findByRole("button", { name: "Delete order 10" }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("shows an empty state", async () => {
    orders([]);
    expect(await screen.findByText("No orders yet.")).toBeInTheDocument();
  });

  it("shows a load error", async () => {
    routeGet({ "/orders/all": new Error("boom") });
    renderApp(<AdminOrders />);
    expect(await screen.findByText("Request failed")).toBeInTheDocument();
  });
});
