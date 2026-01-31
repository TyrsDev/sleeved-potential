import { useState, useEffect } from "react";
import {
  signInWithGoogle,
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
        <h1>Sleeved Potential - Admin</h1>
        <p>Sign in with your Google account to access the admin dashboard</p>
        <div className="auth-buttons">
          <button onClick={signInWithGoogle}>Sign in with Google</button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-container">
        <h1>Sleeved Potential - Admin</h1>
        <p className="error">{error}</p>
        <button onClick={logout}>Sign Out</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <h1>Sleeved Potential - Admin</h1>
        <div className="user-info">
          {firebaseUser.photoURL && <img src={firebaseUser.photoURL} alt="Avatar" />}
          <span>{user?.displayName || "Loading..."}</span>
          <button onClick={logout}>Sign Out</button>
        </div>
      </header>
      <main>
        <p>Welcome to the admin dashboard!</p>
        <p>Here you can manage cards and game settings during playtesting.</p>
        {user && (
          <div className="user-stats">
            <p>Username: {user.username}</p>
            <p>Role: {user.roles.includes("ADMIN") ? "Admin" : "User"}</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
