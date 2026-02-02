import { useGame } from "../../contexts/GameContext";
import { CombatDisplay } from "./CombatDisplay";

export function RoundResult() {
  const { latestRound } = useGame();

  if (!latestRound) {
    return null;
  }

  return (
    <div className="round-result">
      <h3>Round {latestRound.roundNumber} Results</h3>
      <CombatDisplay />
    </div>
  );
}
