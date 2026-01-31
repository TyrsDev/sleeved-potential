import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type {
  UploadCardImageInput,
  UploadCardImageOutput,
} from "@sleeved-potential/shared";

export const uploadCardImage = onCall<UploadCardImageInput, Promise<UploadCardImageOutput>>(
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

    const { cardId, imageData, contentType } = request.data;

    if (!cardId) {
      throw new HttpsError("invalid-argument", "Card ID is required");
    }

    if (!imageData) {
      throw new HttpsError("invalid-argument", "Image data is required");
    }

    // Validate content type
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(contentType)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid content type. Allowed: png, jpeg, webp"
      );
    }

    // Check if card exists
    const cardRef = db.collection("cards").doc(cardId);
    const cardDoc = await cardRef.get();

    if (!cardDoc.exists) {
      throw new HttpsError("not-found", "Card not found");
    }

    // Decode base64 image
    const imageBuffer = Buffer.from(imageData, "base64");

    // Validate image size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (imageBuffer.length > maxSize) {
      throw new HttpsError("invalid-argument", "Image too large (max 5MB)");
    }

    // Determine file extension
    const extensions: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    };
    const extension = extensions[contentType];
    const fileName = `card.${extension}`;

    // Upload to Firebase Storage
    const bucket = getStorage().bucket();
    const filePath = `cards/${cardId}/${fileName}`;
    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType,
        metadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Get the public URL
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Update the card document with the image URL
    await cardRef.update({
      imageUrl,
      updatedAt: new Date().toISOString(),
    });

    return { imageUrl };
  }
);
