import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../api";
import { apiError, makeProduct, renderApp, routeGet } from "../testUtils";
import ProductManager from "./ProductManager";

const PRODUCTS = [
  makeProduct({ id: 1, name: "Mouse", stock: 3, categoryName: "Electronics", sellerName: "Acme" }),
  makeProduct({ id: 2, name: "Lamp", stock: 40, categoryName: null, categoryId: null, price: 1000, finalPrice: 800, discountPercent: 20, sellerName: "Zed" }),
];

const manager = (props: { source?: string; showSeller?: boolean } = {}) => {
  routeGet({ "/seller/products": PRODUCTS, "/products": PRODUCTS, "/categories": [] });
  return renderApp(<ProductManager source={props.source ?? "/seller/products"} title="My products" showSeller={props.showSeller} />);
};

describe("ProductManager", () => {
  it("lists the products from the given source", async () => {
    manager();
    expect(await screen.findByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("Lamp")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My products" })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/seller/products", { params: {} });
  });

  it("reads another source when asked (admin sees every product)", async () => {
    manager({ source: "/products", showSeller: true });
    await screen.findByText("Mouse");
    expect(api.get).toHaveBeenCalledWith("/products", { params: {} });
    expect(screen.getByRole("columnheader", { name: "Seller" })).toBeInTheDocument();
    expect(screen.getByText("Zed")).toBeInTheDocument();
  });

  it("hides the Seller column by default", async () => {
    manager();
    await screen.findByText("Mouse");
    expect(screen.queryByRole("columnheader", { name: "Seller" })).not.toBeInTheDocument();
  });

  it("highlights low stock and shows sale prices", async () => {
    manager();
    await screen.findByText("Mouse");
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("20% off")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    routeGet({ "/seller/products": [], "/categories": [] });
    renderApp(<ProductManager source="/seller/products" title="My products" />);
    expect(await screen.findByText("No products yet.")).toBeInTheDocument();
  });

  it("shows a load error", async () => {
    routeGet({ "/seller/products": new Error("boom"), "/categories": [] });
    renderApp(<ProductManager source="/seller/products" title="My products" />);
    expect(await screen.findByText("Request failed")).toBeInTheDocument();
  });

  it("opens the add dialog", async () => {
    manager();
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: /add product/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("Add product")).toBeInTheDocument();
  });

  it("opens the edit dialog for a product", async () => {
    manager();
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: "Edit Mouse" }));
    expect(await screen.findByText("Edit product")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Mouse");
  });

  it("deletes after confirmation and reloads the list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockResolvedValue({} as never);
    manager();
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: "Delete Mouse" }));
    expect(api.delete).toHaveBeenCalledWith("/products/1");
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.filter(([u]) => u === "/seller/products").length).toBe(2));
  });

  it("does nothing when the delete is not confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    manager();
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: "Delete Mouse" }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("shows why a delete failed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockRejectedValue(apiError("You can only change your own products", 403));
    manager();
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: "Delete Mouse" }));
    expect(await screen.findByText("You can only change your own products")).toBeInTheDocument();
  });
});
