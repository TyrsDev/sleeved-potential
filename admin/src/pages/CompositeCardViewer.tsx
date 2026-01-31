import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { CardDefinition, CardStats, ResolvedStats } from "@sleeved-potential/shared";

/**
 * Composite Card Viewer
 *
 * Allows artists to test how card images overlap by selecting:
 * - A sleeve (background + foreground)
 * - An animal
 * - Multiple equipment cards
 *
 * The view renders layers in order:
 * 1. Sleeve background (bottom)
 * 2. Animal
 * 3. Equipment (in added order)
 * 4. Sleeve foreground (top)
 */

interface SelectedEquipment {
  card: CardDefinition;
  order: number;
}

function mergeStats(base: CardStats, overlay: CardStats): CardStats {
  const result: CardStats = { ...base };
  if (overlay.damage !== undefined) result.damage = overlay.damage;
  if (overlay.health !== undefined) result.health = overlay.health;
  if (overlay.modifier !== undefined) result.modifier = overlay.modifier;
  if (overlay.specialEffect !== undefined) result.specialEffect = overlay.specialEffect;
  if (overlay.initiative !== undefined) result.initiative = overlay.initiative;
  return result;
}

function resolveCompositeStats(
  sleeve: CardDefinition | null,
  animal: CardDefinition | null,
  equipment: CardDefinition[]
): ResolvedStats {
  let stats: CardStats = {};

  // 1. Sleeve background
  if (sleeve?.backgroundStats) {
    stats = mergeStats(stats, sleeve.backgroundStats);
  }

  // 2. Animal
  if (animal?.stats) {
    stats = mergeStats(stats, animal.stats);
  }

  // 3. Equipment (in order)
  for (const equip of equipment) {
    if (equip.stats) {
      stats = mergeStats(stats, equip.stats);
    }
  }

  // 4. Sleeve foreground
  if (sleeve?.foregroundStats) {
    stats = mergeStats(stats, sleeve.foregroundStats);
  }

  // Extract values
  let damage = stats.damage ?? 0;
  let health = stats.health ?? 0;
  const initiative = stats.initiative ?? 0;
  const modifier = stats.modifier ?? null;
  const specialEffect = stats.specialEffect ?? null;

  // Apply modifier
  if (modifier) {
    if (modifier.type === "damage") damage += modifier.amount;
    if (modifier.type === "health") health += modifier.amount;
  }

  return {
    damage: Math.max(0, damage),
    health: Math.max(0, health),
    initiative,
    modifier,
    specialEffect,
  };
}

