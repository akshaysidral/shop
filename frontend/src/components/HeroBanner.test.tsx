import { render, screen } from "@testing-library/react";
import HeroBanner from "./HeroBanner";

describe("HeroBanner", () => {
  it("shows the tagline", () => {
    render(<HeroBanner />);
    expect(screen.getByRole("heading", { name: "Shop. Sell. Celebrate." })).toBeInTheDocument();
    expect(screen.getByText("Welcome to Bazario")).toBeInTheDocument();
  });

  it("scrolls to the products", () => {
    render(<HeroBanner />);
    expect(screen.getByRole("link", { name: "Start shopping" })).toHaveAttribute("href", "#products");
  });
});
