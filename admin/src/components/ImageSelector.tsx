import { useEffect, useState } from "react";
import { listCardImages } from "../firebase";
import type { CardImageInfo } from "@sleeved-potential/shared";

interface ImageSelectorProps {
  currentImageUrl: string | null;
  currentCardId: string | null; // To exclude images used by THIS card
  onSelect: (imageUrl: string | null) => void;
}

export function ImageSelector({ currentImageUrl, currentCardId, onSelect }: ImageSelectorProps) {
  const [images, setImages] = useState<CardImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    if (showSelector && images.length === 0) {
      loadImages();
    }
  }, [showSelector, images.length]);

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

  // Available images: unused OR used by this card
  const availableImages = images.filter(
    (img) => img.cardId === null || img.cardId === currentCardId
  );

  return (
    <div className="image-selector">
      <label>Card Image</label>

      {currentImageUrl && (
        <div className="current-image">
          <img src={currentImageUrl} alt="Current" className="preview-image" />
          <button type="button" className="btn btn-small" onClick={() => onSelect(null)}>
            Remove Image
          </button>
        </div>
      )}

      <button
        type="button"
        className="btn"
        onClick={() => setShowSelector(!showSelector)}
      >
        {showSelector ? "Hide Image Selector" : "Select Existing Image"}
      </button>

      {showSelector && (
        <div className="image-selector-panel">
          {loading ? (
            <p className="loading-text">Loading images...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : availableImages.length === 0 ? (
            <p className="empty-text">No available images. Upload one below.</p>
          ) : (
            <div className="image-selector-grid">
              {availableImages.map((image) => (
                <div
                  key={image.path}
                  className={`image-selector-item ${currentImageUrl === image.url ? "selected" : ""}`}
                  onClick={() => {
                    onSelect(image.url);
                    setShowSelector(false);
                  }}
                >
                  <img src={image.url} alt={image.name} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
