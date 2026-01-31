import { useState, useEffect } from "react";
import {
  signInWithGoogle,
  signInAsGuest,
  logout,
  onAuthChange,
  type User,
} from "./firebase";
import "./App.css";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
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

  return (
    <div className="app-container">
      <header>
        <h1>Sleeved Potential</h1>
        <div className="user-info">
          {user.photoURL && <img src={user.photoURL} alt="Avatar" />}
          <span>{user.displayName || (user.isAnonymous ? "Guest" : user.email)}</span>
          <button onClick={logout}>Sign Out</button>
        </div>
      </header>
      <main>
        <p>Welcome to the game!</p>
        {user.isAnonymous && (
          <p className="guest-notice">
            You're playing as a guest. Sign in with Google to save your progress.
          </p>
        )}
      </main>
    </div>
  );
}

export default App;
