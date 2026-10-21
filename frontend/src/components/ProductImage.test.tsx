import { fireEvent, render, screen } from "@testing-library/react";
import ProductImage from "./ProductImage";

describe("ProductImage", () => {
  it("draws a tile with the initial when there is no image", () => {
    render(<ProductImage name="mouse" />);
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the seller's image when there is one", () => {
    render(<ProductImage name="Mouse" src="https://img/mouse.png" />);
    expect(screen.getByRole("img", { name: "Mouse" })).toHaveAttribute("src", "https://img/mouse.png");
  });

  it("falls back to the tile when the image cannot load", () => {
    render(<ProductImage name="Mouse" src="https://img/broken.png" />);
    fireEvent.error(screen.getByRole("img", { name: "Mouse" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("treats a null src like no image", () => {
    render(<ProductImage name="Lamp" src={null} size="sm" />);
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("is always the same colour for the same name", () => {
    const first = render(<ProductImage name="Same" />);
    const a = first.getByTestId("product-image").className;
    first.unmount();
    const second = render(<ProductImage name="Same" />);
    expect(second.getByTestId("product-image").className).toBe(a);
  });
});
