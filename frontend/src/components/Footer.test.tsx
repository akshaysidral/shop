import { screen } from "@testing-library/react";
import { renderApp } from "../testUtils";
import Footer from "./Footer";

describe("Footer", () => {
  it("shows the brand and the copyright year", () => {
    renderApp(<Footer />);
    expect(screen.getByText("Bazario")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${new Date().getFullYear()} Bazario`))).toBeInTheDocument();
  });

  it("links to the main places", () => {
    renderApp(<Footer />);
    expect(screen.getByRole("link", { name: "All products" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Cart" })).toHaveAttribute("href", "/cart");
    expect(screen.getByRole("link", { name: "My orders" })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("link", { name: "Seller Hub" })).toHaveAttribute("href", "/seller");
  });

  it("has a Sell on Bazario link that opens seller registration", () => {
    renderApp(<Footer />);
    expect(screen.getByRole("link", { name: "Sell on Bazario" })).toHaveAttribute("href", "/login");
  });
});
