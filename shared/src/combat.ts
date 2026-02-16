/**
 * Combat and Game Logic
 *
 * Shared functions for card stat resolution, combat simulation, and game utilities.
 * Used by Firebase functions (backend) and frontends (admin/game).
 */

import type {
  CardDefinition,
  CardStats,
  ResolvedStats,
  RoundOutcome,
  GameRules,
  SpecialEffect,
  TriggeredEffect,
  PersistentModifier,
  SpecialEffectTrigger,
  StatAttribution,
  StatLayerInfo,
} from "./types/index.js";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input for combat resolution (two players' resolved stats)
 */
export interface CombatInput {
  player1: {
    playerId: string;
    stats: ResolvedStats;
  };
  player2: {
    playerId: string;
    stats: ResolvedStats;
  };
  rules: GameRules;
}

/**
 * Result of combat resolution
 */
export interface CombatResult {
  player1: {
    outcome: RoundOutcome;
    effectTriggered: TriggeredEffect | null;
  };
  player2: {
    outcome: RoundOutcome;
    effectTriggered: TriggeredEffect | null;
  };
  combatLog: string[];
}

// ============================================================================
// STAT RESOLUTION
// ============================================================================

/**
 * Merge card stats (higher layer overwrites same stats from lower layer)
 * undefined values do NOT overwrite - only explicit values do
 * Zero values for damage/health also do NOT overwrite (0 means "not defined")
 */
export function mergeStats(base: CardStats, overlay: CardStats): CardStats {
  const result: CardStats = { ...base };

  if (overlay.damage !== undefined && overlay.damage !== 0) result.damage = overlay.damage;
  if (overlay.health !== undefined && overlay.health !== 0) result.health = overlay.health;
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
  sleeve: CardDefinition | null,
  animal: CardDefinition | null,
  equipment: CardDefinition[],
  persistentModifiers: PersistentModifier[] = [],
  initiativeModifier: number = 0
): ResolvedStats {
  // Start with empty stats
  let stats: CardStats = {};

  // 1. Layer sleeve background stats
  if (sleeve?.backgroundStats) {
    stats = mergeStats(stats, sleeve.backgroundStats);
  }

  // 2. Layer animal stats
  if (animal?.stats) {
    stats = mergeStats(stats, animal.stats);
  }

  // 3. Layer each equipment (in stacking order, bottom to top)
  for (const equip of equipment) {
    if (equip.stats) {
      stats = mergeStats(stats, equip.stats);
    }
  }

  // 4. Layer sleeve foreground stats (guaranteed to overwrite)
  if (sleeve?.foregroundStats) {
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

  // Floor damage and health at 0 (initiative can be negative)
  return {
    damage: Math.max(0, damage),
    health: Math.max(0, health),
    initiative,
    modifier,
    specialEffect,
  };
}

/**
 * Get stat attribution information for a card composition
 *
 * Returns which layer contributes which stats and which layer "wins" for each stat.
 * Used for UI display to show overwritten vs active values.
 *
 * Layering order (bottom to top):
 * 1. Sleeve background stats (BG row)
 * 2. Animal stats
 * 3. Equipment stats (in array order)
 * 4. Sleeve foreground stats (FG row)
 * 5. Persistent modifiers (additive bonuses from previous rounds)
 * 6. Initiative modifier (from special effects)
 */
export function getStatAttribution(
  sleeve: CardDefinition | null,
  animal: CardDefinition | null,
  equipment: CardDefinition[],
  persistentModifiers: PersistentModifier[] = [],
  initiativeModifier: number = 0
): StatAttribution {
  const layers: StatLayerInfo[] = [];

  // Track which layer "wins" for each stat (last non-zero/non-undefined value)
  const activeLayer = {
    damage: null as string | null,
    health: null as string | null,
    initiative: null as string | null,
    modifier: null as string | null,
    specialEffect: null as string | null,
  };

  // Helper to create a unique ID for sleeve bg/fg layers
  const sleeveBgId = sleeve ? `${sleeve.id}_bg` : null;
  const sleeveFgId = sleeve ? `${sleeve.id}_fg` : null;

  // 1. Sleeve background stats
  if (sleeve?.backgroundStats) {
    const bgStats = sleeve.backgroundStats;
    const layer: StatLayerInfo = {
      layerType: "sleeve_bg",
      cardId: sleeveBgId!,
      cardName: `${sleeve.name} (BG)`,
      damage: bgStats.damage,
      health: bgStats.health,
      initiative: bgStats.initiative,
      modifier: bgStats.modifier,
      specialEffect: bgStats.specialEffect,
    };
    layers.push(layer);

    // Update active layer tracking
    if (bgStats.damage !== undefined && bgStats.damage !== 0) activeLayer.damage = sleeveBgId;
    if (bgStats.health !== undefined && bgStats.health !== 0) activeLayer.health = sleeveBgId;
    if (bgStats.initiative !== undefined) activeLayer.initiative = sleeveBgId;
    if (bgStats.modifier !== undefined) activeLayer.modifier = sleeveBgId;
    if (bgStats.specialEffect !== undefined) activeLayer.specialEffect = sleeveBgId;
  }

  // 2. Animal stats
  if (animal?.stats) {
    const animalStats = animal.stats;
    const layer: StatLayerInfo = {
      layerType: "animal",
      cardId: animal.id,
      cardName: animal.name,
      damage: animalStats.damage,
      health: animalStats.health,
      initiative: animalStats.initiative,
      modifier: animalStats.modifier,
      specialEffect: animalStats.specialEffect,
    };
    layers.push(layer);

    // Update active layer tracking
    if (animalStats.damage !== undefined && animalStats.damage !== 0) activeLayer.damage = animal.id;
    if (animalStats.health !== undefined && animalStats.health !== 0) activeLayer.health = animal.id;
    if (animalStats.initiative !== undefined) activeLayer.initiative = animal.id;
    if (animalStats.modifier !== undefined) activeLayer.modifier = animal.id;
    if (animalStats.specialEffect !== undefined) activeLayer.specialEffect = animal.id;
  }

  // 3. Equipment stats (in stacking order)
  for (const equip of equipment) {
    if (equip.stats) {
      const equipStats = equip.stats;
      const layer: StatLayerInfo = {
        layerType: "equipment",
        cardId: equip.id,
        cardName: equip.name,
        damage: equipStats.damage,
        health: equipStats.health,
        initiative: equipStats.initiative,
        modifier: equipStats.modifier,
        specialEffect: equipStats.specialEffect,
      };
      layers.push(layer);

      // Update active layer tracking
      if (equipStats.damage !== undefined && equipStats.damage !== 0) activeLayer.damage = equip.id;
      if (equipStats.health !== undefined && equipStats.health !== 0) activeLayer.health = equip.id;
      if (equipStats.initiative !== undefined) activeLayer.initiative = equip.id;
      if (equipStats.modifier !== undefined) activeLayer.modifier = equip.id;
      if (equipStats.specialEffect !== undefined) activeLayer.specialEffect = equip.id;
    }
  }

  // 4. Sleeve foreground stats (guaranteed to overwrite)
  if (sleeve?.foregroundStats) {
    const fgStats = sleeve.foregroundStats;
    const layer: StatLayerInfo = {
      layerType: "sleeve_fg",
      cardId: sleeveFgId!,
      cardName: `${sleeve.name} (FG)`,
      damage: fgStats.damage,
      health: fgStats.health,
      initiative: fgStats.initiative,
      modifier: fgStats.modifier,
      specialEffect: fgStats.specialEffect,
    };
    layers.push(layer);

    // Update active layer tracking
    if (fgStats.damage !== undefined && fgStats.damage !== 0) activeLayer.damage = sleeveFgId;
    if (fgStats.health !== undefined && fgStats.health !== 0) activeLayer.health = sleeveFgId;
    if (fgStats.initiative !== undefined) activeLayer.initiative = sleeveFgId;
    if (fgStats.modifier !== undefined) activeLayer.modifier = sleeveFgId;
    if (fgStats.specialEffect !== undefined) activeLayer.specialEffect = sleeveFgId;
  }

  // 5. Persistent modifiers (additive bonuses from previous rounds)
  for (const mod of persistentModifiers) {
    const modId = `persistent_${mod.sourceRound}_${mod.stat}`;
    const layer: StatLayerInfo = {
      layerType: "persistent",
      cardId: modId,
      cardName: `Round ${mod.sourceRound}`,
      damage: mod.stat === "damage" ? mod.amount : undefined,
      health: mod.stat === "health" ? mod.amount : undefined,
      isAdditive: true,
      sourceRound: mod.sourceRound,
    };
    layers.push(layer);
    // Persistent modifiers are additive, they don't "win" over base stats
  }

  // 6. Initiative modifier (from special effects, applies to next round)
  if (initiativeModifier !== 0) {
    const initModId = "initiative_modifier";
    const layer: StatLayerInfo = {
      layerType: "initiative_mod",
      cardId: initModId,
      cardName: "Initiative Bonus",
      initiative: initiativeModifier,
      isAdditive: true,
    };
    layers.push(layer);
  }

  return { layers, activeLayer };
}

// ============================================================================
// COMBAT RESOLUTION
// ============================================================================

/**
 * Check if a special effect should trigger based on combat outcome
 */
export function shouldEffectTrigger(
  trigger: SpecialEffectTrigger,
  survived: boolean,
  defeated: boolean,
  opponentSurvived: boolean
): boolean {
  switch (trigger) {
    case "on_play":
      return true; // on_play triggers before combat, handled separately
    case "if_survives":
      return survived;
    case "if_destroyed":
      return !survived;
    case "if_defeats":
      return defeated;
    case "if_doesnt_defeat":
      return opponentSurvived;
    default:
      return false;
  }
}

/**
 * Resolve combat between two players
 *
 * Combat rules:
 * - Equal initiative: Both attack simultaneously
 * - Different initiative: Higher attacks first, defender counterattacks if survives
 * - 0 damage means no damage dealt (tanks that can't attack is intentional)
 */
export function resolveCombat(input: CombatInput): CombatResult {
  const { player1, player2, rules } = input;
  const p1Stats = player1.stats;
  const p2Stats = player2.stats;
  const combatLog: string[] = [];

  combatLog.push(`=== ROUND START ===`);
  combatLog.push(`${player1.playerId}: ${p1Stats.damage} DMG, ${p1Stats.health} HP, ${p1Stats.initiative} INIT`);
  combatLog.push(`${player2.playerId}: ${p2Stats.damage} DMG, ${p2Stats.health} HP, ${p2Stats.initiative} INIT`);

  // Track on_play effects (triggered before combat)
  let p1OnPlayEffect: TriggeredEffect | null = null;
  let p2OnPlayEffect: TriggeredEffect | null = null;

  if (p1Stats.specialEffect?.trigger === "on_play") {
    p1OnPlayEffect = {
      odIdplayerId: player1.playerId,
      effect: p1Stats.specialEffect,
      resolved: true,
    };
    combatLog.push(`${player1.playerId} triggers ON_PLAY: ${formatEffectAction(p1Stats.specialEffect)}`);
  }
  if (p2Stats.specialEffect?.trigger === "on_play") {
    p2OnPlayEffect = {
      odIdplayerId: player2.playerId,
      effect: p2Stats.specialEffect,
      resolved: true,
    };
    combatLog.push(`${player2.playerId} triggers ON_PLAY: ${formatEffectAction(p2Stats.specialEffect)}`);
  }

  // Combat resolution
  let p1Health = p1Stats.health;
  let p2Health = p2Stats.health;
  let p1DamageDealt = 0;
  let p2DamageDealt = 0;

  combatLog.push(`\n=== COMBAT ===`);

  if (p1Stats.initiative === p2Stats.initiative) {
    // Simultaneous attack
    combatLog.push(`Initiative tied (${p1Stats.initiative}) - Simultaneous attack!`);
    p1Health -= p2Stats.damage;
    p2Health -= p1Stats.damage;
    p1DamageDealt = p1Stats.damage;
    p2DamageDealt = p2Stats.damage;
    combatLog.push(`${player1.playerId} deals ${p1Stats.damage} damage (${p2Stats.health} -> ${p2Health})`);
    combatLog.push(`${player2.playerId} deals ${p2Stats.damage} damage (${p1Stats.health} -> ${p1Health})`);
  } else if (p1Stats.initiative > p2Stats.initiative) {
    // Player 1 attacks first
    combatLog.push(`${player1.playerId} has higher initiative (${p1Stats.initiative} > ${p2Stats.initiative})`);
    p2Health -= p1Stats.damage;
    p1DamageDealt = p1Stats.damage;
    combatLog.push(`${player1.playerId} attacks first: ${p1Stats.damage} damage (${p2Stats.health} -> ${p2Health})`);
    if (p2Health > 0) {
      p1Health -= p2Stats.damage;
      p2DamageDealt = p2Stats.damage;
      combatLog.push(`${player2.playerId} counterattacks: ${p2Stats.damage} damage (${p1Stats.health} -> ${p1Health})`);
    } else {
      combatLog.push(`${player2.playerId} is destroyed before attacking!`);
    }
  } else {
    // Player 2 attacks first
    combatLog.push(`${player2.playerId} has higher initiative (${p2Stats.initiative} > ${p1Stats.initiative})`);
    p1Health -= p2Stats.damage;
    p2DamageDealt = p2Stats.damage;
    combatLog.push(`${player2.playerId} attacks first: ${p2Stats.damage} damage (${p1Stats.health} -> ${p1Health})`);
    if (p1Health > 0) {
      p2Health -= p1Stats.damage;
      p1DamageDealt = p1Stats.damage;
      combatLog.push(`${player1.playerId} counterattacks: ${p1Stats.damage} damage (${p2Stats.health} -> ${p2Health})`);
    } else {
      combatLog.push(`${player1.playerId} is destroyed before attacking!`);
    }
  }

  // Determine outcomes
  const p1Survived = p1Health > 0;
  const p2Survived = p2Health > 0;
  const p1Defeated = !p2Survived; // P1 defeated P2 if P2 didn't survive
  const p2Defeated = !p1Survived; // P2 defeated P1 if P1 didn't survive

  combatLog.push(`\n=== RESULTS ===`);
  combatLog.push(`${player1.playerId}: ${p1Survived ? "SURVIVED" : "DESTROYED"} (${Math.max(0, p1Health)} HP)`);
  combatLog.push(`${player2.playerId}: ${p2Survived ? "SURVIVED" : "DESTROYED"} (${Math.max(0, p2Health)} HP)`);

  // Check post-combat effects
  let p1PostCombatEffect: TriggeredEffect | null = null;
  let p2PostCombatEffect: TriggeredEffect | null = null;

  if (p1Stats.specialEffect && p1Stats.specialEffect.trigger !== "on_play") {
    if (shouldEffectTrigger(p1Stats.specialEffect.trigger, p1Survived, p1Defeated, p2Survived)) {
      p1PostCombatEffect = {
        odIdplayerId: player1.playerId,
        effect: p1Stats.specialEffect,
        resolved: true,
      };
      combatLog.push(`${player1.playerId} triggers ${p1Stats.specialEffect.trigger.toUpperCase()}: ${formatEffectAction(p1Stats.specialEffect)}`);
    }
  }

  if (p2Stats.specialEffect && p2Stats.specialEffect.trigger !== "on_play") {
    if (shouldEffectTrigger(p2Stats.specialEffect.trigger, p2Survived, p2Defeated, p1Survived)) {
      p2PostCombatEffect = {
        odIdplayerId: player2.playerId,
        effect: p2Stats.specialEffect,
        resolved: true,
      };
      combatLog.push(`${player2.playerId} triggers ${p2Stats.specialEffect.trigger.toUpperCase()}: ${formatEffectAction(p2Stats.specialEffect)}`);
    }
  }

  // New scoring: absorption + kill bonus + overkill
  // damageTaken = opponent's damage stat if they attacked, else 0
  const p1DamageTaken = p2DamageDealt;
  const p2DamageTaken = p1DamageDealt;

  function calcScore(survived: boolean, killed: boolean, damageDealt: number,
                     damageTaken: number, opponentHP: number) {
    if (!survived) return { points: 0, absorbed: 0, killBonus: 0 };
    const absorbed = damageTaken * (rules.pointsPerAbsorbed ?? 1);
    let killBonus = 0;
    if (killed) {
      const overkill = Math.max(0, damageDealt - opponentHP);
      killBonus = (rules.pointsForKill ?? 3) + overkill * (rules.pointsPerOverkill ?? 1);
    }
    return { points: absorbed + killBonus, absorbed, killBonus };
  }

  const p1Score = calcScore(p1Survived, p1Defeated, p1DamageDealt, p1DamageTaken, p2Stats.health);
  const p2Score = calcScore(p2Survived, p2Defeated, p2DamageDealt, p2DamageTaken, p1Stats.health);

  combatLog.push(`\n=== SCORING ===`);
  combatLog.push(`${player1.playerId}: ${p1Score.points} points${p1Survived ? ` (absorbed: ${p1Score.absorbed}, kill: ${p1Score.killBonus})` : " (destroyed)"}`);
  combatLog.push(`${player2.playerId}: ${p2Score.points} points${p2Survived ? ` (absorbed: ${p2Score.absorbed}, kill: ${p2Score.killBonus})` : " (destroyed)"}`);

  return {
    player1: {
      outcome: {
        pointsEarned: p1Score.points,
        damageDealt: p1DamageDealt,
        damageAbsorbed: p1Survived ? p1DamageTaken : 0,
        killBonus: p1Score.killBonus,
        survived: p1Survived,
        defeated: p1Defeated,
        finalHealth: Math.max(0, p1Health),
      },
      effectTriggered: p1OnPlayEffect || p1PostCombatEffect,
    },
    player2: {
      outcome: {
        pointsEarned: p2Score.points,
        damageDealt: p2DamageDealt,
        damageAbsorbed: p2Survived ? p2DamageTaken : 0,
        killBonus: p2Score.killBonus,
        survived: p2Survived,
        defeated: p2Defeated,
        finalHealth: Math.max(0, p2Health),
      },
      effectTriggered: p2OnPlayEffect || p2PostCombatEffect,
    },
    combatLog,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
 * Find a card by ID in a list
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

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a special effect action for display
 */
export function formatEffectAction(effect: SpecialEffect): string {
  const action = effect.effect;
  switch (action.type) {
    case "modify_initiative":
      return `${action.amount > 0 ? "+" : ""}${action.amount} Initiative next round`;
    case "add_persistent_modifier":
      return `${action.amount > 0 ? "+" : ""}${action.amount} ${action.stat} permanent`;
  }
}

/**
 * Format a trigger name for display
 */
export function formatTriggerName(trigger: SpecialEffectTrigger): string {
  const triggerMap: Record<SpecialEffectTrigger, string> = {
    on_play: "On Play",
    if_survives: "If Survives",
    if_destroyed: "If Destroyed",
    if_defeats: "If Defeats",
    if_doesnt_defeat: "If Doesn't Defeat",
  };
  return triggerMap[trigger] || trigger;
}
