import { memo, useState, type MouseEvent } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import type { ProductImageAsset } from "../../api";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "../../icons";
import ProductImage from "../../components/ProductImage";
import styles from "./ProductImageGallery.module.css";

type Props = {
  name: string;
  images: ProductImageAsset[];
};

function ProductImageGallery({ name, images }: Props) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const selectedImage = images[selectedImageIndex] ?? images[0];

  const showImage = (index: number) => {
    setSelectedImageIndex((index + images.length) % images.length);
  };
  const changeImage = (direction: "previous" | "next") => {
    showImage(selectedImageIndex + (direction === "previous" ? -1 : 1));
    setZoomLevel(1);
    setZoomOrigin({ x: 50, y: 50 });
  };
  const closeViewer = () => {
    setViewerOpen(false);
    setZoomLevel(1);
    setZoomOrigin({ x: 50, y: 50 });
  };
  const openViewer = () => {
    setZoomLevel(1);
    setZoomOrigin({ x: 50, y: 50 });
    setViewerOpen(true);
  };
  const zoomImage = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width && rect.height) {
      setZoomOrigin({
        x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
      });
    }
    setZoomLevel((level) => (level === 3 ? 1 : level + 1));
  };
  const panZoom = (event: MouseEvent<HTMLButtonElement>) => {
    if (zoomLevel === 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setZoomOrigin({
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    });
  };

  return (
    <>
      <div className={styles.gallery}>
        <div className={styles.mainImage}>
          {selectedImage?.url ? (
            <button type="button" aria-label="Zoom product image" className={styles.mainImageButton} onClick={openViewer}>
              <ProductImage key={selectedImage.url} name={name} src={selectedImage.url} size="lg" />
              <span className={styles.zoomBadge}>Zoom</span>
            </button>
          ) : (
            <ProductImage name={name} src={selectedImage?.url} size="lg" />
          )}
          {images.length > 1 && (
            <>
              <IconButton aria-label="Previous product image" onClick={() => showImage(selectedImageIndex - 1)} className={styles.mainArrow}>
                <ChevronLeftIcon />
              </IconButton>
              <IconButton aria-label="Next product image" onClick={() => showImage(selectedImageIndex + 1)} className={`${styles.mainArrow} ${styles.mainArrowNext}`}>
                <ChevronRightIcon />
              </IconButton>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className={styles.thumbnails} aria-label="Product image gallery">
            {images.map((image, index) => (
              <button
                type="button"
                key={`${image.key ?? image.url}-${index}`}
                aria-label={`Show product image ${index + 1}`}
                aria-pressed={selectedImageIndex === index}
                onClick={() => showImage(index)}
                className={`${styles.thumbnail} ${selectedImageIndex === index ? styles.thumbnailSelected : ""}`}
              >
                <ProductImage name={`${name} image ${index + 1}`} src={image.url} size="sm" />
              </button>
            ))}
          </div>
        )}
      </div>
      <Dialog
        open={viewerOpen}
        onClose={closeViewer}
        maxWidth={false}
        aria-labelledby="product-image-viewer-title"
        slotProps={{ paper: { className: styles.viewerPaper } }}
      >
        <DialogTitle id="product-image-viewer-title" className={styles.visuallyHidden}>
          Product image viewer
        </DialogTitle>
        <DialogContent className={styles.viewerContent}>
          {selectedImage?.url && (
            <div className={styles.viewerStage}>
              <IconButton aria-label="Close image viewer" onClick={closeViewer} className={`${styles.viewerControl} ${styles.closeButton}`}>
                <CloseIcon />
              </IconButton>
              {images.length > 1 && (
                <IconButton aria-label="Previous product image" onClick={() => changeImage("previous")} className={`${styles.viewerControl} ${styles.previousButton}`}>
                  <ChevronLeftIcon />
                </IconButton>
              )}
              <button
                type="button"
                aria-label={zoomLevel === 1 ? "Zoom image" : zoomLevel === 3 ? "Reset image zoom" : "Zoom image further"}
                onClick={zoomImage}
                onMouseMove={panZoom}
                className={`${styles.zoomSurface} ${zoomLevel > 1 ? styles.zoomed : ""}`}
              >
                <img
                  src={selectedImage.url}
                  alt={`${name} enlarged`}
                  className={styles.zoomImage}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                  }}
                />
              </button>
              {images.length > 1 && (
                <IconButton aria-label="Next product image" onClick={() => changeImage("next")} className={`${styles.viewerControl} ${styles.nextButton}`}>
                  <ChevronRightIcon />
                </IconButton>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(ProductImageGallery);
