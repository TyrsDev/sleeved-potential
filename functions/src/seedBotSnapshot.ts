import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  SeedBotSnapshotInput,
  SeedBotSnapshotOutput,
  User,
  GameSnapshot,
} from "@sleeved-potential/shared";
import { isAdmin } from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

/**
 * Seed a bot snapshot for async matchmaking (ADMIN only)
 *
 * Creates a GameSnapshot with isBot: true that can be matched against
 * in async games. Card IDs in commits are validated against active cards.
 */
export const seedBotSnapshot = onCall<SeedBotSnapshotInput, Promise<SeedBotSnapshotOutput>>(
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

    const { botName, elo, commits } = request.data;

    if (!botName || typeof botName !== "string") {
      throw new HttpsError("invalid-argument", "botName is required");
    }
    if (typeof elo !== "number" || elo < 0) {
      throw new HttpsError("invalid-argument", "elo must be a positive number");
    }
    if (!Array.isArray(commits) || commits.length !== 5) {
      throw new HttpsError("invalid-argument", "commits must be an array of 5 SnapshotCommit objects");
    }

    // Validate each commit has required fields
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      if (!commit.sleeveId || !commit.animalId || !Array.isArray(commit.equipmentIds)) {
        throw new HttpsError(
          "invalid-argument",
          `Commit ${i + 1} must have sleeveId, animalId, and equipmentIds`
        );
      }
    }

    // Get all active card IDs for the snapshot
    const cardsSnapshot = await db.collection("cards").get();
    const activeCardIds: string[] = [];
    cardsSnapshot.docs.forEach((doc) => {
      const card = doc.data();
      if (card.active !== false) {
        activeCardIds.push(doc.id);
      }
    });

    const snapshotRef = db.collection("snapshots").doc();
    const snapshot: GameSnapshot = {
      id: snapshotRef.id,
      sourcePlayerId: "bot",
      sourcePlayerName: botName,
      elo,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      roundCount: 5,
      commits,
      activeCardIds,
      isBot: true,
      createdAt: new Date().toISOString(),
    };

    await snapshotRef.set(snapshot);

    return {
      snapshotId: snapshotRef.id,
      _meta: getResponseMeta(),
    };
  }
);
