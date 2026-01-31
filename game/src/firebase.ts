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
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import type {
  User,
  GetOrCreateUserInput,
  GetOrCreateUserOutput,
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

export type { FirebaseUser, User };
