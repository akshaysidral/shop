import { render, screen } from "@testing-library/react";
import PriceTag from "./PriceTag";

describe("PriceTag", () => {
  it("shows only the price when there is no offer", () => {
    render(<PriceTag product={{ price: 800, finalPrice: 800, discountPercent: 0 }} />);
    expect(screen.getByTestId("final-price")).toHaveTextContent("800");
    expect(screen.queryByTestId("list-price")).not.toBeInTheDocument();
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
  });

  it("shows the sale price, the list price and the percentage", () => {
    render(<PriceTag product={{ price: 1000, finalPrice: 800, discountPercent: 20 }} />);
    expect(screen.getByTestId("final-price")).toHaveTextContent("800");
    expect(screen.getByTestId("list-price")).toHaveTextContent("1,000");
    expect(screen.getByText("20% off")).toBeInTheDocument();
  });

  it("renders in a larger size", () => {
    render(<PriceTag large product={{ price: 800, finalPrice: 800, discountPercent: 0 }} />);
    expect(screen.getByTestId("final-price")).toBeInTheDocument();
  });
});
