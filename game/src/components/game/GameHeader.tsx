import { useGame } from "../../contexts/GameContext";
import { useUser } from "../../contexts/UserContext";
import { subscribeToUser } from "../../firebase";
import { useEffect, useState } from "react";
import type { User } from "@sleeved-potential/shared";

export function GameHeader() {
  const { game, myScore, opponentScore, opponentId } = useGame();
  const { user } = useUser();
  const [opponent, setOpponent] = useState<User | null>(null);

  useEffect(() => {
    if (!opponentId) return;
    const unsubscribe = subscribeToUser(opponentId, setOpponent);
    return unsubscribe;
  }, [opponentId]);

  if (!game) return null;

  const pointsToWin = game.rulesSnapshot.pointsToWin;
  const currentRound = game.currentRound;

  return (
    <div className="game-header">
      <div className="game-header-player me">
        <div className="player-name">{user?.displayName ?? "You"}</div>
        <div className="player-score">{myScore}</div>
      </div>

      <div className="game-header-center">
        <div className="round-info">Round {currentRound}</div>
        <div className="points-to-win">First to {pointsToWin}</div>
      </div>

      <div className="game-header-player opponent">
        <div className="player-name">{opponent?.displayName ?? "Opponent"}</div>
        <div className="player-score">{opponentScore}</div>
      </div>
    </div>
  );
}
