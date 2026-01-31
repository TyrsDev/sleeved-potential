import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin
initializeApp();

// Export all functions
// Note: Region is set per-function to avoid ESM module loading order issues

// User management
export { getOrCreateUser } from "./getOrCreateUser.js";
export { setUsername } from "./setUsername.js";

// Matchmaking
export { joinGame } from "./joinGame.js";
export { challengePlayer } from "./challengePlayer.js";

// Challenge management
export { acceptChallenge } from "./acceptChallenge.js";
export { declineChallenge } from "./declineChallenge.js";

// Admin functions (ADMIN role required)
export { createCard } from "./createCard.js";
export { updateCard } from "./updateCard.js";
export { deleteCard } from "./deleteCard.js";
export { uploadCardImage } from "./uploadCardImage.js";
export { updateRules } from "./updateRules.js";
export { listCardImages } from "./listCardImages.js";
