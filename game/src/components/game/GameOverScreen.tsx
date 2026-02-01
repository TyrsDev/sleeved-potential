import { Link } from "react-router-dom";
import { useGame } from "../../contexts/GameContext";
import { useUser } from "../../contexts/UserContext";
import { useMemo } from "react";

export function GameOverScreen() {
  const { game, myScore, opponentScore } = useGame();
  const { user } = useUser();

  const userId = user?.id;

  const isWinner = useMemo(() => {
    if (!game || !userId) return false;
    return game.winner === userId;
  }, [game, userId]);

  const isDraw = game?.isDraw ?? false;
  const endReason = game?.endReason;

  const roundsPlayed = game?.rounds.length ?? 0;

  const startTime = game?.startedAt ? new Date(game.startedAt) : null;
  const endTime = game?.endedAt ? new Date(game.endedAt) : null;
  const duration = startTime && endTime
    ? Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60)
    : null;

  return (
    <div className="game-over-screen">
      <div className="game-over-content">
        {isDraw ? (
          <>
            <h2 className="game-over-title draw">Draw!</h2>
            <p className="game-over-subtitle">Neither player reached the goal</p>
          </>
        ) : isWinner ? (
          <>
            <h2 className="game-over-title winner">Victory!</h2>
            <p className="game-over-subtitle">
              {endReason === "surrender" ? "Your opponent surrendered" : `You reached ${myScore} points first`}
            </p>
          </>
        ) : (
          <>
            <h2 className="game-over-title loser">Defeat</h2>
            <p className="game-over-subtitle">
              {endReason === "surrender" ? "You surrendered" : `Your opponent reached ${opponentScore} points first`}
            </p>
          </>
        )}

        <div className="game-over-scores">
          <div className={`score-card ${isWinner && !isDraw ? "winner" : ""}`}>
            <div className="score-label">You</div>
            <div className="score-value">{myScore}</div>
          </div>
          <div className="score-vs">-</div>
          <div className={`score-card ${!isWinner && !isDraw ? "winner" : ""}`}>
            <div className="score-label">Opponent</div>
            <div className="score-value">{opponentScore}</div>
          </div>
        </div>

        <div className="game-over-stats">
          <div className="game-stat">
            <span className="stat-label">Rounds</span>
            <span className="stat-value">{roundsPlayed}</span>
          </div>
          {duration !== null && (
            <div className="game-stat">
              <span className="stat-label">Duration</span>
              <span className="stat-value">{duration} min</span>
            </div>
          )}
        </div>

        <div className="game-over-actions">
          <Link to="/play" className="btn btn-primary btn-large">
            Play Again
          </Link>
          <Link to="/" className="btn">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
