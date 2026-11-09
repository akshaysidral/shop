import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { api, errMsg } from "../api";
import type { Category, Product, ProductImageAsset } from "../api";
import { DeleteIcon } from "../icons";
import ProductImage from "./ProductImage";
import SelectField from "./SelectField";

type Props = {
  show: boolean;
  product: Product | null;            // null = add a new product
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

const BLANK = { name: "", description: "", price: "", stock: "", categoryId: "" };

export default function ProductFormModal({ show, product, categories, onClose, onSaved }: Props) {
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [currentImages, setCurrentImages] = useState<ProductImageAsset[]>([]);
  const [createdProductId, setCreatedProductId] = useState<number | null>(null);

  useEffect(() => {
    if (!show) return;
    setError("");
    setImageFiles([]);
    setCurrentImages(product?.images?.length
      ? product.images
      : product?.imageUrl
        ? [{ url: product.imageUrl, key: product.imageKey }]
        : []);
    setCreatedProductId(null);
    setForm(product
      ? {
          name: product.name,
          description: product.description ?? "",
          price: String(product.price),
          stock: String(product.stock),
          categoryId: product.categoryId ? String(product.categoryId) : "",
        }
      : BLANK);
  }, [show, product]);

  const text = (k: keyof typeof BLANK) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function addImageFiles(event: ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(event.currentTarget.files ?? []);
    setImageFiles((files) => [...files, ...newFiles]);
    event.currentTarget.value = "";
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim()) return setError("Name is required");
    if (!(price > 0)) return setError("Price must be greater than 0");
    if (form.stock.trim() === "" || !Number.isInteger(stock) || stock < 0) return setError("Stock must be a whole number, 0 or more");
    if (imageFiles.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      return setError("Only JPEG, PNG, and WebP images are supported");
    }
    if (imageFiles.some((file) => file.size < 1 || file.size > 5 * 1024 * 1024)) {
      return setError("Each image must be between 1 byte and 5 MiB");
    }
    setBusy(true);
    const imageUrls = currentImages.map((image) => image.key ?? image.url);
    const body = {
      name: form.name.trim(),
      description: form.description,
      price,
      stock,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      imageUrl: imageUrls[0] ?? null,
      imageUrls,
    };
    let productSaved = Boolean(product?.id || createdProductId);
    try {
      let productId = product?.id ?? createdProductId;
      if (productId) {
        await api.put(`/products/${productId}`, body);
        productSaved = true;
      } else {
        const { data } = await api.post<{ id: number }>("/products", body);
        if (!Number.isInteger(data.id) || data.id <= 0) {
          throw new Error("The product was saved, but the server did not return its ID.");
        }
        productId = data.id;
        productSaved = true;
        setCreatedProductId(productId);
      }

      if (imageFiles.length > 0) {
        const uploadedKeys = await Promise.all(imageFiles.map(async (imageFile) => {
          const { data: upload } = await api.post<{
            objectKey: string;
            uploadUrl: string;
            requiredHeaders: Record<string, string>;
          }>(`/seller/products/${productId}/image-upload-url`, {
            contentType: imageFile.type,
            fileSizeBytes: imageFile.size,
          });
          const headers = Object.fromEntries(
            Object.entries(upload.requiredHeaders).filter(([name]) => name.toLowerCase() !== "content-length"),
          );
          const response = await fetch(upload.uploadUrl, {
            method: "PUT",
            headers,
            body: imageFile,
          });
          if (!response.ok) {
            throw new Error(`S3 image upload failed (${response.status}).`);
          }
          return upload.objectKey;
        }));
        const allImageUrls = [...imageUrls, ...uploadedKeys];
        await api.put(`/products/${productId}`, {
          ...body,
          imageUrl: allImageUrls[0] ?? null,
          imageUrls: allImageUrls,
        });
      }
      onSaved();
    } catch (err) {
      const message = errMsg(err, err instanceof Error ? err.message : "Could not save the product");
      setError(productSaved
        ? `Product saved, but the image step failed: ${message}. Retry Save to continue.`
        : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField id="pf-name" label="Name" value={form.name} onChange={text("name")} />
            <TextField id="pf-desc" label="Description" multiline minRows={3} value={form.description} onChange={text("description")} />
            <Stack direction="row" spacing={2}>
              <TextField id="pf-price" label="Price (INR)" type="number" fullWidth value={form.price} onChange={text("price")}
                         slotProps={{ htmlInput: { min: 0, step: "0.01" } }} />
              <TextField id="pf-stock" label="Stock" type="number" fullWidth value={form.stock} onChange={text("stock")}
                         slotProps={{ htmlInput: { min: 0, step: "1" } }} />
            </Stack>
            <SelectField id="pf-cat" label="Category" size="medium" value={form.categoryId} onChange={(v) => setForm({ ...form, categoryId: v })}
                         options={[{ value: "", label: "No category" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
            {currentImages.length > 0 && (
              <Box aria-label="Current product images" sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {currentImages.map((image, index) => (
                  <Box key={`${image.key ?? image.url}-${index}`} sx={{ position: "relative" }}>
                    <ProductImage name={`${form.name || "Product"} image ${index + 1}`} src={image.url} size="sm" />
                    <IconButton
                      aria-label={`Remove current image ${index + 1}`}
                      size="small"
                      color="error"
                      onClick={() => setCurrentImages((images) => images.filter((_, imageIndex) => imageIndex !== index))}
                      sx={{ position: "absolute", top: -8, right: -8, bgcolor: "background.paper" }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
            <Button component="label" variant="outlined">
              {imageFiles.length > 0 ? "Add more images" : "Choose images"}
              <input
                aria-label="Product images"
                hidden
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={addImageFiles}
              />
            </Button>
            {imageFiles.length > 0 && (
              <Stack spacing={0.5} aria-label="Selected images">
                {imageFiles.map((file, index) => (
                  <Box key={`${file.name}-${file.lastModified}-${index}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>{file.name}</Typography>
                    <IconButton
                      aria-label={`Remove selected image ${file.name}`}
                      size="small"
                      color="error"
                      onClick={() => setImageFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
            <Typography variant="caption" color="text.secondary">
              Select multiple JPEG, PNG, or WebP images (maximum 5 MiB each). Uploads use private S3 storage.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
