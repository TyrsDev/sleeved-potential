/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  signInWithGoogle,
  signInAsGuest,
  logout,
  onAuthChange,
  getOrCreateUser,
  subscribeToUser,
  type FirebaseUser,
  type User,
} from "../firebase";

interface UserContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      setFirebaseUser(authUser);

      if (authUser) {
        try {
          setError(null);
          const result = await getOrCreateUser();
          setUser(result.user);
        } catch (err) {
          console.error("Failed to get or create user:", err);
          setError("Failed to initialize user. Please try again.");
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Subscribe to user document for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUser(user.id, (updatedUser) => {
      if (updatedUser) {
        setUser(updatedUser);
      }
    });

    return unsubscribe;
  }, [user?.id]);

  const handleSignInWithGoogle = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      console.error("Sign in failed:", err);
      setError("Failed to sign in. Please try again.");
    }
  };

  const handleSignInAsGuest = async () => {
    try {
      setError(null);
      await signInAsGuest();
    } catch (err) {
      console.error("Guest sign in failed:", err);
      setError("Failed to sign in as guest. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const refreshUser = async () => {
    if (!firebaseUser) return;
    try {
      const result = await getOrCreateUser();
      setUser(result.user);
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  };

  return (
    <UserContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        error,
        signInWithGoogle: handleSignInWithGoogle,
        signInAsGuest: handleSignInAsGuest,
        logout: handleLogout,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
