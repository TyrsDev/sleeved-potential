import type { CardStats } from "../types/index.js";
import { formatTriggerName, formatEffectAction } from "../combat.js";

interface StatsDisplayProps {
  stats: CardStats | undefined;
  label?: string;
  variant?: "fg" | "bg";
  className?: string;
}

/**
 * Stat section for detail views.
 * Shows rows for damage, health, initiative, modifier, and special effect.
 * Optionally styled by FG/BG variant for sleeve layers.
 */
export function StatsDisplay({ stats, label, variant, className = "" }: StatsDisplayProps) {
  const hasDamage = (stats?.damage ?? 0) !== 0;
  const hasHealth = (stats?.health ?? 0) !== 0;
  const hasInit = (stats?.initiative ?? 0) !== 0;
  const hasCombatStats = hasDamage || hasHealth || hasInit;
  const hasModifier = stats?.modifier !== undefined;
  const hasEffect = stats?.specialEffect !== undefined;

  const variantClass = variant === "fg" ? "sp-stats-display-fg" : variant === "bg" ? "sp-stats-display-bg" : "";

  return (
    <div className={`sp-stats-display ${variantClass} ${className}`}>
      {label && (
        <h4 className={variant === "fg" ? "sp-stats-label-fg" : variant === "bg" ? "sp-stats-label-bg" : ""}>
          {label}
        </h4>
      )}
      {hasCombatStats && (
        <div className="sp-stats-row">
          {hasDamage && (
            <div className="sp-stat">
              <span className="sp-stat-label">Damage</span>
              <span className="sp-stat-value damage">{stats!.damage}</span>
            </div>
          )}
          {hasInit && (
            <div className="sp-stat">
              <span className="sp-stat-label">Initiative</span>
              <span className="sp-stat-value initiative">
                {stats!.initiative! > 0 ? "+" : ""}{stats!.initiative}
              </span>
            </div>
          )}
          {hasHealth && (
            <div className="sp-stat">
              <span className="sp-stat-label">Health</span>
              <span className="sp-stat-value health">{stats!.health}</span>
            </div>
          )}
        </div>
      )}
      {hasModifier && (
        <div className="sp-stat-effect">
          <span className="sp-stat-label">Modifier</span>
          <span className="sp-stat-value">
            {stats!.modifier!.amount > 0 ? "+" : ""}{stats!.modifier!.amount} {stats!.modifier!.type}
          </span>
        </div>
      )}
      {hasEffect && (
        <div className="sp-stat-effect">
          <span className="sp-stat-label">{formatTriggerName(stats!.specialEffect!.trigger)}</span>
          <span className="sp-stat-value">{formatEffectAction(stats!.specialEffect!)}</span>
        </div>
      )}
    </div>
  );
}
