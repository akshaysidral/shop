import { fireEvent, screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductDetail from "./ProductDetail";
import { CartCount, makeProduct, renderApp, routeGet } from "../../testUtils";

const show = (product: ReturnType<typeof makeProduct> | Error) => {
  routeGet({ "/products/1": product });
  // CartCount lives outside the route so it survives the move to /cart
  return renderApp(<><ProductDetail /><CartCount /></>, { route: "/product/1" });
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
    expect(await screen.findByRole("link", { name: "Electronics" })).toHaveAttribute("href", "/category/electronics");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });

  it("shows a gallery and lets buyers switch between product images", async () => {
    show(makeProduct({
      name: "Camera",
      images: [
        { url: "https://images.example/front", key: "product/1/front.png" },
        { url: "https://images.example/back", key: "product/1/back.png" },
      ],
    }));

    expect(await screen.findByRole("img", { name: "Camera" })).toHaveAttribute("src", "https://images.example/front");
    await userEvent.click(screen.getByRole("button", { name: "Show product image 2" }));
    expect(screen.getByRole("img", { name: "Camera" })).toHaveAttribute("src", "https://images.example/back");
  });

  it("opens a zoomed image viewer and lets buyers slide through the gallery", async () => {
    show(makeProduct({
      name: "Camera",
      images: [
        { url: "https://images.example/front", key: "product/1/front.png" },
        { url: "https://images.example/back", key: "product/1/back.png" },
      ],
    }));

    await userEvent.click(await screen.findByRole("button", { name: "Zoom product image" }));
    expect(screen.getByRole("dialog", { name: "Product image viewer" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Camera enlarged" })).toHaveAttribute("src", "https://images.example/front");

    await userEvent.click(within(screen.getByRole("dialog", { name: "Product image viewer" })).getByRole("button", { name: "Next product image" }));
    expect(screen.getByRole("img", { name: "Camera enlarged" })).toHaveAttribute("src", "https://images.example/back");

    const viewer = screen.getByRole("dialog", { name: "Product image viewer" });
    await userEvent.click(screen.getByRole("button", { name: "Close image viewer" }));
    await waitForElementToBeRemoved(viewer);
  });

  it("zooms further on repeated image clicks and resets at the maximum zoom", async () => {
    show(makeProduct({
      name: "Camera",
      images: [{ url: "https://images.example/front", key: "product/1/front.png" }],
    }));

    await userEvent.click(await screen.findByRole("button", { name: "Zoom product image" }));
    await userEvent.click(screen.getByRole("button", { name: "Zoom image" }));
    expect(screen.getByRole("img", { name: "Camera enlarged" })).toHaveStyle({ transform: "scale(2)" });

    await userEvent.click(screen.getByRole("button", { name: "Zoom image further" }));
    expect(screen.getByRole("img", { name: "Camera enlarged" })).toHaveStyle({ transform: "scale(3)" });

    await userEvent.click(screen.getByRole("button", { name: "Reset image zoom" }));
    expect(screen.getByRole("img", { name: "Camera enlarged" })).toHaveStyle({ transform: "scale(1)" });
  });

  it("pans the zoom focus to the pointer position", async () => {
    show(makeProduct({
      name: "Camera",
      images: [{ url: "https://images.example/front", key: "product/1/front.png" }],
    }));

    await userEvent.click(await screen.findByRole("button", { name: "Zoom product image" }));
    const zoomButton = screen.getByRole("button", { name: "Zoom image" });
    vi.spyOn(zoomButton, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    });

    await userEvent.click(zoomButton);
    fireEvent.mouseMove(zoomButton, { clientX: 75, clientY: 25 });

    expect(screen.getByRole("img", { name: "Camera enlarged" })).toHaveStyle({ transformOrigin: "75% 25%" });
  });

  it("slides between images from the product image", async () => {
    show(makeProduct({
      name: "Camera",
      images: [
        { url: "https://images.example/front", key: "product/1/front.png" },
        { url: "https://images.example/back", key: "product/1/back.png" },
      ],
    }));

    await userEvent.click(await screen.findByRole("button", { name: "Next product image" }));
    expect(screen.getByRole("img", { name: "Camera" })).toHaveAttribute("src", "https://images.example/back");
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