export function CompositeCardViewer() {
  const [cards, setCards] = useState<CardDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSleeve, setSelectedSleeve] = useState<CardDefinition | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<CardDefinition | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<SelectedEquipment[]>([]);
  const [nextEquipmentOrder, setNextEquipmentOrder] = useState(0);

  // Load all cards
  useEffect(() => {
    const q = query(collection(db, "cards"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cardData = snapshot.docs.map((doc) => doc.data() as CardDefinition);
      setCards(cardData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const sleeves = cards.filter((c) => c.type === "sleeve");
  const animals = cards.filter((c) => c.type === "animal");
  const equipment = cards.filter((c) => c.type === "equipment");

  const handleAddEquipment = useCallback((card: CardDefinition) => {
    setSelectedEquipment((prev) => [
      ...prev,
      { card, order: nextEquipmentOrder },
    ]);
    setNextEquipmentOrder((prev) => prev + 1);
  }, [nextEquipmentOrder]);

  const handleRemoveEquipment = useCallback((order: number) => {
    setSelectedEquipment((prev) => prev.filter((e) => e.order !== order));
  }, []);

  const handleClearEquipment = useCallback(() => {
    setSelectedEquipment([]);
    setNextEquipmentOrder(0);
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedSleeve(null);
    setSelectedAnimal(null);
    setSelectedEquipment([]);
    setNextEquipmentOrder(0);
  }, []);

  // Sort equipment by order added
  const sortedEquipment = [...selectedEquipment].sort((a, b) => a.order - b.order);
  const equipmentCards = sortedEquipment.map((e) => e.card);

  // Calculate resolved stats
  const resolvedStats = resolveCompositeStats(selectedSleeve, selectedAnimal, equipmentCards);

  if (loading) {
    return <div className="loading">Loading cards...</div>;
  }

  return (
    <div className="composite-viewer-page">
      <div className="page-header">
        <h2>Composite Card Viewer</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={handleClearAll} className="btn">
            Clear All
          </button>
          <Link to="/cards" className="btn">
            Back to Cards
          </Link>
        </div>
      </div>

      <p className="help-text">
        Select cards to preview how their images layer together. The composition preview shows
        layers in order: sleeve background, animal, equipment, then sleeve foreground on top.
      </p>

      <div className="composite-viewer-layout">
        {/* Preview Panel */}
        <div className="composite-preview-panel">
          <h3>Composition Preview</h3>
          <div className="composite-preview-container">
            {/* Layer stack - absolutely positioned for overlap */}
            <div className="composite-layer-stack">
              {/* Sleeve Background (bottom) */}
              {selectedSleeve?.imageUrl && (
                <img
                  src={selectedSleeve.imageUrl}
                  alt={selectedSleeve.name}
                  className="composite-layer layer-sleeve-bg"
                  title={`Sleeve Background: ${selectedSleeve.name}`}
                />
              )}

              {/* Animal */}
              {selectedAnimal?.imageUrl && (
                <img
                  src={selectedAnimal.imageUrl}
                  alt={selectedAnimal.name}
                  className="composite-layer layer-animal"
                  title={`Animal: ${selectedAnimal.name}`}
                />
              )}

              {/* Equipment (in order) */}
              {sortedEquipment.map((equip, index) => (
                equip.card.imageUrl && (
                  <img
                    key={equip.order}
                    src={equip.card.imageUrl}
                    alt={equip.card.name}
                    className="composite-layer layer-equipment"
                    style={{ zIndex: 20 + index }}
                    title={`Equipment ${index + 1}: ${equip.card.name}`}
                  />
                )
              ))}

              {/* Sleeve Foreground (top) - same image but rendered last */}
              {selectedSleeve?.imageUrl && (
                <img
                  src={selectedSleeve.imageUrl}
                  alt={selectedSleeve.name}
                  className="composite-layer layer-sleeve-fg"
                  title={`Sleeve Foreground: ${selectedSleeve.name}`}
                />
              )}

              {/* Placeholder when nothing selected */}
              {!selectedSleeve && !selectedAnimal && selectedEquipment.length === 0 && (
                <div className="composite-placeholder">
                  Select cards to preview composition
                </div>
              )}
            </div>
          </div>

          {/* Resolved Stats */}
          <div className="composite-stats-panel">
            <h4>Resolved Stats</h4>
            <div className="composite-stats-grid">
              <div className="composite-stat">
                <span className="stat-label">Damage</span>
                <span className="stat-value">{resolvedStats.damage}</span>
              </div>
              <div className="composite-stat">
                <span className="stat-label">Health</span>
                <span className="stat-value">{resolvedStats.health}</span>
              </div>
              <div className="composite-stat">
                <span className="stat-label">Initiative</span>
                <span className="stat-value">{resolvedStats.initiative}</span>
              </div>
            </div>
            {resolvedStats.modifier && (
              <div className="composite-modifier">
                <strong>Modifier:</strong> {resolvedStats.modifier.amount > 0 ? "+" : ""}
                {resolvedStats.modifier.amount} {resolvedStats.modifier.type}
              </div>
            )}
            {resolvedStats.specialEffect && (
              <div className="composite-effect">
                <strong>Special Effect:</strong> {resolvedStats.specialEffect.trigger} -&gt;{" "}
                {resolvedStats.specialEffect.effect.type}
              </div>
            )}
          </div>

          {/* Layer Order Info */}
          <div className="layer-order-info">
            <h4>Selected Cards (Layer Order)</h4>
            <ol className="layer-list">
              {selectedSleeve && (
                <li className="layer-item layer-bg">
                  <span className="layer-type">Sleeve BG:</span> {selectedSleeve.name}
                  <button onClick={() => setSelectedSleeve(null)} className="layer-remove">
                    &times;
                  </button>
                </li>
              )}
              {selectedAnimal && (
                <li className="layer-item layer-animal-item">
                  <span className="layer-type">Animal:</span> {selectedAnimal.name}
                  <button onClick={() => setSelectedAnimal(null)} className="layer-remove">
                    &times;
                  </button>
                </li>
              )}
              {sortedEquipment.map((equip, index) => (
                <li key={equip.order} className="layer-item layer-equip-item">
                  <span className="layer-type">Equipment {index + 1}:</span> {equip.card.name}
                  <button
                    onClick={() => handleRemoveEquipment(equip.order)}
                    className="layer-remove"
                  >
                    &times;
                  </button>
                </li>
              ))}
              {selectedSleeve && (
                <li className="layer-item layer-fg">
                  <span className="layer-type">Sleeve FG:</span> {selectedSleeve.name} (top)
                </li>
              )}
            </ol>
          </div>
        </div>

        {/* Card Selection Panel */}
        <div className="composite-selection-panel">
          {/* Sleeves */}
          <div className="selection-section">
            <h4>Sleeves ({sleeves.length})</h4>
            <div className="selection-grid">
              {sleeves.map((card) => (
                <div
                  key={card.id}
                  className={`selection-item ${selectedSleeve?.id === card.id ? "selected" : ""}`}
                  onClick={() => setSelectedSleeve(card)}
                >
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.name} />
                  ) : (
                    <div className="selection-no-image">No image</div>
                  )}
                  <span className="selection-name">{card.name}</span>
                </div>
              ))}
              {sleeves.length === 0 && (
                <p className="empty-state">No sleeves created yet</p>
              )}
            </div>
          </div>

          {/* Animals */}
          <div className="selection-section">
            <h4>Animals ({animals.length})</h4>
            <div className="selection-grid">
              {animals.map((card) => (
                <div
                  key={card.id}
                  className={`selection-item ${selectedAnimal?.id === card.id ? "selected" : ""}`}
                  onClick={() => setSelectedAnimal(card)}
                >
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.name} />
                  ) : (
                    <div className="selection-no-image">No image</div>
                  )}
                  <span className="selection-name">{card.name}</span>
                </div>
              ))}
              {animals.length === 0 && (
                <p className="empty-state">No animals created yet</p>
              )}
            </div>
          </div>

          {/* Equipment */}
          <div className="selection-section">
            <div className="selection-header">
              <h4>Equipment ({equipment.length})</h4>
              {selectedEquipment.length > 0 && (
                <button onClick={handleClearEquipment} className="btn btn-small">
                  Clear ({selectedEquipment.length})
                </button>
              )}
            </div>
            <p className="selection-hint">Click to add equipment. Can select multiple.</p>
            <div className="selection-grid">
              {equipment.map((card) => {
                const isSelected = selectedEquipment.some((e) => e.card.id === card.id);
                const count = selectedEquipment.filter((e) => e.card.id === card.id).length;
                return (
                  <div
                    key={card.id}
                    className={`selection-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleAddEquipment(card)}
                  >
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt={card.name} />
                    ) : (
                      <div className="selection-no-image">No image</div>
                    )}
                    <span className="selection-name">{card.name}</span>
                    {count > 0 && <span className="selection-count">{count}</span>}
                  </div>
                );
              })}
              {equipment.length === 0 && (
                <p className="empty-state">No equipment created yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
