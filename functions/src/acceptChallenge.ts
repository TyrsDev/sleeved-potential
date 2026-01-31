import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import {
  DEFAULT_GAME_RULES,
  type Challenge,
  type AcceptChallengeInput,
  type AcceptChallengeOutput,
  type Game,
  type GameRules,
  type CardDefinition,
  type CardSnapshot,
  type PlayerGameState,
} from "@sleeved-potential/shared";
import { shuffleArray, dealCards } from "./utils/gameHelpers.js";

/**
 * Accept a challenge and create a game with full initialization
 *
 * Game initialization includes:
 * - Snapshot current rules from rules/current
 * - Snapshot all card definitions
 * - Initialize shared Animal deck (shuffle, deal 3 to each player)
 * - Create PlayerGameState subcollections for both players
 * - Deal starting equipment hands
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
    const now = new Date().toISOString();

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

    // Fetch current rules (or use defaults)
    const rulesDoc = await db.doc("rules/current").get();
    const rulesSnapshot: GameRules = rulesDoc.exists
      ? (rulesDoc.data() as GameRules)
      : {
          id: "current",
          ...DEFAULT_GAME_RULES,
          updatedAt: now,
          updatedBy: "system",
        };

    // Fetch all card definitions
    const cardsSnapshot = await db.collection("cards").get();
    const cardSnapshot: CardSnapshot = {
      sleeves: [],
      animals: [],
      equipment: [],
    };

    cardsSnapshot.docs.forEach((doc) => {
      const card = doc.data() as CardDefinition;
      if (card.type === "sleeve") cardSnapshot.sleeves.push(card);
      else if (card.type === "animal") cardSnapshot.animals.push(card);
      else if (card.type === "equipment") cardSnapshot.equipment.push(card);
    });

    // Validate we have enough cards to start a game
    if (cardSnapshot.sleeves.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        "Cannot start game: no sleeves defined. Admin must create sleeves first."
      );
    }
    if (cardSnapshot.animals.length < rulesSnapshot.startingAnimalHand * 2) {
      throw new HttpsError(
        "failed-precondition",
        `Cannot start game: need at least ${rulesSnapshot.startingAnimalHand * 2} animals, found ${cardSnapshot.animals.length}`
      );
    }

    // Prepare player IDs
    const player1Id = challenge.creatorId;
    const player2Id = userId;
    const players: [string, string] = [player1Id, player2Id];

    // Shuffle and deal animals from shared deck
    const animalIds = cardSnapshot.animals.map((a) => a.id);
    const shuffledAnimals = shuffleArray(animalIds);

    const { dealt: player1Animals, remaining: afterPlayer1 } = dealCards(
      shuffledAnimals,
      rulesSnapshot.startingAnimalHand
    );
    const { dealt: player2Animals, remaining: animalDeck } = dealCards(
      afterPlayer1,
      rulesSnapshot.startingAnimalHand
    );

    // Prepare equipment decks for each player (each gets their own copy of all equipment)
    const equipmentIds = cardSnapshot.equipment.map((e) => e.id);
    const player1Equipment = shuffleArray(equipmentIds);
    const player2Equipment = shuffleArray(equipmentIds);

    const { dealt: player1EquipHand, remaining: player1EquipDeck } = dealCards(
      player1Equipment,
      rulesSnapshot.startingEquipmentHand
    );
    const { dealt: player2EquipHand, remaining: player2EquipDeck } = dealCards(
      player2Equipment,
      rulesSnapshot.startingEquipmentHand
    );

    // Prepare sleeve availability (all sleeves available to both players)
    const sleeveIds = cardSnapshot.sleeves.map((s) => s.id);

    // Create the game document
    const gameRef = db.collection("games").doc();

    const gameData: Game = {
      id: gameRef.id,
      players,
      status: "active",
      currentRound: 1,
      scores: {
        [player1Id]: 0,
        [player2Id]: 0,
      },
      winner: null,
      isDraw: false,
      rulesSnapshot,
      cardSnapshot,
      animalDeck,
      animalDiscard: [],
      rounds: [],
      createdAt: now,
      startedAt: now,
      endedAt: null,
    };

    // Create player state documents
    const player1State: PlayerGameState = {
      odIdplayerId: player1Id,
      odIduserId: player1Id, // Firebase Auth UID
      animalHand: player1Animals,
      equipmentHand: player1EquipHand,
      equipmentDeck: player1EquipDeck,
      equipmentDiscard: [],
      availableSleeves: [...sleeveIds],
      usedSleeves: [],
      persistentModifiers: [],
      initiativeModifier: 0,
      currentCommit: null,
      hasCommitted: false,
    };

    const player2State: PlayerGameState = {
      odIdplayerId: player2Id,
      odIduserId: player2Id, // Firebase Auth UID
      animalHand: player2Animals,
      equipmentHand: player2EquipHand,
      equipmentDeck: player2EquipDeck,
      equipmentDiscard: [],
      availableSleeves: [...sleeveIds],
      usedSleeves: [],
      persistentModifiers: [],
      initiativeModifier: 0,
      currentCommit: null,
      hasCommitted: false,
    };

    // Create game and player states, delete challenge in a transaction
    await db.runTransaction(async (transaction) => {
      // Re-check challenge status in transaction
      const freshChallenge = await transaction.get(challengeRef);
      if (!freshChallenge.exists || (freshChallenge.data() as Challenge).status !== "waiting") {
        throw new HttpsError("failed-precondition", "Challenge is no longer available");
      }

      // Create game document
      transaction.set(gameRef, gameData);

      // Create player state subcollections
      const player1StateRef = gameRef.collection("playerState").doc(player1Id);
      const player2StateRef = gameRef.collection("playerState").doc(player2Id);
      transaction.set(player1StateRef, player1State);
      transaction.set(player2StateRef, player2State);

      // Delete the challenge
      transaction.delete(challengeRef);
    });

    return {
      gameId: gameRef.id,
    };
  }
);
