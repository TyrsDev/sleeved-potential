import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Firestore, DocumentReference } from "firebase-admin/firestore";
import type {
  CommitCardInput,
  CommitCardOutput,
  Game,
  PlayerGameState,
  CommittedCard,
  RoundResult,
  TriggeredEffect,
  PersistentModifier,
  CardDefinition,
} from "@sleeved-potential/shared";
import { resolveStats, findCardOfType, dealCards, shuffleArray, resolveCombat } from "./utils/gameHelpers.js";

/**
 * Commit a composed card for the current round
 *
 * Validates:
 * - User is a player in the game
 * - Game is active
 * - User hasn't already committed this round
 * - Sleeve is in player's availableSleeves
 * - Animal is in player's animalHand
 * - All equipment are in player's equipmentHand
 *
 * When both players have committed, triggers round resolution
 */
export const commitCard = onCall<CommitCardInput, Promise<CommitCardOutput>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to commit a card");
    }

    const db = getFirestore();
    const { gameId, sleeveId, animalId, equipmentIds } = request.data;
    const userId = request.auth.uid;

    // Validate input
    if (!gameId) throw new HttpsError("invalid-argument", "gameId is required");
    if (!sleeveId) throw new HttpsError("invalid-argument", "sleeveId is required");
    if (!animalId) throw new HttpsError("invalid-argument", "animalId is required");
    if (!equipmentIds) throw new HttpsError("invalid-argument", "equipmentIds is required");

    const gameRef = db.collection("games").doc(gameId);
    const playerStateRef = gameRef.collection("playerState").doc(userId);

    // Fetch game and player state
    const [gameDoc, playerStateDoc] = await Promise.all([
      gameRef.get(),
      playerStateRef.get(),
    ]);

    if (!gameDoc.exists) {
      throw new HttpsError("not-found", "Game not found");
    }

    const game = gameDoc.data() as Game;

    // Verify user is a player
    if (!game.players.includes(userId)) {
      throw new HttpsError("permission-denied", "You are not a player in this game");
    }

    if (game.status !== "active") {
      throw new HttpsError("failed-precondition", "Game is not active");
    }

    if (!playerStateDoc.exists) {
      throw new HttpsError("not-found", "Player state not found");
    }

    const playerState = playerStateDoc.data() as PlayerGameState;

    if (playerState.hasCommitted) {
      throw new HttpsError("failed-precondition", "You have already committed this round");
    }

    // Validate card selections
    if (!playerState.availableSleeves.includes(sleeveId)) {
      throw new HttpsError("invalid-argument", "Selected sleeve is not available");
    }

    if (!playerState.animalHand.includes(animalId)) {
      throw new HttpsError("invalid-argument", "Selected animal is not in your hand");
    }

    for (const equipId of equipmentIds) {
      if (!playerState.equipmentHand.includes(equipId)) {
        throw new HttpsError("invalid-argument", `Equipment ${equipId} is not in your hand`);
      }
    }

    // Get card definitions from snapshot
    const sleeve = findCardOfType(sleeveId, game.cardSnapshot.sleeves, "sleeve");
    const animal = findCardOfType(animalId, game.cardSnapshot.animals, "animal");
    const equipment = equipmentIds
      .map((id) => findCardOfType(id, game.cardSnapshot.equipment, "equipment"))
      .filter((c): c is CardDefinition => c !== undefined);

    if (!sleeve) {
      throw new HttpsError("internal", "Sleeve not found in game snapshot");
    }
    if (!animal) {
      throw new HttpsError("internal", "Animal not found in game snapshot");
    }
    if (equipment.length !== equipmentIds.length) {
      throw new HttpsError("internal", "Some equipment not found in game snapshot");
    }

    // Resolve final stats (including any initiative modifier from previous round's effects)
    const finalStats = resolveStats(
      sleeve,
      animal,
      equipment,
      playerState.persistentModifiers,
      playerState.initiativeModifier ?? 0
    );

    const commit: CommittedCard = {
      sleeveId,
      animalId,
      equipmentIds,
      finalStats,
    };

    // Update player state with commit
    await playerStateRef.update({
      currentCommit: commit,
      hasCommitted: true,
    });

    // Check if opponent has also committed
    const opponentId = game.players.find((p) => p !== userId)!;
    const opponentStateDoc = await gameRef.collection("playerState").doc(opponentId).get();
    const opponentState = opponentStateDoc.data() as PlayerGameState;

    const bothCommitted = opponentState.hasCommitted;

    if (bothCommitted) {
      // Trigger round resolution
      await resolveRound(db, gameRef, game, userId, opponentId, commit, opponentState.currentCommit!);
    }

    return {
      success: true,
      commit,
      bothCommitted,
    };
  }
);

