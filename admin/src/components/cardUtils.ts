import { formatEffectAction, formatTriggerName } from "@sleeved-potential/shared";
import type { CardDefinition, CardStats } from "@sleeved-potential/shared";

/**
 * Format a card's stats into a tooltip string
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

function formatStatsLines(stats: CardStats): string[] {
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
