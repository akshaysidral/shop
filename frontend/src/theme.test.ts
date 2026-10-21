import { brand, theme } from "./theme";

describe("theme", () => {
  it("uses the Bazario brand colours", () => {
    expect(theme.palette.primary.main).toBe(brand.indigo);
    expect(theme.palette.secondary.main).toBe(brand.saffron);
  });

  it("has a gradient for the header and the banner", () => {
    expect(brand.gradient).toContain("linear-gradient");
    expect(brand.heroGradient).toContain(brand.coral);
  });

  it("keeps button labels in normal case", () => {
    expect(theme.typography.button.textTransform).toBe("none");
  });
});
