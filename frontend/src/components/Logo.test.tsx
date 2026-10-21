import { render, screen } from "@testing-library/react";
import Logo from "./Logo";

describe("Logo", () => {
  it("shows the mark and the wordmark", () => {
    render(<Logo />);
    expect(screen.getByRole("img", { name: "Bazario logo" })).toBeInTheDocument();
    expect(screen.getByText("Bazario")).toBeInTheDocument();
  });

  it("can hide the wordmark", () => {
    render(<Logo withText={false} />);
    expect(screen.queryByText("Bazario")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bazario logo" })).toBeInTheDocument();
  });

  it("uses the requested size", () => {
    render(<Logo size={50} />);
    const svg = screen.getByRole("img", { name: "Bazario logo" });
    expect(svg).toHaveAttribute("width", "50");
    expect(svg).toHaveAttribute("height", "50");
  });

  it("gives every logo its own gradient id so several can share a page", () => {
    const { container } = render(<><Logo /><Logo /></>);
    const ids = Array.from(container.querySelectorAll("linearGradient")).map((g) => g.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => !id.includes(":"))).toBe(true);
  });
});
