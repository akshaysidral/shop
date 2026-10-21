import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../api";
import type { Offer } from "../api";
import { apiError, makeProduct, renderApp, routeGet } from "../testUtils";
import OfferManager, { FESTIVALS, toLocalInput } from "./OfferManager";

const OFFER: Offer = {
  id: 1, name: "Diwali Sale", discountPercent: 20, startsAt: "2030-01-01T00:00:00Z", endsAt: "2030-01-08T00:00:00Z",
  active: true, appliesToAll: false, productIds: [1, 2], sellerId: 7, sellerName: "Acme", status: "LIVE",
};
const PAUSED: Offer = { ...OFFER, id: 2, name: "Holi Sale", discountPercent: 15, active: false, status: "PAUSED", appliesToAll: true, productIds: [] };
const PRODUCTS = [makeProduct({ id: 1, name: "Mouse" }), makeProduct({ id: 2, name: "Lamp" })];

const manager = (admin = false, offers: Offer[] = [OFFER, PAUSED]) => {
  routeGet({ "/offers": offers, "/seller/products": PRODUCTS });
  return renderApp(<OfferManager admin={admin} />);
};

const openNew = async () => {
  await screen.findByText("Diwali Sale");
  await userEvent.click(screen.getByRole("button", { name: /new offer/i }));
  return screen.findByRole("dialog");
};

