import { screen } from "@testing-library/react";
import type { ActiveOffer } from "../api";
import { renderApp, routeGet } from "../testUtils";
import OfferStrip from "./OfferStrip";

const offer = (over: Partial<ActiveOffer> = {}): ActiveOffer => ({
  name: "Diwali Sale", discountPercent: 20, endsAt: "2030-01-01T00:00:00Z", sellerName: "Acme", appliesToAll: true, ...over,
});

describe("OfferStrip", () => {
  it("shows the sales that are running", async () => {
    routeGet({ "/offers/active": [offer(), offer({ name: "Holi Sale", discountPercent: 10, appliesToAll: false, sellerName: "Zed" })] });
    renderApp(<OfferStrip />);
    expect(await screen.findByText("Diwali Sale")).toBeInTheDocument();
    expect(screen.getByText(/20% off everything at Acme/)).toBeInTheDocument();
    expect(screen.getByText(/10% off at Zed/)).toBeInTheDocument();
  });

  it("renders nothing when no sale is running", async () => {
    routeGet({ "/offers/active": [] });
    renderApp(<OfferStrip />);
    await Promise.resolve();
    expect(screen.queryByText(/sales on now/i)).not.toBeInTheDocument();
  });

  it("shows at most four sales", async () => {
    routeGet({ "/offers/active": Array.from({ length: 6 }, (_, i) => offer({ name: `Sale ${i + 1}` })) });
    renderApp(<OfferStrip />);
    expect(await screen.findByText("Sale 1")).toBeInTheDocument();
    expect(screen.getByText("Sale 4")).toBeInTheDocument();
    expect(screen.queryByText("Sale 5")).not.toBeInTheDocument();
  });
});
