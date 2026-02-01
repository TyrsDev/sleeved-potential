import type { CardStats, CardDefinition } from "@sleeved-potential/shared";

interface CardStatsOverlayProps {
  card: CardDefinition;
  className?: string;
}

/**
 * Overlays card stats on top of an image.
 * Uses transparent backgrounds with colored text values.
 * Positioned using the same grid layout as CardStatsFallback.
 */
export function CardStatsOverlay({ card, className = "" }: CardStatsOverlayProps) {
  if (card.type === "sleeve") {
    return (
      <SleeveStatsOverlay
        name={card.name}
        bgStats={card.backgroundStats}
        fgStats={card.foregroundStats}
        className={className}
      />
    );
  }

  return <StatsOverlay name={card.name} stats={card.stats} className={className} />;
}

interface SleeveStatsOverlayProps {
  name: string;
  bgStats: CardStats | undefined;
  fgStats: CardStats | undefined;
  className?: string;
}

function SleeveStatsOverlay({ name, bgStats, fgStats, className = "" }: SleeveStatsOverlayProps) {
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
    <div className={`stats-overlay ${className}`}>
      <div className="overlay-header">{name}</div>

      {/* Top: Special Effect */}
      {effect && (
        <div className={`overlay-top ${effectIsFg ? "fg-text" : "bg-text"}`}>
          <span className="overlay-effect">{formatEffectShort(effect)}</span>
        </div>
      )}

      {/* Middle: Modifier or Initiative */}
      {(modifier || initiative) && (
        <div className={`overlay-middle ${(modifierIsFg || initIsFg) ? "fg-text" : "bg-text"}`}>
          {modifier && (
            <span className="overlay-modifier">{formatModifierShort(modifier)}</span>
          )}
          {initiative && !modifier && (
            <span className="overlay-initiative">INIT {initiative}</span>
          )}
        </div>
      )}

      {/* Bottom Left: Damage */}
      {damage !== null && (
        <div className={`overlay-bottom-left ${damageIsFg ? "fg-text" : "bg-text"}`}>
          <span className="overlay-damage">{damage}</span>
        </div>
      )}

      {/* Bottom Right: Health */}
      {health !== null && (
        <div className={`overlay-bottom-right ${healthIsFg ? "fg-text" : "bg-text"}`}>
          <span className="overlay-health">{health}</span>
        </div>
      )}
    </div>
  );
}

interface StatsOverlayProps {
  name: string;
  stats: CardStats | undefined;
  className?: string;
}

function StatsOverlay({ name, stats, className = "" }: StatsOverlayProps) {
  const hasEffect = stats?.specialEffect !== undefined;
  const hasModifier = stats?.modifier !== undefined;
  const hasDamage = stats?.damage !== undefined && stats.damage !== 0;
  const hasHealth = stats?.health !== undefined && stats.health !== 0;
  const hasInit = stats?.initiative !== undefined && stats.initiative !== 0;

  return (
    <div className={`stats-overlay ${className}`}>
      <div className="overlay-header">{name}</div>

      {/* Top: Special Effect */}
      {hasEffect && (
        <div className="overlay-top">
          <span className="overlay-effect">{formatEffectShort(stats!.specialEffect!)}</span>
        </div>
      )}

      {/* Middle: Modifier or Initiative */}
      {(hasModifier || hasInit) && (
        <div className="overlay-middle">
          {hasModifier && (
            <span className="overlay-modifier">{formatModifierShort(stats!.modifier!)}</span>
          )}
          {hasInit && !hasModifier && (
            <span className="overlay-initiative">INIT {stats!.initiative}</span>
          )}
        </div>
      )}

      {/* Bottom Left: Damage */}
      {hasDamage && (
        <div className="overlay-bottom-left">
          <span className="overlay-damage">{stats!.damage}</span>
        </div>
      )}

      {/* Bottom Right: Health */}
      {hasHealth && (
        <div className="overlay-bottom-right">
          <span className="overlay-health">{stats!.health}</span>
        </div>
      )}
    </div>
  );
}

// Shorthand formatting for special effects
function formatEffectShort(effect: { trigger: string; effect: { type: string; count?: number; amount?: number; stat?: string } }): string {
  const trigger = formatTriggerShort(effect.trigger);
  const action = formatActionShort(effect.effect);
  return `${trigger}: ${action}`;
}

function formatTriggerShort(trigger: string): string {
  const triggerMap: Record<string, string> = {
    on_play: "PLAY",
    if_survives: "SURV",
    if_destroyed: "DEAD",
    if_defeats: "KILL",
    if_doesnt_defeat: "MISS",
  };
  return triggerMap[trigger] || trigger.slice(0, 4).toUpperCase();
}

function formatActionShort(effect: { type: string; count?: number; amount?: number; stat?: string }): string {
  switch (effect.type) {
    case "draw_cards":
      return `+${effect.count}`;
    case "modify_initiative":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} SPD`;
    case "add_persistent_modifier":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} ${effect.stat === "damage" ? "DMG" : "HP"}`;
    default:
      return effect.type.slice(0, 6);
  }
}

function formatModifierShort(modifier: { type: string; amount: number }): string {
  const sign = modifier.amount > 0 ? "+" : "";
  const stat = modifier.type === "damage" ? "DMG" : "HP";
  return `${sign}${modifier.amount} ${stat}`;
}
