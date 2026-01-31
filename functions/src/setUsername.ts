import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  User,
  UsernameDoc,
  SetUsernameInput,
  SetUsernameOutput,
} from "@sleeved-potential/shared";
import { isValidUsername } from "@sleeved-potential/shared";

/**
 * Set a unique username for an account user
 *
 * Requirements:
 * - Username must be 3-12 alphanumeric characters
 * - Username must be unique (checked via usernames collection)
 * - User must be signed in and have a user document
 * - Atomic operation: reserves username and updates user in transaction
 */
export const setUsername = onCall<SetUsernameInput, Promise<SetUsernameOutput>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }

    const { username } = request.data;

    // Validate username format
    if (!username || !isValidUsername(username)) {
      throw new HttpsError(
        "invalid-argument",
        "Username must be 3-12 alphanumeric characters"
      );
    }

    // Normalize username (lowercase for uniqueness check)
    const normalizedUsername = username.toLowerCase();

    const db = getFirestore();
    const userId = request.auth.uid;
    const now = new Date().toISOString();

    // Get user document to verify they exist
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User document not found");
    }

    const userData = userDoc.data() as User;

    // Check if user is a guest - they need to be upgraded first
    // (This is handled by linking their anonymous account to Google)
    // For now, allow setting username for any user

    // Check if this username is already taken
    const usernameRef = db.collection("usernames").doc(normalizedUsername);

    // Use a transaction to atomically check and reserve the username
    try {
      await db.runTransaction(async (transaction) => {
        const usernameDoc = await transaction.get(usernameRef);

        if (usernameDoc.exists) {
          const existingData = usernameDoc.data() as UsernameDoc;
          // Allow if user already owns this username
          if (existingData.odIduserId === userId) {
            return; // No change needed
          }
          throw new HttpsError("already-exists", "Username is already taken");
        }

        // Get the user's old username to potentially release it
        const oldUsername = userData.username;
        const oldUsernameRef = db.collection("usernames").doc(oldUsername.toLowerCase());

        // Delete old username reservation if it exists and was a proper username (not UUID)
        // UUID usernames start with lowercase and have dashes, proper usernames are alphanumeric
        if (isValidUsername(oldUsername)) {
          transaction.delete(oldUsernameRef);
        }

        // Reserve the new username
        const usernameData: UsernameDoc = {
          odIduserId: userId,
          createdAt: now,
        };
        transaction.set(usernameRef, usernameData);

        // Update user's username
        transaction.update(userRef, {
          username: normalizedUsername,
          isGuest: false, // Setting a username confirms they're not a guest
          updatedAt: now,
        });
      });

      return {
        success: true,
        username: normalizedUsername,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Failed to set username");
    }
  }
);
