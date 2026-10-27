import { screen } from "@testing-library/react";
import { api } from "../../api";
import { makeProduct, renderApp, routeGet } from "../../testUtils";
import SellerProducts from "./SellerProducts";

describe("SellerProducts", () => {
  it("manages the seller's own products", async () => {
    routeGet({ "/seller/products": [makeProduct({ name: "Mouse" })], "/categories": [] });
    renderApp(<SellerProducts />);
    expect(await screen.findByText("Mouse")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My products" })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/seller/products", { params: {} });
    expect(api.get).not.toHaveBeenCalledWith("/products", expect.anything());
  });
});
