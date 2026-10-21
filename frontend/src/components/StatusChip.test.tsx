import { render, screen } from "@testing-library/react";
import StatusChip from "./StatusChip";

describe("StatusChip", () => {
  it.each(["PLACED", "SHIPPED", "DELIVERED", "CANCELLED", "LIVE", "SCHEDULED", "PAUSED", "ENDED"])("shows %s", (status) => {
    render(<StatusChip status={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });

  it("copes with a status it does not know", () => {
    render(<StatusChip status="MYSTERY" />);
    expect(screen.getByText("MYSTERY")).toBeInTheDocument();
  });
});
