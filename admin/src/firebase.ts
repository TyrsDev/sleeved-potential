import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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
  CreateCardInput,
  CreateCardOutput,
  UpdateCardInput,
  UpdateCardOutput,
  DeleteCardInput,
  DeleteCardOutput,
  UploadCardImageInput,
  UploadCardImageOutput,
  UpdateRulesInput,
  UpdateRulesOutput,
  ListCardImagesInput,
  ListCardImagesOutput,
  CreateCardData,
  UpdateCardData,
  UpdateRulesData,
} from "@sleeved-potential/shared";

const firebaseConfig = {
  apiKey: "AIzaSyAbOHF0kJvs51r9_6yhW0GfMWBla0TvGiU",
  authDomain: "sleeved-potential.firebaseapp.com",
  projectId: "sleeved-potential",
  storageBucket: "sleeved-potential.firebasestorage.app",
  messagingSenderId: "592797830247",
  appId: "1:592797830247:web:5ec92a3b775410d6dad8c2",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const functions = getFunctions(app, "europe-west1");

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
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

// =============================================================================
// Admin Functions
// =============================================================================

export async function createCard(card: CreateCardData): Promise<CreateCardOutput> {
  const fn = httpsCallable<CreateCardInput, CreateCardOutput>(functions, "createCard");
  const result = await fn({ card });
  return result.data;
}

export async function updateCard(
  cardId: string,
  updates: UpdateCardData
): Promise<UpdateCardOutput> {
  const fn = httpsCallable<UpdateCardInput, UpdateCardOutput>(functions, "updateCard");
  const result = await fn({ cardId, updates });
  return result.data;
}

export async function deleteCard(cardId: string): Promise<DeleteCardOutput> {
  const fn = httpsCallable<DeleteCardInput, DeleteCardOutput>(functions, "deleteCard");
  const result = await fn({ cardId });
  return result.data;
}

export async function uploadCardImage(
  cardId: string,
  imageData: string,
  contentType: string
): Promise<UploadCardImageOutput> {
  const fn = httpsCallable<UploadCardImageInput, UploadCardImageOutput>(
    functions,
    "uploadCardImage"
  );
  const result = await fn({ cardId, imageData, contentType });
  return result.data;
}

export async function updateRules(rules: UpdateRulesData): Promise<UpdateRulesOutput> {
  const fn = httpsCallable<UpdateRulesInput, UpdateRulesOutput>(functions, "updateRules");
  const result = await fn({ rules });
  return result.data;
}

export async function listCardImages(): Promise<ListCardImagesOutput> {
  const fn = httpsCallable<ListCardImagesInput, ListCardImagesOutput>(functions, "listCardImages");
  const result = await fn({});
  return result.data;
}

export type { FirebaseUser, User };
