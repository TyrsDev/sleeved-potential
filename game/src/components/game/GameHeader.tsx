import { useGame } from "../../contexts/GameContext";
import { useUser } from "../../contexts/UserContext";
import { subscribeToUser, surrenderGame } from "../../firebase";
import { useEffect, useState } from "react";
import type { User } from "@sleeved-potential/shared";
import { useNavigate } from "react-router-dom";

export function GameHeader() {
  const { game, myScore, opponentScore, opponentId } = useGame();
  const { user } = useUser();
  const navigate = useNavigate();
  const [opponent, setOpponent] = useState<User | null>(null);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [surrendering, setSurrendering] = useState(false);

  useEffect(() => {
    if (!opponentId) return;
    const unsubscribe = subscribeToUser(opponentId, setOpponent);
    return unsubscribe;
  }, [opponentId]);

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

  const pointsToWin = game.rulesSnapshot.pointsToWin;
  const currentRound = game.currentRound;

  return (
    <>
      <div className="game-header">
        <div className="game-header-player me">
          <div className="player-name">{user?.displayName ?? "You"}</div>
          <div className="player-score">{myScore}</div>
        </div>

        <div className="game-header-center">
          <div className="round-info">Round {currentRound}</div>
          <div className="points-to-win">First to {pointsToWin}</div>
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

        <div className="game-header-player opponent">
          <div className="player-name">{opponent?.displayName ?? "Opponent"}</div>
          <div className="player-score">{opponentScore}</div>
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
