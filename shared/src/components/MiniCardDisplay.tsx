import type { CardDefinition } from "../types/index.js";
import { formatTriggerName, formatEffectAction } from "../combat.js";

interface MiniCardDisplayProps {
  card: CardDefinition;
  className?: string;
}

/**
 * Mini card display with label, image (if available), and stats overlay.
 * For sleeves, tracks FG/BG stat sources with CSS classes.
 */
export function MiniCardDisplay({ card, className = "" }: MiniCardDisplayProps) {
  const isSleeve = card.type === "sleeve";
  const bgStats = isSleeve ? card.backgroundStats : undefined;
  const fgStats = isSleeve ? card.foregroundStats : undefined;

  const stats = isSleeve ? { ...bgStats, ...fgStats } : card.stats;

  // For sleeves: track which layer each displayed stat comes from.
  const effectIsFg = isSleeve && fgStats?.specialEffect !== undefined;
  const effectIsBg = isSleeve && !effectIsFg && bgStats?.specialEffect !== undefined;
  const modifierIsFg = isSleeve && fgStats?.modifier !== undefined;
  const modifierIsBg = isSleeve && !modifierIsFg && bgStats?.modifier !== undefined;
  const initiativeIsFg = isSleeve && (fgStats?.initiative ?? 0) !== 0;
  const initiativeIsBg = isSleeve && !initiativeIsFg && (bgStats?.initiative ?? 0) !== 0;

  const typeLabel = card.type.toUpperCase();
  const typeClass = `sp-fallback-${card.type}`;

  const effectText =
    stats?.specialEffect
      ? `${formatTriggerName(stats.specialEffect.trigger)}: ${formatEffectAction(stats.specialEffect)}`
      : null;

  const modifierText = stats?.modifier
    ? `${stats.modifier.amount > 0 ? "+" : ""}${stats.modifier.amount} ${stats.modifier.type === "damage" ? "dmg" : "hp"}`
    : null;

  const hasDamage = stats?.damage !== undefined && stats.damage !== 0;
  const hasHealth = stats?.health !== undefined && stats.health !== 0;
  const hasInit = stats?.initiative !== undefined && stats.initiative !== 0;

  return (
    <div className={`sp-mini-card-display ${typeClass} ${className}`}>
      <div className="sp-mini-card-label">{typeLabel}</div>
      <div className="sp-mini-card-content">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="sp-mini-card-image" />
        ) : (
          <div className="sp-mini-card-placeholder" />
        )}
        <div className="sp-mini-card-overlay">
          <div className="sp-mini-card-top">
            {effectText && (
              <div className={`sp-mini-card-effect${effectIsFg ? " sp-stat-source-fg" : effectIsBg ? " sp-stat-source-bg" : ""}`}>
                {effectText}
              </div>
            )}
          </div>
          <div className="sp-mini-card-middle">
            {modifierText && (
              <div className={`sp-mini-card-modifier${modifierIsFg ? " sp-stat-source-fg" : modifierIsBg ? " sp-stat-source-bg" : ""}`}>
                {modifierText}
              </div>
            )}
          </div>
          <div className="sp-mini-card-stats">
            <span className={`sp-mini-stat damage${isSleeve && hasDamage ? " sp-stat-source-fg" : ""}`}>
              {hasDamage ? stats!.damage : ""}
            </span>
            <span className={`sp-mini-stat initiative${initiativeIsFg ? " sp-stat-source-fg" : initiativeIsBg ? " sp-stat-source-bg" : ""}`}>
              {hasInit ? `${stats!.initiative! > 0 ? "+" : ""}${stats!.initiative}` : ""}
            </span>
            <span className={`sp-mini-stat health${isSleeve && hasHealth ? " sp-stat-source-fg" : ""}`}>
              {hasHealth ? stats!.health : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
