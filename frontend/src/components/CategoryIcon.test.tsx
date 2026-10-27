import { render } from "@testing-library/react";
import CategoryIcon, { CATEGORY_ICON_KEYS, iconKey } from "./CategoryIcon";

const renderedIconKey = (icon: string | null) => render(<CategoryIcon icon={icon} />).container.querySelector("[data-icon]")?.getAttribute("data-icon");

describe("CategoryIcon", () => {
  it("knows the icon keys the admin can choose from", () => {
    expect(CATEGORY_ICON_KEYS).toEqual(expect.arrayContaining(["phone", "fashion", "home", "books", "beauty", "sports", "tag"]));
  });

  it("draws the icon for a key", () => {
    expect(renderedIconKey("books")).toBe("books");
    expect(renderedIconKey("phone")).toBe("phone");
  });

  it("understands the older Bootstrap icon names", () => {
    expect(iconKey("bi-phone")).toBe("phone");
    expect(iconKey("bi-handbag")).toBe("fashion");
    expect(iconKey("bi-bicycle")).toBe("sports");
  });

  it("falls back to the tag icon", () => {
    expect(renderedIconKey(null)).toBe("tag");
    expect(renderedIconKey("not-an-icon")).toBe("tag");
  });

  it("normalises icon names to keys", () => {
    expect(iconKey("bi-journal-bookmark")).toBe("books");
    expect(iconKey("beauty")).toBe("beauty");
    expect(iconKey(null)).toBe("tag");
    expect(iconKey("???")).toBe("tag");
  });
});
