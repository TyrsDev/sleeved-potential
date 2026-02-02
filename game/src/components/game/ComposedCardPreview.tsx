import type { CardDefinition, ResolvedStats } from "@sleeved-potential/shared";
import { formatTriggerName, formatEffectAction } from "@sleeved-potential/shared";

interface SelectedEquipment {
  card: CardDefinition;
  order: number;
}

interface ComposedCardPreviewProps {
  sleeve: CardDefinition | null;
  animal: CardDefinition | null;
  equipment: SelectedEquipment[];
  resolvedStats: ResolvedStats;
}

/**
 * Visual preview of a composed card with layered images.
 * Sleeve is at the back, animal on top, equipment layers on top of that.
 * Card images are partially transparent PNGs designed for layering.
 */
export function ComposedCardPreview({
  sleeve,
  animal,
  equipment,
  resolvedStats,
}: ComposedCardPreviewProps) {
  // Sort equipment by order (bottom to top)
  const sortedEquipment = [...equipment].sort((a, b) => a.order - b.order);

  const hasAnyCard = sleeve || animal || equipment.length > 0;

  return (
    <div className="composed-card-preview">
      <div className="composed-card-frame">
        {!hasAnyCard ? (
          <div className="composed-card-empty">
            <span>Select cards to compose</span>
          </div>
        ) : (
          <div className="composed-card-layers">
            {/* Sleeve layer (background) */}
            {sleeve?.imageUrl && (
              <img
                src={sleeve.imageUrl}
                alt={sleeve.name}
                className="composed-layer layer-sleeve"
              />
            )}

            {/* Animal layer */}
            {animal?.imageUrl && (
              <img
                src={animal.imageUrl}
                alt={animal.name}
                className="composed-layer layer-animal"
              />
            )}

            {/* Equipment layers (in order, bottom to top) */}
            {sortedEquipment.map((eq, index) =>
              eq.card.imageUrl ? (
                <img
                  key={eq.order}
                  src={eq.card.imageUrl}
                  alt={eq.card.name}
                  className="composed-layer layer-equipment"
                  style={{ zIndex: 30 + index }}
                />
              ) : null
            )}

            {/* Stats overlay */}
            <div className="composed-stats-overlay">
              <div className="composed-overlay-top">
                {resolvedStats.specialEffect && (
                  <div className="composed-effect">
                    {formatTriggerName(resolvedStats.specialEffect.trigger)}:{" "}
                    {formatEffectAction(resolvedStats.specialEffect)}
                  </div>
                )}
              </div>
              <div className="composed-overlay-middle">
                {resolvedStats.modifier && (
                  <div className="composed-modifier">
                    {resolvedStats.modifier.amount > 0 ? "+" : ""}
                    {resolvedStats.modifier.amount}{" "}
                    {resolvedStats.modifier.type === "damage" ? "DMG" : "HP"}
                  </div>
                )}
              </div>
              <div className="composed-overlay-bottom">
                <span className="composed-stat damage">{resolvedStats.damage}</span>
                <span className="composed-stat initiative">
                  {resolvedStats.initiative !== 0
                    ? `${resolvedStats.initiative > 0 ? "+" : ""}${resolvedStats.initiative}`
                    : ""}
                </span>
                <span className="composed-stat health">{resolvedStats.health}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card name labels */}
      {hasAnyCard && (
        <div className="composed-card-labels">
          {sleeve && <span className="label-sleeve">{sleeve.name}</span>}
          {animal && <span className="label-animal">{animal.name}</span>}
          {sortedEquipment.map((eq) => (
            <span key={eq.order} className="label-equipment">
              {eq.card.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
