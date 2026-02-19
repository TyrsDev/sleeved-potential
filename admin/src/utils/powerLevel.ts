import type { CardDefinition, CardStats } from "@sleeved-potential/shared";
import type { SpecialEffectAction } from "@sleeved-potential/shared";

/**
 * Tuneable constants for the power level formula.
 * All values are relative to 1 damage = 1.0 power point.
 *
 * This is an admin-only concept used for card balancing.
 */
export const POWER_LEVEL_WEIGHTS = {
  // Stat weights (per point)
  damage: 1.0,
  health: 0.8,
  initiative: 0.5, // Signed; negative is a liability

  // Sleeve position multipliers
  backgroundMultiplier: 0.6, // easily overwritten by animal/equipment
  foregroundMultiplier: 1.4, // guaranteed overwrite; enables synergistic combos

  // Modifier weights
  modifierDamage: 1.0,
  modifierHealth: 0.8,

  // Trigger weights (reliability / cost of firing)
  triggerWeights: {
    on_play: 1.0, // always fires
    if_survives: 0.6, // positive condition, moderately reliable
    if_defeats: 0.7, // strong correlation with winning
    if_destroyed: 0.3, // fires when losing
    if_doesnt_defeat: 0.3, // fires when not winning
  } as Record<string, number>,

  // Action base values
  actionModifyInitiativePerPoint: 0.5,
  actionPersistentModifierDamagePerPoint: 2.0, // applies to all future rounds
  actionPersistentModifierHealthPerPoint: 1.6,
};

function getActionBaseValue(action: SpecialEffectAction): number {
  switch (action.type) {
    case "modify_initiative":
      return action.amount * POWER_LEVEL_WEIGHTS.actionModifyInitiativePerPoint;
    case "add_persistent_modifier":
      return (
        action.amount *
        (action.stat === "damage"
          ? POWER_LEVEL_WEIGHTS.actionPersistentModifierDamagePerPoint
          : POWER_LEVEL_WEIGHTS.actionPersistentModifierHealthPerPoint)
      );
  }
}

/**
 * Compute the power level contribution of a single CardStats block.
 * Does NOT apply sleeve position multipliers — use calculateCardPowerLevel for that.
 */
export function calculateStatsPowerLevel(stats: CardStats): number {
  const statContrib =
    (stats.damage ?? 0) * POWER_LEVEL_WEIGHTS.damage +
    (stats.health ?? 0) * POWER_LEVEL_WEIGHTS.health +
    (stats.initiative ?? 0) * POWER_LEVEL_WEIGHTS.initiative;

  const modContrib = stats.modifier
    ? stats.modifier.amount *
      (stats.modifier.type === "damage"
        ? POWER_LEVEL_WEIGHTS.modifierDamage
        : POWER_LEVEL_WEIGHTS.modifierHealth)
    : 0;

  const effectContrib = stats.specialEffect
    ? (POWER_LEVEL_WEIGHTS.triggerWeights[stats.specialEffect.trigger] ?? 0) *
      getActionBaseValue(stats.specialEffect.effect)
    : 0;

  return statContrib + modContrib + effectContrib;
}

/**
 * Compute the total power level of a card definition.
 *
 * - Animal / Equipment: statsContrib + modifierContrib + effectContrib
 * - Sleeve: 0.6 × bgContrib + 1.4 × fgContrib
 */
export function calculateCardPowerLevel(card: CardDefinition): number {
  if (card.type === "sleeve") {
    const bgPower = card.backgroundStats
      ? calculateStatsPowerLevel(card.backgroundStats) * POWER_LEVEL_WEIGHTS.backgroundMultiplier
      : 0;
    const fgPower = card.foregroundStats
      ? calculateStatsPowerLevel(card.foregroundStats) * POWER_LEVEL_WEIGHTS.foregroundMultiplier
      : 0;
    return bgPower + fgPower;
  } else {
    return card.stats ? calculateStatsPowerLevel(card.stats) : 0;
  }
}
