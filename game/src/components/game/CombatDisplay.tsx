import { useMemo } from "react";
import { useGame } from "../../contexts/GameContext";
import { useUser } from "../../contexts/UserContext";
import { CommittedCardPreview } from "./CommittedCardPreview";
import type { RoundOutcome } from "@sleeved-potential/shared";

function ScoreBreakdown({ outcome }: { outcome: RoundOutcome }) {
  if (!outcome.survived) {
    return (
      <div className="score-breakdown destroyed">
        <span className="score-total">0 points</span>
        <span className="score-detail">(destroyed)</span>
      </div>
    );
  }

  const parts: string[] = [];
  if (outcome.damageAbsorbed > 0) parts.push(`${outcome.damageAbsorbed} absorbed`);
  if (outcome.killBonus > 0) parts.push(`${outcome.killBonus} kill`);

  return (
    <div className="score-breakdown survived">
      <span className="score-total">+{outcome.pointsEarned} points</span>
      {parts.length > 0 && <span className="score-detail">({parts.join(" + ")})</span>}
    </div>
  );
}

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
      <div className="combat-player">
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
        {myOutcome && <ScoreBreakdown outcome={myOutcome} />}
      </div>

      <div className="combat-vs">VS</div>

      <div className="combat-player">
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
        {opponentOutcome && <ScoreBreakdown outcome={opponentOutcome} />}
      </div>
    </div>
  );
}
