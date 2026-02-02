import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type { Challenge, AcceptChallengeInput, AcceptChallengeOutput } from "@sleeved-potential/shared";
import { createGameFromChallenge } from "./utils/gameHelpers.js";
import { getResponseMeta } from "./utils/apiMeta.js";

/**
 * Accept a direct challenge and create a game with full initialization
 *
 * Uses the shared createGameFromChallenge helper which:
 * - Snapshots current rules from rules/current
 * - Snapshots all card definitions
 * - Initializes shared Animal deck (shuffle, deal 3 to each player)
 * - Creates PlayerGameState subcollections for both players
 * - Deals starting equipment hands
 * - Updates the challenge with status: "accepted" and gameId
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

    if (!challengeId) {
      throw new HttpsError("invalid-argument", "challengeId is required");
    }

    const challengeRef = db.collection("challenges").doc(challengeId);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      throw new HttpsError("not-found", "Challenge not found");
    }

    const challenge = challengeDoc.data() as Challenge;

    // Verify user is the challenged opponent (for direct challenges)
    if (challenge.opponentId !== userId) {
      throw new HttpsError("permission-denied", "You are not the challenged player");
    }

    if (challenge.status !== "waiting") {
      throw new HttpsError("failed-precondition", "Challenge is no longer available");
    }

    // Use shared helper to create the game
    const gameId = await createGameFromChallenge(
      db,
      challengeRef,
      challenge,
      challenge.creatorId, // player1 = challenge creator
      userId // player2 = this user (accepting the challenge)
    );

    return {
      gameId,
      _meta: getResponseMeta(),
    };
  }
);
