import { useState, useEffect } from "react";
import { signInWithGoogle, logout, onAuthChange, type User } from "./firebase";
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
        <h1>Sleeved Potential - Admin</h1>
        <p>Sign in with your Google account to access the admin dashboard</p>
        <div className="auth-buttons">
          <button onClick={signInWithGoogle}>Sign in with Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <h1>Sleeved Potential - Admin</h1>
        <div className="user-info">
          {user.photoURL && <img src={user.photoURL} alt="Avatar" />}
          <span>{user.displayName || user.email}</span>
          <button onClick={logout}>Sign Out</button>
        </div>
      </header>
      <main>
        <p>Welcome to the admin dashboard!</p>
        <p>Here you can manage cards and game settings during playtesting.</p>
      </main>
    </div>
  );
}

export default App;
