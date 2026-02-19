import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToLeaderboard } from "../firebase";
import { useUser } from "../contexts/UserContext";
import type { User } from "@sleeved-potential/shared";
import { DEFAULT_ELO } from "@sleeved-potential/shared";

function getPlayerName(player: User): string {
  // Prefer custom username (≤12 chars) over auto-generated UUID-like username
  return player.username.length <= 12 ? `@${player.username}` : player.displayName;
}

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
        const isDev = import.meta.env.DEV;
        setError(isDev ? err.message : "Failed to load leaderboard. Please try again later.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const userRank = user ? leaderboard.findIndex((u) => u.id === user.id) + 1 : 0;
  const userEligible = user && !user.isGuest && user.stats.gamesPlayed >= 5;
  const userOnBoard = userRank > 0;

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

      {user && (!userEligible || !userOnBoard) && (
        <div className="leaderboard-info">
          {user.isGuest ? (
            <p>
              <Link to="/profile">Upgrade to a full account</Link> and play 5+
              games to appear on the leaderboard.
            </p>
          ) : !userEligible ? (
            <p>
              Play{" "}
              <strong>{5 - user.stats.gamesPlayed}</strong> more game
              {5 - user.stats.gamesPlayed !== 1 ? "s" : ""} to appear on the
              leaderboard.
            </p>
          ) : (
            <p>
              Your rating:{" "}
              <strong className="elo-accent">{user.stats.elo ?? DEFAULT_ELO}</strong>{" "}
              — not in top 100.
            </p>
          )}
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className="leaderboard-empty">
          <p>No players on the leaderboard yet.</p>
          <p>Be the first to play 5+ games!</p>
        </div>
      ) : (
        <div className="leaderboard-table-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="col-rank">Rank</th>
                <th className="col-player">Player</th>
                <th className="col-games">Games</th>
                <th className="col-record">W / L / D</th>
                <th className="col-rating">Rating</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player, index) => {
                const rank = index + 1;
                const isCurrentUser = player.id === user?.id;
                return (
                  <tr key={player.id} className={isCurrentUser ? "current-user" : ""}>
                    <td className="col-rank">
                      {rank <= 3 ? (
                        <span className={`rank-medal rank-medal-${rank}`}>{rank}</span>
                      ) : (
                        <span className="rank-number">{rank}</span>
                      )}
                    </td>
                    <td className="col-player">
                      <span className="player-name">{getPlayerName(player)}</span>
                    </td>
                    <td className="col-games">{player.stats.gamesPlayed}</td>
                    <td className="col-record">
                      <span className="record-wins">{player.stats.wins}</span>
                      <span className="record-sep"> / </span>
                      <span className="record-losses">{player.stats.losses}</span>
                      <span className="record-sep"> / </span>
                      <span className="record-draws">{player.stats.draws}</span>
                    </td>
                    <td className="col-rating">
                      <span className="rating-value">{player.stats.elo ?? DEFAULT_ELO}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
