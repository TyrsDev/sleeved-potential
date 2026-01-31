import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  Challenge,
  User,
  ChallengePlayerInput,
  ChallengePlayerOutput,
} from "@sleeved-potential/shared";

/**
 * Create a direct challenge to a specific player by user ID
 *
 * Note: Only available to account users (not guests)
 * Note: Cannot challenge guest users
 */
export const challengePlayer = onCall<ChallengePlayerInput, Promise<ChallengePlayerOutput>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to challenge a player");
    }

    const db = getFirestore();
    const { opponentId } = request.data;
    const userId = request.auth.uid;
    const now = new Date().toISOString();

    if (!opponentId) {
      throw new HttpsError("invalid-argument", "opponentId is required");
    }

    if (opponentId === userId) {
      throw new HttpsError("invalid-argument", "Cannot challenge yourself");
    }

    // Get current user
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found. Call getOrCreateUser first.");
    }
    const userData = userDoc.data() as User;

    // Check if current user is a guest (guests cannot challenge directly)
    if (userData.isGuest) {
      throw new HttpsError(
        "permission-denied",
        "Guest users cannot send direct challenges. Use matchmaking instead."
      );
    }

    // Verify opponent exists
    const opponentDoc = await db.collection("users").doc(opponentId).get();
    if (!opponentDoc.exists) {
      throw new HttpsError("not-found", "Opponent not found");
    }
    const opponentData = opponentDoc.data() as User;

    // Check if opponent is a guest (cannot challenge guests)
    if (opponentData.isGuest) {
      throw new HttpsError(
        "invalid-argument",
        "Cannot challenge guest users. They can only use matchmaking."
      );
    }

    // Check if there's already a pending challenge between these players
    const existingChallenge = await db
      .collection("challenges")
      .where("type", "==", "direct")
      .where("status", "==", "waiting")
      .where("creatorId", "==", userId)
      .where("opponentId", "==", opponentId)
      .limit(1)
      .get();

    if (!existingChallenge.empty) {
      throw new HttpsError("already-exists", "You already have a pending challenge to this player");
    }

    // Create the challenge
    const challengeRef = db.collection("challenges").doc();
    const challengeData: Challenge = {
      id: challengeRef.id,
      type: "direct",
      creatorId: userId,
      creatorUsername: userData.username,
      opponentId,
      opponentUsername: opponentData.username,
      status: "waiting",
      createdAt: now,
    };

    await challengeRef.set(challengeData);

    return {
      challengeId: challengeRef.id,
    };
  }
);
