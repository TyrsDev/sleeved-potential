export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = "ADMIN";

export interface CreateUserData {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
