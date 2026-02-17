import type { CardDefinition } from "./card.js";
import type { Modifier, PersistentModifier, SpecialEffect, TriggeredEffect } from "./effects.js";
import type { GameRules } from "./rules.js";

/**
 * Game status
 */
export type GameStatus = "active" | "finished";

/**
 * Reason the game ended
 */
export type GameEndReason = "points" | "surrender" | "rounds_complete";

/**
 * Resolved stats after card composition
 * All stats are calculated from layering + modifiers + persistent stack
 */
export interface ResolvedStats {
  damage: number;
  health: number;
  initiative: number;
  modifier: Modifier | null; // Single modifier (topmost)
  specialEffect: SpecialEffect | null; // Single effect (topmost)
}

/**
 * A committed card for a round
 */
export interface CommittedCard {
  sleeveId: string;
  animalId: string;
  equipmentIds: string[]; // In stacking order (bottom to top)
  finalStats: ResolvedStats;
}

/**
 * Outcome for a player in a round
 */
export interface RoundOutcome {
  pointsEarned: number; // total (absorption + kill + overkill)
  damageDealt: number; // damage stat if attacked, 0 if didn't attack
  damageAbsorbed: number; // damage taken if survived
  killBonus: number; // pointsForKill + overkill if killed opponent
  survived: boolean;
  defeated: boolean; // Did this card defeat the opponent's card
  finalHealth: number;
}

/**
 * Complete result of a round
 */
export interface RoundResult {
  roundNumber: number;
  commits: Record<string, CommittedCard>; // playerId -> commit
  results: Record<string, RoundOutcome>; // playerId -> outcome
  effectsTriggered: TriggeredEffect[];
}

/**
 * Card snapshots taken at game start
 * Games use these snapshots, not live card definitions
 */
export interface CardSnapshot {
  sleeves: CardDefinition[];
  animals: CardDefinition[];
  equipment: CardDefinition[];
}

/**
 * ELO change record for a player
 */
export interface EloChange {
  previousElo: number;
  newElo: number;
  change: number;
}

/**
 * Game document stored in Firestore games/{gameId}
 */
export interface Game {
  id: string;
  players: [string, string]; // User IDs (or snapshot player ID for async)
  status: GameStatus;
  currentRound: number;
  scores: Record<string, number>; // playerId -> score
  winner: string | null; // User ID, null if draw or ongoing
  isDraw: boolean;
  ranked: boolean; // If false, no ELO changes

  // Snapshots at game start (immune to admin edits)
  rulesSnapshot: GameRules;
  cardSnapshot: CardSnapshot;

  // Round history
  rounds: RoundResult[];
  maxRounds: number; // 5 for all new games

  // ELO changes (only present for ranked games that have ended)
  eloChanges?: Record<string, EloChange>; // playerId -> ELO change

  // Async game fields (only present for async games)
  isAsync?: boolean;
  snapshotId?: string;
  snapshotSourcePlayerId?: string;
  snapshotSourcePlayerName?: string;

  // Snapshot accumulated state (only for async games, updated each round)
  snapshotState?: {
    persistentModifiers: PersistentModifier[];
    initiativeModifier: number;
  };

  createdAt: string; // ISO 8601
  startedAt: string; // ISO 8601
  endedAt: string | null; // ISO 8601
  endReason: GameEndReason | null; // Why the game ended
}

/**
 * Private player state for a game
 * Stored in games/{gameId}/playerState/{playerId}
 * Each player can only read their own document
 */
export interface PlayerGameState {
  odIdplayerId: string;
  odIduserId: string; // Firebase Auth UID (for security rules)

  // Hands
  animalHand: string[]; // Card IDs (typically 3)
  equipmentHand: string[]; // Card IDs (no limit)

  // Per-player animal deck/discard (independent copies)
  animalDeck: string[];
  animalDiscard: string[];

  // Equipment deck/discard
  equipmentDeck: string[];
  equipmentDiscard: string[];

  // Sleeve tracking
  availableSleeves: string[];
  usedSleeves: string[];

  // Persistent modifiers from special effects
  persistentModifiers: PersistentModifier[];

  // Temporary initiative modifier (from modify_initiative effect, applies to next round only)
  initiativeModifier: number;

  // Current round commit
  currentCommit: CommittedCard | null;
  hasCommitted: boolean;

  // Replay data (logged before each round)
  roundSnapshots: RoundSnapshot[];
}

/**
 * Replay data snapshot for a single round (private to each player)
 */
export interface RoundSnapshot {
  roundNumber: number;
  animalHand: string[];
  equipmentHand: string[];
  availableSleeves: string[];
  animalsDrawn: string[];
  equipmentDrawn: string[];
}

/**
 * Data required to create a new game (from acceptChallenge)
 */
export interface CreateGameData {
  players: [string, string];
  rulesSnapshot: GameRules;
  cardSnapshot: CardSnapshot;
}

// ============================================================================
// SNAPSHOT PLAYER ID HELPERS
// ============================================================================

export const SNAPSHOT_PLAYER_PREFIX = "snapshot:";

export function isSnapshotPlayer(playerId: string): boolean {
  return playerId.startsWith(SNAPSHOT_PLAYER_PREFIX);
}

export function getSnapshotIdFromPlayer(playerId: string): string {
  return playerId.slice(SNAPSHOT_PLAYER_PREFIX.length);
}

export function makeSnapshotPlayerId(snapshotId: string): string {
  return `${SNAPSHOT_PLAYER_PREFIX}${snapshotId}`;
}

// ============================================================================
// STAT ATTRIBUTION (for UI display of which layer contributes what)
// ============================================================================

/**
 * Layer type in the card composition stack
 */
export type LayerType = "sleeve_bg" | "animal" | "equipment" | "sleeve_fg" | "persistent" | "initiative_mod";

/**
 * Information about what stats a single layer contributes
 */
export interface StatLayerInfo {
  layerType: LayerType;
  cardId: string;
  cardName: string;
  damage?: number;
  health?: number;
  initiative?: number;
  modifier?: Modifier;
  specialEffect?: SpecialEffect;
  /** If true, this layer adds to stats instead of overwriting (persistent modifiers) */
  isAdditive?: boolean;
  /** Source round for persistent modifiers */
  sourceRound?: number;
}

/**
 * Complete stat attribution for a card composition
 * Shows which layer contributes which stats and which layer "wins" for each
 */
export interface StatAttribution {
  layers: StatLayerInfo[];
  /** Tracks which layer's cardId is the "active" (winning) source for each stat */
  activeLayer: {
    damage: string | null;
    health: string | null;
    initiative: string | null;
    modifier: string | null;
    specialEffect: string | null;
  };
}
