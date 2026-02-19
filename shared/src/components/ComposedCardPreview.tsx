import type { CardDefinition, ResolvedStats } from "../types/index.js";
import { formatTriggerName, formatEffectAction } from "../combat.js";
import type { SelectedEquipment } from "./types.js";

interface ComposedCardPreviewProps {
  sleeve: CardDefinition | null;
  animal: CardDefinition | null;
  equipment: SelectedEquipment[];
  resolvedStats: ResolvedStats;
  showLabels?: boolean;
  className?: string;
}

/**
 * Visual preview of a composed card with layered images.
 * Sleeve is at the back, animal on top, equipment layers on top of that.
 */
export function ComposedCardPreview({
  sleeve,
  animal,
  equipment,
  resolvedStats,
  showLabels = true,
  className = "",
}: ComposedCardPreviewProps) {
  const sortedEquipment = [...equipment].sort((a, b) => a.order - b.order);
  const hasAnyCard = sleeve || animal || equipment.length > 0;

  return (
    <div className={`sp-composed-card-preview ${className}`}>
      <div className="sp-composed-card-frame">
        {!hasAnyCard ? (
          <div className="sp-composed-card-empty">
            <span>Select cards to compose</span>
          </div>
        ) : (
          <div className="sp-composed-card-layers">
            {sleeve?.imageUrl && (
              <img src={sleeve.imageUrl} alt={sleeve.name} className="sp-composed-layer sp-layer-sleeve" />
            )}
            {animal?.imageUrl && (
              <img src={animal.imageUrl} alt={animal.name} className="sp-composed-layer sp-layer-animal" />
            )}
            {sortedEquipment.map((eq, index) =>
              eq.card.imageUrl ? (
                <img
                  key={eq.order}
                  src={eq.card.imageUrl}
                  alt={eq.card.name}
                  className="sp-composed-layer sp-layer-equipment"
                  style={{ zIndex: 30 + index }}
                />
              ) : null
            )}

            <div className="sp-composed-stats-overlay">
              <div className="sp-composed-overlay-top">
                {resolvedStats.specialEffect && (
                  <div className="sp-composed-effect">
                    {formatTriggerName(resolvedStats.specialEffect.trigger)}:{" "}
                    {formatEffectAction(resolvedStats.specialEffect)}
                  </div>
                )}
              </div>
              <div className="sp-composed-overlay-middle">
                {resolvedStats.modifier && (
                  <div className="sp-composed-modifier">
                    {resolvedStats.modifier.amount > 0 ? "+" : ""}
                    {resolvedStats.modifier.amount}{" "}
                    {resolvedStats.modifier.type === "damage" ? "DMG" : "HP"}
                  </div>
                )}
              </div>
              <div className="sp-composed-overlay-bottom">
                <span className="sp-composed-stat damage">{resolvedStats.damage}</span>
                <span className="sp-composed-stat initiative">
                  {resolvedStats.initiative !== 0
                    ? `${resolvedStats.initiative > 0 ? "+" : ""}${resolvedStats.initiative}`
                    : ""}
                </span>
                <span className="sp-composed-stat health">{resolvedStats.health}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showLabels && hasAnyCard && (
        <div className="sp-composed-card-labels">
          {sleeve && <span className="sp-label-sleeve">{sleeve.name}</span>}
          {animal && <span className="sp-label-animal">{animal.name}</span>}
          {sortedEquipment.map((eq) => (
            <span key={eq.order} className="sp-label-equipment">
              {eq.card.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
