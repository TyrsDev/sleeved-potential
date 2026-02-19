import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  signInWithGoogle,
  logout,
  onAuthChange,
  getOrCreateUser,
  type FirebaseUser,
  type User,
} from "./firebase";
import { Layout } from "./components/Layout";
import { DataProvider } from "./contexts/DataContext";
import { Dashboard } from "./pages/Dashboard";
import { CardList } from "./pages/CardList";
import { CardForm } from "./pages/CardForm";
import { CompositeCardViewer } from "./pages/CompositeCardViewer";
import { ImageList } from "./pages/ImageList";
import { RulesEditor } from "./pages/RulesEditor";
import { PlayerList } from "./pages/PlayerList";
import { Playtest } from "./pages/Playtest";
import { ChangelogEditor } from "./pages/ChangelogEditor";
import { SnapshotManager } from "./pages/SnapshotManager";
import "@sleeved-potential/shared/components/cards.css";
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

  if (!user) {
    return <div className="loading">Loading user data...</div>;
  }

  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout user={user} onLogout={logout} />}>
            <Route index element={<Dashboard />} />
            <Route path="cards" element={<CardList />} />
            <Route path="cards/compose" element={<CompositeCardViewer />} />
            <Route path="cards/:cardId" element={<CardForm />} />
            <Route path="images" element={<ImageList />} />
            <Route path="rules" element={<RulesEditor />} />
            <Route path="players" element={<PlayerList />} />
            <Route path="playtest" element={<Playtest />} />
            <Route path="changelog" element={<ChangelogEditor />} />
            <Route path="snapshots" element={<SnapshotManager />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
