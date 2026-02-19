import type { CardDefinition, ResolvedStats } from "../types/index.js";
import { formatTriggerName, formatEffectAction } from "../combat.js";

interface ComposedTooltipContentProps {
  resolvedStats: ResolvedStats;
  sleeve?: CardDefinition | null;
  animal?: CardDefinition | null;
  equipmentCount?: number;
}

/**
 * Rich tooltip content for a composed card.
 * Shows layer summary, resolved stats, active effect and modifier.
 */
export function ComposedTooltipContent({
  resolvedStats,
  sleeve,
  animal,
  equipmentCount = 0,
}: ComposedTooltipContentProps) {
  const layerParts: string[] = [];
  if (sleeve) layerParts.push("Sleeve");
  if (animal) layerParts.push("Animal");
  if (equipmentCount > 0) layerParts.push(`${equipmentCount} Equipment`);

  return (
    <div className="sp-composed-tooltip-content">
      <div className="sp-tooltip-header">
        <span className="sp-tooltip-name">Composed Card</span>
      </div>

      {layerParts.length > 0 && (
        <div className="sp-tooltip-layers">{layerParts.join(" + ")}</div>
      )}

      <div className="sp-tooltip-stats">
        <div className="sp-tooltip-stat">
          <span className="sp-stat-label">DMG</span>
          <span className="sp-stat-value damage">{resolvedStats.damage}</span>
        </div>
        <div className="sp-tooltip-stat">
          <span className="sp-stat-label">HP</span>
          <span className="sp-stat-value health">{resolvedStats.health}</span>
        </div>
        <div className="sp-tooltip-stat">
          <span className="sp-stat-label">INIT</span>
          <span className="sp-stat-value initiative">{resolvedStats.initiative}</span>
        </div>
      </div>

      {resolvedStats.specialEffect && (
        <div className="sp-tooltip-effect">
          <strong>{formatTriggerName(resolvedStats.specialEffect.trigger)}:</strong>{" "}
          {formatEffectAction(resolvedStats.specialEffect)}
        </div>
      )}

      {resolvedStats.modifier && (
        <div className="sp-tooltip-modifier">
          <strong>Modifier:</strong>{" "}
          {resolvedStats.modifier.amount > 0 ? "+" : ""}{resolvedStats.modifier.amount}{" "}
          {resolvedStats.modifier.type}
        </div>
      )}
    </div>
  );
}
