import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db, createCard, updateCard, deleteCard, uploadCardImage } from "../firebase";
import { ImageSelector } from "../components/ImageSelector";
import type { CardDefinition, CardType, CardStats, CreateCardData } from "@sleeved-potential/shared";

export function CardForm() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const isNew = cardId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<CardType>("animal");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Stats (for animal/equipment)
  const [damage, setDamage] = useState<string>("");
  const [health, setHealth] = useState<string>("");

  // Sleeve stats
  const [bgDamage, setBgDamage] = useState<string>("");
  const [bgHealth, setBgHealth] = useState<string>("");
  const [fgDamage, setFgDamage] = useState<string>("");
  const [fgHealth, setFgHealth] = useState<string>("");

  // Reset form when creating new card
  useEffect(() => {
    if (isNew) {
      setType("animal");
      setName("");
      setDescription("");
      setImageUrl(null);
      setDamage("");
      setHealth("");
      setBgDamage("");
      setBgHealth("");
      setFgDamage("");
      setFgHealth("");
      setError(null);
    }
  }, [isNew]);

  // Load existing card
  useEffect(() => {
    if (isNew || !cardId) return;

    const unsubscribe = onSnapshot(doc(db, "cards", cardId), (snapshot) => {
      if (snapshot.exists()) {
        const card = snapshot.data() as CardDefinition;
        setType(card.type);
        setName(card.name);
        setDescription(card.description);
        setImageUrl(card.imageUrl);

        if (card.type === "sleeve") {
          setBgDamage(card.backgroundStats?.damage?.toString() ?? "");
          setBgHealth(card.backgroundStats?.health?.toString() ?? "");
          setFgDamage(card.foregroundStats?.damage?.toString() ?? "");
          setFgHealth(card.foregroundStats?.health?.toString() ?? "");
        } else {
          setDamage(card.stats?.damage?.toString() ?? "");
          setHealth(card.stats?.health?.toString() ?? "");
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [cardId, isNew]);

  const buildStats = useCallback((): CardStats | undefined => {
    const stats: CardStats = {};
    if (damage !== "") stats.damage = parseInt(damage, 10);
    if (health !== "") stats.health = parseInt(health, 10);
    return Object.keys(stats).length > 0 ? stats : undefined;
  }, [damage, health]);

  const buildSleeveStats = useCallback((): {
    backgroundStats?: CardStats;
    foregroundStats?: CardStats;
  } => {
    const bg: CardStats = {};
    const fg: CardStats = {};

    if (bgDamage !== "") bg.damage = parseInt(bgDamage, 10);
    if (bgHealth !== "") bg.health = parseInt(bgHealth, 10);
    if (fgDamage !== "") fg.damage = parseInt(fgDamage, 10);
    if (fgHealth !== "") fg.health = parseInt(fgHealth, 10);

    return {
      backgroundStats: Object.keys(bg).length > 0 ? bg : undefined,
      foregroundStats: Object.keys(fg).length > 0 ? fg : undefined,
    };
  }, [bgDamage, bgHealth, fgDamage, fgHealth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isNew) {
        const cardData: CreateCardData = {
          type,
          name,
          description,
        };

        if (type === "sleeve") {
          const { backgroundStats, foregroundStats } = buildSleeveStats();
          cardData.backgroundStats = backgroundStats;
          cardData.foregroundStats = foregroundStats;
        } else {
          cardData.stats = buildStats();
        }

        const result = await createCard(cardData);
        navigate(`/cards/${result.card.id}`);
      } else if (cardId) {
        const updates: Partial<CardDefinition> = {
          name,
          description,
          imageUrl,
        };

        if (type === "sleeve") {
          const { backgroundStats, foregroundStats } = buildSleeveStats();
          updates.backgroundStats = backgroundStats;
          updates.foregroundStats = foregroundStats;
        } else {
          updates.stats = buildStats();
        }

        await updateCard(cardId, updates);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!cardId || isNew) return;
    if (!confirm("Are you sure you want to delete this card?")) return;

    setSaving(true);
    try {
      await deleteCard(cardId);
      navigate("/cards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete card");
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cardId || isNew) return;

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setSaving(true);
      try {
        const result = await uploadCardImage(cardId, base64, file.type);
        setImageUrl(result.imageUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload image");
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="loading">Loading card...</div>;
  }

  return (
    <div className="card-form-page">
      <div className="page-header">
        <h2>{isNew ? "Create Card" : "Edit Card"}</h2>
        {!isNew && (
          <Link to="/cards/new" className="btn btn-primary">
            + New Card
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as CardType)}
            disabled={!isNew}
          >
            <option value="animal">Animal</option>
            <option value="equipment">Equipment</option>
            <option value="sleeve">Sleeve</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {type === "sleeve" ? (
          <>
            <fieldset>
              <legend>Background Stats (easily overwritten)</legend>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bgDamage">Damage</label>
                  <input
                    id="bgDamage"
                    type="number"
                    value={bgDamage}
                    onChange={(e) => setBgDamage(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bgHealth">Health</label>
                  <input
                    id="bgHealth"
                    type="number"
                    value={bgHealth}
                    onChange={(e) => setBgHealth(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Foreground Stats (guaranteed)</legend>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fgDamage">Damage</label>
                  <input
                    id="fgDamage"
                    type="number"
                    value={fgDamage}
                    onChange={(e) => setFgDamage(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fgHealth">Health</label>
                  <input
                    id="fgHealth"
                    type="number"
                    value={fgHealth}
                    onChange={(e) => setFgHealth(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
            </fieldset>
          </>
        ) : (
          <fieldset>
            <legend>Stats</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="damage">Damage</label>
                <input
                  id="damage"
                  type="number"
                  value={damage}
                  onChange={(e) => setDamage(e.target.value)}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="health">Health</label>
                <input
                  id="health"
                  type="number"
                  value={health}
                  onChange={(e) => setHealth(e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </fieldset>
        )}

        {!isNew && cardId && (
          <fieldset>
            <legend>Card Image</legend>
            <ImageSelector
              currentImageUrl={imageUrl}
              currentCardId={cardId}
              onSelect={setImageUrl}
            />
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Or upload a new image:</label>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} />
            </div>
          </fieldset>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : isNew ? "Create Card" : "Save Changes"}
          </button>
          <button type="button" className="btn" onClick={() => navigate("/cards")}>
            Cancel
          </button>
          {!isNew && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
