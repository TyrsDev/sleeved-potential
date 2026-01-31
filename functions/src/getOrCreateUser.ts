import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import type {
  User,
  GetOrCreateUserInput,
  GetOrCreateUserOutput,
} from "@sleeved-potential/shared";
import {
  generateGuestUsername,
  generateGuestDisplayName,
} from "@sleeved-potential/shared";

/**
 * Get or create a user document on login
 *
 * - If user document exists, return it
 * - If user is new, create document with:
 *   - For Google users: use auth display name, generate temporary username
 *   - For guests: generate UUID username and "Adjective Noun" display name
 */
export const getOrCreateUser = onCall<GetOrCreateUserInput, Promise<GetOrCreateUserOutput>>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }

    const db = getFirestore();
    const authUser = request.auth;
    const userId = authUser.uid;

    // Check if user already exists
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // User exists, return it
      const userData = userDoc.data() as User;
      return {
        user: userData,
        isNewUser: false,
      };
    }

    // Determine if this is a guest (anonymous) or Google user
    const isGuest = authUser.token.firebase.sign_in_provider === "anonymous";
    const now = new Date().toISOString();

    let displayName: string;
    let username: string;
    let email: string | null = null;
    let photoURL: string | null = null;

    if (isGuest) {
      // Guest user: generate display name and UUID username
      displayName = generateGuestDisplayName();
      username = generateGuestUsername();
    } else {
      // Google user: use auth info, needs to set username later
      displayName = authUser.token.name || authUser.token.email || "Player";
      username = generateGuestUsername(); // Temporary until they set a real one
      email = authUser.token.email || null;
      photoURL = authUser.token.picture || null;
    }

    // Create new user document
    const newUser: User = {
      id: userId,
      authUserId: userId,
      email,
      displayName,
      username,
      isGuest,
      photoURL,
      roles: [],
      stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    await userRef.set(newUser);

    return {
      user: newUser,
      isNewUser: true,
    };
  }
);
