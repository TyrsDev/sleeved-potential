import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  Challenge,
  DeclineChallengeInput,
  DeclineChallengeOutput,
} from "@sleeved-potential/shared";

/**
 * Decline a challenge
 */
export const declineChallenge = onCall<DeclineChallengeInput, Promise<DeclineChallengeOutput>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to decline a challenge");
    }

    const db = getFirestore();
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

    // Delete the challenge
    await challengeRef.delete();

    return {
      success: true,
    };
  }
);
