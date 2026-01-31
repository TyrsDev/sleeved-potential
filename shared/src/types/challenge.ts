export interface Challenge {
  id: string;
  type: ChallengeType;
  creatorId: string;
  opponentId: string | null;
  status: ChallengeStatus;
  createdAt: Date;
}

export type ChallengeType = "matchmaking" | "direct";

export type ChallengeStatus = "waiting" | "accepted" | "declined";

export interface CreateChallengeData {
  type: ChallengeType;
  opponentId?: string;
}
