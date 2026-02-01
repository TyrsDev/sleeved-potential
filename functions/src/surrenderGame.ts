import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { Game, SurrenderGameInput, SurrenderGameOutput } from "@sleeved-potential/shared";

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

    // Update game and user stats in a batch
    const batch = db.batch();

    // Update game document
    batch.update(gameRef, {
      status: "finished",
      winner: winnerId,
      isDraw: false,
      endedAt: now,
      endReason: "surrender",
    });

    // Update winner stats
    batch.update(db.collection("users").doc(winnerId), {
      "stats.gamesPlayed": FieldValue.increment(1),
      "stats.wins": FieldValue.increment(1),
    });

    // Update loser (surrendering player) stats
    batch.update(db.collection("users").doc(loserId), {
      "stats.gamesPlayed": FieldValue.increment(1),
      "stats.losses": FieldValue.increment(1),
    });

    await batch.commit();

    return {
      success: true,
    };
  }
);
