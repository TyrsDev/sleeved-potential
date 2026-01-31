import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type { DeleteCardInput, DeleteCardOutput } from "@sleeved-potential/shared";

export const deleteCard = onCall<DeleteCardInput, Promise<DeleteCardOutput>>(
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

    const { cardId } = request.data;

    if (!cardId) {
      throw new HttpsError("invalid-argument", "Card ID is required");
    }

    // Check if card exists
    const cardRef = db.collection("cards").doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      throw new HttpsError("not-found", "Card not found");
    }

    // Delete the card
    await cardRef.delete();

    // Note: We could also delete the card image from Storage here,
    // but for now we'll keep images (soft delete approach)

    return { success: true };
  }
);
