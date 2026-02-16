import { useGame } from "../../contexts/GameContext";
import { CommittedCardPreview } from "./CommittedCardPreview";

export function WaitingForOpponent() {
  const { playerState, getSleeve, getAnimal, getEquipment, isAsync } = useGame();

  const commit = playerState?.currentCommit;

  return (
    <div className="waiting-for-opponent">
      <div className="waiting-spinner">
        <div className="spinner" />
        <p>{isAsync ? "Resolving round..." : "Waiting for opponent to commit..."}</p>
      </div>

      {commit && (
        <div className="your-commit">
          <h3>Your Committed Card</h3>
          <CommittedCardPreview
            commit={commit}
            getSleeve={getSleeve}
            getAnimal={getAnimal}
            getEquipment={getEquipment}
          />
        </div>
      )}
    </div>
  );
}
