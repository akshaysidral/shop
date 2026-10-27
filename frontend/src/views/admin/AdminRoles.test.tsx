import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../../api";
import type { Role } from "../../api";
import { apiError, renderApp, routeGet } from "../../testUtils";
import AdminRoles, { groupPermissions } from "./AdminRoles";

const PERMISSIONS = ["ROLES_READ", "ROLES_CREATE", "PRODUCTS_CREATE", "PRODUCTS_UPDATE", "COMMISSION_MANAGE"];
const ROLES: Role[] = [
  { id: 1, name: "ADMIN", description: "Full access", builtIn: true, permissions: PERMISSIONS },
  { id: 2, name: "BUYER", description: "Buys", builtIn: true, permissions: [] },
  { id: 3, name: "EDITOR", description: "Edits products", builtIn: false, permissions: ["PRODUCTS_UPDATE"] },
];

const page = () => {
  routeGet({ "/roles": ROLES, "/permissions": PERMISSIONS });
  return renderApp(<AdminRoles />);
};

describe("groupPermissions", () => {
  it("groups by the word before the first underscore", () => {
    expect(groupPermissions(["ROLES_READ", "ROLES_CREATE", "PRODUCTS_CREATE"])).toEqual({
      ROLES: ["ROLES_READ", "ROLES_CREATE"], PRODUCTS: ["PRODUCTS_CREATE"],
    });
  });

  it("returns nothing for no permissions", () => {
    expect(groupPermissions([])).toEqual({});
  });
});

describe("AdminRoles list", () => {
  it("lists roles with their permissions and a built-in marker", async () => {
    page();
    expect(await screen.findByText("EDITOR")).toBeInTheDocument();
    expect(screen.getAllByText("built-in")).toHaveLength(2);
    expect(screen.getByText("No special permissions")).toBeInTheDocument();
    expect(screen.getAllByText("PRODUCTS_UPDATE").length).toBeGreaterThan(0);
  });

  it("protects the built-in roles", async () => {
    page();
    await screen.findByText("EDITOR");
    expect(screen.getByRole("button", { name: "Edit ADMIN" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete ADMIN" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete BUYER" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit EDITOR" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete EDITOR" })).toBeEnabled();
  });

  it("deletes a custom role after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockResolvedValue({} as never);
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Delete EDITOR" }));
    expect(api.delete).toHaveBeenCalledWith("/roles/3");
  });

  it("explains why a role in use cannot be deleted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockRejectedValue(apiError("Role is assigned to users; unassign it first"));
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Delete EDITOR" }));
    expect(await screen.findByText(/assigned to users/i)).toBeInTheDocument();
  });

  it("keeps the role when the delete is not confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Delete EDITOR" }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("shows a load error", async () => {
    routeGet({ "/roles": new Error("boom"), "/permissions": [] });
    renderApp(<AdminRoles />);
    expect(await screen.findByText("Request failed")).toBeInTheDocument();
  });
});

describe("AdminRoles create and edit", () => {
  it("groups the permissions in the dialog", async () => {
    page();
    await userEvent.click(await screen.findByRole("button", { name: /new role/i }));
    const dialog = await screen.findByRole("dialog");
    for (const group of ["ROLES", "PRODUCTS", "COMMISSION"]) expect(within(dialog).getByText(group)).toBeInTheDocument();
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(PERMISSIONS.length);
  });

  it("creates a role with the chosen permissions", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} } as never);
    page();
    await userEvent.click(await screen.findByRole("button", { name: /new role/i }));
    await userEvent.type(screen.getByLabelText("Name (UPPER_SNAKE_CASE)"), "catalog_editor");
    expect(screen.getByLabelText("Name (UPPER_SNAKE_CASE)")).toHaveValue("CATALOG_EDITOR");
    await userEvent.click(screen.getByLabelText("PRODUCTS_CREATE"));
    await userEvent.click(screen.getByLabelText("PRODUCTS_UPDATE"));
    await userEvent.click(screen.getByRole("button", { name: "Save role" }));
    expect(api.post).toHaveBeenCalledWith("/roles", {
      name: "CATALOG_EDITOR", description: "", permissions: ["PRODUCTS_CREATE", "PRODUCTS_UPDATE"],
    });
  });

  it("shows the server's message when creating fails", async () => {
    vi.mocked(api.post).mockRejectedValue(apiError("You cannot grant or revoke permissions you do not hold: [COMMISSION_MANAGE]", 403));
    page();
    await userEvent.click(await screen.findByRole("button", { name: /new role/i }));
    await userEvent.type(screen.getByLabelText("Name (UPPER_SNAKE_CASE)"), "SNEAKY");
    await userEvent.click(screen.getByLabelText("COMMISSION_MANAGE"));
    await userEvent.click(screen.getByRole("button", { name: "Save role" }));
    expect(await screen.findByText(/you do not hold/i)).toBeInTheDocument();
  });

  it("edits a custom role", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Edit EDITOR" }));
    expect(screen.getByText("Edit EDITOR")).toBeInTheDocument();
    expect(screen.getByLabelText("Name (UPPER_SNAKE_CASE)")).toBeEnabled();
    expect(screen.getByLabelText("PRODUCTS_UPDATE")).toBeChecked();
    expect(screen.getByLabelText("PRODUCTS_CREATE")).not.toBeChecked();
    await userEvent.click(screen.getByLabelText("PRODUCTS_UPDATE"));
    await userEvent.click(screen.getByLabelText("PRODUCTS_CREATE"));
    await userEvent.click(screen.getByRole("button", { name: "Save role" }));
    expect(api.put).toHaveBeenCalledWith("/roles/3", { name: "EDITOR", description: "Edits products", permissions: ["PRODUCTS_CREATE"] });
  });

  it("cannot rename a built-in role", async () => {
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Edit BUYER" }));
    expect(screen.getByLabelText("Name (UPPER_SNAKE_CASE)")).toBeDisabled();
  });

  it("closes without saving", async () => {
    page();
    await userEvent.click(await screen.findByRole("button", { name: /new role/i }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(api.post).not.toHaveBeenCalled();
  });
});
