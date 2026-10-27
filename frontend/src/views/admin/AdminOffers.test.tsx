import { screen } from "@testing-library/react";
import { renderApp, routeGet } from "../../testUtils";
import AdminOffers from "./AdminOffers";

describe("AdminOffers", () => {
  it("shows all offers without a create button", async () => {
    routeGet({ "/offers": [{ id: 1, name: "Diwali Sale", discountPercent: 20, startsAt: "2030-01-01T00:00:00Z", endsAt: "2030-01-08T00:00:00Z",
      active: true, appliesToAll: true, productIds: [], sellerId: 7, sellerName: "Acme", status: "LIVE" }] });
    renderApp(<AdminOffers />);
    expect(await screen.findByText("Diwali Sale")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All offers" })).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new offer/i })).not.toBeInTheDocument();
  });
});
