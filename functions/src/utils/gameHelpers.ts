/**
 * Game Helper Utilities
 *
 * Re-exports shared combat functions and adds any functions-specific utilities
 */

// Re-export all shared combat functions
export {
  mergeStats,
  resolveStats,
  resolveCombat,
  shouldEffectTrigger,
  shuffleArray,
  dealCards,
  findCard,
  findCardOfType,
  formatEffectAction,
  formatTriggerName,
  type CombatInput,
  type CombatResult,
} from "@sleeved-potential/shared";
