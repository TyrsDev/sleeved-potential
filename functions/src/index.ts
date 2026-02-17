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
export { challengeByUsername } from "./challengeByUsername.js";

// Challenge management
export { acceptChallenge } from "./acceptChallenge.js";
export { declineChallenge } from "./declineChallenge.js";

// Game actions
export { commitCard } from "./commitCard.js";
export { surrenderGame } from "./surrenderGame.js";

// Admin functions (ADMIN role required)
export { createCard } from "./createCard.js";
export { updateCard } from "./updateCard.js";
export { deleteCard } from "./deleteCard.js";
export { uploadCardImage } from "./uploadCardImage.js";
export { updateRules } from "./updateRules.js";
export { listCardImages } from "./listCardImages.js";

// Changelog functions (ADMIN role required)
export { createChangelog } from "./createChangelog.js";
export { updateChangelog } from "./updateChangelog.js";
export { publishChangelog } from "./publishChangelog.js";
export { deleteChangelog } from "./deleteChangelog.js";

// Snapshot/Migration functions (ADMIN role required)
export { seedBotSnapshot } from "./seedBotSnapshot.js";
export { deleteSnapshot } from "./deleteSnapshot.js";
export { migrateGames } from "./migrateGames.js";
