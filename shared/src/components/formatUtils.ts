import type { CardDefinition, CardStats } from "../types/index.js";
import { formatEffectAction, formatTriggerName } from "../combat.js";

/**
 * Format a card's stats into a multi-line tooltip string.
 * Shared utility — replaces duplicated copies in game and admin.
 */
export function formatCardTooltip(card: CardDefinition): string {
  const lines: string[] = [card.name];

  if (card.type === "sleeve") {
    if (card.backgroundStats) {
      lines.push("", "Background:");
      lines.push(...formatStatsLines(card.backgroundStats));
    }
    if (card.foregroundStats) {
      lines.push("", "Foreground:");
      lines.push(...formatStatsLines(card.foregroundStats));
    }
  } else if (card.stats) {
    lines.push(...formatStatsLines(card.stats));
  }

  if (card.description) {
    lines.push("", card.description);
  }

  return lines.join("\n");
}

export function formatStatsLines(stats: CardStats): string[] {
  const lines: string[] = [];
  if (stats.damage !== undefined) lines.push(`  Damage: ${stats.damage}`);
  if (stats.health !== undefined) lines.push(`  Health: ${stats.health}`);
  if (stats.initiative !== undefined && stats.initiative !== 0) {
    lines.push(`  Initiative: ${stats.initiative > 0 ? "+" : ""}${stats.initiative}`);
  }
  if (stats.modifier) {
    lines.push(
      `  Modifier: ${stats.modifier.amount > 0 ? "+" : ""}${stats.modifier.amount} ${stats.modifier.type}`
    );
  }
  if (stats.specialEffect) {
    lines.push(
      `  Effect: ${formatTriggerName(stats.specialEffect.trigger)} → ${formatEffectAction(stats.specialEffect)}`
    );
  }
  return lines;
}

/**
 * Format trigger name to short abbreviation for table display
 */
export function formatTriggerShort(trigger: string): string {
  const triggerMap: Record<string, string> = {
    on_play: "PLAY",
    if_survives: "SURV",
    if_destroyed: "DEAD",
    if_defeats: "KILL",
    if_doesnt_defeat: "MISS",
  };
  return triggerMap[trigger] || trigger.slice(0, 4).toUpperCase();
}

/**
 * Format effect action to short form for table display
 */
export function formatEffectShort(
  effect: { type: string; count?: number; amount?: number; stat?: string }
): string {
  switch (effect.type) {
    case "draw_cards":
      return `+${effect.count} card`;
    case "modify_initiative":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} init`;
    case "add_persistent_modifier":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} ${effect.stat === "damage" ? "dmg" : "hp"}`;
    default:
      return effect.type.slice(0, 8);
  }
}

/**
 * Format trigger for card stats fallback display (longer than short form)
 */
export function formatTriggerFallback(trigger: string): string {
  const triggerMap: Record<string, string> = {
    on_play: "ON PLAY",
    if_survives: "SURVIVES",
    if_destroyed: "DESTROYED",
    if_defeats: "DEFEATS",
    if_doesnt_defeat: "NO KILL",
  };
  return triggerMap[trigger] || trigger.toUpperCase();
}

/**
 * Format effect action for card stats fallback display
 */
export function formatActionFallback(
  effect: { type: string; count?: number; amount?: number; stat?: string }
): string {
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
