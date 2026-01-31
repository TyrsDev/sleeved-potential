import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { Challenge, Game } from "@sleeved-potential/shared";

const db = getFirestore();

interface JoinGameResult {
  type: "matched" | "waiting";
  gameId?: string;
  challengeId?: string;
}

/**
 * Matchmaking function:
 * 1. Look for existing matchmaking challenges (not created by this user)
 * 2. If found: Create game with both players, delete challenge
 * 3. If not found: Create new matchmaking challenge
 */
export const joinGame = onCall<void, Promise<JoinGameResult>>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in to join a game");
  }

  const userId = request.auth.uid;

  // Look for an existing matchmaking challenge
  const challengesRef = db.collection("challenges");
  const existingChallenge = await challengesRef
    .where("type", "==", "matchmaking")
    .where("status", "==", "waiting")
    .limit(10)
    .get();

  // Find a challenge not created by this user
  const availableChallenge = existingChallenge.docs.find(
    (doc) => (doc.data() as Challenge).creatorId !== userId
  );

  if (availableChallenge) {
    // Match found! Create a game
    const challengeData = availableChallenge.data() as Challenge;

    const gameRef = db.collection("games").doc();
    const now = FieldValue.serverTimestamp();

    const gameData: Omit<Game, "createdAt" | "updatedAt"> & {
      createdAt: FieldValue;
      updatedAt: FieldValue;
    } = {
      id: gameRef.id,
      players: [challengeData.creatorId, userId],
      currentTurn: challengeData.creatorId, // First player goes first
      status: "active",
      winner: null,
      createdAt: now,
      updatedAt: now,
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
  const challengeData: Omit<Challenge, "createdAt"> & { createdAt: FieldValue } = {
    id: challengeRef.id,
    type: "matchmaking",
    creatorId: userId,
    opponentId: null,
    status: "waiting",
    createdAt: FieldValue.serverTimestamp(),
  };

  await challengeRef.set(challengeData);

  return {
    type: "waiting",
    challengeId: challengeRef.id,
  };
});
