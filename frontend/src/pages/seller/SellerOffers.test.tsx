import { screen } from "@testing-library/react";
import { renderApp, routeGet } from "../../testUtils";
import SellerOffers from "./SellerOffers";

describe("SellerOffers", () => {
  it("lets the seller create festival offers", async () => {
    routeGet({ "/offers": [], "/seller/products": [] });
    renderApp(<SellerOffers />);
    expect(await screen.findByText("No offers yet.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Festival offers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new offer/i })).toBeInTheDocument();
  });
});
