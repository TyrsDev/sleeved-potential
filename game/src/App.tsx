import { useState, useEffect } from "react";
import {
  signInWithGoogle,
  signInAsGuest,
  logout,
  onAuthChange,
  getOrCreateUser,
  type FirebaseUser,
  type User,
} from "./firebase";
import "./App.css";

function App() {
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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!firebaseUser) {
    return (
      <div className="auth-container">
        <h1>Sleeved Potential</h1>
        <p>Sign in to play</p>
        <div className="auth-buttons">
          <button onClick={signInWithGoogle}>Sign in with Google</button>
          <button onClick={signInAsGuest}>Play as Guest</button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-container">
        <h1>Sleeved Potential</h1>
        <p className="error">{error}</p>
        <button onClick={logout}>Sign Out</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <h1>Sleeved Potential</h1>
        <div className="user-info">
          {firebaseUser.photoURL && <img src={firebaseUser.photoURL} alt="Avatar" />}
          <span>{user?.displayName || "Loading..."}</span>
          <button onClick={logout}>Sign Out</button>
        </div>
      </header>
      <main>
        <p>Welcome to the game!</p>
        {user?.isGuest && (
          <p className="guest-notice">
            You're playing as a guest ({user.displayName}). Sign in with Google to save your
            progress.
          </p>
        )}
        {user && (
          <div className="user-stats">
            <p>Username: {user.username}</p>
            <p>
              Games: {user.stats.gamesPlayed} | Wins: {user.stats.wins} | Losses:{" "}
              {user.stats.losses}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
