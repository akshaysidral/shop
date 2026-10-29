import { screen } from "@testing-library/react";
import NotFound from "./NotFound";
import { renderApp } from "../../testUtils";

describe("NotFound", () => {
  it("says the page is missing and links home", () => {
    renderApp(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText(/could not find that page/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to shop/i })).toHaveAttribute("href", "/");
  });
});
