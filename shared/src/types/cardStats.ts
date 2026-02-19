import type { CardType } from "./card.js";

/**
 * Aggregated usage statistics for a single card across all completed games.
 * Stored in Firestore: cardStats/{cardId}
 */
export interface CardUsageStats {
  cardId: string;
  cardName: string; // Denormalized for display
  cardType: CardType;

  // How many times the card was committed (played)
  timesUsed: number;
  timesDefeated: number; // outcome.defeated === true when this card was played
  timesSurvived: number; // outcome.survived === true when this card was played
  timesDestroyed: number; // !survived when played
  timesDidntDefeat: number; // !defeated when played

  // Hand presence (real players only — snapshot players have no hand tracking)
  timesInHand: number; // Card appeared in hand at round start
  timesInHandNotUsed: number; // In hand but not committed that round

  lastComputedAt: string; // ISO 8601
  gamesAnalyzed: number; // Total completed games used in computation
}
