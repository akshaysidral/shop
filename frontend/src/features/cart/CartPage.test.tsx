import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../../api";
import CartPage from "./CartPage";
import { apiError, makeProduct, renderApp, SeedCart } from "../../testUtils";

const mouse = makeProduct({ id: 1, name: "Mouse", price: 800, finalPrice: 800, stock: 3 });
const lamp = makeProduct({ id: 2, name: "Lamp", price: 1000, finalPrice: 800, discountPercent: 20, stock: 5, sellerName: "Zed" });

async function cartWith(items: [typeof mouse, number][] = [[mouse, 2], [lamp, 1]]) {
  const utils = renderApp(<><SeedCart items={items} /><CartPage /></>);
  await userEvent.click(screen.getByRole("button", { name: "seed cart" }));
  return utils;
}

describe("CartPage", () => {
  it("shows an empty cart", () => {
    renderApp(<CartPage />);
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shop now" })).toHaveAttribute("href", "/");
  });

  it("lists the items with their seller", async () => {
    await cartWith();
    expect(screen.getByRole("link", { name: "Mouse" })).toHaveAttribute("href", "/product/1");
    expect(screen.getByRole("link", { name: "Lamp" })).toBeInTheDocument();
    expect(screen.getByText("Sold by Zed")).toBeInTheDocument();
    expect(screen.getByText("My Cart (3)")).toBeInTheDocument();
  });

  it("totals the order and shows the offer discount", async () => {
    await cartWith();
    expect(screen.getByText("Price (3 items)").parentElement).toHaveTextContent("2,600");   // list prices: 2x800 + 1000
    expect(screen.getByText("Offer discount").parentElement).toHaveTextContent("200");
    expect(screen.getByText("Total amount").parentElement).toHaveTextContent("2,400");
    expect(screen.getByText(/you will save/i)).toHaveTextContent("200");
  });

  it("shows no discount row when nothing is on offer", async () => {
    await cartWith([[mouse, 1]]);
    expect(screen.queryByText("Offer discount")).not.toBeInTheDocument();
    expect(screen.getByText("Price (1 item)")).toBeInTheDocument();
  });

  it("changes the quantity and stops at the stock", async () => {
    await cartWith([[mouse, 2]]);
    expect(screen.getByTestId("qty-1")).toHaveTextContent("2");
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(screen.getByTestId("qty-1")).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(screen.getByTestId("qty-1")).toHaveTextContent("2");
  });

  it("removes a line when its quantity drops to zero", async () => {
    await cartWith([[mouse, 1]]);
    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it("removes a line with Remove", async () => {
    await cartWith();
    const row = screen.getByRole("link", { name: "Lamp" }).closest("li") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: /^remove$/i }));
    expect(screen.queryByRole("link", { name: "Lamp" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mouse" })).toBeInTheDocument();
  });

  it("asks guests to log in before ordering", async () => {
    await cartWith();
    await userEvent.click(screen.getByRole("button", { name: "Place order" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("places the order for a logged-in buyer and opens My orders", async () => {
    localStorage.setItem("token", "t");
    vi.mocked(api.post).mockResolvedValue({ data: { id: 1 } } as never);
    await cartWith();
    await userEvent.click(screen.getByRole("button", { name: "Place order" }));
    expect(api.post).toHaveBeenCalledWith("/orders", { items: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }] });
    expect(await screen.findByText("Your cart is empty")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/orders");
  });

  it("shows why the order failed and keeps the cart", async () => {
    localStorage.setItem("token", "t");
    vi.mocked(api.post).mockRejectedValue(apiError("Insufficient stock for Mouse"));
    await cartWith();
    await userEvent.click(screen.getByRole("button", { name: "Place order" }));
    expect(await screen.findByText("Insufficient stock for Mouse")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mouse" })).toBeInTheDocument();
  });
});
