import { screen } from "@testing-library/react";
import { renderApp } from "../testUtils";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("shows the value and the label", () => {
    renderApp(<StatCard icon={<span>i</span>} label="Products" value={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("is not a link without a destination", () => {
    renderApp(<StatCard icon={<span>i</span>} label="Products" value={12} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links to its page when given one", () => {
    renderApp(<StatCard icon={<span>i</span>} label="Products" value="₹5" to="/seller/products" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/seller/products");
  });
});
