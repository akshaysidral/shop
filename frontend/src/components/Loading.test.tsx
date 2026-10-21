import { render, screen } from "@testing-library/react";
import Loading from "./Loading";

describe("Loading", () => {
  it("shows a progress indicator", () => {
    render(<Loading />);
    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeInTheDocument();
  });
});
