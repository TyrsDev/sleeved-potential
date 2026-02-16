import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { Game, GameSnapshot, SurrenderGameInput, SurrenderGameOutput, User } from "@sleeved-potential/shared";
import { calculateEloChange, DEFAULT_ELO, isSnapshotPlayer } from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

/**
 * Surrender an active game
 *
 * Handles both sync and async games:
 * - Sync: Both players' ELO updated
 * - Async: Live player's ELO updated, snapshot ELO updated (best-effort)
 */
export const surrenderGame = onCall<SurrenderGameInput, Promise<SurrenderGameOutput>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to surrender a game");
    }

    const db = getFirestore();
    const { gameId } = request.data;
    const userId = request.auth.uid;

    if (!gameId) {
      throw new HttpsError("invalid-argument", "gameId is required");
    }

    const gameRef = db.collection("games").doc(gameId);
    const gameDoc = await gameRef.get();

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

    const winnerId = game.players.find((p) => p !== userId)!;
    const loserId = userId;
    const now = new Date().toISOString();
    const isAsync = game.isAsync ?? false;
    const ranked = game.ranked ?? true;

    const batch = db.batch();

    const gameUpdate: Record<string, unknown> = {
      status: "finished",
      winner: winnerId,
      isDraw: false,
      endedAt: now,
      endReason: "surrender",
    };

    if (ranked) {
      if (isAsync && isSnapshotPlayer(winnerId)) {
        // Async surrender: live player loses, snapshot wins
        const loserRef = db.collection("users").doc(loserId);
        const loserDoc = await loserRef.get();
        if (!loserDoc.exists) {
          // User deleted — skip ELO updates, just end the game
          batch.update(gameRef, gameUpdate);
          await batch.commit();
          return { success: true, _meta: getResponseMeta() };
        }
        const loserData = loserDoc.data() as User;
        const loserElo = loserData.stats.elo ?? DEFAULT_ELO;

        // Get snapshot ELO
        let snapshotElo = DEFAULT_ELO;
        if (game.snapshotId) {
          try {
            const snapshotDoc = await db.collection("snapshots").doc(game.snapshotId).get();
            if (snapshotDoc.exists) {
              snapshotElo = (snapshotDoc.data() as GameSnapshot).elo;
            }
          } catch { /* use default */ }
        }

        const loserEloResult = calculateEloChange(loserElo, snapshotElo, loserData.stats.gamesPlayed, "loss");

        gameUpdate.eloChanges = {
          [loserId]: { previousElo: loserElo, newElo: loserEloResult.newElo, change: loserEloResult.eloChange },
        };

        batch.update(loserRef, {
          "stats.gamesPlayed": FieldValue.increment(1),
          "stats.losses": FieldValue.increment(1),
          "stats.elo": loserEloResult.newElo,
        });

        // Update snapshot ELO (best-effort)
        if (game.snapshotId) {
          try {
            const snapshotEloResult = calculateEloChange(snapshotElo, loserElo, 30, "win");
            batch.update(db.collection("snapshots").doc(game.snapshotId), {
              elo: snapshotEloResult.newElo,
              gamesPlayed: FieldValue.increment(1),
              wins: FieldValue.increment(1),
            });
          } catch { /* best-effort */ }
        }
      } else {
        // Sync surrender: both players are live
        const winnerRef = db.collection("users").doc(winnerId);
        const loserRef = db.collection("users").doc(loserId);
        const [winnerDoc, loserDoc] = await Promise.all([winnerRef.get(), loserRef.get()]);
        if (!winnerDoc.exists || !loserDoc.exists) {
          // User(s) deleted — skip ELO updates, just end the game
          batch.update(gameRef, gameUpdate);
          await batch.commit();
          return { success: true, _meta: getResponseMeta() };
        }
        const winnerData = winnerDoc.data() as User;
        const loserData = loserDoc.data() as User;

        const winnerElo = winnerData.stats.elo ?? DEFAULT_ELO;
        const loserElo = loserData.stats.elo ?? DEFAULT_ELO;

        const winnerEloResult = calculateEloChange(winnerElo, loserElo, winnerData.stats.gamesPlayed, "win");
        const loserEloResult = calculateEloChange(loserElo, winnerElo, loserData.stats.gamesPlayed, "loss");

        gameUpdate.eloChanges = {
          [winnerId]: { previousElo: winnerElo, newElo: winnerEloResult.newElo, change: winnerEloResult.eloChange },
          [loserId]: { previousElo: loserElo, newElo: loserEloResult.newElo, change: loserEloResult.eloChange },
        };

        batch.update(winnerRef, {
          "stats.gamesPlayed": FieldValue.increment(1),
          "stats.wins": FieldValue.increment(1),
          "stats.elo": winnerEloResult.newElo,
        });

        batch.update(loserRef, {
          "stats.gamesPlayed": FieldValue.increment(1),
          "stats.losses": FieldValue.increment(1),
          "stats.elo": loserEloResult.newElo,
        });
      }
    }

    batch.update(gameRef, gameUpdate);
    await batch.commit();

    return {
      success: true,
      _meta: getResponseMeta(),
    };
  }
);
