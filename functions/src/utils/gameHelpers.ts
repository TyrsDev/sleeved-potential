/**
 * Game Helper Utilities
 *
 * Re-exports shared combat functions and adds any functions-specific utilities
 */

import { HttpsError } from "firebase-functions/v2/https";
import type { Firestore, DocumentReference, Transaction } from "firebase-admin/firestore";
import {
  DEFAULT_GAME_RULES,
  shuffleArray,
  dealCards,
  resolveStats,
  findCardOfType,
  type Challenge,
  type Game,
  type GameRules,
  type CardDefinition,
  type CardSnapshot,
  type PlayerGameState,
  type GameSnapshot,
  type SnapshotCommit,
  type CommittedCard,
  type PersistentModifier,
  makeSnapshotPlayerId,
} from "@sleeved-potential/shared";

// Re-export all shared combat functions
export {
  mergeStats,
  resolveStats,
  resolveCombat,
  shouldEffectTrigger,
  shuffleArray,
  dealCards,
  findCard,
  findCardOfType,
  formatEffectAction,
  formatTriggerName,
  type CombatInput,
  type CombatResult,
} from "@sleeved-potential/shared";

/**
 * Fetch rules and card snapshot for creating a new game
 */
export async function fetchRulesAndCards(db: Firestore): Promise<{ rules: GameRules; cardSnapshot: CardSnapshot }> {
  const now = new Date().toISOString();

  const rulesDoc = await db.doc("rules/current").get();
  const rules: GameRules = rulesDoc.exists
    ? (rulesDoc.data() as GameRules)
    : {
        id: "current",
        ...DEFAULT_GAME_RULES,
        updatedAt: now,
        updatedBy: "system",
      };

  const cardsSnapshotQuery = await db.collection("cards").get();
  const cardSnapshot: CardSnapshot = {
    sleeves: [],
    animals: [],
    equipment: [],
  };

  cardsSnapshotQuery.docs.forEach((doc) => {
    const card = doc.data() as CardDefinition;
    if (card.active === false) return;
    if (card.type === "sleeve") cardSnapshot.sleeves.push(card);
    else if (card.type === "animal") cardSnapshot.animals.push(card);
    else if (card.type === "equipment") cardSnapshot.equipment.push(card);
  });

  return { rules, cardSnapshot };
}

/**
 * Validate that enough cards exist for a game
 */
export function validateCardCounts(cardSnapshot: CardSnapshot, rules: GameRules): void {
  if (cardSnapshot.sleeves.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "Cannot start game: no sleeves defined. Admin must create sleeves first."
    );
  }
  // With independent decks, each player gets their own copy, so we only need startingAnimalHand total
  if (cardSnapshot.animals.length < rules.startingAnimalHand) {
    throw new HttpsError(
      "failed-precondition",
      `Cannot start game: need at least ${rules.startingAnimalHand} animals, found ${cardSnapshot.animals.length}`
    );
  }
}

/**
 * Create player state with independent animal deck
 */
function createPlayerState(
  playerId: string,
  animalIds: string[],
  equipmentIds: string[],
  sleeveIds: string[],
  rules: GameRules
): PlayerGameState {
  // Each player gets their own shuffled copy of ALL animals
  const shuffledAnimals = shuffleArray(animalIds);
  const { dealt: animalHand, remaining: animalDeck } = dealCards(shuffledAnimals, rules.startingAnimalHand);

  // Each player gets their own shuffled copy of ALL equipment
  const shuffledEquipment = shuffleArray(equipmentIds);
  const { dealt: equipmentHand, remaining: equipmentDeck } = dealCards(shuffledEquipment, rules.startingEquipmentHand);

  return {
    odIdplayerId: playerId,
    odIduserId: playerId,
    animalHand,
    equipmentHand,
    animalDeck,
    animalDiscard: [],
    equipmentDeck,
    equipmentDiscard: [],
    availableSleeves: [...sleeveIds],
    usedSleeves: [],
    persistentModifiers: [],
    initiativeModifier: 0,
    currentCommit: null,
    hasCommitted: false,
    roundSnapshots: [],
  };
}

/**
 * Create a game from a matchmaking challenge
 */