describe("OfferManager list", () => {
  it("lists offers with their discount, scope and status", async () => {
    manager();
    expect(await screen.findByText("Diwali Sale")).toBeInTheDocument();
    expect(screen.getByText("20% off")).toBeInTheDocument();
    expect(screen.getByText("2 product(s)")).toBeInTheDocument();
    expect(screen.getByText("All products")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("PAUSED")).toBeInTheDocument();
  });

  it("explains that the seller is in control", async () => {
    manager();
    expect(await screen.findByText(/you decide the festival/i)).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    manager(false, []);
    expect(await screen.findByText("No offers yet.")).toBeInTheDocument();
  });

  it("pauses a live offer", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    manager();
    await screen.findByText("Diwali Sale");
    await userEvent.click(screen.getByRole("button", { name: "Pause Diwali Sale" }));
    expect(api.put).toHaveBeenCalledWith("/offers/1", expect.objectContaining({ active: false, name: "Diwali Sale", productIds: [1, 2] }));
  });

  it("resumes a paused offer", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    manager();
    await screen.findByText("Holi Sale");
    await userEvent.click(screen.getByRole("button", { name: "Resume Holi Sale" }));
    expect(api.put).toHaveBeenCalledWith("/offers/2", expect.objectContaining({ active: true, appliesToAll: true }));
  });

  it("deletes after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockResolvedValue({} as never);
    manager();
    await screen.findByText("Diwali Sale");
    await userEvent.click(screen.getByRole("button", { name: "Delete Diwali Sale" }));
    expect(api.delete).toHaveBeenCalledWith("/offers/1");
  });

  it("keeps the offer when the delete is not confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    manager();
    await screen.findByText("Diwali Sale");
    await userEvent.click(screen.getByRole("button", { name: "Delete Diwali Sale" }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("shows why an update failed", async () => {
    vi.mocked(api.put).mockRejectedValue(apiError("You can only change your own offers", 403));
    manager();
    await screen.findByText("Diwali Sale");
    await userEvent.click(screen.getByRole("button", { name: "Pause Diwali Sale" }));
    expect(await screen.findByText("You can only change your own offers")).toBeInTheDocument();
  });
});

describe("OfferManager create and edit", () => {
  it("offers festival presets", async () => {
    manager();
    const dialog = await openNew();
    expect(FESTIVALS).toContain("Diwali");
    expect(within(dialog).getByRole("option", { name: "Diwali" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Black Friday" })).toBeInTheDocument();
  });

  it("names the offer after the festival", async () => {
    manager();
    await openNew();
    await userEvent.selectOptions(screen.getByLabelText("Festival or occasion"), "Diwali");
    expect(screen.getByLabelText("Offer name")).toHaveValue("Diwali Sale");
  });

  it("creates an offer for all products", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} } as never);
    manager();
    await openNew();
    await userEvent.selectOptions(screen.getByLabelText("Festival or occasion"), "Holi");
    await userEvent.click(screen.getByRole("button", { name: "Save offer" }));
    expect(api.post).toHaveBeenCalledWith("/offers", expect.objectContaining({
      name: "Holi Sale", discountPercent: 10, active: true, appliesToAll: true, productIds: [],
    }));
    const body = vi.mocked(api.post).mock.calls[0][1] as { startsAt: string; endsAt: string };
    expect(new Date(body.endsAt).getTime()).toBeGreaterThan(new Date(body.startsAt).getTime());
  });

  it("creates an offer for chosen products", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} } as never);
    manager();
    await openNew();
    await userEvent.clear(screen.getByLabelText("Offer name"));
    await userEvent.type(screen.getByLabelText("Offer name"), "Mouse deal");
    await userEvent.clear(screen.getByLabelText("Discount %"));
    await userEvent.type(screen.getByLabelText("Discount %"), "25");
    await userEvent.click(screen.getByLabelText("Apply to all my products"));
    await userEvent.click(await screen.findByLabelText("Mouse"));
    await userEvent.click(screen.getByRole("button", { name: "Save offer" }));
    expect(api.post).toHaveBeenCalledWith("/offers", expect.objectContaining({
      name: "Mouse deal", discountPercent: 25, appliesToAll: false, productIds: [1],
    }));
  });

  it("can start paused", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} } as never);
    manager();
    await openNew();
    await userEvent.type(screen.getByLabelText("Offer name"), "Later");
    await userEvent.click(screen.getByLabelText(/active \(untick to pause\)/i));
    await userEvent.click(screen.getByRole("button", { name: "Save offer" }));
    expect(api.post).toHaveBeenCalledWith("/offers", expect.objectContaining({ active: false }));
  });

  it.each([
    ["", "10", "Give the offer a name"],
    ["Sale", "0", "from 1 to 90"],
    ["Sale", "95", "from 1 to 90"],
    ["Sale", "10.5", "from 1 to 90"],
  ])("rejects name=%j discount=%j", async (name, pct, message) => {
    manager();
    await openNew();
    if (name) await userEvent.type(screen.getByLabelText("Offer name"), name);
    await userEvent.clear(screen.getByLabelText("Discount %"));
    await userEvent.type(screen.getByLabelText("Discount %"), pct);
    await userEvent.click(screen.getByRole("button", { name: "Save offer" }));
    expect(await screen.findByText(new RegExp(message))).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("rejects an end before the start", async () => {
    manager();
    await openNew();
    await userEvent.type(screen.getByLabelText("Offer name"), "Sale");
    fireEvent.change(screen.getByLabelText("Starts"), { target: { value: "2030-01-10T10:00" } });
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "2030-01-09T10:00" } });
    await userEvent.click(screen.getByRole("button", { name: "Save offer" }));
    expect(await screen.findByText(/end must be after the start/i)).toBeInTheDocument();
  });

  it("asks for at least one product when not applying to all", async () => {
    manager();
    await openNew();
    await userEvent.type(screen.getByLabelText("Offer name"), "Sale");
    await userEvent.click(screen.getByLabelText("Apply to all my products"));
    await userEvent.click(screen.getByRole("button", { name: "Save offer" }));
    expect(await screen.findByText(/at least one product/i)).toBeInTheDocument();
  });

  it("shows the server's message when saving fails", async () => {
    vi.mocked(api.post).mockRejectedValue(apiError("An offer can only include the seller's own products", 400));
    manager();
    await openNew();
    await userEvent.type(screen.getByLabelText("Offer name"), "Sale");
    await userEvent.click(screen.getByRole("button", { name: "Save offer" }));
    expect(await screen.findByText(/own products/i)).toBeInTheDocument();
  });

  it("edits an existing offer with PUT", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    manager();
    await screen.findByText("Diwali Sale");
    await userEvent.click(screen.getByRole("button", { name: "Edit Diwali Sale" }));
    expect(await screen.findByText("Edit offer")).toBeInTheDocument();
    expect(screen.getByLabelText("Offer name")).toHaveValue("Diwali Sale");
    expect(screen.getByLabelText("Discount %")).toHaveValue(20);
    await userEvent.clear(screen.getByLabelText("Discount %"));
    await userEvent.type(screen.getByLabelText("Discount %"), "30");
    await userEvent.click(screen.getByRole("button", { name: "Save offer" }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/offers/1", expect.objectContaining({ discountPercent: 30, productIds: [1, 2] })));
  });

  it("closes on Cancel without saving", async () => {
    manager();
    await openNew();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("OfferManager as an admin", () => {
  it("shows every seller's offers but cannot create or edit", async () => {
    manager(true);
    expect(await screen.findByText("Diwali Sale")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All offers" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Seller" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new offer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Diwali Sale" })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith("/seller/products", expect.anything());
  });

  it("can still pause and delete", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    manager(true);
    await screen.findByText("Diwali Sale");
    expect(screen.getByRole("button", { name: "Pause Diwali Sale" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Diwali Sale" })).toBeInTheDocument();
  });
});

describe("toLocalInput", () => {
  it("formats a local date for a datetime-local field", () => {
    expect(toLocalInput(new Date(2026, 9, 20, 10, 15))).toBe("2026-10-20T10:15");
  });

  it("pads single digits", () => {
    expect(toLocalInput(new Date(2026, 0, 2, 3, 4))).toBe("2026-01-02T03:04");
  });
});
