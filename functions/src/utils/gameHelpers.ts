/**
 * Game Helper Utilities
 *
 * Functions for game initialization and resolution
 */

import type {
  CardDefinition,
  CardStats,
  ResolvedStats,
  PersistentModifier,
} from "@sleeved-potential/shared";

/**
 * Fisher-Yates shuffle algorithm
 * Returns a new shuffled array without modifying the original
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Deal cards from a deck
 * Returns dealt cards and remaining deck
 */
export function dealCards(
  deck: string[],
  count: number
): { dealt: string[]; remaining: string[] } {
  const actualCount = Math.min(count, deck.length);
  return {
    dealt: deck.slice(0, actualCount),
    remaining: deck.slice(actualCount),
  };
}

/**
 * Merge card stats (higher layer overwrites same stats from lower layer)
 * undefined values do NOT overwrite - only explicit values do
 */
function mergeStats(base: CardStats, overlay: CardStats): CardStats {
  const result: CardStats = { ...base };

  if (overlay.damage !== undefined) result.damage = overlay.damage;
  if (overlay.health !== undefined) result.health = overlay.health;
  if (overlay.modifier !== undefined) result.modifier = overlay.modifier;
  if (overlay.specialEffect !== undefined) result.specialEffect = overlay.specialEffect;
  if (overlay.initiative !== undefined) result.initiative = overlay.initiative;

  return result;
}

/**
 * Resolve final stats from card composition
 *
 * Layering order (bottom to top):
 * 1. Sleeve background stats
 * 2. Animal stats
 * 3. Equipment stats (in array order)
 * 4. Sleeve foreground stats
 *
 * Then apply:
 * 5. Persistent modifiers (additive)
 * 6. Card modifier (if present, additive)
 * 7. Initiative modifier from special effects (additive)
 */
export function resolveStats(
  sleeve: CardDefinition,
  animal: CardDefinition,
  equipment: CardDefinition[],
  persistentModifiers: PersistentModifier[],
  initiativeModifier: number = 0
): ResolvedStats {
  // Start with empty stats
  let stats: CardStats = {};

  // 1. Layer sleeve background stats
  if (sleeve.backgroundStats) {
    stats = mergeStats(stats, sleeve.backgroundStats);
  }

  // 2. Layer animal stats
  if (animal.stats) {
    stats = mergeStats(stats, animal.stats);
  }

  // 3. Layer each equipment (in stacking order, bottom to top)
  for (const equip of equipment) {
    if (equip.stats) {
      stats = mergeStats(stats, equip.stats);
    }
  }

  // 4. Layer sleeve foreground stats (guaranteed to overwrite)
  if (sleeve.foregroundStats) {
    stats = mergeStats(stats, sleeve.foregroundStats);
  }

  // Extract base values
  let damage = stats.damage ?? 0;
  let health = stats.health ?? 0;
  let initiative = stats.initiative ?? 0;
  const modifier = stats.modifier ?? null;
  const specialEffect = stats.specialEffect ?? null;

  // 5. Apply persistent modifiers (additive, not overwrite)
  for (const mod of persistentModifiers) {
    if (mod.stat === "damage") {
      damage += mod.amount;
    } else if (mod.stat === "health") {
      health += mod.amount;
    }
  }

  // 6. Apply card modifier (if topmost has one)
  if (modifier) {
    if (modifier.type === "damage") {
      damage += modifier.amount;
    } else if (modifier.type === "health") {
      health += modifier.amount;
    }
  }

  // 7. Apply initiative modifier from special effects
  initiative += initiativeModifier;

  // Floor values at 0 (initiative can be negative though)
  return {
    damage: Math.max(0, damage),
    health: Math.max(0, health),
    initiative,
    modifier,
    specialEffect,
  };
}

/**
 * Find a card by ID in a card snapshot
 */
export function findCard(
  cardId: string,
  cards: CardDefinition[]
): CardDefinition | undefined {
  return cards.find((c) => c.id === cardId);
}

/**
 * Find card by ID with type checking
 */
export function findCardOfType(
  cardId: string,
  cards: CardDefinition[],
  expectedType: "sleeve" | "animal" | "equipment"
): CardDefinition | undefined {
  const card = cards.find((c) => c.id === cardId);
  if (card && card.type === expectedType) {
    return card;
  }
  return undefined;
}
