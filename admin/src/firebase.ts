import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import type {
  User,
  ApiMetadata,
  ChangelogEntry,
  CreateChangelogData,
  UpdateChangelogData,
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
  CreateChangelogInput,
  CreateChangelogOutput,
  UpdateChangelogInput,
  UpdateChangelogOutput,
  PublishChangelogInput,
  PublishChangelogOutput,
  DeleteChangelogInput,
  DeleteChangelogOutput,
  CreateCardData,
  UpdateCardData,
  UpdateRulesData,
} from "@sleeved-potential/shared";
import { VERSION } from "@sleeved-potential/shared";

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

/**
 * Helper to inject client version metadata into API requests
 */
function withMeta<T extends object>(input: T): T & { _meta: ApiMetadata } {
  return { ...input, _meta: { clientVersion: VERSION } };
}

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
  const result = await fn(withMeta({}));
  return result.data;
}

// =============================================================================
// Admin Functions
// =============================================================================

export async function createCard(card: CreateCardData): Promise<CreateCardOutput> {
  const fn = httpsCallable<CreateCardInput, CreateCardOutput>(functions, "createCard");
  const result = await fn(withMeta({ card }));
  return result.data;
}

export async function updateCard(
  cardId: string,
  updates: UpdateCardData
): Promise<UpdateCardOutput> {
  const fn = httpsCallable<UpdateCardInput, UpdateCardOutput>(functions, "updateCard");
  const result = await fn(withMeta({ cardId, updates }));
  return result.data;
}

export async function deleteCard(cardId: string): Promise<DeleteCardOutput> {
  const fn = httpsCallable<DeleteCardInput, DeleteCardOutput>(functions, "deleteCard");
  const result = await fn(withMeta({ cardId }));
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
  const result = await fn(withMeta({ cardId, imageData, contentType }));
  return result.data;
}

export async function updateRules(rules: UpdateRulesData): Promise<UpdateRulesOutput> {
  const fn = httpsCallable<UpdateRulesInput, UpdateRulesOutput>(functions, "updateRules");
  const result = await fn(withMeta({ rules }));
  return result.data;
}

export async function listCardImages(): Promise<ListCardImagesOutput> {
  const fn = httpsCallable<ListCardImagesInput, ListCardImagesOutput>(functions, "listCardImages");
  const result = await fn(withMeta({}));
  return result.data;
}

// =============================================================================
// Changelog Functions
// =============================================================================

export async function createChangelog(data: CreateChangelogData): Promise<CreateChangelogOutput> {
  const fn = httpsCallable<CreateChangelogInput, CreateChangelogOutput>(
    functions,
    "createChangelog"
  );
  const result = await fn(withMeta({ changelog: data }));
  return result.data;
}

export async function updateChangelog(
  changelogId: string,
  updates: UpdateChangelogData
): Promise<UpdateChangelogOutput> {
  const fn = httpsCallable<UpdateChangelogInput, UpdateChangelogOutput>(
    functions,
    "updateChangelog"
  );
  const result = await fn(withMeta({ changelogId, updates }));
  return result.data;
}

export async function publishChangelog(changelogId: string): Promise<PublishChangelogOutput> {
  const fn = httpsCallable<PublishChangelogInput, PublishChangelogOutput>(
    functions,
    "publishChangelog"
  );
  const result = await fn(withMeta({ changelogId }));
  return result.data;
}

export async function deleteChangelog(changelogId: string): Promise<DeleteChangelogOutput> {
  const fn = httpsCallable<DeleteChangelogInput, DeleteChangelogOutput>(
    functions,
    "deleteChangelog"
  );
  const result = await fn(withMeta({ changelogId }));
  return result.data;
}

/**
 * Subscribe to all changelogs (drafts and published)
 * For admin to manage all entries
 */
export function subscribeToChangelogs(
  callback: (entries: ChangelogEntry[]) => void
): () => void {
  const changelogsQuery = query(
    collection(db, "changelogs"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(changelogsQuery, (snapshot) => {
    const entries = snapshot.docs.map((doc) => doc.data() as ChangelogEntry);
    callback(entries);
  });
}

export type { FirebaseUser, User };
