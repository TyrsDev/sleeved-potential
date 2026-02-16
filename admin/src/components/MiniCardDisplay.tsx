import { formatEffectAction, formatTriggerName } from "@sleeved-potential/shared";
import type { CardDefinition } from "@sleeved-potential/shared";

/**
 * Mini card display with stats overlay - consistent sizing with or without image
 */
export function MiniCardDisplay({ card }: { card: CardDefinition }) {
  const stats =
    card.type === "sleeve"
      ? { ...card.backgroundStats, ...card.foregroundStats }
      : card.stats;

  const typeLabel = card.type.toUpperCase();
  const typeClass = `fallback-${card.type}`;

  const effectText =
    stats?.specialEffect
      ? `${formatTriggerName(stats.specialEffect.trigger)}: ${formatEffectAction(stats.specialEffect)}`
      : null;

  const modifierText = stats?.modifier
    ? `${stats.modifier.amount > 0 ? "+" : ""}${stats.modifier.amount} ${stats.modifier.type === "damage" ? "dmg" : "hp"}`
    : null;

  return (
    <div className={`mini-card-display ${typeClass}`}>
      <div className="mini-card-label">{typeLabel}</div>
      <div className="mini-card-content">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="mini-card-image" />
        ) : (
          <div className="mini-card-placeholder" />
        )}
        <div className="mini-card-overlay">
          <div className="mini-card-top">
            {effectText && <div className="mini-card-effect">{effectText}</div>}
          </div>
          <div className="mini-card-middle">
            {modifierText && <div className="mini-card-modifier">{modifierText}</div>}
          </div>
          <div className="mini-card-stats">
            <span className="mini-stat damage">
              {stats?.damage !== undefined && stats.damage !== 0 ? stats.damage : ""}
            </span>
            <span className="mini-stat initiative">
              {stats?.initiative !== undefined && stats.initiative !== 0
                ? `${stats.initiative > 0 ? "+" : ""}${stats.initiative}`
                : ""}
            </span>
            <span className="mini-stat health">
              {stats?.health !== undefined && stats.health !== 0 ? stats.health : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
