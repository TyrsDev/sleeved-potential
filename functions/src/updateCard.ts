import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  UpdateCardInput,
  UpdateCardOutput,
  CardDefinition,
} from "@sleeved-potential/shared";

export const updateCard = onCall<UpdateCardInput, Promise<UpdateCardOutput>>(
  { region: "europe-west1" },
  async (request) => {
    const db = getFirestore();

    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }

    const userId = request.auth.uid;

    // Check if user has ADMIN role
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("permission-denied", "User not found");
    }

    const userData = userDoc.data();
    if (!userData?.roles?.includes("ADMIN")) {
      throw new HttpsError("permission-denied", "Admin role required");
    }

    const { cardId, updates } = request.data;

    if (!cardId) {
      throw new HttpsError("invalid-argument", "Card ID is required");
    }

    // Get existing card
    const cardRef = db.collection("cards").doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      throw new HttpsError("not-found", "Card not found");
    }

    const existingCard = cardDoc.data() as CardDefinition;

    // Build update object
    const updateData: Partial<CardDefinition> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    if (updates.imageUrl !== undefined) {
      updateData.imageUrl = updates.imageUrl;
    }

    if (updates.active !== undefined) {
      updateData.active = updates.active;
    }

    // Handle type-specific stats
    if (existingCard.type === "sleeve") {
      if (updates.backgroundStats !== undefined) {
        updateData.backgroundStats = updates.backgroundStats;
      }
      if (updates.foregroundStats !== undefined) {
        updateData.foregroundStats = updates.foregroundStats;
      }
    } else {
      // Animal or equipment
      if (updates.stats !== undefined) {
        updateData.stats = updates.stats;
      }
    }

    await cardRef.update(updateData);

    // Return updated card
    const updatedDoc = await cardRef.get();
    const updatedCard = updatedDoc.data() as CardDefinition;

    return { card: updatedCard };
  }
);
