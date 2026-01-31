import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

export function Home() {
  const { user } = useUser();
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="hero">
        <h2>Welcome, {user?.displayName}!</h2>
        <p className="tagline">A 1v1 composite card game where you build cards by layering.</p>
      </div>

      <div className="action-buttons">
        <button className="btn btn-primary btn-large" onClick={() => navigate("/play")}>
          Play Now
        </button>
      </div>

      <div className="quick-stats">
        <div className="stat-card">
          <h3>Games Played</h3>
          <p className="stat-value">{user?.stats.gamesPlayed ?? 0}</p>
        </div>
        <div className="stat-card">
          <h3>Wins</h3>
          <p className="stat-value">{user?.stats.wins ?? 0}</p>
        </div>
        <div className="stat-card">
          <h3>Win Rate</h3>
          <p className="stat-value">
            {user?.stats.gamesPlayed
              ? Math.round((user.stats.wins / user.stats.gamesPlayed) * 100)
              : 0}
            %
          </p>
        </div>
      </div>

      {user?.isGuest && (
        <div className="alert alert-info">
          <p>
            You're playing as a guest. Sign in with Google to save your progress and challenge
            friends by username!
          </p>
        </div>
      )}
    </div>
  );
}
