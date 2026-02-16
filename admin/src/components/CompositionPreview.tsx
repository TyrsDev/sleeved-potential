import { useMemo } from "react";
import { resolveStats } from "@sleeved-potential/shared";
import type { CardDefinition } from "@sleeved-potential/shared";
import { ResolvedStatsOverlay } from "./ResolvedStatsOverlay";
import { StatAttributionTable } from "./StatAttributionTable";
import type { SelectedEquipment } from "./types";

interface CompositionPreviewProps {
  sleeve: CardDefinition | null;
  animal: CardDefinition | null;
  equipment: SelectedEquipment[];
  onRemoveSleeve?: () => void;
  onRemoveAnimal?: () => void;
  onRemoveEquipment?: (order: number) => void;
  placeholderText?: string;
}

/**
 * Full composition preview panel: image layer stack, resolved stats, and stat attribution.
 * Reused by CompositeCardViewer and SnapshotManager.
 */
export function CompositionPreview({
  sleeve,
  animal,
  equipment,
  onRemoveSleeve,
  onRemoveAnimal,
  onRemoveEquipment,
  placeholderText = "Select cards to preview composition",
}: CompositionPreviewProps) {
  const sortedEquipment = useMemo(
    () => [...equipment].sort((a, b) => a.order - b.order),
    [equipment]
  );
  const equipmentCards = useMemo(
    () => sortedEquipment.map((e) => e.card),
    [sortedEquipment]
  );
  const resolvedStats = useMemo(
    () => resolveStats(sleeve, animal, equipmentCards),
    [sleeve, animal, equipmentCards]
  );

  const hasAnySelection = sleeve !== null || animal !== null || equipment.length > 0;

  return (
    <div className="composite-preview-panel">
      {/* Image layer stack */}
      <div className="composite-preview-container">
        <div className="composite-layer-stack">
          {sleeve?.imageUrl && (
            <img
              src={sleeve.imageUrl}
              alt={sleeve.name}
              className="composite-layer"
              style={{ zIndex: 1 }}
            />
          )}
          {animal?.imageUrl && (
            <img
              src={animal.imageUrl}
              alt={animal.name}
              className="composite-layer"
              style={{ zIndex: 10 }}
            />
          )}
          {sortedEquipment.map((equip, index) =>
            equip.card.imageUrl ? (
              <img
                key={equip.order}
                src={equip.card.imageUrl}
                alt={equip.card.name}
                className="composite-layer"
                style={{ zIndex: 20 + index }}
              />
            ) : null
          )}
          {hasAnySelection && <ResolvedStatsOverlay stats={resolvedStats} />}
          {!hasAnySelection && (
            <div className="composite-placeholder">{placeholderText}</div>
          )}
        </div>
      </div>

      {/* Resolved Stats */}
      {hasAnySelection && (
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
      )}

      {/* Stat Attribution */}
      {hasAnySelection && (
        <div className="stat-attribution-section">
          <h4>Stat Attribution</h4>
          <StatAttributionTable
            sleeve={sleeve}
            animal={animal}
            equipment={equipment}
            onRemoveSleeve={onRemoveSleeve}
            onRemoveAnimal={onRemoveAnimal}
            onRemoveEquipment={onRemoveEquipment}
          />
        </div>
      )}
    </div>
  );
}
