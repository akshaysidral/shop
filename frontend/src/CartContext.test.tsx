import { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { CartProvider, useCart } from "./CartContext";
import { makeProduct } from "./testUtils";

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;
const mouse = makeProduct({ id: 1, name: "Mouse", price: 800, finalPrice: 800, stock: 2 });
const keyboard = makeProduct({ id: 2, name: "Keyboard", price: 3500, finalPrice: 3500, stock: 5 });

describe("CartContext", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.lines).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.count).toBe(0);
  });

  it("adds a product and increments quantity on repeat adds", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(mouse));
    act(() => result.current.add(mouse));
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].quantity).toBe(2);
    expect(result.current.count).toBe(2);
  });

  it("never exceeds available stock", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(mouse));
    act(() => result.current.add(mouse));
    act(() => result.current.add(mouse)); // stock is 2
    expect(result.current.lines[0].quantity).toBe(2);
  });

  it("computes the total across lines", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(mouse));
    act(() => result.current.add(keyboard));
    expect(result.current.total).toBe(4300);
  });

  it("removes a line and clears the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(mouse));
    act(() => result.current.add(keyboard));
    act(() => result.current.remove(1));
    expect(result.current.lines.map((l) => l.product.id)).toEqual([2]);
    act(() => result.current.clear());
    expect(result.current.lines).toEqual([]);
  });

  it("add accepts a quantity and clamps it to stock", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(keyboard, 3));
    expect(result.current.lines[0].quantity).toBe(3);
    act(() => result.current.add(keyboard, 10)); // stock is 5
    expect(result.current.lines[0].quantity).toBe(5);
  });

  it("does not add products that are out of stock", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add({ ...mouse, stock: 0 }));
    expect(result.current.lines).toEqual([]);
  });

  it("setQty changes, clamps and removes at zero", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(keyboard));
    act(() => result.current.setQty(2, 4));
    expect(result.current.lines[0].quantity).toBe(4);
    act(() => result.current.setQty(2, 99));
    expect(result.current.lines[0].quantity).toBe(5);
    act(() => result.current.setQty(2, 0));
    expect(result.current.lines).toEqual([]);
  });

  it("totals use the offer price, not the list price", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(makeProduct({ id: 3, price: 1000, finalPrice: 800, discountPercent: 20, stock: 5 }), 2));
    expect(result.current.total).toBe(1600);
  });

  it("throws when used outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCart())).toThrow(/CartProvider/);
    spy.mockRestore();
  });
});
