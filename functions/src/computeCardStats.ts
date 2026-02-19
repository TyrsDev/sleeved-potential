import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  ComputeCardStatsInput,
  ComputeCardStatsOutput,
  User,
  Game,
  PlayerGameState,
  CardDefinition,
  CardUsageStats,
  CardType,
} from "@sleeved-potential/shared";
import { isAdmin, isSnapshotPlayer } from "@sleeved-potential/shared";
import { getResponseMeta } from "./utils/apiMeta.js";

/**
 * Aggregate card usage statistics across all completed games (ADMIN only).
 *
 * For each completed game and each player:
 * - Increments timesUsed + outcome stats for committed cards
 * - Increments timesInHand / timesInHandNotUsed for real players (non-snapshot)
 *
 * Writes results to cardStats/{cardId} in Firestore.
 */
export const computeCardStats = onCall<ComputeCardStatsInput, Promise<ComputeCardStatsOutput>>(
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

    const now = new Date().toISOString();

    // Aggregate stats in memory: cardId -> mutable stats object
    const statsMap = new Map<string, MutableStats>();

    // Query all completed games
    const gamesSnapshot = await db.collection("games").where("status", "==", "finished").get();
    const gamesAnalyzed = gamesSnapshot.docs.length;

    for (const gameDoc of gamesSnapshot.docs) {
      const game = gameDoc.data() as Game;

      // Build a lookup map from cardId -> CardDefinition using the game's card snapshot
      const cardMap = new Map<string, CardDefinition>();
      for (const card of game.cardSnapshot.sleeves) cardMap.set(card.id, card);
      for (const card of game.cardSnapshot.animals) cardMap.set(card.id, card);
      for (const card of game.cardSnapshot.equipment) cardMap.set(card.id, card);

      // Process each player
      for (const playerId of game.players) {
        const isSnapshot = isSnapshotPlayer(playerId);

        // For real players, fetch their private state to get roundSnapshots
        let playerState: PlayerGameState | null = null;
        if (!isSnapshot) {
          const stateDoc = await gameDoc.ref.collection("playerState").doc(playerId).get();
          if (stateDoc.exists) {
            playerState = stateDoc.data() as PlayerGameState;
          }
        }

        // Process each round
        for (let i = 0; i < game.rounds.length; i++) {
          const round = game.rounds[i];
          const commit = round.commits[playerId];
          const outcome = round.results[playerId];

          if (!commit || !outcome) continue;

          // Cards committed this round
          const committedCardIds = [commit.sleeveId, commit.animalId, ...commit.equipmentIds];

          // Increment usage + outcome stats for all committed cards
          for (const cardId of committedCardIds) {
            const stats = getOrCreate(statsMap, cardId, cardMap);
            stats.timesUsed++;
            if (outcome.defeated) stats.timesDefeated++;
            if (outcome.survived) stats.timesSurvived++;
            if (!outcome.survived) stats.timesDestroyed++;
            if (!outcome.defeated) stats.timesDidntDefeat++;
          }

          // Hand presence tracking (real players only)
          if (!isSnapshot && playerState) {
            const roundSnapshot = playerState.roundSnapshots[i];
            if (roundSnapshot) {
              const handCardIds = [
                ...roundSnapshot.animalHand,
                ...roundSnapshot.equipmentHand,
                ...roundSnapshot.availableSleeves,
              ];

              const committedSet = new Set(committedCardIds);

              for (const cardId of handCardIds) {
                const stats = getOrCreate(statsMap, cardId, cardMap);
                stats.timesInHand++;
                if (!committedSet.has(cardId)) {
                  stats.timesInHandNotUsed++;
                }
              }
            }
          }
        }
      }
    }

    // Write aggregated stats to Firestore in batches
    const MAX_BATCH = 499;
    let batch = db.batch();
    let batchSize = 0;
    let cardsUpdated = 0;

    for (const [cardId, mutable] of statsMap) {
      const cardStatsDoc: CardUsageStats = {
        cardId,
        cardName: mutable.cardName,
        cardType: mutable.cardType,
        timesUsed: mutable.timesUsed,
        timesDefeated: mutable.timesDefeated,
        timesSurvived: mutable.timesSurvived,
        timesDestroyed: mutable.timesDestroyed,
        timesDidntDefeat: mutable.timesDidntDefeat,
        timesInHand: mutable.timesInHand,
        timesInHandNotUsed: mutable.timesInHandNotUsed,
        lastComputedAt: now,
        gamesAnalyzed,
      };

      batch.set(db.collection("cardStats").doc(cardId), cardStatsDoc);
      batchSize++;
      cardsUpdated++;

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
      cardsUpdated,
      gamesAnalyzed,
      computedAt: now,
      _meta: getResponseMeta(),
    };
  }
);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface MutableStats {
  cardName: string;
  cardType: CardType;
  timesUsed: number;
  timesDefeated: number;
  timesSurvived: number;
  timesDestroyed: number;
  timesDidntDefeat: number;
  timesInHand: number;
  timesInHandNotUsed: number;
}

function getOrCreate(
  map: Map<string, MutableStats>,
  cardId: string,
  cardMap: Map<string, CardDefinition>
): MutableStats {
  if (!map.has(cardId)) {
    const card = cardMap.get(cardId);
    map.set(cardId, {
      cardName: card?.name ?? "Unknown",
      cardType: card?.type ?? "animal",
      timesUsed: 0,
      timesDefeated: 0,
      timesSurvived: 0,
      timesDestroyed: 0,
      timesDidntDefeat: 0,
      timesInHand: 0,
      timesInHandNotUsed: 0,
    });
  }
  return map.get(cardId)!;
}
