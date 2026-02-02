import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToLeaderboard } from "../firebase";
import { useUser } from "../contexts/UserContext";
import type { User } from "@sleeved-potential/shared";
import { DEFAULT_ELO } from "@sleeved-potential/shared";

export function Leaderboard() {
  const { user } = useUser();
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard(
      (users) => {
        setLeaderboard(users);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Show friendly error in production, detailed error in development
        const isDev = import.meta.env.DEV;
        setError(isDev ? err.message : "Failed to load leaderboard. Please try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Find current user's rank if they're on the leaderboard
  const userRank = user
    ? leaderboard.findIndex((u) => u.id === user.id) + 1
    : 0;

  // Check if user is eligible for leaderboard
  const userEligible = user && !user.isGuest && user.stats.gamesPlayed >= 5;
  const userElo = user?.stats.elo ?? DEFAULT_ELO;

  if (loading) {
    return (
      <div className="leaderboard-page">
        <h2>Leaderboard</h2>
        <div className="loading">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-page">
        <h2>Leaderboard</h2>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <h2>Leaderboard</h2>

      {user && (
        <div className="your-ranking">
          <h3>Your Ranking</h3>
          {userEligible ? (
            userRank > 0 ? (
              <p>
                You are ranked <strong>#{userRank}</strong> with{" "}
                <strong>{userElo}</strong> rating
              </p>
            ) : (
              <p>
                Your rating: <strong>{userElo}</strong> (not in top 100)
              </p>
            )
          ) : user.isGuest ? (
            <p>
              <Link to="/profile">Upgrade to a full account</Link> and play 5+
              games to appear on the leaderboard.
            </p>
          ) : (
            <p>
              Play {5 - user.stats.gamesPlayed} more game
              {5 - user.stats.gamesPlayed !== 1 ? "s" : ""} to appear on the
              leaderboard.
            </p>
          )}
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className="empty-leaderboard">
          <p>No players on the leaderboard yet.</p>
          <p>Be the first to play 5+ games!</p>
        </div>
      ) : (
        <div className="leaderboard-table-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Rating</th>
                <th>W/L/D</th>
                <th>Games</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player, index) => (
                <tr
                  key={player.id}
                  className={player.id === user?.id ? "current-user" : ""}
                >
                  <td className="rank">
                    {index + 1 <= 3 ? (
                      <span className={`medal medal-${index + 1}`}>
                        {index + 1}
                      </span>
                    ) : (
                      index + 1
                    )}
                  </td>
                  <td className="player-name">
                    {player.displayName}
                    <span className="username">@{player.username}</span>
                  </td>
                  <td className="elo">{player.stats.elo ?? DEFAULT_ELO}</td>
                  <td className="record">
                    {player.stats.wins}/{player.stats.losses}/{player.stats.draws}
                  </td>
                  <td className="games">{player.stats.gamesPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
