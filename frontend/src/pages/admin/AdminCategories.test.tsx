import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../../api";
import type { Category } from "../../api";
import { apiError, renderApp, routeGet } from "../../testUtils";
import AdminCategories from "./AdminCategories";

const CATS: Category[] = [
  { id: 1, name: "Electronics", icon: "phone", productCount: 5 },
  { id: 2, name: "Books", icon: "bi-journal-bookmark", productCount: 0 },
];

const page = (list: Category[] = CATS) => {
  routeGet({ "/categories": list });
  return renderApp(<AdminCategories />);
};

describe("AdminCategories", () => {
  it("lists categories with their product counts and icons", async () => {
    const { container } = page();
    expect(await screen.findByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(container.querySelector("[data-icon='phone']")).toBeInTheDocument();
    expect(container.querySelector("[data-icon='books']")).toBeInTheDocument();     // older Bootstrap name still works
  });

  it("creates a category with the default icon", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} } as never);
    page();
    await userEvent.click(await screen.findByRole("button", { name: /new category/i }));
    await userEvent.type(screen.getByLabelText("Name"), "  Toys ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.post).toHaveBeenCalledWith("/categories", { name: "Toys", icon: "phone" });
  });

  it("creates a category with a chosen icon", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} } as never);
    page();
    await userEvent.click(await screen.findByRole("button", { name: /new category/i }));
    await userEvent.type(screen.getByLabelText("Name"), "Games");
    await userEvent.click(screen.getByRole("button", { name: "Icon games" }));
    expect(screen.getByRole("button", { name: "Icon games" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.post).toHaveBeenCalledWith("/categories", { name: "Games", icon: "games" });
  });

  it("requires a name", async () => {
    page();
    await userEvent.click(await screen.findByRole("button", { name: /new category/i }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("edits a category and keeps its icon as a key", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Edit Books" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Books");
    expect(screen.getByRole("button", { name: "Icon books" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.type(screen.getByLabelText("Name"), " & More");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.put).toHaveBeenCalledWith("/categories/2", { name: "Books & More", icon: "books" });
  });

  it("shows the server's message when saving fails", async () => {
    vi.mocked(api.post).mockRejectedValue(apiError("Category already exists"));
    page();
    await userEvent.click(await screen.findByRole("button", { name: /new category/i }));
    await userEvent.type(screen.getByLabelText("Name"), "Books");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Category already exists")).toBeInTheDocument();
  });

  it("deletes after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockResolvedValue({} as never);
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Delete Books" }));
    expect(api.delete).toHaveBeenCalledWith("/categories/2");
  });

  it("explains why a category with products cannot be deleted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.delete).mockRejectedValue(apiError("Category still has products"));
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Delete Electronics" }));
    expect(await screen.findByText("Category still has products")).toBeInTheDocument();
  });

  it("keeps the category when the delete is not confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    page();
    await userEvent.click(await screen.findByRole("button", { name: "Delete Books" }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("shows a load error", async () => {
    routeGet({ "/categories": new Error("boom") });
    renderApp(<AdminCategories />);
    expect(await screen.findByText("Request failed")).toBeInTheDocument();
  });
});