/**
 * Player cleanup state after round resolution
 * Includes all fields that need to be updated
 * Index signature required for Firestore UpdateData compatibility
 */
interface PlayerCleanup {
  [key: string]: string[] | PersistentModifier[] | number | null | boolean;
  availableSleeves: string[];
  usedSleeves: string[];
  animalHand: string[];
  equipmentHand: string[];
  equipmentDeck: string[];
  equipmentDiscard: string[];
  persistentModifiers: PersistentModifier[];
  initiativeModifier: number;
  currentCommit: null;
  hasCommitted: false;
}

/**
 * Resolve a round after both players have committed
 */
async function resolveRound(
  db: Firestore,
  gameRef: DocumentReference,
  game: Game,
  player1Id: string,
  player2Id: string,
  player1Commit: CommittedCard,
  player2Commit: CommittedCard
): Promise<void> {
  const now = new Date().toISOString();
  const rules = game.rulesSnapshot;

  // Use shared combat resolution for consistent logic between frontend simulator and backend
  const combatResult = resolveCombat({
    player1: {
      playerId: player1Id,
      stats: player1Commit.finalStats,
    },
    player2: {
      playerId: player2Id,
      stats: player2Commit.finalStats,
    },
    rules,
  });

  // Collect triggered effects from combat result
  const effectsTriggered: TriggeredEffect[] = [];
  if (combatResult.player1.effectTriggered) {
    effectsTriggered.push(combatResult.player1.effectTriggered);
  }
  if (combatResult.player2.effectTriggered) {
    effectsTriggered.push(combatResult.player2.effectTriggered);
  }

  // Create round result from combat outcomes
  const roundResult: RoundResult = {
    roundNumber: game.currentRound,
    commits: {
      [player1Id]: player1Commit,
      [player2Id]: player2Commit,
    },
    results: {
      [player1Id]: combatResult.player1.outcome,
      [player2Id]: combatResult.player2.outcome,
    },
    effectsTriggered,
  };

  // Update scores using points from combat result
  const newScores = {
    [player1Id]: game.scores[player1Id] + combatResult.player1.outcome.pointsEarned,
    [player2Id]: game.scores[player2Id] + combatResult.player2.outcome.pointsEarned,
  };

  // Check win condition
  let winner: string | null = null;
  let isDraw = false;
  let status = game.status;
  let endedAt: string | null = null;
  let endReason: "points" | null = null;

  const p1Total = newScores[player1Id];
  const p2Total = newScores[player2Id];

  if (p1Total >= rules.pointsToWin || p2Total >= rules.pointsToWin) {
    if (p1Total === p2Total) {
      isDraw = true;
    } else {
      winner = p1Total > p2Total ? player1Id : player2Id;
    }
    status = "finished";
    endedAt = now;
    endReason = "points";
  }

  // Prepare player state updates
  const player1StateRef = gameRef.collection("playerState").doc(player1Id);
  const player2StateRef = gameRef.collection("playerState").doc(player2Id);

  // Get current player states
  const [p1StateDoc, p2StateDoc] = await Promise.all([
    player1StateRef.get(),
    player2StateRef.get(),
  ]);

  const p1State = p1StateDoc.data() as PlayerGameState;
  const p2State = p2StateDoc.data() as PlayerGameState;

  // Process cleanup for each player (creates base cleanup state)
  const processPlayerCleanup = (
    state: PlayerGameState,
    commit: CommittedCard,
    effects: TriggeredEffect[],
    playerId: string
  ): PlayerCleanup => {
    // Move sleeve to used
    const newAvailableSleeves = state.availableSleeves.filter((s) => s !== commit.sleeveId);
    const newUsedSleeves = [...state.usedSleeves, commit.sleeveId];

    // If all sleeves used, reset
    const finalAvailableSleeves = newAvailableSleeves.length === 0 ? newUsedSleeves : newAvailableSleeves;
    const finalUsedSleeves = newAvailableSleeves.length === 0 ? [] : newUsedSleeves;

    return {
      availableSleeves: finalAvailableSleeves,
      usedSleeves: finalUsedSleeves,
      animalHand: state.animalHand.filter((a) => a !== commit.animalId),
      equipmentHand: state.equipmentHand.filter((e) => !commit.equipmentIds.includes(e)),
      equipmentDeck: state.equipmentDeck,
      equipmentDiscard: [...state.equipmentDiscard, ...commit.equipmentIds],
      persistentModifiers: processEffectsForModifiers(
        state.persistentModifiers,
        effects,
        playerId,
        game.currentRound
      ),
      initiativeModifier: processEffectsForInitiative(effects, playerId),
      currentCommit: null,
      hasCommitted: false,
    };
  };

  const p1Cleanup = processPlayerCleanup(p1State, player1Commit, effectsTriggered, player1Id);
  const p2Cleanup = processPlayerCleanup(p2State, player2Commit, effectsTriggered, player2Id);

  // Execute draw_cards effects
  processEffectsForDrawCards(p1Cleanup, effectsTriggered, player1Id);
  processEffectsForDrawCards(p2Cleanup, effectsTriggered, player2Id);

  // Move used animals to shared discard
  const newAnimalDiscard = [
    ...game.animalDiscard,
    player1Commit.animalId,
    player2Commit.animalId,
  ];

  // Draw new animals for players if needed
  let animalDeck = [...game.animalDeck];

  // Draw for player 1 if needed
  if (p1Cleanup.animalHand.length < rules.startingAnimalHand && animalDeck.length > 0) {
    const needed = rules.startingAnimalHand - p1Cleanup.animalHand.length;
    const { dealt, remaining } = dealCards(animalDeck, needed);
    p1Cleanup.animalHand = [...p1Cleanup.animalHand, ...dealt];
    animalDeck = remaining;
  }

  // Draw for player 2 if needed
  if (p2Cleanup.animalHand.length < rules.startingAnimalHand && animalDeck.length > 0) {
    const needed = rules.startingAnimalHand - p2Cleanup.animalHand.length;
    const { dealt, remaining } = dealCards(animalDeck, needed);
    p2Cleanup.animalHand = [...p2Cleanup.animalHand, ...dealt];
    animalDeck = remaining;
  }

  // Draw equipment for next round (if game continues)
  if (status === "active") {
    // Player 1 equipment draw
    if (p1Cleanup.equipmentDeck.length > 0) {
      const { dealt, remaining } = dealCards(p1Cleanup.equipmentDeck, rules.equipmentDrawPerRound);
      p1Cleanup.equipmentHand = [...p1Cleanup.equipmentHand, ...dealt];
      p1Cleanup.equipmentDeck = remaining;
    } else if (p1Cleanup.equipmentDiscard.length > 0) {
      // Shuffle discard into deck
      const shuffled = shuffleArray(p1Cleanup.equipmentDiscard);
      const { dealt, remaining } = dealCards(shuffled, rules.equipmentDrawPerRound);
      p1Cleanup.equipmentHand = [...p1Cleanup.equipmentHand, ...dealt];
      p1Cleanup.equipmentDeck = remaining;
      p1Cleanup.equipmentDiscard = [];
    }

    // Player 2 equipment draw
    if (p2Cleanup.equipmentDeck.length > 0) {
      const { dealt, remaining } = dealCards(p2Cleanup.equipmentDeck, rules.equipmentDrawPerRound);
      p2Cleanup.equipmentHand = [...p2Cleanup.equipmentHand, ...dealt];
      p2Cleanup.equipmentDeck = remaining;
    } else if (p2Cleanup.equipmentDiscard.length > 0) {
      // Shuffle discard into deck
      const shuffled = shuffleArray(p2Cleanup.equipmentDiscard);
      const { dealt, remaining } = dealCards(shuffled, rules.equipmentDrawPerRound);
      p2Cleanup.equipmentHand = [...p2Cleanup.equipmentHand, ...dealt];
      p2Cleanup.equipmentDeck = remaining;
      p2Cleanup.equipmentDiscard = [];
    }
  }

  // Execute all updates in a batch
  const batch = db.batch();

  // Update game document
  batch.update(gameRef, {
    currentRound: game.currentRound + 1,
    scores: newScores,
    winner,
    isDraw,
    status,
    endedAt,
    endReason,
    animalDeck,
    animalDiscard: newAnimalDiscard,
    rounds: FieldValue.arrayUnion(roundResult),
  });

  // Update player states
  batch.update(player1StateRef, p1Cleanup);
  batch.update(player2StateRef, p2Cleanup);

  // Update user stats if game ended
  if (status === "finished") {
    const user1Ref = db.collection("users").doc(player1Id);
    const user2Ref = db.collection("users").doc(player2Id);

    if (isDraw) {
      batch.update(user1Ref, {
        "stats.gamesPlayed": FieldValue.increment(1),
        "stats.draws": FieldValue.increment(1),
      });
      batch.update(user2Ref, {
        "stats.gamesPlayed": FieldValue.increment(1),
        "stats.draws": FieldValue.increment(1),
      });
    } else {
      const winnerId = winner!;
      const loserId = winnerId === player1Id ? player2Id : player1Id;

      batch.update(db.collection("users").doc(winnerId), {
        "stats.gamesPlayed": FieldValue.increment(1),
        "stats.wins": FieldValue.increment(1),
      });
      batch.update(db.collection("users").doc(loserId), {
        "stats.gamesPlayed": FieldValue.increment(1),
        "stats.losses": FieldValue.increment(1),
      });
    }
  }

  await batch.commit();
}

