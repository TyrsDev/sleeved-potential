import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type { MigrateEloInput, MigrateEloOutput, User } from "@sleeved-potential/shared";
import {
  isAdmin,
  isSnapshotPlayer,
  isInPlacement,
  calculatePlacementEloChange,
  calculateEloChange,
  DEFAULT_ELO,
  PLACEMENT_STARTING_ELO,
} from "@sleeved-potential/shared";
import type { Game } from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

interface SimState {
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * Replay all ranked finished games from scratch to recalculate ELO ratings.
 * Fixes ELO inflation from old 1500 baseline for pre-placement users.
 * (ADMIN only)
 */
export const migrateElo = onCall<MigrateEloInput, Promise<MigrateEloOutput>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }

    const db = getFirestore();
    const userId = request.auth.uid;

    // Verify admin role
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }
    const user = userDoc.data() as User;
    if (!isAdmin(user.roles)) {
      throw new HttpsError("permission-denied", "Admin role required");
    }

    // Step 1: Load all users and build initial simState
    const usersSnapshot = await db.collection("users").get();
    const simState: Record<string, SimState> = {};
    for (const doc of usersSnapshot.docs) {
      simState[doc.id] = {
        elo: PLACEMENT_STARTING_ELO,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      };
    }

    // Step 2: Load all finished ranked games
    const gamesSnapshot = await db
      .collection("games")
      .where("status", "==", "finished")
      .get();

    const rankedGames: Game[] = [];
    for (const doc of gamesSnapshot.docs) {
      const data = doc.data() as Game;
      // ranked defaults to true if undefined (per existing game logic)
      const isRanked = data.ranked !== false;
      if (isRanked) {
        rankedGames.push(data);
      }
    }

    // Step 3: Sort chronologically by startedAt
    rankedGames.sort((a, b) => {
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return aTime - bTime;
    });

    // Step 4: Replay each game
    for (const game of rankedGames) {
      const isAsync = game.isAsync ?? false;
      const livePlayerIds = game.players.filter((p) => !isSnapshotPlayer(p));

      if (isAsync) {
        // Async: only update the single live player
        const livePlayerId = livePlayerIds[0];
        if (!livePlayerId || !(livePlayerId in simState)) continue;

        const liveState = simState[livePlayerId];
        const liveResult = game.isDraw
          ? "draw"
          : game.winner === livePlayerId
            ? "win"
            : "loss";

        const liveEloResult = isInPlacement(liveState.gamesPlayed)
          ? calculatePlacementEloChange(liveState.elo, liveResult)
          : calculateEloChange(
              liveState.elo,
              DEFAULT_ELO, // snapshot ELO not recalculated; use default as stand-in
              liveState.gamesPlayed,
              liveResult
            );

        liveState.elo = liveEloResult.newElo;
        liveState.gamesPlayed += 1;
        if (liveResult === "win") liveState.wins += 1;
        else if (liveResult === "loss") liveState.losses += 1;
        else liveState.draws += 1;
      } else {
        // Sync: both players are live users
        if (livePlayerIds.length < 2) continue;
        const [p1Id, p2Id] = livePlayerIds;
        if (!(p1Id in simState) || !(p2Id in simState)) continue;

        const p1State = simState[p1Id];
        const p2State = simState[p2Id];

        if (game.isDraw) {
          const p1EloResult = isInPlacement(p1State.gamesPlayed)
            ? calculatePlacementEloChange(p1State.elo, "draw")
            : calculateEloChange(p1State.elo, p2State.elo, p1State.gamesPlayed, "draw");
          const p2EloResult = isInPlacement(p2State.gamesPlayed)
            ? calculatePlacementEloChange(p2State.elo, "draw")
            : calculateEloChange(p2State.elo, p1State.elo, p2State.gamesPlayed, "draw");

          p1State.elo = p1EloResult.newElo;
          p1State.gamesPlayed += 1;
          p1State.draws += 1;

          p2State.elo = p2EloResult.newElo;
          p2State.gamesPlayed += 1;
          p2State.draws += 1;
        } else {
          const winnerId = game.winner!;
          const loserId = winnerId === p1Id ? p2Id : p1Id;
          const winnerState = simState[winnerId];
          const loserState = simState[loserId];

          const winnerEloResult = isInPlacement(winnerState.gamesPlayed)
            ? calculatePlacementEloChange(winnerState.elo, "win")
            : calculateEloChange(
                winnerState.elo,
                loserState.elo,
                winnerState.gamesPlayed,
                "win"
              );
          const loserEloResult = isInPlacement(loserState.gamesPlayed)
            ? calculatePlacementEloChange(loserState.elo, "loss")
            : calculateEloChange(
                loserState.elo,
                winnerState.elo,
                loserState.gamesPlayed,
                "loss"
              );

          winnerState.elo = winnerEloResult.newElo;
          winnerState.gamesPlayed += 1;
          winnerState.wins += 1;

          loserState.elo = loserEloResult.newElo;
          loserState.gamesPlayed += 1;
          loserState.losses += 1;
        }
      }
    }

    // Step 5: Write updated stats to Firestore in batches
    const MAX_BATCH = 450;
    let batch = db.batch();
    let batchSize = 0;
    let usersUpdated = 0;

    for (const [uid, state] of Object.entries(simState)) {
      batch.update(db.collection("users").doc(uid), {
        "stats.elo": state.elo,
        "stats.gamesPlayed": state.gamesPlayed,
        "stats.wins": state.wins,
        "stats.losses": state.losses,
        "stats.draws": state.draws,
      });
      batchSize++;
      usersUpdated++;

      if (batchSize >= MAX_BATCH) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      await batch.commit();
    }

    return {
      usersUpdated,
      gamesProcessed: rankedGames.length,
      _meta: getResponseMeta(),
    };
  }
);
