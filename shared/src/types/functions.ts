/**
 * Firebase Function Input/Output Interfaces
 *
 * All callable functions must use these interfaces.
 * This ensures type safety across functions and frontends.
 */

import type { User } from "./user.js";
import type { CardDefinition, CreateCardData, UpdateCardData } from "./card.js";
import type { GameRules, UpdateRulesData } from "./rules.js";
import type { CommittedCard } from "./game.js";

// =============================================================================
// User Management Functions
// =============================================================================

/**
 * getOrCreateUser - Fetch or create user on login
 * No input required - user info comes from auth context
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetOrCreateUserInput {}

export interface GetOrCreateUserOutput {
  user: User;
  isNewUser: boolean;
}

/**
 * setUsername - Set unique username for account (3-12 chars)
 */
export interface SetUsernameInput {
  username: string;
}

export interface SetUsernameOutput {
  success: boolean;
  username: string;
}

// =============================================================================
// Matchmaking Functions
// =============================================================================

/**
 * joinGame - Open matchmaking (available to all including guests)
 * No input required - user info comes from auth context
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JoinGameInput {}

export interface JoinGameOutput {
  type: "matched" | "waiting";
  gameId?: string;
  challengeId?: string;
}

/**
 * challengePlayer - Direct challenge by user ID (accounts only)
 */
export interface ChallengePlayerInput {
  opponentId: string;
}

export interface ChallengePlayerOutput {
  challengeId: string;
}

/**
 * challengeByUsername - Challenge by username (accounts only, rejects guests)
 */
export interface ChallengeByUsernameInput {
  username: string;
}

export interface ChallengeByUsernameOutput {
  challengeId: string;
  opponentId: string;
}

// =============================================================================
// Challenge Functions
// =============================================================================

/**
 * acceptChallenge - Accept and create game with snapshots
 */
export interface AcceptChallengeInput {
  challengeId: string;
}

export interface AcceptChallengeOutput {
  gameId: string;
}

/**
 * declineChallenge - Decline and delete challenge
 */
export interface DeclineChallengeInput {
  challengeId: string;
}

export interface DeclineChallengeOutput {
  success: boolean;
}

// =============================================================================
// Game Functions
// =============================================================================

/**
 * commitCard - Commit composed card for current round
 */
export interface CommitCardInput {
  gameId: string;
  sleeveId: string;
  animalId: string;
  equipmentIds: string[]; // In stacking order (bottom to top)
}

export interface CommitCardOutput {
  success: boolean;
  commit: CommittedCard;
  bothCommitted: boolean;
  // If bothCommitted is true, round result will be in game document
}

// =============================================================================
// Admin Functions (ADMIN role required)
// =============================================================================

/**
 * createCard - Create new card definition
 */
export interface CreateCardInput {
  card: CreateCardData;
}

export interface CreateCardOutput {
  card: CardDefinition;
}

/**
 * updateCard - Update existing card
 */
export interface UpdateCardInput {
  cardId: string;
  updates: UpdateCardData;
}

export interface UpdateCardOutput {
  card: CardDefinition;
}

/**
 * deleteCard - Delete card definition
 */
export interface DeleteCardInput {
  cardId: string;
}

export interface DeleteCardOutput {
  success: boolean;
}

/**
 * uploadCardImage - Upload image to Firebase Storage
 */
export interface UploadCardImageInput {
  cardId: string;
  imageData: string; // Base64 encoded image
  contentType: string; // e.g., "image/png"
}

export interface UploadCardImageOutput {
  imageUrl: string;
}

/**
 * updateRules - Update game rules
 */
export interface UpdateRulesInput {
  rules: UpdateRulesData;
}

export interface UpdateRulesOutput {
  rules: GameRules;
}

/**
 * listCardImages - List all card images in Storage with usage info
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListCardImagesInput {}

export interface CardImageInfo {
  path: string;
  url: string;
  name: string;
  cardId: string | null; // null if unused
  cardName: string | null;
  size: number;
  updatedAt: string;
}

export interface ListCardImagesOutput {
  images: CardImageInfo[];
}
