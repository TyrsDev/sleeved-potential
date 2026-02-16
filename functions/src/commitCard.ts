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
  User,
  GameSnapshot,
  RoundSnapshot,
  SnapshotCommit,
} from "@sleeved-potential/shared";
// GameSnapshot used in resolveRound/processGameEnd, SnapshotCommit in createSnapshotFromGame, RoundSnapshot for replay logging
import {
  isSnapshotPlayer,
} from "@sleeved-potential/shared";
import { resolveStats, findCardOfType, dealCards, shuffleArray, resolveCombat, resolveSnapshotCommit } from "./utils/gameHelpers.js";
import { calculateEloChange, DEFAULT_ELO } from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

/**
 * Commit a composed card for the current round
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

    if (!gameId) throw new HttpsError("invalid-argument", "gameId is required");
    if (!sleeveId) throw new HttpsError("invalid-argument", "sleeveId is required");
    if (!animalId) throw new HttpsError("invalid-argument", "animalId is required");
    if (!equipmentIds) throw new HttpsError("invalid-argument", "equipmentIds is required");

    const gameRef = db.collection("games").doc(gameId);
    const playerStateRef = gameRef.collection("playerState").doc(userId);

    const [gameDoc, playerStateDoc] = await Promise.all([
      gameRef.get(),
      playerStateRef.get(),
    ]);

    if (!gameDoc.exists) {
      throw new HttpsError("not-found", "Game not found");
    }

    const game = gameDoc.data() as Game;

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

    // Log replay snapshot before committing
    const roundSnapshot: RoundSnapshot = {
      roundNumber: game.currentRound,
      animalHand: [...playerState.animalHand],
      equipmentHand: [...playerState.equipmentHand],
      availableSleeves: [...playerState.availableSleeves],
      animalsDrawn: [],
      equipmentDrawn: [],
    };

    // Update player state with commit and replay snapshot
    await playerStateRef.update({
      currentCommit: commit,
      hasCommitted: true,
      roundSnapshots: FieldValue.arrayUnion(roundSnapshot),
    });

    // Async games: resolve immediately after live player commits
    if (game.isAsync) {
      const snapshotDoc = await db.collection("snapshots").doc(game.snapshotId!).get();
      if (!snapshotDoc.exists) {
        throw new HttpsError("internal", "Snapshot not found for async game");
      }
      const snapshotData = snapshotDoc.data() as GameSnapshot;
      const snapshotCommit = snapshotData.commits[game.currentRound - 1];

      if (!snapshotCommit) {
        throw new HttpsError("internal", "Snapshot has no commit for this round");
      }

      const resolvedSnapshotCard = resolveSnapshotCommit(
        snapshotCommit,
        game.cardSnapshot,
        game.snapshotState ?? { persistentModifiers: [], initiativeModifier: 0 }
      );

      const snapshotPlayerId = game.players.find((p) => isSnapshotPlayer(p))!;

      await resolveRound(db, gameRef, game, userId, snapshotPlayerId, commit, resolvedSnapshotCard);

      return {
        success: true,
        commit,
        bothCommitted: true,
        _meta: getResponseMeta(),
      };
    }

    // Sync games: check if opponent has also committed
    const opponentId = game.players.find((p) => p !== userId)!;
    const opponentStateDoc = await gameRef.collection("playerState").doc(opponentId).get();
    const opponentState = opponentStateDoc.data() as PlayerGameState;

    const bothCommitted = opponentState.hasCommitted;

    if (bothCommitted) {
      await resolveRound(db, gameRef, game, userId, opponentId, commit, opponentState.currentCommit!);
    }

    return {
      success: true,
      commit,
      bothCommitted,
      _meta: getResponseMeta(),
    };
  }
);

/**
 * Player cleanup state after round resolution
 */
