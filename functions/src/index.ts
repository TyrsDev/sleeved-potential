import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin
initializeApp();

// Export all functions
// Note: Region is set per-function to avoid ESM module loading order issues
export { joinGame } from "./joinGame.js";
export { challengePlayer } from "./challengePlayer.js";
export { acceptChallenge } from "./acceptChallenge.js";
export { declineChallenge } from "./declineChallenge.js";
