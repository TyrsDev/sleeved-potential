import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { Challenge, Game } from "@sleeved-potential/shared";

const db = getFirestore();

interface AcceptChallengeRequest {
  challengeId: string;
}

interface AcceptChallengeResult {
  gameId: string;
}

/**
 * Accept a challenge and create a game
 */
export const acceptChallenge = onCall<AcceptChallengeRequest, Promise<AcceptChallengeResult>>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to accept a challenge");
    }

    const { challengeId } = request.data;
    const userId = request.auth.uid;

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
    const now = FieldValue.serverTimestamp();

    const gameData: Omit<Game, "createdAt" | "updatedAt"> & {
      createdAt: FieldValue;
      updatedAt: FieldValue;
    } = {
      id: gameRef.id,
      players: [challenge.creatorId, userId],
      currentTurn: challenge.creatorId, // Challenger goes first
      status: "active",
      winner: null,
      createdAt: now,
      updatedAt: now,
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
