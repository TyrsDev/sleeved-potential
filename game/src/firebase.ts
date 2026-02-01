import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import type {
  User,
  CardDefinition,
  GameRules,
  Game,
  PlayerGameState,
  Challenge,
  GetOrCreateUserInput,
  GetOrCreateUserOutput,
  SetUsernameInput,
  SetUsernameOutput,
  JoinGameInput,
  JoinGameOutput,
  CommitCardInput,
  CommitCardOutput,
  AcceptChallengeInput,
  AcceptChallengeOutput,
  DeclineChallengeInput,
  DeclineChallengeOutput,
  SurrenderGameInput,
  SurrenderGameOutput,
} from "@sleeved-potential/shared";

const firebaseConfig = {
  apiKey: "AIzaSyAbOHF0kJvs51r9_6yhW0GfMWBla0TvGiU",
  authDomain: "sleeved-potential.firebaseapp.com",
  projectId: "sleeved-potential",
  storageBucket: "sleeved-potential.firebasestorage.app",
  messagingSenderId: "592797830247",
  appId: "1:592797830247:web:a785c5ec7e0ac438dad8c2",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const functions = getFunctions(app, "europe-west1");

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signInAsGuest() {
  return signInAnonymously(auth);
}

export async function logout() {
  return signOut(auth);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Call getOrCreateUser function to ensure user document exists
 */
export async function getOrCreateUser(): Promise<GetOrCreateUserOutput> {
  const fn = httpsCallable<GetOrCreateUserInput, GetOrCreateUserOutput>(
    functions,
    "getOrCreateUser"
  );
  const result = await fn({});
  return result.data;
}

/**
 * Set username for account users
 */
export async function setUsername(username: string): Promise<SetUsernameOutput> {
  const fn = httpsCallable<SetUsernameInput, SetUsernameOutput>(functions, "setUsername");
  const result = await fn({ username });
  return result.data;
}

/**
 * Join matchmaking queue
 */
export async function joinGame(): Promise<JoinGameOutput> {
  const fn = httpsCallable<JoinGameInput, JoinGameOutput>(functions, "joinGame");
  const result = await fn({});
  return result.data;
}

/**
 * Subscribe to all card definitions
 */
export function subscribeToCards(callback: (cards: CardDefinition[]) => void) {
  const cardsQuery = query(collection(db, "cards"), orderBy("name"));
  return onSnapshot(cardsQuery, (snapshot) => {
    const cards = snapshot.docs.map((doc) => doc.data() as CardDefinition);
    callback(cards);
  });
}

/**
 * Subscribe to game rules
 */
export function subscribeToRules(callback: (rules: GameRules | null) => void) {
  return onSnapshot(doc(db, "rules", "current"), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as GameRules);
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to user document
 */
export function subscribeToUser(userId: string, callback: (user: User | null) => void) {
  return onSnapshot(doc(db, "users", userId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as User);
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to game document
 */
export function subscribeToGame(
  gameId: string,
  callback: (game: Game | null) => void
): () => void {
  return onSnapshot(doc(db, "games", gameId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as Game);
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to player's private state
 */
export function subscribeToPlayerState(
  gameId: string,
  playerId: string,
  callback: (state: PlayerGameState | null) => void
): () => void {
  return onSnapshot(doc(db, "games", gameId, "playerState", playerId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as PlayerGameState);
    } else {
      callback(null);
    }
  });
}

/**
 * Commit a card for the current round
 */
export async function commitCard(
  gameId: string,
  sleeveId: string,
  animalId: string,
  equipmentIds: string[]
): Promise<CommitCardOutput> {
  const fn = httpsCallable<CommitCardInput, CommitCardOutput>(functions, "commitCard");
  const result = await fn({ gameId, sleeveId, animalId, equipmentIds });
  return result.data;
}

/**
 * Subscribe to a challenge document
 * Used to track when a matchmaking challenge gets matched
 */
export function subscribeToChallenge(
  challengeId: string,
  callback: (challenge: Challenge | null) => void
): () => void {
  return onSnapshot(doc(db, "challenges", challengeId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as Challenge);
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to the user's active games
 * Useful for detecting when a game is created (from matchmaking or direct challenge)
 */
export function subscribeToUserActiveGames(
  userId: string,
  callback: (games: Game[]) => void
): () => void {
  const gamesQuery = query(
    collection(db, "games"),
    where("players", "array-contains", userId),
    where("status", "==", "active"),
    limit(1)
  );

  return onSnapshot(gamesQuery, (snapshot) => {
    const games = snapshot.docs.map((doc) => doc.data() as Game);
    callback(games);
  });
}

/**
 * Subscribe to all user's active games (for Home page display)
 */
export function subscribeToUserGames(
  userId: string,
  callback: (games: Game[]) => void
): () => void {
  const gamesQuery = query(
    collection(db, "games"),
    where("players", "array-contains", userId),
    where("status", "==", "active")
  );

  return onSnapshot(gamesQuery, (snapshot) => {
    const games = snapshot.docs.map((d) => d.data() as Game);
    callback(games);
  });
}

/**
 * Subscribe to user's challenges (created by them OR targeting them)
 */
export function subscribeToUserChallenges(
  userId: string,
  callback: (challenges: Challenge[]) => void
): () => void {
  // Query for challenges where user is the creator
  const creatorQuery = query(
    collection(db, "challenges"),
    where("creatorId", "==", userId),
    where("status", "==", "waiting")
  );

  // Query for challenges where user is the opponent
  const opponentQuery = query(
    collection(db, "challenges"),
    where("opponentId", "==", userId),
    where("status", "==", "waiting")
  );

  let creatorChallenges: Challenge[] = [];
  let opponentChallenges: Challenge[] = [];

  const unsubCreator = onSnapshot(creatorQuery, (snapshot) => {
    creatorChallenges = snapshot.docs.map((d) => d.data() as Challenge);
    callback([...creatorChallenges, ...opponentChallenges]);
  });

  const unsubOpponent = onSnapshot(opponentQuery, (snapshot) => {
    opponentChallenges = snapshot.docs.map((d) => d.data() as Challenge);
    callback([...creatorChallenges, ...opponentChallenges]);
  });

  return () => {
    unsubCreator();
    unsubOpponent();
  };
}

/**
 * Accept a direct challenge
 */
export async function acceptChallenge(challengeId: string): Promise<AcceptChallengeOutput> {
  const fn = httpsCallable<AcceptChallengeInput, AcceptChallengeOutput>(
    functions,
    "acceptChallenge"
  );
  const result = await fn({ challengeId });
  return result.data;
}

/**
 * Decline a direct challenge
 */
export async function declineChallenge(challengeId: string): Promise<DeclineChallengeOutput> {
  const fn = httpsCallable<DeclineChallengeInput, DeclineChallengeOutput>(
    functions,
    "declineChallenge"
  );
  const result = await fn({ challengeId });
  return result.data;
}

/**
 * Surrender an active game
 */
export async function surrenderGame(gameId: string): Promise<SurrenderGameOutput> {
  const fn = httpsCallable<SurrenderGameInput, SurrenderGameOutput>(functions, "surrenderGame");
  const result = await fn({ gameId });
  return result.data;
}

export type { FirebaseUser, User };
