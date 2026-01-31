import type { CardStats } from "@sleeved-potential/shared";

interface SleeveLayerFallbackProps {
  stats: CardStats | undefined;
  layer: "background" | "foreground";
  className?: string;
}

/**
 * Displays a single layer (background or foreground) of a sleeve's stats.
 * Used in the composite viewer where bg and fg need to be on separate z-index layers.
 * Always renders the full grid structure to maintain positioning.
 */
export function SleeveLayerFallback({ stats, layer, className = "" }: SleeveLayerFallbackProps) {
  const hasEffect = stats?.specialEffect !== undefined;
  const hasModifier = stats?.modifier !== undefined;
  const hasDamage = stats?.damage !== undefined && stats.damage !== 0;
  const hasHealth = stats?.health !== undefined && stats.health !== 0;
  const hasInit = stats?.initiative !== undefined && stats.initiative !== 0;
  const hasAnyStats = hasEffect || hasModifier || hasDamage || hasHealth || hasInit;

  // Don't render anything if there are no stats for this layer
  if (!stats || !hasAnyStats) {
    return null;
  }

  const layerClass = layer === "foreground" ? "fg-layer" : "bg-layer";

  return (
    <div className={`sleeve-layer-fallback ${layerClass} ${className}`}>
      <div className="sleeve-layer-grid">
        {/* Top: Special Effect - always render cell, conditionally show content */}
        <div className={`layer-grid-top ${hasEffect ? "has-content" : "empty-cell"}`}>
          {hasEffect && (
            <>
              <span className="effect-trigger">{formatTrigger(stats.specialEffect!.trigger)}</span>
              <span className="effect-action">{formatAction(stats.specialEffect!.effect)}</span>
            </>
          )}
        </div>

        {/* Middle: Modifier or Initiative */}
        <div className={`layer-grid-middle ${(hasModifier || hasInit) ? "has-content" : "empty-cell"}`}>
          {hasModifier && (
            <span className="modifier-display">
              {stats.modifier!.amount > 0 ? "+" : ""}{stats.modifier!.amount} {stats.modifier!.type.toUpperCase()}
            </span>
          )}
          {hasInit && !hasModifier && (
            <span className="initiative-display">INIT {stats.initiative}</span>
          )}
        </div>

        {/* Bottom Left: Damage */}
        <div className={`layer-grid-bottom-left ${hasDamage ? "has-content" : "empty-cell"}`}>
          {hasDamage && (
            <>
              <span className="stat-value">{stats.damage}</span>
              <span className="stat-label">DMG</span>
            </>
          )}
        </div>

        {/* Bottom Right: Health */}
        <div className={`layer-grid-bottom-right ${hasHealth ? "has-content" : "empty-cell"}`}>
          {hasHealth && (
            <>
              <span className="stat-value">{stats.health}</span>
              <span className="stat-label">HP</span>
            </>
          )}
        </div>
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
      return `Draw ${effect.count}`;
    case "modify_initiative":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} Init`;
    case "add_persistent_modifier":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} ${effect.stat?.toUpperCase()}`;
    default:
      return effect.type;
  }
}
