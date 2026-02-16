import { useGame } from "../../contexts/GameContext";
import { useUser } from "../../contexts/UserContext";
import { subscribeToUser, surrenderGame } from "../../firebase";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import type { User } from "@sleeved-potential/shared";
import { useNavigate } from "react-router-dom";

interface GameHeaderProps {
  actionButton?: ReactNode;
}

export function GameHeader({ actionButton }: GameHeaderProps) {
  const { game, myScore, opponentScore, opponentId, latestRound, showingResult, isAsync, snapshotOpponentName, maxRounds } = useGame();
  const { user } = useUser();
  const navigate = useNavigate();
  const [opponent, setOpponent] = useState<User | null>(null);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [surrendering, setSurrendering] = useState(false);

  useEffect(() => {
    // For async games, don't subscribe to user doc for the snapshot player
    if (!opponentId || isAsync) return;
    const unsubscribe = subscribeToUser(opponentId, setOpponent);
    return unsubscribe;
  }, [opponentId, isAsync]);

  // Calculate score changes from latest round
  const scoreChanges = useMemo(() => {
    if (!latestRound || !showingResult || !user?.id || !opponentId) {
      return { my: null, opponent: null };
    }
    const myResult = latestRound.results[user.id];
    const opponentResult = latestRound.results[opponentId];
    return {
      my: myResult?.pointsEarned ?? null,
      opponent: opponentResult?.pointsEarned ?? null,
    };
  }, [latestRound, showingResult, user?.id, opponentId]);

  const handleSurrenderClick = () => {
    setShowSurrenderConfirm(true);
  };

  const handleSurrenderConfirm = async () => {
    if (!game) return;
    setSurrendering(true);
    try {
      await surrenderGame(game.id);
      navigate("/");
    } catch (err) {
      console.error("Failed to surrender:", err);
      setSurrendering(false);
      setShowSurrenderConfirm(false);
    }
  };

  const handleSurrenderCancel = () => {
    setShowSurrenderConfirm(false);
  };

  if (!game) return null;

  const currentRound = game.currentRound;

  return (
    <>
      <div className="game-header">
        <div className="game-header-player me">
          <div className="player-name">{user?.displayName ?? "You"}</div>
          <div className="player-score">
            {myScore}
            {scoreChanges.my !== null && (
              <span className={`score-change ${scoreChanges.my > 0 ? "positive" : "zero"}`}>
                (+{scoreChanges.my})
              </span>
            )}
          </div>
        </div>

        <div className="game-header-center">
          <div className="round-info">Round {currentRound} / {maxRounds}</div>
          <div className="header-actions">
            {actionButton}
            {game.status === "active" && (
              <button
                className="btn btn-small btn-surrender"
                onClick={handleSurrenderClick}
                disabled={surrendering}
              >
                Surrender
              </button>
            )}
          </div>
        </div>

        <div className="game-header-player opponent">
          <div className="player-name">{isAsync ? (snapshotOpponentName ?? "Snapshot") : (opponent?.displayName ?? "Opponent")}</div>
          <div className="player-score">
            {opponentScore}
            {scoreChanges.opponent !== null && (
              <span className={`score-change ${scoreChanges.opponent > 0 ? "positive" : "zero"}`}>
                (+{scoreChanges.opponent})
              </span>
            )}
          </div>
        </div>
      </div>

      {showSurrenderConfirm && (
        <div className="modal-overlay" onClick={handleSurrenderCancel}>
          <div className="modal-content surrender-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Surrender?</h3>
            <p>Are you sure you want to surrender? This will count as a loss.</p>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleSurrenderConfirm}
                disabled={surrendering}
              >
                {surrendering ? "Surrendering..." : "Yes, Surrender"}
              </button>
              <button className="btn" onClick={handleSurrenderCancel} disabled={surrendering}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
