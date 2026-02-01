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
import { getFirestore, collection, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import type {
  User,
  CardDefinition,
  GameRules,
  Game,
  PlayerGameState,
  GetOrCreateUserInput,
  GetOrCreateUserOutput,
  SetUsernameInput,
  SetUsernameOutput,
  JoinGameInput,
  JoinGameOutput,
  CommitCardInput,
  CommitCardOutput,
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

export type { FirebaseUser, User };
