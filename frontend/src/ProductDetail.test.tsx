import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import ProductDetail from "./ProductDetail";
import { CartCount, makeProduct, renderApp, routeGet } from "./testUtils";

const show = (product: ReturnType<typeof makeProduct> | Error) => {
  routeGet({ "/products/1": product });
  // CartCount lives outside the route so it survives the move to /cart
  return renderApp(
    <>
      <Routes><Route path="/product/:id" element={<ProductDetail />} /></Routes>
      <CartCount />
    </>,
    { route: "/product/1" },
  );
};

describe("ProductDetail", () => {
  it("shows the product, its seller and its price", async () => {
    show(makeProduct({ name: "Mouse", description: "Wireless and quiet" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Mouse" })).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Wireless and quiet")).toBeInTheDocument();
    expect(screen.getByTestId("final-price")).toHaveTextContent("800");
  });

  it("links back to the category in the breadcrumb", async () => {
    show(makeProduct({ categoryId: 4, categoryName: "Electronics" }));
    expect(await screen.findByRole("link", { name: "Electronics" })).toHaveAttribute("href", "/?category=4");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });

  it("explains an offer and shows the crossed-out price", async () => {
    show(makeProduct({ price: 1000, finalPrice: 800, discountPercent: 20, offerName: "Diwali Sale" }));
    expect(await screen.findByText(/applied automatically/i)).toBeInTheDocument();
    expect(screen.getByText("Diwali Sale")).toBeInTheDocument();
    expect(screen.getByTestId("list-price")).toHaveTextContent("1,000");
  });

  it.each([
    [50, "In stock"],
    [3, "Hurry, only 3 left"],
    [0, "Currently unavailable"],
  ])("with stock %i shows %s", async (stock, text) => {
    show(makeProduct({ stock }));
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it("offers a quantity up to the stock, at most ten", async () => {
    show(makeProduct({ stock: 25 }));
    await screen.findByLabelText("Quantity");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  });

  it("limits the quantity to what is in stock", async () => {
    show(makeProduct({ stock: 3 }));
    await screen.findByLabelText("Quantity");
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("adds the chosen quantity to the cart", async () => {
    show(makeProduct({ stock: 9 }));
    await userEvent.selectOptions(await screen.findByLabelText("Quantity"), "4");
    await userEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    expect(screen.getByTestId("count")).toHaveTextContent("4");
    expect(screen.getByRole("button", { name: /added/i })).toBeInTheDocument();
  });

  it("Buy now adds the product and opens the cart", async () => {
    show(makeProduct({ stock: 9 }));
    await userEvent.click(await screen.findByRole("button", { name: /buy now/i }));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("location")).toHaveTextContent("/cart");
  });

  it("cannot be bought when out of stock", async () => {
    show(makeProduct({ stock: 0 }));
    expect(await screen.findByRole("button", { name: /add to cart/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /buy now/i })).toBeDisabled();
    expect(screen.queryByLabelText("Quantity")).not.toBeInTheDocument();
  });

  it("says so when the product cannot be found", async () => {
    show(new Error("404"));
    expect(await screen.findByText(/could not find this product/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to shop/i })).toHaveAttribute("href", "/");
  });
});
