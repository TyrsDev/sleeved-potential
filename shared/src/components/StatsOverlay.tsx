import type { CardDefinition, CardStats, ResolvedStats } from "../types/index.js";
import { formatTriggerShort, formatEffectShort } from "./formatUtils.js";

interface StatsOverlayProps {
  card?: CardDefinition;
  resolvedStats?: ResolvedStats;
  showName?: boolean;
  className?: string;
}

/**
 * Semi-transparent overlay for card stats, placed over card images.
 * If `card` prop is given, shows individual card stats with FG/BG distinction for sleeves.
 * If `resolvedStats` prop is given, shows final resolved values.
 */
export function StatsOverlay({ card, resolvedStats, showName = false, className = "" }: StatsOverlayProps) {
  if (resolvedStats) {
    return <ResolvedOverlay stats={resolvedStats} className={className} />;
  }

  if (!card) return null;

  if (card.type === "sleeve") {
    return (
      <SleeveOverlay
        name={showName ? card.name : undefined}
        bgStats={card.backgroundStats}
        fgStats={card.foregroundStats}
        className={className}
      />
    );
  }

  return <SimpleOverlay name={showName ? card.name : undefined} stats={card.stats} className={className} />;
}

function ResolvedOverlay({ stats, className = "" }: { stats: ResolvedStats; className?: string }) {
  const hasEffect = stats.specialEffect !== null;
  const hasModifier = stats.modifier !== null;
  const hasDamage = stats.damage > 0;
  const hasHealth = stats.health > 0;
  const hasInit = stats.initiative !== 0;

  return (
    <div className={`sp-stats-overlay ${className}`}>
      <div className="sp-overlay-cell sp-overlay-top">
        {hasEffect && (
          <span className="sp-overlay-effect">
            {formatTriggerShort(stats.specialEffect!.trigger)}: {formatEffectShort(stats.specialEffect!.effect)}
          </span>
        )}
      </div>
      <div className="sp-overlay-cell sp-overlay-middle">
        {hasModifier && (
          <span className="sp-overlay-modifier">
            {stats.modifier!.amount > 0 ? "+" : ""}{stats.modifier!.amount} {stats.modifier!.type.toUpperCase()}
          </span>
        )}
        {hasInit && !hasModifier && (
          <span className="sp-overlay-initiative">INIT {stats.initiative}</span>
        )}
      </div>
      <div className="sp-overlay-cell sp-overlay-bottom-left">
        {hasDamage && <span className="sp-overlay-damage">{stats.damage}</span>}
      </div>
      <div className="sp-overlay-cell sp-overlay-bottom-right">
        {hasHealth && <span className="sp-overlay-health">{stats.health}</span>}
      </div>
    </div>
  );
}

function SleeveOverlay({ name, bgStats, fgStats, className = "" }: {
  name?: string;
  bgStats: CardStats | undefined;
  fgStats: CardStats | undefined;
  className?: string;
}) {
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

  const formatModifier = (mod: { type: string; amount: number }) => {
    const sign = mod.amount > 0 ? "+" : "";
    const stat = mod.type === "damage" ? "DMG" : "HP";
    return `${sign}${mod.amount} ${stat}`;
  };

  return (
    <div className={`sp-stats-overlay ${className}`}>
      {name && <div className="sp-overlay-header">{name}</div>}
      {effect && (
        <div className={`sp-overlay-top ${effectIsFg ? "sp-fg-text" : "sp-bg-text"}`}>
          <span className="sp-overlay-effect">
            {formatTriggerShort(effect.trigger)}: {formatEffectShort(effect.effect)}
          </span>
        </div>
      )}
      {(modifier || initiative) && (
        <div className={`sp-overlay-middle ${(modifierIsFg || initIsFg) ? "sp-fg-text" : "sp-bg-text"}`}>
          {modifier && <span className="sp-overlay-modifier">{formatModifier(modifier)}</span>}
          {initiative && !modifier && <span className="sp-overlay-initiative">INIT {initiative}</span>}
        </div>
      )}
      {damage !== null && (
        <div className={`sp-overlay-bottom-left ${damageIsFg ? "sp-fg-text" : "sp-bg-text"}`}>
          <span className="sp-overlay-damage">{damage}</span>
        </div>
      )}
      {health !== null && (
        <div className={`sp-overlay-bottom-right ${healthIsFg ? "sp-fg-text" : "sp-bg-text"}`}>
          <span className="sp-overlay-health">{health}</span>
        </div>
      )}
    </div>
  );
}

function SimpleOverlay({ name, stats, className = "" }: {
  name?: string;
  stats: CardStats | undefined;
  className?: string;
}) {
  const hasEffect = stats?.specialEffect !== undefined;
  const hasModifier = stats?.modifier !== undefined;
  const hasDamage = stats?.damage !== undefined && stats.damage !== 0;
  const hasHealth = stats?.health !== undefined && stats.health !== 0;
  const hasInit = stats?.initiative !== undefined && stats.initiative !== 0;

  const formatModifier = (mod: { type: string; amount: number }) => {
    const sign = mod.amount > 0 ? "+" : "";
    const stat = mod.type === "damage" ? "DMG" : "HP";
    return `${sign}${mod.amount} ${stat}`;
  };

  return (
    <div className={`sp-stats-overlay ${className}`}>
      {name && <div className="sp-overlay-header">{name}</div>}
      {hasEffect && (
        <div className="sp-overlay-top">
          <span className="sp-overlay-effect">
            {formatTriggerShort(stats!.specialEffect!.trigger)}: {formatEffectShort(stats!.specialEffect!.effect)}
          </span>
        </div>
      )}
      {(hasModifier || hasInit) && (
        <div className="sp-overlay-middle">
          {hasModifier && <span className="sp-overlay-modifier">{formatModifier(stats!.modifier!)}</span>}
          {hasInit && !hasModifier && <span className="sp-overlay-initiative">INIT {stats!.initiative}</span>}
        </div>
      )}
      {hasDamage && (
        <div className="sp-overlay-bottom-left">
          <span className="sp-overlay-damage">{stats!.damage}</span>
        </div>
      )}
      {hasHealth && (
        <div className="sp-overlay-bottom-right">
          <span className="sp-overlay-health">{stats!.health}</span>
        </div>
      )}
    </div>
  );
}
