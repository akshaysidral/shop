import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuyButton } from "./Buttons";

describe("BuyButton", () => {
  it("is a normal clickable button", async () => {
    const onClick = vi.fn();
    render(<BuyButton onClick={onClick}>Buy now</BuyButton>);
    await userEvent.click(screen.getByRole("button", { name: "Buy now" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("can be disabled", async () => {
    const onClick = vi.fn();
    render(<BuyButton disabled onClick={onClick}>Buy now</BuyButton>);
    expect(screen.getByRole("button", { name: "Buy now" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Buy now" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
