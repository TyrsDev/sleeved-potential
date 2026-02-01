import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { useEffect, useState } from "react";
import {
  subscribeToUserGames,
  subscribeToUserChallenges,
  subscribeToUser,
  acceptChallenge,
  declineChallenge,
} from "../firebase";
import type { Game, Challenge, User } from "@sleeved-potential/shared";
import { auth } from "../firebase";

export function Home() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [activeGames, setActiveGames] = useState<Game[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [opponentNames, setOpponentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const userId = auth.currentUser?.uid;

  // Subscribe to active games
  useEffect(() => {
    if (!userId) return;
    return subscribeToUserGames(userId, setActiveGames);
  }, [userId]);

  // Subscribe to challenges
  useEffect(() => {
    if (!userId) return;
    return subscribeToUserChallenges(userId, setChallenges);
  }, [userId]);

  // Fetch opponent names for active games
  useEffect(() => {
    if (!userId || activeGames.length === 0) return;

    const opponentIds = activeGames
      .map((g) => g.players.find((p) => p !== userId))
      .filter((id): id is string => !!id);

    const unsubscribes: (() => void)[] = [];

    for (const opponentId of opponentIds) {
      const unsub = subscribeToUser(opponentId, (opponent: User | null) => {
        if (opponent) {
          setOpponentNames((prev) => ({ ...prev, [opponentId]: opponent.displayName }));
        }
      });
      unsubscribes.push(unsub);
    }

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [userId, activeGames]);

  const handleAcceptChallenge = async (challengeId: string) => {
    setLoading((prev) => ({ ...prev, [challengeId]: true }));
    try {
      const result = await acceptChallenge(challengeId);
      navigate(`/game/${result.gameId}`);
    } catch (err) {
      console.error("Failed to accept challenge:", err);
      setLoading((prev) => ({ ...prev, [challengeId]: false }));
    }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    setLoading((prev) => ({ ...prev, [challengeId]: true }));
    try {
      await declineChallenge(challengeId);
    } catch (err) {
      console.error("Failed to decline challenge:", err);
      setLoading((prev) => ({ ...prev, [challengeId]: false }));
    }
  };

  const getOpponentId = (game: Game) => game.players.find((p) => p !== userId);
  const getOpponentName = (game: Game) => {
    const oppId = getOpponentId(game);
    return oppId ? opponentNames[oppId] ?? "Opponent" : "Opponent";
  };

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

      {/* Active Games Section */}
      {activeGames.length > 0 && (
        <div className="home-section">
          <h3>Active Games</h3>
          <div className="home-list">
            {activeGames.map((game) => {
              const myScore = game.scores[userId!] ?? 0;
              const oppScore = game.scores[getOpponentId(game)!] ?? 0;
              return (
                <div
                  key={game.id}
                  className="home-list-item clickable"
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  <div className="home-item-main">
                    <span className="home-item-title">vs {getOpponentName(game)}</span>
                    <span className="home-item-subtitle">Round {game.currentRound}</span>
                  </div>
                  <div className="home-item-stats">
                    <span className="score-display">
                      {myScore} - {oppScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Challenges Section */}
      {challenges.length > 0 && (
        <div className="home-section">
          <h3>Challenges</h3>
          <div className="home-list">
            {challenges.map((challenge) => {
              const isCreator = challenge.creatorId === userId;
              const isMatchmaking = challenge.type === "matchmaking";
              const isLoading = loading[challenge.id];

              return (
                <div key={challenge.id} className="home-list-item">
                  <div className="home-item-main">
                    {isMatchmaking ? (
                      <>
                        <span className="home-item-title">Searching for opponent...</span>
                        <span className="home-item-subtitle">Matchmaking</span>
                      </>
                    ) : isCreator ? (
                      <>
                        <span className="home-item-title">
                          Waiting for {challenge.opponentUsername}
                        </span>
                        <span className="home-item-subtitle">Direct challenge</span>
                      </>
                    ) : (
                      <>
                        <span className="home-item-title">
                          Challenge from {challenge.creatorUsername}
                        </span>
                        <span className="home-item-subtitle">Direct challenge</span>
                      </>
                    )}
                  </div>
                  {!isCreator && !isMatchmaking && (
                    <div className="home-item-actions">
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleAcceptChallenge(challenge.id)}
                        disabled={isLoading}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => handleDeclineChallenge(challenge.id)}
                        disabled={isLoading}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {(isCreator || isMatchmaking) && (
                    <div className="home-item-status">
                      <span className="spinner-small"></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
