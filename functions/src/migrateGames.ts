import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  MigrateGamesInput,
  MigrateGamesOutput,
  User,
} from "@sleeved-potential/shared";
import { isAdmin } from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

/**
 * Delete old format game documents (ADMIN only)
 *
 * Deletes all games that don't have the `maxRounds` field,
 * along with their playerState subcollections.
 */
export const migrateGames = onCall<MigrateGamesInput, Promise<MigrateGamesOutput>>(
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

    // Find all games without maxRounds field (old format)
    const gamesSnapshot = await db.collection("games").get();
    let deletedCount = 0;

    let batch = db.batch();
    let batchSize = 0;
    const MAX_BATCH = 450; // Leave room for subcollection deletes

    for (const gameDoc of gamesSnapshot.docs) {
      const data = gameDoc.data();
      if (data.maxRounds === undefined) {
        // Delete playerState subcollection first
        const playerStates = await gameDoc.ref.collection("playerState").get();
        for (const stateDoc of playerStates.docs) {
          batch.delete(stateDoc.ref);
          batchSize++;
        }

        batch.delete(gameDoc.ref);
        batchSize++;
        deletedCount++;

        // Commit batch if getting large and start a new one
        if (batchSize >= MAX_BATCH) {
          await batch.commit();
          batch = db.batch();
          batchSize = 0;
        }
      }
    }

    if (batchSize > 0) {
      await batch.commit();
    }

    return {
      deletedCount,
      _meta: getResponseMeta(),
    };
  }
);