interface PlayerCleanup {
  [key: string]: string[] | PersistentModifier[] | number | null | boolean;
  availableSleeves: string[];
  usedSleeves: string[];
  animalHand: string[];
  animalDeck: string[];
  animalDiscard: string[];
  equipmentHand: string[];
  equipmentDeck: string[];
  equipmentDiscard: string[];
  persistentModifiers: PersistentModifier[];
  initiativeModifier: number;
  currentCommit: null;
  hasCommitted: false;
}

/**
 * Resolve a round after both players have committed (or async auto-commit)
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
  const isAsync = game.isAsync ?? false;

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

  const effectsTriggered: TriggeredEffect[] = [];
  if (combatResult.player1.effectTriggered) {
    effectsTriggered.push(combatResult.player1.effectTriggered);
  }
  if (combatResult.player2.effectTriggered) {
    effectsTriggered.push(combatResult.player2.effectTriggered);
  }

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

  const newScores = {
    [player1Id]: game.scores[player1Id] + combatResult.player1.outcome.pointsEarned,
    [player2Id]: game.scores[player2Id] + combatResult.player2.outcome.pointsEarned,
  };

  // Win condition: maxRounds reached
  let winner: string | null = null;
  let isDraw = false;
  let status = game.status;
  let endedAt: string | null = null;
  let endReason: Game["endReason"] = null;

  const p1Total = newScores[player1Id];
  const p2Total = newScores[player2Id];
  const maxRounds = game.maxRounds ?? 5;

  if (game.currentRound >= maxRounds) {
    if (p1Total === p2Total) {
      isDraw = true;
    } else {
      winner = p1Total > p2Total ? player1Id : player2Id;
    }
    status = "finished";
    endedAt = now;
    endReason = "rounds_complete";
  }

  // Get live player states (snapshot player has no PlayerGameState)
  const livePlayerIds = game.players.filter((p) => !isSnapshotPlayer(p));
  const playerStateDocs = await Promise.all(
    livePlayerIds.map((id) => gameRef.collection("playerState").doc(id).get())
  );
  const playerStates: Record<string, PlayerGameState> = {};
  for (const doc of playerStateDocs) {
    if (doc.exists) {
      playerStates[doc.id] = doc.data() as PlayerGameState;
    }
  }

  // Process cleanup for live players
  const cleanups: Record<string, PlayerCleanup> = {};

  for (const playerId of livePlayerIds) {
    const state = playerStates[playerId];
    if (!state) continue;
    const commit = playerId === player1Id ? player1Commit : player2Commit;

    cleanups[playerId] = processPlayerCleanup(
      state,
      commit,
      effectsTriggered,
      playerId,
      game.currentRound,
      rules,
      status === "active"
    );
  }

  // Update snapshot state for async games (effects from BOTH players affect snapshot)
  let updatedSnapshotState = game.snapshotState;
  if (isAsync && updatedSnapshotState) {
    const snapshotPlayerId = game.players.find((p) => isSnapshotPlayer(p))!;

    // Process effects that apply to the snapshot player
    const snapshotModifiers = processEffectsForModifiers(
      updatedSnapshotState.persistentModifiers,
      effectsTriggered,
      snapshotPlayerId,
      game.currentRound
    );
    const snapshotInitiative = processEffectsForInitiative(effectsTriggered, snapshotPlayerId);

    updatedSnapshotState = {
      persistentModifiers: snapshotModifiers,
      initiativeModifier: snapshotInitiative,
    };
  }

  // Execute all updates in a batch
  const batch = db.batch();

  const gameUpdateData: Record<string, unknown> = {
    currentRound: status === "active" ? game.currentRound + 1 : game.currentRound,
    scores: newScores,
    winner,
    isDraw,
    status,
    endedAt,
    endReason,
    rounds: FieldValue.arrayUnion(roundResult),
  };

  if (isAsync && updatedSnapshotState) {
    gameUpdateData.snapshotState = updatedSnapshotState;
  }

  // Update user stats and ELO if game ended
  if (status === "finished" && (game.ranked ?? true)) {
    await processGameEnd(db, batch, gameUpdateData, game, player1Id, player2Id, winner, isDraw);
  }

  // On async game end: create snapshot from live player's commits (if 5 rounds completed)
  if (status === "finished" && isAsync && endReason === "rounds_complete") {
    await createSnapshotFromGame(db, batch, game, roundResult, player1Id);
  }

  batch.update(gameRef, gameUpdateData);

  // Update live player states
  for (const playerId of livePlayerIds) {
    if (cleanups[playerId]) {
      batch.update(gameRef.collection("playerState").doc(playerId), cleanups[playerId]);
    }
  }

  await batch.commit();
}

/**
 * Process cleanup for a single player after round resolution
 */
