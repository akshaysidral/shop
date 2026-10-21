import { screen } from "@testing-library/react";
import { api } from "../../api";
import { makeProduct, renderApp, routeGet } from "../../testUtils";
import AdminProducts from "./AdminProducts";

describe("AdminProducts", () => {
  it("lists every seller's products with the seller", async () => {
    routeGet({ "/products": [makeProduct({ name: "Mouse", sellerName: "Acme" }), makeProduct({ id: 2, name: "Lamp", sellerName: "Zed" })], "/categories": [] });
    renderApp(<AdminProducts />);
    expect(await screen.findByText("Mouse")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All products" })).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Zed")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/products", { params: {} });
  });
});
