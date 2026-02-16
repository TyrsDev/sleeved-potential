/**
 * Game Snapshot System
 *
 * Snapshots record a player's strategy (card compositions per round)
 * for async games. Stats are NOT pre-baked — they are re-resolved
 * at game time using current card definitions.
 */

/**
 * A single round's card composition (IDs only, no resolved stats)
 */
export interface SnapshotCommit {
  sleeveId: string;
  animalId: string;
  equipmentIds: string[]; // In stacking order
}

/**
 * A recorded game strategy stored in Firestore snapshots/{snapshotId}
 * Used for async matchmaking — live players play against these
 */
export interface GameSnapshot {
  id: string;
  sourcePlayerId: string;
  sourcePlayerName: string;
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  roundCount: number; // Always 5, used in query: where("roundCount", "==", 5)
  commits: SnapshotCommit[]; // Card composition per round (index 0 = round 1)
  activeCardIds: string[]; // IDs of cards that were active when snapshot was created
  isBot: boolean;
  createdAt: string; // ISO 8601
}