function processPlayerCleanup(
  state: PlayerGameState,
  commit: CommittedCard,
  effects: TriggeredEffect[],
  playerId: string,
  roundNumber: number,
  rules: Game["rulesSnapshot"],
  gameActive: boolean
): PlayerCleanup {
  // Move sleeve to used
  const newAvailableSleeves = state.availableSleeves.filter((s) => s !== commit.sleeveId);
  const newUsedSleeves = [...state.usedSleeves, commit.sleeveId];

  // If all sleeves used, reset
  const finalAvailableSleeves = newAvailableSleeves.length === 0 ? newUsedSleeves : newAvailableSleeves;
  const finalUsedSleeves = newAvailableSleeves.length === 0 ? [] : newUsedSleeves;

  // Per-player animal management
  let animalHand = state.animalHand.filter((a) => a !== commit.animalId);
  let animalDiscard = [...(state.animalDiscard ?? []), commit.animalId];
  let animalDeck = [...(state.animalDeck ?? [])];

  // Draw animal if hand is below starting count
  if (animalHand.length < rules.startingAnimalHand) {
    if (animalDeck.length === 0 && animalDiscard.length > 0) {
      animalDeck = shuffleArray(animalDiscard);
      animalDiscard = [];
    }
    const needed = rules.startingAnimalHand - animalHand.length;
    const { dealt, remaining } = dealCards(animalDeck, needed);
    animalHand = [...animalHand, ...dealt];
    animalDeck = remaining;
  }

  const cleanup: PlayerCleanup = {
    availableSleeves: finalAvailableSleeves,
    usedSleeves: finalUsedSleeves,
    animalHand,
    animalDeck,
    animalDiscard,
    equipmentHand: state.equipmentHand.filter((e) => !commit.equipmentIds.includes(e)),
    equipmentDeck: state.equipmentDeck,
    equipmentDiscard: [...state.equipmentDiscard, ...commit.equipmentIds],
    persistentModifiers: processEffectsForModifiers(
      state.persistentModifiers,
      effects,
      playerId,
      roundNumber
    ),
    initiativeModifier: processEffectsForInitiative(effects, playerId),
    currentCommit: null,
    hasCommitted: false,
  };

  // Draw equipment for next round (if game continues)
  if (gameActive) {
    if (cleanup.equipmentDeck.length > 0) {
      const { dealt, remaining } = dealCards(cleanup.equipmentDeck, rules.equipmentDrawPerRound);
      cleanup.equipmentHand = [...cleanup.equipmentHand, ...dealt];
      cleanup.equipmentDeck = remaining;
    } else if (cleanup.equipmentDiscard.length > 0) {
      const shuffled = shuffleArray(cleanup.equipmentDiscard);
      const { dealt, remaining } = dealCards(shuffled, rules.equipmentDrawPerRound);
      cleanup.equipmentHand = [...cleanup.equipmentHand, ...dealt];
      cleanup.equipmentDeck = remaining;
      cleanup.equipmentDiscard = [];
    }
  }

  return cleanup;
}

/**
 * Process game end: ELO updates for both players
 */
