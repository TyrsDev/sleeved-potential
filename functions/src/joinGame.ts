import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import {
  DEFAULT_ELO,
  type Challenge,
  type User,
  type JoinGameInput,
  type JoinGameOutput,
  type Game,
} from "@sleeved-potential/shared";
import {
  createGameFromChallenge,
  fetchRulesAndCards,
  validateCardCounts,
  findMatchingSnapshot,
  createAsyncGame,
} from "./utils/gameHelpers.js";
import { getResponseMeta } from "./utils/apiMeta.js";

/**
 * Matchmaking function:
 * 1. Validate enough cards exist to start a game
 * 2. Check if player has an active async game already
 * 3. Look for existing matchmaking challenges (not created by this user)
 * 4. If found: Create full game with card/rules snapshots, update challenge
 * 5. If not found: Try async matching against a snapshot
 * 6. If no snapshot: Create new matchmaking challenge (waiting)
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

    // Fetch rules and cards
    const { rules, cardSnapshot } = await fetchRulesAndCards(db);
    validateCardCounts(cardSnapshot, rules);

    // Get current user's info
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found. Call getOrCreateUser first.");
    }
    const userData = userDoc.data() as User;

    // Check if player already has an active game
    const activeGames = await db
      .collection("games")
      .where("players", "array-contains", userId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!activeGames.empty) {
      const existingGame = activeGames.docs[0].data() as Game;
      return {
        type: existingGame.isAsync ? "async_matched" : "matched",
        gameId: existingGame.id,
        _meta: getResponseMeta(),
      };
    }

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
      // Match found! Create a full game with proper initialization
      const challengeData = availableChallenge.data() as Challenge;

      const gameId = await createGameFromChallenge(
        db,
        availableChallenge.ref,
        challengeData,
        challengeData.creatorId,
        userId
      );

      return {
        type: "matched",
        gameId,
        _meta: getResponseMeta(),
      };
    }

    // No live match — try async matching against a snapshot
    const playerElo = userData.stats.elo ?? DEFAULT_ELO;
    const snapshot = await findMatchingSnapshot(db, userId, playerElo);

    if (snapshot) {
      const gameId = await createAsyncGame(db, userId, snapshot, rules, cardSnapshot);
      return {
        type: "async_matched",
        gameId,
        _meta: getResponseMeta(),
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
      _meta: getResponseMeta(),
    };
  }
);
