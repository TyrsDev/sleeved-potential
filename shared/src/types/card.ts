import type { Modifier, SpecialEffect } from "./effects.js";

/**
 * Card types in the game
 */
export type CardType = "sleeve" | "animal" | "equipment";

/**
 * Stats that can appear on a card component
 * All fields are optional - only present if the component defines that stat
 */
export interface CardStats {
  damage?: number;
  health?: number;
  modifier?: Modifier;
  specialEffect?: SpecialEffect;
  initiative?: number; // Usually only from effects, but could be on cards
}

/**
 * Card definition stored in Firestore cards/{cardId}
 *
 * Card types:
 * - Sleeve: Has backgroundStats (easily overwritten) and foregroundStats (guaranteed)
 * - Animal: Has stats with damage and health
 * - Equipment: Has stats with any combination of stats
 */
export interface CardDefinition {
  id: string;
  type: CardType;
  name: string;
  description: string;
  imageUrl: string | null; // Firebase Storage URL

  /**
   * Whether this card is active and can be used in new games.
   * Inactive cards are excluded from cardSnapshot when games start.
   */
  active: boolean;

  /**
   * For sleeves only: stats on the inside of the sleeve
   * These are the "default" stats that get easily overwritten by cards inside
   */
  backgroundStats?: CardStats;

  /**
   * For sleeves only: stats on the outside front of the sleeve
   * These are guaranteed to overwrite any stat from cards inside
   * Designer chooses which stat(s) the foreground guarantees
   */
  foregroundStats?: CardStats;

  /**
   * For animals and equipment: the card's stats
   */
  stats?: CardStats;

  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Data for creating a new card
 */
export interface CreateCardData {
  type: CardType;
  name: string;
  description: string;
  backgroundStats?: CardStats;
  foregroundStats?: CardStats;
  stats?: CardStats;
}

/**
 * Data for updating an existing card
 */
export interface UpdateCardData {
  name?: string;
  description?: string;
  backgroundStats?: CardStats;
  foregroundStats?: CardStats;
  stats?: CardStats;
  imageUrl?: string | null;
  active?: boolean;
}

/**
 * @deprecated Use CardDefinition instead
 * Legacy Card interface for backwards compatibility during migration
 */
export interface Card {
  id: string;
  name: string;
  description: string;
  attack: number;
  defense: number;
  cost: number;
  createdAt: string;
  updatedAt: string;
}
