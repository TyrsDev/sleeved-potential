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
import type {
  ChangelogEntry,
  CreateChangelogData,
  UpdateChangelogData,
} from "./changelog.js";
import type { SnapshotCommit } from "./snapshot.js";

// =============================================================================
// API Metadata (versioning)
// =============================================================================

/**
 * Client metadata included in API requests
 */
export interface ApiMetadata {
  clientVersion: string;
}

/**
 * Server metadata included in API responses
 */
export interface ApiResponseMeta {
  serverVersion: string;
}

// =============================================================================
// User Management Functions
// =============================================================================

/**
 * getOrCreateUser - Fetch or create user on login
 * No input required - user info comes from auth context
 */
export interface GetOrCreateUserInput {
  _meta?: ApiMetadata;
}

export interface GetOrCreateUserOutput {
  user: User;
  isNewUser: boolean;
  _meta: ApiResponseMeta;
}

/**
 * setUsername - Set unique username for account (3-12 chars)
 */
export interface SetUsernameInput {
  username: string;
  _meta?: ApiMetadata;
}

export interface SetUsernameOutput {
  success: boolean;
  username: string;
  _meta: ApiResponseMeta;
}

// =============================================================================
// Matchmaking Functions
// =============================================================================

/**
 * joinGame - Open matchmaking (available to all including guests)
 * No input required - user info comes from auth context
 */
export interface JoinGameInput {
  _meta?: ApiMetadata;
}

export interface JoinGameOutput {
  type: "matched" | "waiting" | "async_matched";
  gameId?: string;
  challengeId?: string;
  _meta: ApiResponseMeta;
}

/**
 * challengePlayer - Direct challenge by user ID (accounts only)
 */
export interface ChallengePlayerInput {
  opponentId: string;
  _meta?: ApiMetadata;
}

export interface ChallengePlayerOutput {
  challengeId: string;
  _meta: ApiResponseMeta;
}

/**
 * challengeByUsername - Challenge by username (accounts only, rejects guests)
 */
export interface ChallengeByUsernameInput {
  username: string;
  _meta?: ApiMetadata;
}

export interface ChallengeByUsernameOutput {
  challengeId: string;
  opponentId: string;
  _meta: ApiResponseMeta;
}

// =============================================================================
// Challenge Functions
// =============================================================================

/**
 * acceptChallenge - Accept and create game with snapshots
 */
export interface AcceptChallengeInput {
  challengeId: string;
  _meta?: ApiMetadata;
}

export interface AcceptChallengeOutput {
  gameId: string;
  _meta: ApiResponseMeta;
}

/**
 * declineChallenge - Decline and delete challenge
 */
export interface DeclineChallengeInput {
  challengeId: string;
  _meta?: ApiMetadata;
}

export interface DeclineChallengeOutput {
  success: boolean;
  _meta: ApiResponseMeta;
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
  _meta?: ApiMetadata;
}

export interface CommitCardOutput {
  success: boolean;
  commit: CommittedCard;
  bothCommitted: boolean;
  // If bothCommitted is true, round result will be in game document
  _meta: ApiResponseMeta;
}

// =============================================================================
// Admin Functions (ADMIN role required)
// =============================================================================

/**
 * createCard - Create new card definition
 */
export interface CreateCardInput {
  card: CreateCardData;
  _meta?: ApiMetadata;
}

export interface CreateCardOutput {
  card: CardDefinition;
  _meta: ApiResponseMeta;
}

/**
 * updateCard - Update existing card
 */
export interface UpdateCardInput {
  cardId: string;
  updates: UpdateCardData;
  _meta?: ApiMetadata;
}

export interface UpdateCardOutput {
  card: CardDefinition;
  _meta: ApiResponseMeta;
}

/**
 * deleteCard - Delete card definition
 */
export interface DeleteCardInput {
  cardId: string;
  _meta?: ApiMetadata;
}

export interface DeleteCardOutput {
  success: boolean;
  _meta: ApiResponseMeta;
}

/**
 * uploadCardImage - Upload image to Firebase Storage
 */
export interface UploadCardImageInput {
  cardId: string;
  imageData: string; // Base64 encoded image
  contentType: string; // e.g., "image/png"
  _meta?: ApiMetadata;
}

export interface UploadCardImageOutput {
  imageUrl: string;
  _meta: ApiResponseMeta;
}

/**
 * updateRules - Update game rules
 */
export interface UpdateRulesInput {
  rules: UpdateRulesData;
  _meta?: ApiMetadata;
}

export interface UpdateRulesOutput {
  rules: GameRules;
  _meta: ApiResponseMeta;
}

/**
 * listCardImages - List all card images in Storage with usage info
 */
export interface ListCardImagesInput {
  _meta?: ApiMetadata;
}

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
  _meta: ApiResponseMeta;
}

// =============================================================================
// Game Management Functions
// =============================================================================

/**
 * surrenderGame - Surrender an active game
 */
export interface SurrenderGameInput {
  gameId: string;
  _meta?: ApiMetadata;
}

export interface SurrenderGameOutput {
  success: boolean;
  _meta: ApiResponseMeta;
}

// =============================================================================
// Changelog Functions (ADMIN role required)
// =============================================================================

/**
 * createChangelog - Create a new changelog entry (as draft)
 */
export interface CreateChangelogInput {
  changelog: CreateChangelogData;
  _meta?: ApiMetadata;
}

export interface CreateChangelogOutput {
  changelog: ChangelogEntry;
  _meta: ApiResponseMeta;
}

/**
 * updateChangelog - Update an existing draft changelog entry
 */
export interface UpdateChangelogInput {
  changelogId: string;
  updates: UpdateChangelogData;
  _meta?: ApiMetadata;
}

export interface UpdateChangelogOutput {
  changelog: ChangelogEntry;
  _meta: ApiResponseMeta;
}

/**
 * publishChangelog - Publish a draft changelog entry
 */
export interface PublishChangelogInput {
  changelogId: string;
  _meta?: ApiMetadata;
}

export interface PublishChangelogOutput {
  changelog: ChangelogEntry;
  _meta: ApiResponseMeta;
}

// =============================================================================
// Admin Snapshot/Migration Functions
// =============================================================================

/**
 * seedBotSnapshot - Create a bot snapshot for async matchmaking (ADMIN)
 */
export interface SeedBotSnapshotInput {
  botName: string;
  elo: number;
  commits: SnapshotCommit[]; // Card IDs only
  _meta?: ApiMetadata;
}

export interface SeedBotSnapshotOutput {
  snapshotId: string;
  _meta: ApiResponseMeta;
}

/**
 * migrateGames - Delete old format games (ADMIN)
 */
export interface MigrateGamesInput {
  _meta?: ApiMetadata;
}

export interface MigrateGamesOutput {
  deletedCount: number;
  _meta: ApiResponseMeta;
}

/**
 * deleteSnapshot - Delete a bot snapshot (ADMIN)
 */
export interface DeleteSnapshotInput {
  snapshotId: string;
  _meta?: ApiMetadata;
}

export interface DeleteSnapshotOutput {
  success: boolean;
  _meta: ApiResponseMeta;
}

/**
 * deleteChangelog - Delete a draft changelog entry
 */
export interface DeleteChangelogInput {
  changelogId: string;
  _meta?: ApiMetadata;
}

export interface DeleteChangelogOutput {
  success: boolean;
  _meta: ApiResponseMeta;
}