async function processGameEnd(
  db: Firestore,
  batch: FirebaseFirestore.WriteBatch,
  gameUpdateData: Record<string, unknown>,
  game: Game,
  player1Id: string,
  player2Id: string,
  winner: string | null,
  isDraw: boolean
): Promise<void> {
  // For async games, handle snapshot ELO separately
  const isAsync = game.isAsync ?? false;
  const livePlayerIds = game.players.filter((p) => !isSnapshotPlayer(p));
  const snapshotPlayerId = game.players.find((p) => isSnapshotPlayer(p));

  // Get live user docs
  const userDocs = await Promise.all(
    livePlayerIds.map((id) => db.collection("users").doc(id).get())
  );
  const users: Record<string, User> = {};
  for (const doc of userDocs) {
    if (doc.exists) users[doc.id] = doc.data() as User;
  }

  if (isAsync && snapshotPlayerId && game.snapshotId) {
    // Async: live player vs snapshot
    const livePlayerId = livePlayerIds[0];
    const liveUser = users[livePlayerId];
    if (!liveUser) return;

    const liveElo = liveUser.stats.elo ?? DEFAULT_ELO;

    // Get snapshot ELO from the snapshot document
    let snapshotElo = DEFAULT_ELO;
    try {
      const snapshotDoc = await db.collection("snapshots").doc(game.snapshotId).get();
      if (snapshotDoc.exists) {
        snapshotElo = (snapshotDoc.data() as GameSnapshot).elo;
      }
    } catch { /* use default */ }

    const liveResult = isDraw ? "draw" : winner === livePlayerId ? "win" : "loss";
    const snapshotResult = isDraw ? "draw" : winner === snapshotPlayerId ? "win" : "loss";

    const liveEloResult = calculateEloChange(liveElo, snapshotElo, liveUser.stats.gamesPlayed, liveResult);

    gameUpdateData.eloChanges = {
      [livePlayerId]: { previousElo: liveElo, newElo: liveEloResult.newElo, change: liveEloResult.eloChange },
    };

    const liveStatUpdate: Record<string, unknown> = {
      "stats.gamesPlayed": FieldValue.increment(1),
      "stats.elo": liveEloResult.newElo,
    };
    if (liveResult === "win") liveStatUpdate["stats.wins"] = FieldValue.increment(1);
    else if (liveResult === "loss") liveStatUpdate["stats.losses"] = FieldValue.increment(1);
    else liveStatUpdate["stats.draws"] = FieldValue.increment(1);

    batch.update(db.collection("users").doc(livePlayerId), liveStatUpdate);

    // Update snapshot ELO (graceful failure OK)
    try {
      const snapshotEloResult = calculateEloChange(snapshotElo, liveElo, 30, snapshotResult);
      const snapshotUpdate: Record<string, unknown> = {
        elo: snapshotEloResult.newElo,
        gamesPlayed: FieldValue.increment(1),
      };
      if (snapshotResult === "win") snapshotUpdate.wins = FieldValue.increment(1);
      else if (snapshotResult === "loss") snapshotUpdate.losses = FieldValue.increment(1);
      else snapshotUpdate.draws = FieldValue.increment(1);

      batch.update(db.collection("snapshots").doc(game.snapshotId), snapshotUpdate);
    } catch { /* snapshot update is best-effort */ }
  } else {
    // Sync: both players are live users
    const user1 = users[player1Id];
    const user2 = users[player2Id];
    if (!user1 || !user2) return;

    const user1Elo = user1.stats.elo ?? DEFAULT_ELO;
    const user2Elo = user2.stats.elo ?? DEFAULT_ELO;

    if (isDraw) {
      const user1EloResult = calculateEloChange(user1Elo, user2Elo, user1.stats.gamesPlayed, "draw");
      const user2EloResult = calculateEloChange(user2Elo, user1Elo, user2.stats.gamesPlayed, "draw");

      gameUpdateData.eloChanges = {
        [player1Id]: { previousElo: user1Elo, newElo: user1EloResult.newElo, change: user1EloResult.eloChange },
        [player2Id]: { previousElo: user2Elo, newElo: user2EloResult.newElo, change: user2EloResult.eloChange },
      };

      batch.update(db.collection("users").doc(player1Id), {
        "stats.gamesPlayed": FieldValue.increment(1),
        "stats.draws": FieldValue.increment(1),
        "stats.elo": user1EloResult.newElo,
      });
      batch.update(db.collection("users").doc(player2Id), {
        "stats.gamesPlayed": FieldValue.increment(1),
        "stats.draws": FieldValue.increment(1),
        "stats.elo": user2EloResult.newElo,
      });
    } else {
      const winnerId = winner!;
      const loserId = winnerId === player1Id ? player2Id : player1Id;
      const winnerElo = winnerId === player1Id ? user1Elo : user2Elo;
      const loserElo = winnerId === player1Id ? user2Elo : user1Elo;
      const winnerGamesPlayed = winnerId === player1Id ? user1.stats.gamesPlayed : user2.stats.gamesPlayed;
      const loserGamesPlayed = winnerId === player1Id ? user2.stats.gamesPlayed : user1.stats.gamesPlayed;

      const winnerEloResult = calculateEloChange(winnerElo, loserElo, winnerGamesPlayed, "win");
      const loserEloResult = calculateEloChange(loserElo, winnerElo, loserGamesPlayed, "loss");

      gameUpdateData.eloChanges = {
        [winnerId]: { previousElo: winnerElo, newElo: winnerEloResult.newElo, change: winnerEloResult.eloChange },
        [loserId]: { previousElo: loserElo, newElo: loserEloResult.newElo, change: loserEloResult.eloChange },
      };

      batch.update(db.collection("users").doc(winnerId), {
        "stats.gamesPlayed": FieldValue.increment(1),
        "stats.wins": FieldValue.increment(1),
        "stats.elo": winnerEloResult.newElo,
      });
      batch.update(db.collection("users").doc(loserId), {
        "stats.gamesPlayed": FieldValue.increment(1),
        "stats.losses": FieldValue.increment(1),
        "stats.elo": loserEloResult.newElo,
      });
    }
  }
}

