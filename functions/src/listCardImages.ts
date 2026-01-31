import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type {
  ListCardImagesInput,
  ListCardImagesOutput,
  CardImageInfo,
} from "@sleeved-potential/shared";

export const listCardImages = onCall<ListCardImagesInput, Promise<ListCardImagesOutput>>(
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

    // Get all images from the cards/ folder in Storage
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({ prefix: "cards/" });

    // Get all cards to map images to cards
    const cardsSnapshot = await db.collection("cards").get();
    const cardsByImageUrl = new Map<string, { id: string; name: string }>();

    cardsSnapshot.docs.forEach((doc) => {
      const card = doc.data();
      if (card.imageUrl) {
        cardsByImageUrl.set(card.imageUrl, { id: doc.id, name: card.name });
      }
    });

    // Build image info list
    const images: CardImageInfo[] = [];

    for (const file of files) {
      // Skip directories (they end with /)
      if (file.name.endsWith("/")) continue;

      const [metadata] = await file.getMetadata();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

      const cardInfo = cardsByImageUrl.get(publicUrl);

      images.push({
        path: file.name,
        url: publicUrl,
        name: file.name.split("/").pop() || file.name,
        cardId: cardInfo?.id || null,
        cardName: cardInfo?.name || null,
        size: parseInt(metadata.size as string, 10) || 0,
        updatedAt: metadata.updated || new Date().toISOString(),
      });
    }

    // Sort by updatedAt descending (newest first)
    images.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return { images };
  }
);
