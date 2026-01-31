import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type { Challenge, User, JoinGameInput, JoinGameOutput } from "@sleeved-potential/shared";

/**
 * Matchmaking function:
 * 1. Look for existing matchmaking challenges (not created by this user)
 * 2. If found: Create game with both players, delete challenge
 * 3. If not found: Create new matchmaking challenge
 *
 * Note: Available to all users including guests (unlike direct challenges)
 */
export const joinGame = onCall<JoinGameInput, Promise<JoinGameOutput>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to join a game");
    }

    const db = getFirestore();
    const userId = request.auth.uid;
    const now = new Date().toISOString();

    // Get current user's info for challenge creation
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found. Call getOrCreateUser first.");
    }
    const userData = userDoc.data() as User;

    // Look for an existing matchmaking challenge
    const challengesRef = db.collection("challenges");
    const existingChallenges = await challengesRef
      .where("type", "==", "matchmaking")
      .where("status", "==", "waiting")
      .limit(10)
      .get();

    // Find a challenge not created by this user
    const availableChallenge = existingChallenges.docs.find(
      (doc) => (doc.data() as Challenge).creatorId !== userId
    );

    if (availableChallenge) {
      // Match found! Create a game
      const challengeData = availableChallenge.data() as Challenge;

      const gameRef = db.collection("games").doc();

      // TODO: Phase 4 - Initialize full game state with card/rules snapshots
      // For now, create a minimal game document
      const gameData = {
        id: gameRef.id,
        players: [challengeData.creatorId, userId] as [string, string],
        status: "active" as const,
        currentRound: 0,
        scores: {
          [challengeData.creatorId]: 0,
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
        transaction.set(gameRef, gameData);
        transaction.delete(availableChallenge.ref);
      });

      return {
        type: "matched",
        gameId: gameRef.id,
      };
    }

    // No match found, create a new challenge
    const challengeRef = db.collection("challenges").doc();
    const challengeData: Challenge = {
      id: challengeRef.id,
      type: "matchmaking",
      creatorId: userId,
      creatorUsername: userData.username,
      opponentId: null,
      opponentUsername: null,
      status: "waiting",
      createdAt: now,
    };

    await challengeRef.set(challengeData);

    return {
      type: "waiting",
      challengeId: challengeRef.id,
    };
  }
);
