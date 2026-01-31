/**
 * User roles for authorization
 */
export type UserRole = "ADMIN";

/**
 * User statistics
 */
export interface UserStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * User profile stored in Firestore users/{userId}
 */
export interface User {
  id: string;
  authUserId: string; // Firebase Auth UID
  email: string | null;
  displayName: string; // Google name (accounts) or "Adjective Noun" (guests)
  username: string; // Unique 3-12 chars (accounts) or UUID (guests)
  isGuest: boolean;
  photoURL: string | null;
  roles: UserRole[];
  stats: UserStats;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Username document for uniqueness enforcement
 * Stored in Firestore usernames/{username}
 */
export interface UsernameDoc {
  odIduserId: string;
  createdAt: string; // ISO 8601
}

/**
 * Data required to create a new user (internal use)
 */
export interface CreateUserData {
  authUserId: string;
  email: string | null;
  displayName: string;
  username: string;
  isGuest: boolean;
  photoURL: string | null;
}
