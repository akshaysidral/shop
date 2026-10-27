import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartCount, makeProduct, renderApp } from "../testUtils";
import ProductCard from "./ProductCard";

const card = (product = makeProduct()) => renderApp(<><CartCount /><ProductCard product={product} /></>);

describe("ProductCard", () => {
  it("shows the name, the seller and the price", () => {
    card();
    expect(screen.getByRole("heading", { level: 3, name: "Mouse" })).toBeInTheDocument();
    expect(screen.getByText("Sold by Acme")).toBeInTheDocument();
    expect(screen.getByTestId("final-price")).toHaveTextContent("800");
  });

  it("links to the product page", () => {
    card(makeProduct({ id: 42 }));
    expect(screen.getByRole("link", { name: /mouse/i })).toHaveAttribute("href", "/product/42");
  });

  it("shows the sale price, the crossed-out list price and the offer name", () => {
    card(makeProduct({ price: 1000, finalPrice: 800, discountPercent: 20, offerName: "Diwali Sale" }));
    expect(screen.getByText("-20%")).toBeInTheDocument();
    expect(screen.getByText("20% off")).toBeInTheDocument();
    expect(screen.getByText("Diwali Sale")).toBeInTheDocument();
    expect(screen.getByTestId("list-price")).toHaveTextContent("1,000");
  });

  it("shows no discount UI when there is no offer", () => {
    card();
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^-\d+%$/)).not.toBeInTheDocument();
  });

  it("warns when stock is low", () => {
    card(makeProduct({ stock: 2 }));
    expect(screen.getByText("Only 2 left")).toBeInTheDocument();
  });

  it("does not warn when there is plenty of stock", () => {
    card(makeProduct({ stock: 50 }));
    expect(screen.queryByText(/only \d+ left/i)).not.toBeInTheDocument();
  });

  it("adds to the cart", async () => {
    card();
    await userEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: /added/i })).toBeInTheDocument();
  });

  it("disables adding once the stock is in the cart", async () => {
    card(makeProduct({ stock: 1 }));
    await userEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    expect(screen.getByRole("button", { name: /added|max in cart/i })).toBeDisabled();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("cannot be bought when out of stock", () => {
    card(makeProduct({ stock: 0 }));
    expect(screen.getByRole("button", { name: /out of stock/i })).toBeDisabled();
    expect(screen.getByText("Currently unavailable")).toBeInTheDocument();
  });
});
