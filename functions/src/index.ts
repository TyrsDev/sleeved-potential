import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";

// Initialize Firebase Admin
initializeApp();

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "europe-west1",
});

// Export all functions
export { joinGame } from "./joinGame.js";
export { challengePlayer } from "./challengePlayer.js";
export { acceptChallenge } from "./acceptChallenge.js";
export { declineChallenge } from "./declineChallenge.js";
