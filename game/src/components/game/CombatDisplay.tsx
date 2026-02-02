import { useMemo } from "react";
import { useGame } from "../../contexts/GameContext";
import { useUser } from "../../contexts/UserContext";
import { CommittedCardPreview } from "./CommittedCardPreview";

export function CombatDisplay() {
  const { latestRound, getSleeve, getAnimal, getEquipment, opponentId } = useGame();
  const { user } = useUser();

  const userId = user?.id;

  const myCommit = useMemo(() => {
    if (!latestRound || !userId) return null;
    return latestRound.commits[userId] ?? null;
  }, [latestRound, userId]);

  const opponentCommit = useMemo(() => {
    if (!latestRound || !opponentId) return null;
    return latestRound.commits[opponentId] ?? null;
  }, [latestRound, opponentId]);

  const myOutcome = useMemo(() => {
    if (!latestRound || !userId) return undefined;
    return latestRound.results[userId];
  }, [latestRound, userId]);

  const opponentOutcome = useMemo(() => {
    if (!latestRound || !opponentId) return undefined;
    return latestRound.results[opponentId];
  }, [latestRound, opponentId]);

  // Check if effects were triggered for each player
  const myEffectTriggered = useMemo(() => {
    if (!latestRound || !userId) return false;
    return latestRound.effectsTriggered?.some((e) => e.odIdplayerId === userId) ?? false;
  }, [latestRound, userId]);

  const opponentEffectTriggered = useMemo(() => {
    if (!latestRound || !opponentId) return false;
    return latestRound.effectsTriggered?.some((e) => e.odIdplayerId === opponentId) ?? false;
  }, [latestRound, opponentId]);

  if (!myCommit || !opponentCommit) {
    return null;
  }

  return (
    <div className="combat-display">
      <CommittedCardPreview
        commit={myCommit}
        getSleeve={getSleeve}
        getAnimal={getAnimal}
        getEquipment={getEquipment}
        label="You"
        outcome={myOutcome}
        effectTriggered={myEffectTriggered}
        showStats={false}
      />

      <div className="combat-vs">VS</div>

      <CommittedCardPreview
        commit={opponentCommit}
        getSleeve={getSleeve}
        getAnimal={getAnimal}
        getEquipment={getEquipment}
        label="Opponent"
        outcome={opponentOutcome}
        effectTriggered={opponentEffectTriggered}
        showStats={false}
      />
    </div>
  );
}
