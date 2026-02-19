import type { CardStats, CardDefinition } from "../types/index.js";
import { formatTriggerFallback, formatActionFallback } from "./formatUtils.js";

interface CardStatsFallbackProps {
  card: CardDefinition;
  className?: string;
}

/**
 * Displays a visual fallback for cards without images.
 * Grid layout: Top (effect), Middle (modifier/init), Bottom (DMG | HP).
 * For sleeves, combines BG and FG stats with color coding.
 */
export function CardStatsFallback({ card, className = "" }: CardStatsFallbackProps) {
  if (card.type === "sleeve") {
    return (
      <div className={`sp-card-stats-fallback sp-fallback-sleeve ${className}`}>
        <div className="sp-fallback-label">SLEEVE</div>
        <SleeveStatsDisplay bgStats={card.backgroundStats} fgStats={card.foregroundStats} />
      </div>
    );
  }

  return (
    <div className={`sp-card-stats-fallback sp-fallback-${card.type} ${className}`}>
      <div className="sp-fallback-label">{card.type.toUpperCase()}</div>
      <StatsDisplay stats={card.stats} />
    </div>
  );
}

function SleeveStatsDisplay({ bgStats, fgStats }: { bgStats: CardStats | undefined; fgStats: CardStats | undefined }) {
  const hasBgEffect = bgStats?.specialEffect !== undefined;
  const hasFgEffect = fgStats?.specialEffect !== undefined;
  const hasBgModifier = bgStats?.modifier !== undefined;
  const hasFgModifier = fgStats?.modifier !== undefined;
  const hasBgDamage = bgStats?.damage !== undefined && bgStats.damage !== 0;
  const hasFgDamage = fgStats?.damage !== undefined && fgStats.damage !== 0;
  const hasBgHealth = bgStats?.health !== undefined && bgStats.health !== 0;
  const hasFgHealth = fgStats?.health !== undefined && fgStats.health !== 0;
  const hasBgInit = bgStats?.initiative !== undefined && bgStats.initiative !== 0;
  const hasFgInit = fgStats?.initiative !== undefined && fgStats.initiative !== 0;

  const hasEffect = hasBgEffect || hasFgEffect;
  const hasModifier = hasBgModifier || hasFgModifier;
  const hasInit = hasBgInit || hasFgInit;
  const hasDamage = hasBgDamage || hasFgDamage;
  const hasHealth = hasBgHealth || hasFgHealth;

  const hasAnyStats = hasEffect || hasModifier || hasDamage || hasHealth || hasInit;

  if (!hasAnyStats) {
    return <div className="sp-fallback-grid sp-fallback-empty-grid"><span>No stats</span></div>;
  }

  const effect = hasFgEffect ? fgStats!.specialEffect : (hasBgEffect ? bgStats!.specialEffect : null);
  const modifier = hasFgModifier ? fgStats!.modifier : (hasBgModifier ? bgStats!.modifier : null);
  const initiative = hasFgInit ? fgStats!.initiative : (hasBgInit ? bgStats!.initiative : null);
  const damage = hasFgDamage ? fgStats!.damage : (hasBgDamage ? bgStats!.damage : null);
  const health = hasFgHealth ? fgStats!.health : (hasBgHealth ? bgStats!.health : null);

  const effectIsFg = hasFgEffect;
  const modifierIsFg = hasFgModifier;
  const initIsFg = hasFgInit;
  const damageIsFg = hasFgDamage;
  const healthIsFg = hasFgHealth;

  return (
    <div className="sp-fallback-grid">
      <div className={`sp-grid-top ${effect ? (effectIsFg ? "sp-fg-stat" : "sp-bg-stat") : "sp-empty-cell"}`}>
        {effect && (
          <>
            <span className="sp-effect-trigger">{formatTriggerFallback(effect.trigger)}</span>
            <span className="sp-effect-action">{formatActionFallback(effect.effect)}</span>
          </>
        )}
      </div>

      <div className={`sp-grid-middle ${(modifier || initiative) ? ((modifierIsFg || initIsFg) ? "sp-fg-stat" : "sp-bg-stat") : "sp-empty-cell"}`}>
        {modifier && (
          <span className="sp-modifier-display">
            {modifier.amount > 0 ? "+" : ""}{modifier.amount} {modifier.type === "damage" ? "dmg" : "hp"}
          </span>
        )}
        {initiative && !modifier && (
          <span className="sp-initiative-display">{initiative > 0 ? "+" : ""}{initiative} init</span>
        )}
      </div>

      <div className={`sp-grid-bottom-left ${damage !== null ? (damageIsFg ? "sp-fg-stat" : "sp-bg-stat") : "sp-empty-cell"}`}>
        {damage !== null && (
          <>
            <span className="sp-stat-value">{damage}</span>
            <span className="sp-stat-label">DMG</span>
          </>
        )}
      </div>

      <div className={`sp-grid-bottom-right ${health !== null ? (healthIsFg ? "sp-fg-stat" : "sp-bg-stat") : "sp-empty-cell"}`}>
        {health !== null && (
          <>
            <span className="sp-stat-value">{health}</span>
            <span className="sp-stat-label">HP</span>
          </>
        )}
      </div>
    </div>
  );
}

function StatsDisplay({ stats }: { stats: CardStats | undefined }) {
  const hasEffect = stats?.specialEffect !== undefined;
  const hasModifier = stats?.modifier !== undefined;
  const hasDamage = stats?.damage !== undefined && stats.damage !== 0;
  const hasHealth = stats?.health !== undefined && stats.health !== 0;
  const hasInit = stats?.initiative !== undefined && stats.initiative !== 0;
  const hasAnyStats = hasEffect || hasModifier || hasDamage || hasHealth || hasInit;

  if (!hasAnyStats) {
    return <div className="sp-fallback-grid sp-fallback-empty-grid"><span>No stats</span></div>;
  }

  return (
    <div className="sp-fallback-grid">
      <div className={`sp-grid-top ${hasEffect ? "" : "sp-empty-cell"}`}>
        {hasEffect && (
          <>
            <span className="sp-effect-trigger">{formatTriggerFallback(stats!.specialEffect!.trigger)}</span>
            <span className="sp-effect-action">{formatActionFallback(stats!.specialEffect!.effect)}</span>
          </>
        )}
      </div>

      <div className={`sp-grid-middle ${(hasModifier || hasInit) ? "" : "sp-empty-cell"}`}>
        {hasModifier && (
          <span className="sp-modifier-display">
            {stats!.modifier!.amount > 0 ? "+" : ""}{stats!.modifier!.amount} {stats!.modifier!.type === "damage" ? "dmg" : "hp"}
          </span>
        )}
        {hasInit && !hasModifier && (
          <span className="sp-initiative-display">{stats!.initiative! > 0 ? "+" : ""}{stats!.initiative} init</span>
        )}
      </div>

      <div className={`sp-grid-bottom-left ${hasDamage ? "" : "sp-empty-cell"}`}>
        {hasDamage && (
          <>
            <span className="sp-stat-value">{stats!.damage}</span>
            <span className="sp-stat-label">DMG</span>
          </>
        )}
      </div>

      <div className={`sp-grid-bottom-right ${hasHealth ? "" : "sp-empty-cell"}`}>
        {hasHealth && (
          <>
            <span className="sp-stat-value">{stats!.health}</span>
            <span className="sp-stat-label">HP</span>
          </>
        )}
      </div>
    </div>
  );
}
