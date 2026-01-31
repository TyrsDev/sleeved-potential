import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  Challenge,
  AcceptChallengeInput,
  AcceptChallengeOutput,
} from "@sleeved-potential/shared";

/**
 * Accept a challenge and create a game
 *
 * TODO: Phase 4 - Initialize full game state with:
 * - Card snapshots (sleeves, animals, equipment)
 * - Rules snapshot
 * - Player state subcollections
 * - Initial deck distributions
 */
export const acceptChallenge = onCall<AcceptChallengeInput, Promise<AcceptChallengeOutput>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to accept a challenge");
    }

    const db = getFirestore();
    const { challengeId } = request.data;
    const userId = request.auth.uid;
    const now = new Date().toISOString();

    if (!challengeId) {
      throw new HttpsError("invalid-argument", "challengeId is required");
    }

    const challengeRef = db.collection("challenges").doc(challengeId);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      throw new HttpsError("not-found", "Challenge not found");
    }

    const challenge = challengeDoc.data() as Challenge;

    // Verify user is the challenged opponent
    if (challenge.opponentId !== userId) {
      throw new HttpsError("permission-denied", "You are not the challenged player");
    }

    if (challenge.status !== "waiting") {
      throw new HttpsError("failed-precondition", "Challenge is no longer available");
    }

    // Create the game
    const gameRef = db.collection("games").doc();

    // TODO: Phase 4 - Initialize full game state with card/rules snapshots
    // For now, create a minimal game document
    const gameData = {
      id: gameRef.id,
      players: [challenge.creatorId, userId] as [string, string],
      status: "active" as const,
      currentRound: 0,
      scores: {
        [challenge.creatorId]: 0,
        [userId]: 0,
      },
      winner: null,
      isDraw: false,
      // TODO: Add these in Phase 4
      rulesSnapshot: null,
      cardSnapshot: null,
      animalDeck: [],
      animalDiscard: [],
      rounds: [],
      createdAt: now,
      startedAt: now,
      endedAt: null,
    };

    // Create game and delete challenge in a transaction
    await db.runTransaction(async (transaction) => {
      // Re-check challenge status in transaction
      const freshChallenge = await transaction.get(challengeRef);
      if (!freshChallenge.exists || (freshChallenge.data() as Challenge).status !== "waiting") {
        throw new HttpsError("failed-precondition", "Challenge is no longer available");
      }

      transaction.set(gameRef, gameData);
      transaction.delete(challengeRef);
    });

    return {
      gameId: gameRef.id,
    };
  }
);
