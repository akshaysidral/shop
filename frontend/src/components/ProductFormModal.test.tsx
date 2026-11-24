import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../api";
import type { Category } from "../api";
import { apiError, makeProduct, renderApp } from "../testUtils";
import ProductFormModal from "./ProductFormModal";

const CATEGORIES: Category[] = [{ id: 3, name: "Electronics", slug: "electronics", icon: "phone", productCount: 1 }, { id: 4, name: "Books", slug: "books", icon: "books", productCount: 0 }];

function open(product = null as ReturnType<typeof makeProduct> | null) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  renderApp(<ProductFormModal show product={product} categories={CATEGORIES} onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
}

const fill = async (name: string, price: string, stock: string) => {
  if (name) await userEvent.type(screen.getByLabelText("Name"), name);
  if (price) await userEvent.type(screen.getByLabelText(/price/i), price);
  if (stock) await userEvent.type(screen.getByLabelText("Stock"), stock);
};

describe("ProductFormModal", () => {
  it("opens as Add product with an empty form", () => {
    open();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add product")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("offers every category plus none", () => {
    open();
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["No category", "Electronics", "Books"]);
  });

  it("creates a product with trimmed values and a category", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 5 } } as never);
    const { onSaved } = open();
    await fill("  Lamp ", "499.5", "7");
    await userEvent.type(screen.getByLabelText("Description"), "Bright");
    await userEvent.selectOptions(screen.getByLabelText("Category"), "3");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(api.post).toHaveBeenCalledWith("/products", {
      name: "Lamp", description: "Bright", price: 499.5, stock: 7, categoryId: 3, imageUrls: [],
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("offers a multi-file picker and no longer shows an image URL field", () => {
    open();
    expect(screen.getByLabelText("Product images")).toHaveAttribute("multiple");
    expect(screen.queryByLabelText(/image url/i)).not.toBeInTheDocument();
  });

  it("sends no category and no images when they are left empty", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 5 } } as never);
    open();
    await fill("Lamp", "10", "1");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.post).toHaveBeenCalledWith("/products", expect.objectContaining({
      categoryId: null,
      imageUrls: [],
    }));
  });

  it("edits an existing product with PUT", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    const { onSaved } = open(makeProduct({ id: 9, name: "Old", price: 100, stock: 2, categoryId: 4, description: "d" }));
    expect(screen.getByText("Edit product")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Old");
    expect(screen.getByLabelText("Category")).toHaveValue("4");
    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "New");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.put).toHaveBeenCalledWith("/products/9", expect.objectContaining({ name: "New", price: 100, stock: 2, categoryId: 4 }));
    expect(onSaved).toHaveBeenCalled();
  });

  it("preserves an existing private S3 image key when editing other product fields", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    const key = "product/9_old/123e4567-e89b-12d3-a456-426614174000.png";
    open(makeProduct({
      id: 9,
      images: [{ url: "https://s3.example/signed-read", key }],
    }));

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(api.put).toHaveBeenCalledWith("/products/9", expect.objectContaining({ imageUrls: [key] }));
  });

  it("uploads multiple product images to S3 and saves all object keys in order", async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: 12 } } as never)
      .mockResolvedValueOnce({ data: {
        objectKey: "product/12_lamp/123e4567-e89b-12d3-a456-426614174000.png",
        uploadUrl: "https://s3.example/upload-1",
        requiredHeaders: { "Content-Type": "image/png", "Content-Length": "3" },
      } } as never)
      .mockResolvedValueOnce({ data: {
        objectKey: "product/12_lamp/123e4567-e89b-12d3-a456-426614174001.jpg",
        uploadUrl: "https://s3.example/upload-2",
        requiredHeaders: { "Content-Type": "image/jpeg", "Content-Length": "4" },
      } } as never);
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const { onSaved } = open();
    await fill("Lamp", "10", "1");
    const files = [
      new File(["png"], "lamp.png", { type: "image/png" }),
      new File(["jpeg"], "lamp-front.jpg", { type: "image/jpeg" }),
    ];
    await userEvent.upload(screen.getByLabelText("Product images"), files);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(api.post).toHaveBeenNthCalledWith(1, "/products", expect.objectContaining({ name: "Lamp" }));
    expect(api.post).toHaveBeenNthCalledWith(2, "/seller/products/12/image-upload-url", {
      contentType: "image/png",
      fileSizeBytes: 3,
    });
    expect(api.post).toHaveBeenNthCalledWith(3, "/seller/products/12/image-upload-url", {
      contentType: "image/jpeg",
      fileSizeBytes: 4,
    });
    expect(fetch).toHaveBeenCalledWith("https://s3.example/upload-1", {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: files[0],
    });
    expect(fetch).toHaveBeenCalledWith("https://s3.example/upload-2", {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: files[1],
    });
    expect(api.put).toHaveBeenCalledWith("/products/12", expect.objectContaining({
      imageUrls: [
        "product/12_lamp/123e4567-e89b-12d3-a456-426614174000.png",
        "product/12_lamp/123e4567-e89b-12d3-a456-426614174001.jpg",
      ],
    }));
    expect(onSaved).toHaveBeenCalled();
  });

  it("removes existing images from the gallery before saving", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} } as never);
    open(makeProduct({
      images: [
        { url: "https://images.example/front", key: null },
        { url: "https://images.example/back", key: null },
      ],
    }));

    await userEvent.click(screen.getByRole("button", { name: "Remove current image 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(api.put).toHaveBeenCalledWith("/products/1", expect.objectContaining({
      imageUrls: ["https://images.example/back"],
    }));
  });

  it.each([
    ["", "10", "1", "Name is required"],
    ["Lamp", "", "1", "Price must be greater than 0"],
    ["Lamp", "0", "1", "Price must be greater than 0"],
    ["Lamp", "10", "", "Stock must be a whole number"],
    ["Lamp", "10", "1.5", "Stock must be a whole number"],
  ])("rejects name=%j price=%j stock=%j", async (name, price, stock, message) => {
    open();
    await fill(name, price, stock);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(new RegExp(message))).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("shows the server's message when saving fails", async () => {
    vi.mocked(api.post).mockRejectedValue(apiError("Category not found", 404));
    const { onSaved } = open();
    await fill("Lamp", "10", "1");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Category not found")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("closes on Cancel", async () => {
    const { onClose } = open();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});
