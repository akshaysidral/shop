import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../../api";
import type { SellerSummary } from "../../api";
import { apiError, renderApp, routeGet } from "../../testUtils";
import AdminSellers, { PRESETS } from "./AdminSellers";

const SELLERS: SellerSummary[] = [
  { id: 7, email: "s@shop.com", storeName: "Acme", commissionPercent: 5, unitsSold: 4, grossSales: 4000, commission: 200 },
  { id: 8, email: "p@shop.com", storeName: "Preferred Picks", commissionPercent: 3, unitsSold: 2, grossSales: 2000, commission: 60 },
];

const page = (list: SellerSummary[] = SELLERS) => {
  routeGet({ "/admin/sellers": list });
  return renderApp(<AdminSellers />);
};

const openRate = async (email: string) => userEvent.click(await screen.findByRole("button", { name: `Change commission for ${email}` }));
const field = () => screen.getByLabelText("Commission %");

describe("AdminSellers list", () => {
  it("shows each seller with their rate, units, sales and the commission earned", async () => {
    page();
    const row = (await screen.findByText("Acme")).closest("tr") as HTMLElement;
    expect(row).toHaveTextContent("5%");
    expect(row).toHaveTextContent("4");
    expect(row).toHaveTextContent("₹4,000");
    expect(row).toHaveTextContent("₹200");
    expect((screen.getByText("Preferred Picks").closest("tr") as HTMLElement)).toHaveTextContent("3%");
  });

  it("totals the commission earned", async () => {
    page();
    expect(await screen.findByText("Commission earned: ₹260")).toBeInTheDocument();
  });

  it("explains the 5% and 3% rates", async () => {
    page();
    expect(await screen.findByText(/5% as standard, 3% for preferred sellers/i)).toBeInTheDocument();
  });

  it("shows the email under the store name", async () => {
    page();
    expect(await screen.findByText("s@shop.com")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    page([]);
    expect(await screen.findByText("No sellers yet.")).toBeInTheDocument();
  });

  it("shows a load error", async () => {
    routeGet({ "/admin/sellers": new Error("boom") });
    renderApp(<AdminSellers />);
    expect(await screen.findByText("Request failed")).toBeInTheDocument();
  });
});

describe("AdminSellers change the rate", () => {
  it("offers the standard and preferred presets", () => {
    expect(PRESETS).toEqual([{ label: "Preferred 3%", value: 3 }, { label: "Standard 5%", value: 5 }]);
  });

  it("opens with the seller's current rate", async () => {
    page();
    await openRate("s@shop.com");
    expect(await screen.findByText("Commission for Acme")).toBeInTheDocument();
    expect(field()).toHaveValue(5);
  });

  it("moves a seller to the preferred 3% rate", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    page();
    await openRate("s@shop.com");
    await userEvent.click(await screen.findByRole("button", { name: "Preferred 3%" }));
    expect(field()).toHaveValue(3);
    await userEvent.click(screen.getByRole("button", { name: "Save rate" }));
    expect(api.put).toHaveBeenCalledWith("/admin/sellers/7/commission", { percent: 3 });
  });

  it("moves a seller back to the standard 5% rate", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    page();
    await openRate("p@shop.com");
    await userEvent.click(await screen.findByRole("button", { name: "Standard 5%" }));
    await userEvent.click(screen.getByRole("button", { name: "Save rate" }));
    expect(api.put).toHaveBeenCalledWith("/admin/sellers/8/commission", { percent: 5 });
  });

  it("accepts a custom rate", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    page();
    await openRate("s@shop.com");
    await userEvent.clear(await screen.findByLabelText("Commission %"));
    await userEvent.type(field(), "4.5");
    await userEvent.click(screen.getByRole("button", { name: "Save rate" }));
    expect(api.put).toHaveBeenCalledWith("/admin/sellers/7/commission", { percent: 4.5 });
  });

  it("reloads the list after saving", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    page();
    await openRate("s@shop.com");
    await userEvent.click(await screen.findByRole("button", { name: "Save rate" }));
    await vi.waitFor(() => expect(vi.mocked(api.get).mock.calls.filter(([u]) => u === "/admin/sellers")).toHaveLength(2));
  });

  it.each(["31", "-1", "100"])("rejects %s%%", async (value) => {
    page();
    await openRate("s@shop.com");
    await userEvent.clear(await screen.findByLabelText("Commission %"));
    await userEvent.type(field(), value);
    await userEvent.click(screen.getByRole("button", { name: "Save rate" }));
    expect(await screen.findByText("Enter a percentage from 0 to 30")).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it("rejects an empty rate", async () => {
    page();
    await openRate("s@shop.com");
    await userEvent.clear(await screen.findByLabelText("Commission %"));
    await userEvent.click(screen.getByRole("button", { name: "Save rate" }));
    expect(await screen.findByText("Enter a percentage from 0 to 30")).toBeInTheDocument();
  });

  it("allows 0% and 30%", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    page();
    await openRate("s@shop.com");
    await userEvent.clear(await screen.findByLabelText("Commission %"));
    await userEvent.type(field(), "30");
    await userEvent.click(screen.getByRole("button", { name: "Save rate" }));
    expect(api.put).toHaveBeenCalledWith("/admin/sellers/7/commission", { percent: 30 });
  });

  it("shows the server's message when the change is refused", async () => {
    vi.mocked(api.put).mockRejectedValue(apiError("That user is not a seller"));
    page();
    await openRate("s@shop.com");
    await userEvent.click(await screen.findByRole("button", { name: "Save rate" }));
    expect(await screen.findByText("That user is not a seller")).toBeInTheDocument();
  });

  it("says the new rate only applies to new orders", async () => {
    page();
    await openRate("s@shop.com");
    expect(await screen.findByText(/new orders only/i)).toBeInTheDocument();
  });

  it("closes without saving", async () => {
    page();
    await openRate("s@shop.com");
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(api.put).not.toHaveBeenCalled();
  });
});