/**
 * Create a new snapshot from the live player's commits after an async game completes
 */
async function createSnapshotFromGame(
  db: Firestore,
  batch: FirebaseFirestore.WriteBatch,
  game: Game,
  _lastRound: RoundResult,
  livePlayerId: string
): Promise<void> {
  // Collect commits from all rounds (including this last one which is being added)
  const allRounds = [...game.rounds]; // This doesn't include the current round yet
  // The current round's commit is passed via _lastRound
  allRounds.push(_lastRound);

  const commits: SnapshotCommit[] = allRounds.map((round) => {
    const commit = round.commits[livePlayerId];
    if (!commit) return { sleeveId: "", animalId: "", equipmentIds: [] };
    return {
      sleeveId: commit.sleeveId,
      animalId: commit.animalId,
      equipmentIds: commit.equipmentIds,
    };
  });

  // Only create if we have the expected number of rounds
  if (commits.length < (game.maxRounds ?? 5)) return;

  // Get live player data for the snapshot
  try {
    const userDoc = await db.collection("users").doc(livePlayerId).get();
    if (!userDoc.exists) return;
    const user = userDoc.data() as User;

    const activeCardIds = [
      ...game.cardSnapshot.sleeves.map((c) => c.id),
      ...game.cardSnapshot.animals.map((c) => c.id),
      ...game.cardSnapshot.equipment.map((c) => c.id),
    ];

    const snapshotRef = db.collection("snapshots").doc();
    const snapshot: GameSnapshot = {
      id: snapshotRef.id,
      sourcePlayerId: livePlayerId,
      sourcePlayerName: user.displayName ?? user.username ?? "Unknown",
      elo: user.stats.elo ?? DEFAULT_ELO,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      roundCount: commits.length,
      commits,
      activeCardIds,
      isBot: false,
      createdAt: new Date().toISOString(),
    };

    batch.set(snapshotRef, snapshot);
  } catch {
    // Snapshot creation is best-effort
  }
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
