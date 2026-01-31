import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listCardImages } from "../firebase";
import type { CardImageInfo } from "@sleeved-potential/shared";

export function ImageList() {
  const [images, setImages] = useState<CardImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "used" | "unused">("all");

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    setLoading(true);
    setError(null);
    try {
      const result = await listCardImages();
      setImages(result.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }

  const filteredImages = images.filter((img) => {
    if (filter === "used") return img.cardId !== null;
    if (filter === "unused") return img.cardId === null;
    return true;
  });

  const usedCount = images.filter((img) => img.cardId !== null).length;
  const unusedCount = images.filter((img) => img.cardId === null).length;

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return <div className="loading">Loading images...</div>;
  }

  if (error) {
    return (
      <div className="error-page">
        <h2>Images</h2>
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-primary" onClick={loadImages}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="image-list-page">
      <div className="page-header">
        <h2>Card Images</h2>
        <button className="btn" onClick={loadImages}>
          Refresh
        </button>
      </div>

      <p className="help-text">
        Images stored in Firebase Storage. Upload new images when creating or editing cards.
      </p>

      <div className="filter-tabs">
        <button
          className={`tab ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({images.length})
        </button>
        <button
          className={`tab ${filter === "used" ? "active" : ""}`}
          onClick={() => setFilter("used")}
        >
          Used ({usedCount})
        </button>
        <button
          className={`tab ${filter === "unused" ? "active" : ""}`}
          onClick={() => setFilter("unused")}
        >
          Unused ({unusedCount})
        </button>
      </div>

      {filteredImages.length === 0 ? (
        <p className="empty-state">
          {filter === "all"
            ? "No images uploaded yet. Upload images when creating cards."
            : filter === "used"
              ? "No images are currently in use."
              : "All images are in use."}
        </p>
      ) : (
        <div className="image-grid">
          {filteredImages.map((image) => (
            <div key={image.path} className={`image-item ${image.cardId ? "used" : "unused"}`}>
              <div className="image-preview">
                <img src={image.url} alt={image.name} />
              </div>
              <div className="image-info">
                <p className="image-name" title={image.name}>
                  {image.name}
                </p>
                <p className="image-size">{formatBytes(image.size)}</p>
                {image.cardId ? (
                  <Link to={`/cards/${image.cardId}`} className="image-card-link">
                    Used by: {image.cardName}
                  </Link>
                ) : (
                  <span className="image-unused-badge">Unused</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
