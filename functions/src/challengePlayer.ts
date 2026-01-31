import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { Challenge } from "@sleeved-potential/shared";

interface ChallengePlayerRequest {
  opponentId: string;
}

interface ChallengePlayerResult {
  challengeId: string;
}

/**
 * Create a direct challenge to a specific player
 */
export const challengePlayer = onCall<ChallengePlayerRequest, Promise<ChallengePlayerResult>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to challenge a player");
    }

    const db = getFirestore();
    const { opponentId } = request.data;
    const userId = request.auth.uid;

    if (!opponentId) {
      throw new HttpsError("invalid-argument", "opponentId is required");
    }

    if (opponentId === userId) {
      throw new HttpsError("invalid-argument", "Cannot challenge yourself");
    }

    // Verify opponent exists
    const opponentDoc = await db.collection("users").doc(opponentId).get();
    if (!opponentDoc.exists) {
      throw new HttpsError("not-found", "Opponent not found");
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
    const challengeData: Omit<Challenge, "createdAt"> & { createdAt: FieldValue } = {
      id: challengeRef.id,
      type: "direct",
      creatorId: userId,
      opponentId,
      status: "waiting",
      createdAt: FieldValue.serverTimestamp(),
    };

    await challengeRef.set(challengeData);

    return {
      challengeId: challengeRef.id,
    };
  }
);
