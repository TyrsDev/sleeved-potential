import type { ResolvedStats } from "@sleeved-potential/shared";

/**
 * Unified stats overlay that displays the final resolved values.
 * Shows on top of all image layers.
 */
export function ResolvedStatsOverlay({ stats }: { stats: ResolvedStats }) {
  const hasEffect = stats.specialEffect !== null;
  const hasModifier = stats.modifier !== null;
  const hasDamage = stats.damage > 0;
  const hasHealth = stats.health > 0;
  const hasInit = stats.initiative !== 0;

  return (
    <div className="resolved-stats-overlay">
      {/* Top: Special Effect */}
      <div className="overlay-cell overlay-top">
        {hasEffect && (
          <span className="overlay-effect">
            {formatTriggerShort(stats.specialEffect!.trigger)}: {formatActionShort(stats.specialEffect!.effect)}
          </span>
        )}
      </div>

      {/* Middle: Modifier or Initiative */}
      <div className="overlay-cell overlay-middle">
        {hasModifier && (
          <span className="overlay-modifier">
            {stats.modifier!.amount > 0 ? "+" : ""}{stats.modifier!.amount} {stats.modifier!.type.toUpperCase()}
          </span>
        )}
        {hasInit && !hasModifier && (
          <span className="overlay-initiative">INIT {stats.initiative}</span>
        )}
      </div>

      {/* Bottom Left: Damage */}
      <div className="overlay-cell overlay-bottom-left">
        {hasDamage && (
          <span className="overlay-damage">{stats.damage}</span>
        )}
      </div>

      {/* Bottom Right: Health */}
      <div className="overlay-cell overlay-bottom-right">
        {hasHealth && (
          <span className="overlay-health">{stats.health}</span>
        )}
      </div>
    </div>
  );
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
      return `+${effect.count} CARD`;
    case "modify_initiative":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} SPD`;
    case "add_persistent_modifier":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} ${effect.stat === "damage" ? "DMG" : "HP"}`;
    default:
      return effect.type.slice(0, 8);
  }
}
