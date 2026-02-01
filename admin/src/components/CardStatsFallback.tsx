import type { CardStats, CardDefinition } from "@sleeved-potential/shared";

interface CardStatsFallbackProps {
  card: CardDefinition;
  className?: string;
}

/**
 * Displays a visual fallback for cards without images.
 * Uses a grid layout:
 * - Top: Special Effect
 * - Middle: Modifier / Initiative
 * - Bottom: Damage (left) | Health (right)
 *
 * For sleeves, combines background and foreground stats with color coding.
 */
export function CardStatsFallback({ card, className = "" }: CardStatsFallbackProps) {
  if (card.type === "sleeve") {
    return (
      <div className={`card-stats-fallback fallback-sleeve ${className}`}>
        <div className="fallback-label">SLEEVE</div>
        <SleeveStatsDisplay bgStats={card.backgroundStats} fgStats={card.foregroundStats} />
      </div>
    );
  }

  return (
    <div className={`card-stats-fallback fallback-${card.type} ${className}`}>
      <div className="fallback-label">{card.type.toUpperCase()}</div>
      <StatsDisplay stats={card.stats} />
    </div>
  );
}

interface SleeveStatsDisplayProps {
  bgStats: CardStats | undefined;
  fgStats: CardStats | undefined;
}

function SleeveStatsDisplay({ bgStats, fgStats }: SleeveStatsDisplayProps) {
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
    return <div className="fallback-grid fallback-empty-grid"><span>No stats</span></div>;
  }

  // Determine which stat to show (foreground overwrites background)
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
    <div className="fallback-grid">
      {/* Top: Special Effect */}
      <div className={`grid-top ${effect ? (effectIsFg ? "fg-stat" : "bg-stat") : "empty-cell"}`}>
        {effect && (
          <>
            <span className="effect-trigger">{formatTrigger(effect.trigger)}</span>
            <span className="effect-action">{formatAction(effect.effect)}</span>
          </>
        )}
      </div>

      {/* Middle: Modifier or Initiative */}
      <div className={`grid-middle ${(modifier || initiative) ? ((modifierIsFg || initIsFg) ? "fg-stat" : "bg-stat") : "empty-cell"}`}>
        {modifier && (
          <span className="modifier-display">
            {modifier.amount > 0 ? "+" : ""}{modifier.amount} {modifier.type === "damage" ? "dmg" : "hp"}
          </span>
        )}
        {initiative && !modifier && (
          <span className="initiative-display">{initiative > 0 ? "+" : ""}{initiative} init</span>
        )}
      </div>

      {/* Bottom Left: Damage */}
      <div className={`grid-bottom-left ${damage !== null ? (damageIsFg ? "fg-stat" : "bg-stat") : "empty-cell"}`}>
        {damage !== null && (
          <>
            <span className="stat-value">{damage}</span>
            <span className="stat-label">DMG</span>
          </>
        )}
      </div>

      {/* Bottom Right: Health */}
      <div className={`grid-bottom-right ${health !== null ? (healthIsFg ? "fg-stat" : "bg-stat") : "empty-cell"}`}>
        {health !== null && (
          <>
            <span className="stat-value">{health}</span>
            <span className="stat-label">HP</span>
          </>
        )}
      </div>
    </div>
  );
}

interface StatsDisplayProps {
  stats: CardStats | undefined;
}

function StatsDisplay({ stats }: StatsDisplayProps) {
  const hasEffect = stats?.specialEffect !== undefined;
  const hasModifier = stats?.modifier !== undefined;
  const hasDamage = stats?.damage !== undefined && stats.damage !== 0;
  const hasHealth = stats?.health !== undefined && stats.health !== 0;
  const hasInit = stats?.initiative !== undefined && stats.initiative !== 0;
  const hasAnyStats = hasEffect || hasModifier || hasDamage || hasHealth || hasInit;

  if (!hasAnyStats) {
    return <div className="fallback-grid fallback-empty-grid"><span>No stats</span></div>;
  }

  return (
    <div className="fallback-grid">
      {/* Top: Special Effect */}
      <div className={`grid-top ${hasEffect ? "" : "empty-cell"}`}>
        {hasEffect && (
          <>
            <span className="effect-trigger">{formatTrigger(stats!.specialEffect!.trigger)}</span>
            <span className="effect-action">{formatAction(stats!.specialEffect!.effect)}</span>
          </>
        )}
      </div>

      {/* Middle: Modifier or Initiative */}
      <div className={`grid-middle ${(hasModifier || hasInit) ? "" : "empty-cell"}`}>
        {hasModifier && (
          <span className="modifier-display">
            {stats!.modifier!.amount > 0 ? "+" : ""}{stats!.modifier!.amount} {stats!.modifier!.type === "damage" ? "dmg" : "hp"}
          </span>
        )}
        {hasInit && !hasModifier && (
          <span className="initiative-display">{stats!.initiative! > 0 ? "+" : ""}{stats!.initiative} init</span>
        )}
      </div>

      {/* Bottom Left: Damage */}
      <div className={`grid-bottom-left ${hasDamage ? "" : "empty-cell"}`}>
        {hasDamage && (
          <>
            <span className="stat-value">{stats!.damage}</span>
            <span className="stat-label">DMG</span>
          </>
        )}
      </div>

      {/* Bottom Right: Health */}
      <div className={`grid-bottom-right ${hasHealth ? "" : "empty-cell"}`}>
        {hasHealth && (
          <>
            <span className="stat-value">{stats!.health}</span>
            <span className="stat-label">HP</span>
          </>
        )}
      </div>
    </div>
  );
}

function formatTrigger(trigger: string): string {
  const triggerMap: Record<string, string> = {
    on_play: "ON PLAY",
    if_survives: "SURVIVES",
    if_destroyed: "DESTROYED",
    if_defeats: "DEFEATS",
    if_doesnt_defeat: "NO KILL",
  };
  return triggerMap[trigger] || trigger.toUpperCase();
}

function formatAction(effect: { type: string; count?: number; amount?: number; stat?: string }): string {
  switch (effect.type) {
    case "draw_cards":
      return `+${effect.count} card${effect.count !== 1 ? "s" : ""}`;
    case "modify_initiative":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} init`;
    case "add_persistent_modifier": {
      const statShort = effect.stat === "damage" ? "dmg" : effect.stat === "health" ? "hp" : effect.stat;
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} ${statShort}`;
    }
    default:
      return effect.type;
  }
}
