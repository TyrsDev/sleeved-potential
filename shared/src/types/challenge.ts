/**
 * Challenge types
 * - matchmaking: Open challenge, anyone can match
 * - direct: Challenge to a specific player by user ID or username
 */
export type ChallengeType = "matchmaking" | "direct";

/**
 * Challenge status
 */
export type ChallengeStatus = "waiting" | "accepted" | "declined";

/**
 * Challenge document stored in Firestore challenges/{challengeId}
 */
export interface Challenge {
  id: string;
  type: ChallengeType;
  creatorId: string;
  creatorUsername: string; // For display purposes
  opponentId: string | null; // null for matchmaking
  opponentUsername: string | null; // For direct challenges
  status: ChallengeStatus;
  createdAt: string; // ISO 8601
}

/**
 * Data for creating a challenge
 */
export interface CreateChallengeData {
  type: ChallengeType;
  creatorId: string;
  creatorUsername: string;
  opponentId?: string;
  opponentUsername?: string;
}
