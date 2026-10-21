import { money, percent } from "./format";

describe("money", () => {
  it("formats rupees without decimals", () => {
    expect(money(799)).toContain("799");
    expect(money(799)).toContain("₹");
    expect(money(799)).not.toContain(".");
  });

  it("uses thousands separators", () => {
    expect(money(1000)).toMatch(/1,000/);
    expect(money(250000)).toMatch(/2,50,000/);       // Indian grouping
  });

  it("handles zero", () => {
    expect(money(0)).toContain("0");
  });
});

describe("percent", () => {
  it("shows whole numbers without decimals", () => {
    expect(percent(3)).toBe("3%");
    expect(percent(5.0)).toBe("5%");
  });

  it("keeps real decimals", () => {
    expect(percent(5.5)).toBe("5.5%");
  });
});
