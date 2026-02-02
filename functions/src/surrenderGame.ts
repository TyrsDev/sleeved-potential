import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { Game, SurrenderGameInput, SurrenderGameOutput, User } from "@sleeved-potential/shared";
import { calculateEloChange, DEFAULT_ELO } from "@sleeved-potential/shared";

/**
 * Surrender an active game
 *
 * - Verifies user is a player in the game
 * - Verifies game is active
 * - Sets game status to "finished"
 * - Sets winner to opponent
 * - Updates both players' stats (wins/losses)
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

    // Verify user is a player in the game
    if (!game.players.includes(userId)) {
      throw new HttpsError("permission-denied", "You are not a player in this game");
    }

    // Verify game is active
    if (game.status !== "active") {
      throw new HttpsError("failed-precondition", "Game is not active");
    }

    // Determine the winner (the opponent)
    const winnerId = game.players.find((p) => p !== userId)!;
    const loserId = userId;
    const now = new Date().toISOString();

    // Fetch user data for ELO calculation
    const winnerRef = db.collection("users").doc(winnerId);
    const loserRef = db.collection("users").doc(loserId);
    const [winnerDoc, loserDoc] = await Promise.all([winnerRef.get(), loserRef.get()]);
    const winnerData = winnerDoc.data() as User;
    const loserData = loserDoc.data() as User;

    // Get current ELO (default to 1500 for users without ELO)
    const winnerElo = winnerData.stats.elo ?? DEFAULT_ELO;
    const loserElo = loserData.stats.elo ?? DEFAULT_ELO;

    // Calculate ELO changes
    const winnerEloResult = calculateEloChange(winnerElo, loserElo, winnerData.stats.gamesPlayed, "win");
    const loserEloResult = calculateEloChange(loserElo, winnerElo, loserData.stats.gamesPlayed, "loss");

    // Update game and user stats in a batch
    const batch = db.batch();

    // Update game document with ELO changes
    batch.update(gameRef, {
      status: "finished",
      winner: winnerId,
      isDraw: false,
      endedAt: now,
      endReason: "surrender",
      eloChanges: {
        [winnerId]: { previousElo: winnerElo, newElo: winnerEloResult.newElo, change: winnerEloResult.eloChange },
        [loserId]: { previousElo: loserElo, newElo: loserEloResult.newElo, change: loserEloResult.eloChange },
      },
    });

    // Update winner stats
    batch.update(winnerRef, {
      "stats.gamesPlayed": FieldValue.increment(1),
      "stats.wins": FieldValue.increment(1),
      "stats.elo": winnerEloResult.newElo,
    });

    // Update loser (surrendering player) stats
    batch.update(loserRef, {
      "stats.gamesPlayed": FieldValue.increment(1),
      "stats.losses": FieldValue.increment(1),
      "stats.elo": loserEloResult.newElo,
    });

    await batch.commit();

    return {
      success: true,
    };
  }
);
