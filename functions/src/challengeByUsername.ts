import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  Challenge,
  User,
  UsernameDoc,
  ChallengeByUsernameInput,
  ChallengeByUsernameOutput,
} from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

/**
 * Create a challenge to a player by their username
 *
 * Note: Only available to account users (not guests)
 * Note: Cannot challenge guest users (they don't have public usernames)
 */
export const challengeByUsername = onCall<ChallengeByUsernameInput, Promise<ChallengeByUsernameOutput>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to challenge a player");
    }

    const db = getFirestore();
    const { username } = request.data;
    const userId = request.auth.uid;
    const now = new Date().toISOString();

    if (!username) {
      throw new HttpsError("invalid-argument", "username is required");
    }

    // Normalize username to lowercase for lookup
    const normalizedUsername = username.toLowerCase().trim();

    if (normalizedUsername.length < 3 || normalizedUsername.length > 12) {
      throw new HttpsError("invalid-argument", "Username must be 3-12 characters");
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

    // Look up username in usernames collection
    const usernameDoc = await db.collection("usernames").doc(normalizedUsername).get();
    if (!usernameDoc.exists) {
      throw new HttpsError("not-found", "User not found with that username");
    }

    const usernameData = usernameDoc.data() as UsernameDoc;
    const opponentId = usernameData.odIduserId;

    // Cannot challenge yourself
    if (opponentId === userId) {
      throw new HttpsError("invalid-argument", "Cannot challenge yourself");
    }

    // Get opponent user data
    const opponentDoc = await db.collection("users").doc(opponentId).get();
    if (!opponentDoc.exists) {
      throw new HttpsError("not-found", "Opponent user not found");
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

    // Check for existing active game between these players
    const existingGame = await db
      .collection("games")
      .where("status", "==", "active")
      .where("players", "array-contains", userId)
      .get();

    const hasActiveGame = existingGame.docs.some((doc) => {
      const game = doc.data();
      return game.players.includes(opponentId);
    });

    if (hasActiveGame) {
      throw new HttpsError(
        "failed-precondition",
        "You already have an active game with this player. Finish it first."
      );
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
      opponentId,
      _meta: getResponseMeta(),
    };
  }
);
