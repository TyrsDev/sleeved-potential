import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { CardDefinition } from "@sleeved-potential/shared";
import { CompositionPreview } from "../components/CompositionPreview";
import { MiniCardDisplay } from "../components/MiniCardDisplay";
import type { SelectedEquipment } from "../components/types";

/**
 * Composite Card Viewer
 *
 * Allows artists to test how card images overlap by selecting:
 * - A sleeve (background)
 * - An animal
 * - Multiple equipment cards
 *
 * The view renders layers in order:
 * 1. Sleeve (bottom/background)
 * 2. Animal
 * 3. Equipment (in added order, on top)
 */

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
        layers in order: sleeve (background), animal, then equipment on top.
      </p>

      <div className="composite-viewer-layout">
        {/* Preview Panel — shared component */}
        <CompositionPreview
          sleeve={selectedSleeve}
          animal={selectedAnimal}
          equipment={selectedEquipment}
          onRemoveSleeve={() => setSelectedSleeve(null)}
          onRemoveAnimal={() => setSelectedAnimal(null)}
          onRemoveEquipment={handleRemoveEquipment}
        />

        {/* Card Selection Panel */}
        <div className="composite-selection-panel">
          {/* Sleeves */}
          <div className="selection-section">
            <h4>Sleeves ({sleeves.length})</h4>
            <div className="mini-selection-grid">
              {sleeves.map((card) => (
                <div
                  key={card.id}
                  className={`mini-selection-item ${selectedSleeve?.id === card.id ? "selected" : ""}`}
                  onClick={() => setSelectedSleeve(card)}
                >
                  <MiniCardDisplay card={card} />
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
            <div className="mini-selection-grid">
              {animals.map((card) => (
                <div
                  key={card.id}
                  className={`mini-selection-item ${selectedAnimal?.id === card.id ? "selected" : ""}`}
                  onClick={() => setSelectedAnimal(card)}
                >
                  <MiniCardDisplay card={card} />
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
            <div className="mini-selection-grid">
              {equipment.map((card) => {
                const isSelected = selectedEquipment.some((e) => e.card.id === card.id);
                const count = selectedEquipment.filter((e) => e.card.id === card.id).length;
                return (
                  <div
                    key={card.id}
                    className={`mini-selection-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleAddEquipment(card)}
                  >
                    <MiniCardDisplay card={card} />
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
