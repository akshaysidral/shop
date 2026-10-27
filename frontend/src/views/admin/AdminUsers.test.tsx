import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../../api";
import type { Me, Role } from "../../api";
import { apiError, makeUser, renderApp, routeGet } from "../../testUtils";
import AdminUsers from "./AdminUsers";

const USERS: Me[] = [
  makeUser({ id: 1, email: "alice@shop.com", roles: ["ADMIN"] }),
  makeUser({ id: 2, email: "seller@shop.com", storeName: "Acme", commissionPercent: 3, roles: ["SELLER"] }),
  makeUser({ id: 3, email: "buyer@shop.com", roles: ["BUYER"] }),
  makeUser({ id: 4, email: "nobody@shop.com", roles: [] }),
];
const ROLES: Role[] = [
  { id: 1, name: "ADMIN", description: "Full access", builtIn: true, permissions: [] },
  { id: 2, name: "SELLER", description: "Sells", builtIn: true, permissions: [] },
  { id: 3, name: "BUYER", description: "Buys", builtIn: true, permissions: [] },
];

const page = () => {
  routeGet({ "/users": USERS, "/roles": ROLES });
  return renderApp(<AdminUsers />, { permissions: [], user: { id: 1, email: "alice@shop.com" } });
};

describe("AdminUsers", () => {
  it("lists users with their store, commission and roles", async () => {
    page();
    expect(await screen.findByText("seller@shop.com")).toBeInTheDocument();
    const row = screen.getByText("seller@shop.com").closest("tr") as HTMLElement;
    expect(row).toHaveTextContent("Acme");
    expect(row).toHaveTextContent("3%");
    expect(within(row).getByText("SELLER")).toBeInTheDocument();
    expect(screen.getByText("No roles")).toBeInTheDocument();
  });

  it("shows no commission for people who do not sell", async () => {
    page();
    const row = (await screen.findByText("buyer@shop.com")).closest("tr") as HTMLElement;
    expect(row).not.toHaveTextContent("%");
  });

  it("does not let admins delete themselves", async () => {
    page();
    await screen.findByText("seller@shop.com");
    expect(screen.getByRole("button", { name: "Delete alice@shop.com" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete buyer@shop.com" })).toBeEnabled();
  });

  it("opens the roles dialog with the user's roles ticked", async () => {
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Roles for seller@shop.com" }));
    expect(await screen.findByText("Roles for seller@shop.com")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /^SELLER/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /^BUYER/ })).not.toBeChecked();
  });

  it("changes a user's roles", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Roles for seller@shop.com" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /^BUYER/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save roles" }));
    expect(api.put).toHaveBeenCalledWith("/users/2/roles", { roleIds: [2, 3] });
  });

  it("can take every role away", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Roles for buyer@shop.com" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /^BUYER/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save roles" }));
    expect(api.put).toHaveBeenCalledWith("/users/3/roles", { roleIds: [] });
  });

  it("shows why a role change was refused", async () => {
    vi.mocked(api.put).mockRejectedValue(apiError("Cannot remove the last ADMIN"));
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Roles for alice@shop.com" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /^ADMIN/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save roles" }));
    expect(await screen.findByText("Cannot remove the last ADMIN")).toBeInTheDocument();
  });

  it("deletes a user after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockResolvedValue({} as never);
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Delete buyer@shop.com" }));
    expect(api.delete).toHaveBeenCalledWith("/users/3");
  });

  it("explains why a user cannot be deleted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockRejectedValue(apiError("User has orders and cannot be deleted"));
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Delete buyer@shop.com" }));
    expect(await screen.findByText("User has orders and cannot be deleted")).toBeInTheDocument();
  });

  it("keeps the user when the delete is not confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Delete buyer@shop.com" }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("shows a load error", async () => {
    routeGet({ "/users": new Error("boom"), "/roles": [] });
    renderApp(<AdminUsers />, { permissions: [] });
    expect(await screen.findByText("Request failed")).toBeInTheDocument();
  });
});
