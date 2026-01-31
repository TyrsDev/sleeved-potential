import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  CreateCardInput,
  CreateCardOutput,
  CardDefinition,
} from "@sleeved-potential/shared";

export const createCard = onCall<CreateCardInput, Promise<CreateCardOutput>>(
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

    const { card } = request.data;

    // Validate card data
    if (!card.type || !["sleeve", "animal", "equipment"].includes(card.type)) {
      throw new HttpsError("invalid-argument", "Invalid card type");
    }

    if (!card.name || card.name.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Card name is required");
    }

    // Create card document
    const now = new Date().toISOString();
    const cardRef = db.collection("cards").doc();

    const cardDefinition: CardDefinition = {
      id: cardRef.id,
      type: card.type,
      name: card.name.trim(),
      description: card.description || "",
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    };

    // Add type-specific stats
    if (card.type === "sleeve") {
      if (card.backgroundStats) {
        cardDefinition.backgroundStats = card.backgroundStats;
      }
      if (card.foregroundStats) {
        cardDefinition.foregroundStats = card.foregroundStats;
      }
    } else {
      // Animal or equipment
      if (card.stats) {
        cardDefinition.stats = card.stats;
      }
    }

    await cardRef.set(cardDefinition);

    return { card: cardDefinition };
  }
);