export async function createGameFromChallenge(
  db: Firestore,
  challengeRef: DocumentReference,
  _challenge: Challenge,
  player1Id: string,
  player2Id: string
): Promise<string> {
  const now = new Date().toISOString();

  const { rules: rulesSnapshot, cardSnapshot } = await fetchRulesAndCards(db);
  validateCardCounts(cardSnapshot, rulesSnapshot);

  const players: [string, string] = [player1Id, player2Id];
  const animalIds = cardSnapshot.animals.map((a) => a.id);
  const equipmentIds = cardSnapshot.equipment.map((e) => e.id);
  const sleeveIds = cardSnapshot.sleeves.map((s) => s.id);

  const player1State = createPlayerState(player1Id, animalIds, equipmentIds, sleeveIds, rulesSnapshot);
  const player2State = createPlayerState(player2Id, animalIds, equipmentIds, sleeveIds, rulesSnapshot);

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
    ranked: true,
    rulesSnapshot,
    cardSnapshot,
    rounds: [],
    maxRounds: rulesSnapshot.maxRounds ?? 5,
    createdAt: now,
    startedAt: now,
    endedAt: null,
    endReason: null,
  };

  await db.runTransaction(async (transaction: Transaction) => {
    const freshChallenge = await transaction.get(challengeRef);
    if (!freshChallenge.exists || (freshChallenge.data() as Challenge).status !== "waiting") {
      throw new HttpsError("failed-precondition", "Challenge is no longer available");
    }

    transaction.set(gameRef, gameData);

    const player1StateRef = gameRef.collection("playerState").doc(player1Id);
    const player2StateRef = gameRef.collection("playerState").doc(player2Id);
    transaction.set(player1StateRef, player1State);
    transaction.set(player2StateRef, player2State);

    transaction.update(challengeRef, {
      status: "accepted",
      gameId: gameRef.id,
    });
  });

  return gameRef.id;
}

/**
 * Find a matching snapshot for async matchmaking
 * Searches with widening ELO windows
 */
export async function findMatchingSnapshot(
  db: Firestore,
  playerId: string,
  playerElo: number
): Promise<GameSnapshot | null> {
  const windows = [100, 200, 400, 800, 1500];

  for (const window of windows) {
    const minElo = playerElo - window;
    const maxElo = playerElo + window;

    const snapshots = await db
      .collection("snapshots")
      .where("roundCount", "==", 5)
      .where("elo", ">=", minElo)
      .where("elo", "<=", maxElo)
      .limit(20)
      .get();

    // Filter out player's own snapshots
    const candidates = snapshots.docs.filter(
      (doc) => (doc.data() as GameSnapshot).sourcePlayerId !== playerId
    );

    if (candidates.length > 0) {
      // Pick a random candidate
      const randomIdx = Math.floor(Math.random() * candidates.length);
      return candidates[randomIdx].data() as GameSnapshot;
    }
  }

  return null;
}

/**
 * Create an async game against a snapshot
 */
export async function createAsyncGame(
  db: Firestore,
  livePlayerId: string,
  snapshot: GameSnapshot,
  rules: GameRules,
  cardSnapshot: CardSnapshot
): Promise<string> {
  const now = new Date().toISOString();
  const snapshotPlayerId = makeSnapshotPlayerId(snapshot.id);
  const players: [string, string] = [livePlayerId, snapshotPlayerId];

  const animalIds = cardSnapshot.animals.map((a) => a.id);
  const equipmentIds = cardSnapshot.equipment.map((e) => e.id);
  const sleeveIds = cardSnapshot.sleeves.map((s) => s.id);

  // Only live player gets a PlayerGameState
  const livePlayerState = createPlayerState(livePlayerId, animalIds, equipmentIds, sleeveIds, rules);

  const gameRef = db.collection("games").doc();

  const gameData: Game = {
    id: gameRef.id,
    players,
    status: "active",
    currentRound: 1,
    scores: {
      [livePlayerId]: 0,
      [snapshotPlayerId]: 0,
    },
    winner: null,
    isDraw: false,
    ranked: true,
    rulesSnapshot: rules,
    cardSnapshot,
    rounds: [],
    maxRounds: rules.maxRounds ?? 5,
    isAsync: true,
    snapshotId: snapshot.id,
    snapshotSourcePlayerId: snapshot.sourcePlayerId,
    snapshotSourcePlayerName: snapshot.sourcePlayerName,
    snapshotState: {
      persistentModifiers: [],
      initiativeModifier: 0,
    },
    createdAt: now,
    startedAt: now,
    endedAt: null,
    endReason: null,
  };

  const batch = db.batch();
  batch.set(gameRef, gameData);
  batch.set(gameRef.collection("playerState").doc(livePlayerId), livePlayerState);
  await batch.commit();

  return gameRef.id;
}

/**
 * Resolve a snapshot's commit for a given round using current card definitions
 */
export function resolveSnapshotCommit(
  snapshotCommit: SnapshotCommit,
  cardSnapshot: CardSnapshot,
  snapshotState: { persistentModifiers: PersistentModifier[]; initiativeModifier: number }
): CommittedCard {
  const allCards = [...cardSnapshot.sleeves, ...cardSnapshot.animals, ...cardSnapshot.equipment];
  const sleeve = findCardOfType(snapshotCommit.sleeveId, allCards, "sleeve") ?? null;
  const animal = findCardOfType(snapshotCommit.animalId, allCards, "animal") ?? null;
  const equipment = snapshotCommit.equipmentIds
    .map((id) => findCardOfType(id, allCards, "equipment"))
    .filter((c): c is CardDefinition => c !== undefined);

  const finalStats = resolveStats(
    sleeve,
    animal,
    equipment,
    snapshotState.persistentModifiers,
    snapshotState.initiativeModifier
  );

  return {
    sleeveId: snapshotCommit.sleeveId,
    animalId: snapshotCommit.animalId,
    equipmentIds: snapshotCommit.equipmentIds,
    finalStats,
  };
}
