import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "./api";
import type { ActiveOffer, Category } from "./api";
import ProductList from "./ProductList";
import { CartCount, makeProduct, renderApp, routeGet } from "./testUtils";

const mouse = makeProduct({ id: 1, name: "Mouse", price: 800, finalPrice: 800, stock: 3 });
const webcam = makeProduct({ id: 2, name: "Webcam", price: 2500, finalPrice: 2500, stock: 0 });
const keyboard = makeProduct({ id: 3, name: "Keyboard", price: 3500, finalPrice: 2800, discountPercent: 20, stock: 9 });
const electronics: Category = { id: 1, name: "Electronics", icon: "phone", productCount: 3 };
const fashion: Category = { id: 2, name: "Fashion", icon: "fashion", productCount: 1 };

const list = (data: Record<string, unknown>, route = "/") => {
  routeGet(data);
  return renderApp(<><CartCount /><ProductList /></>, { route });
};

describe("ProductList", () => {
  it("renders products and the category list with counts", async () => {
    list({ "/products": [mouse, webcam], "/categories": [electronics, fashion] });
    expect(await screen.findByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("Webcam")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /electronics/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fashion/i })).toBeInTheDocument();
  });

  it("counts the items shown", async () => {
    list({ "/products": [mouse, webcam] });
    expect(await screen.findByText("2 items")).toBeInTheDocument();
  });

  it("disables the button for out-of-stock products", async () => {
    list({ "/products": [mouse, webcam] });
    await screen.findByText("Mouse");
    expect(screen.getByRole("button", { name: /add to cart/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /out of stock/i })).toBeDisabled();
  });

  it("adds a product to the cart", async () => {
    list({ "/products": [mouse, webcam] });
    await screen.findByText("Mouse");
    await userEvent.click(screen.getByRole("button", { name: /add to cart/i }));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("hides out-of-stock products when the filter is switched on", async () => {
    list({ "/products": [mouse, webcam] });
    await screen.findByText("Webcam");
    await userEvent.click(screen.getByLabelText(/hide out of stock/i));
    expect(screen.queryByText("Webcam")).not.toBeInTheDocument();
    expect(screen.getByText("Mouse")).toBeInTheDocument();
  });

  it("shows only discounted products with 'On offer only'", async () => {
    list({ "/products": [mouse, keyboard] });
    await screen.findByText("Keyboard");
    await userEvent.click(screen.getByLabelText(/on offer only/i));
    expect(screen.queryByText("Mouse")).not.toBeInTheDocument();
    expect(screen.getByText("Keyboard")).toBeInTheDocument();
  });

  it("shows the discount badge, offer price and seller", async () => {
    list({ "/products": [keyboard] });
    expect(await screen.findByText("-20%")).toBeInTheDocument();
    expect(screen.getByText("20% off")).toBeInTheDocument();
    expect(screen.getByText("Sold by Acme")).toBeInTheDocument();
  });

  it("limits the price with the slider", async () => {
    list({ "/products": [mouse, keyboard] });
    await screen.findByText("Keyboard");
    fireEvent.change(screen.getByRole("slider", { name: /max price/i }), { target: { value: "1000" } });
    expect(screen.queryByText("Keyboard")).not.toBeInTheDocument();
    expect(screen.getByText("Mouse")).toBeInTheDocument();
  });

  const titles = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

  it.each([
    ["priceAsc", ["Mouse", "Keyboard"]],
    ["priceDesc", ["Keyboard", "Mouse"]],
    ["discount", ["Keyboard", "Mouse"]],
    ["name", ["Keyboard", "Mouse"]],
  ])("sorts by %s", async (sort, expected) => {
    list({ "/products": [mouse, keyboard] });
    await screen.findByText("Mouse");
    await userEvent.selectOptions(screen.getByLabelText("Sort by"), sort);
    expect(titles()).toEqual(expected);
  });

  it("shows running festival sales", async () => {
    const offers: ActiveOffer[] = [{ name: "Diwali Sale", discountPercent: 20, endsAt: "2030-01-01T00:00:00Z", sellerName: "Acme", appliesToAll: true }];
    list({ "/products": [mouse], "/offers/active": offers });
    expect(await screen.findByText("Diwali Sale")).toBeInTheDocument();
  });

  it("sends the search term from the URL to the API", async () => {
    list({ "/products": [mouse] }, "/?q=mouse");
    await screen.findByText("Mouse");
    expect(api.get).toHaveBeenCalledWith("/products", { params: { q: "mouse" } });
    expect(screen.getByRole("heading", { level: 2, name: 'Results for "mouse"' })).toBeInTheDocument();
  });

  it("sends the chosen category to the API and names the page after it", async () => {
    list({ "/products": [mouse], "/categories": [electronics] }, "/?category=1");
    await screen.findByText("Mouse");
    expect(api.get).toHaveBeenCalledWith("/products", { params: { categoryId: 1 } });
    expect(await screen.findByRole("heading", { level: 2, name: "Electronics" })).toBeInTheDocument();
  });

  it("filters by category when a category is clicked", async () => {
    list({ "/products": [mouse], "/categories": [electronics, fashion] });
    await userEvent.click(await screen.findByRole("button", { name: /fashion/i }));
    expect(screen.getByTestId("location")).toHaveTextContent("/?category=2");
  });

  it("goes back to every category", async () => {
    list({ "/products": [mouse], "/categories": [electronics] }, "/?category=1");
    await userEvent.click(await screen.findByRole("button", { name: /all categories/i }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("shows the banner on the plain home page only", async () => {
    list({ "/products": [mouse] });
    await screen.findByText("Mouse");
    expect(screen.getByRole("heading", { level: 1, name: "Shop. Sell. Celebrate." })).toBeInTheDocument();
  });

  it("hides the banner while searching or browsing a category", async () => {
    list({ "/products": [mouse] }, "/?q=mouse");
    await screen.findByText("Mouse");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("shows a message when nothing matches", async () => {
    list({ "/products": [] });
    expect(await screen.findByText(/no products match/i)).toBeInTheDocument();
  });

  it("shows an error message when the API fails", async () => {
    list({ "/products": new Error("network") });
    expect(await screen.findByText(/could not load products/i)).toBeInTheDocument();
  });
});
