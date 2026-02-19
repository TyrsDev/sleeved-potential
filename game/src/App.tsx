import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "./contexts/UserContext";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Cards } from "./pages/Cards";
import { Rules } from "./pages/Rules";
import { Profile } from "./pages/Profile";
import { Play } from "./pages/Play";
import { Playtest } from "./pages/Playtest";
import { GameView } from "./pages/GameView";
import { Leaderboard } from "./pages/Leaderboard";
import { Changelog } from "./pages/Changelog";
import "@sleeved-potential/shared/components/cards.css";
import "./App.css";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, loading, error, signInWithGoogle, signInAsGuest, logout } = useUser();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!firebaseUser) {
    return (
      <div className="auth-container">
        <h1>Sleeved Potential</h1>
        <p className="tagline">A 1v1 composite card game where you build cards by layering.</p>
        <div className="auth-buttons">
          <button className="btn btn-primary" onClick={signInWithGoogle}>
            Sign in with Google
          </button>
          <button className="btn" onClick={signInAsGuest}>
            Play as Guest
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-container">
        <h1>Sleeved Potential</h1>
        <p className="error">{error}</p>
        <button className="btn" onClick={logout}>
          Sign Out
        </button>
      </div>
    );
  }

  if (!user) {
    return <div className="loading">Loading user data...</div>;
  }

  return <>{children}</>;
}

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="cards" element={<Cards />} />
              <Route path="rules" element={<Rules />} />
              <Route path="playtest" element={<Playtest />} />
              <Route path="profile" element={<Profile />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="changelog" element={<Changelog />} />
              <Route path="play" element={<Play />} />
              <Route path="game/:gameId" element={<GameView />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
