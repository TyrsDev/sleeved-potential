import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import {
  DEFAULT_GAME_RULES,
  type Challenge,
  type User,
  type JoinGameInput,
  type JoinGameOutput,
  type GameRules,
  type CardDefinition,
} from "@sleeved-potential/shared";
import { createGameFromChallenge } from "./utils/gameHelpers.js";

/**
 * Matchmaking function:
 * 1. Validate enough cards exist to start a game
 * 2. Look for existing matchmaking challenges (not created by this user)
 * 3. If found: Create full game with card/rules snapshots, update challenge
 * 4. If not found: Create new matchmaking challenge
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

    // Validate we have enough cards to start a game BEFORE creating/matching challenges
    const rulesDoc = await db.doc("rules/current").get();
    const rules: GameRules = rulesDoc.exists
      ? (rulesDoc.data() as GameRules)
      : { id: "current", ...DEFAULT_GAME_RULES, updatedAt: now, updatedBy: "system" };

    const cardsSnapshot = await db.collection("cards").get();
    let sleeveCount = 0;
    let animalCount = 0;

    cardsSnapshot.docs.forEach((doc) => {
      const card = doc.data() as CardDefinition;
      if (card.active === false) return;
      if (card.type === "sleeve") sleeveCount++;
      else if (card.type === "animal") animalCount++;
    });

    if (sleeveCount === 0) {
      throw new HttpsError(
        "failed-precondition",
        "Cannot start game: no sleeves defined. Admin must create sleeves first."
      );
    }

    const requiredAnimals = rules.startingAnimalHand * 2;
    if (animalCount < requiredAnimals) {
      throw new HttpsError(
        "failed-precondition",
        `Cannot start game: need at least ${requiredAnimals} animals, found ${animalCount}`
      );
    }

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
      // Match found! Create a full game with proper initialization
      const challengeData = availableChallenge.data() as Challenge;

      const gameId = await createGameFromChallenge(
        db,
        availableChallenge.ref,
        challengeData,
        challengeData.creatorId, // player1 = challenge creator
        userId // player2 = this user (the matcher)
      );

      return {
        type: "matched",
        gameId,
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