/**
 * Process triggered effects and return updated persistent modifiers
 */
function processEffectsForModifiers(
  currentModifiers: PersistentModifier[],
  effects: TriggeredEffect[],
  playerId: string,
  roundNumber: number
): PersistentModifier[] {
  const newModifiers = [...currentModifiers];

  for (const triggered of effects) {
    if (triggered.odIdplayerId !== playerId) continue;

    const action = triggered.effect.effect;
    if (action.type === "add_persistent_modifier") {
      newModifiers.push({
        stat: action.stat,
        amount: action.amount,
        sourceRound: roundNumber,
      });
    }
  }

  return newModifiers;
}

/**
 * Process triggered effects and return initiative modifier for next round
 * Initiative modifiers are temporary (only apply to next round)
 */
function processEffectsForInitiative(effects: TriggeredEffect[], playerId: string): number {
  let initiativeModifier = 0;

  for (const triggered of effects) {
    if (triggered.odIdplayerId !== playerId) continue;

    const action = triggered.effect.effect;
    if (action.type === "modify_initiative") {
      initiativeModifier += action.amount;
    }
  }

  return initiativeModifier;
}

/**
 * Process triggered effects for draw_cards action
 * Modifies the cleanup object in place to add drawn cards
 */
function processEffectsForDrawCards(
  cleanup: PlayerCleanup,
  effects: TriggeredEffect[],
  playerId: string
): void {
  for (const triggered of effects) {
    if (triggered.odIdplayerId !== playerId) continue;

    const action = triggered.effect.effect;
    if (action.type === "draw_cards") {
      // Draw from equipment deck
      if (cleanup.equipmentDeck.length > 0) {
        const { dealt, remaining } = dealCards(cleanup.equipmentDeck, action.count);
        cleanup.equipmentHand = [...cleanup.equipmentHand, ...dealt];
        cleanup.equipmentDeck = remaining;
      } else if (cleanup.equipmentDiscard.length > 0) {
        // Shuffle discard into deck first, then draw
        const shuffled = shuffleArray(cleanup.equipmentDiscard);
        const { dealt, remaining } = dealCards(shuffled, action.count);
        cleanup.equipmentHand = [...cleanup.equipmentHand, ...dealt];
        cleanup.equipmentDeck = remaining;
        cleanup.equipmentDiscard = [];
      }
      // If both deck and discard are empty, no cards to draw (effect fizzles)
    }
  }
}
