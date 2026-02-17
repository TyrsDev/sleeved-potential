import { useMemo } from "react";
import { useGame } from "../../contexts/GameContext";
import { useUser } from "../../contexts/UserContext";
import { CommittedCardPreview } from "./CommittedCardPreview";
import type { RoundOutcome, ResolvedStats } from "@sleeved-potential/shared";

function ScoreBreakdown({ outcome }: { outcome: RoundOutcome }) {
  const parts: string[] = [];
  if (outcome.damageAbsorbed > 0) parts.push(`${outcome.damageAbsorbed} absorbed`);
  if (outcome.killBonus > 0) parts.push(`${outcome.killBonus} kill`);

  const prefix = outcome.pointsEarned > 0 ? "+" : "";

  return (
    <div className={`score-breakdown ${outcome.survived ? "survived" : "destroyed"}`}>
      <span className="score-total">{prefix}{outcome.pointsEarned} points</span>
      {parts.length > 0 && <span className="score-detail">({parts.join(" + ")})</span>}
      {!outcome.survived && <span className="score-detail destroyed-label">[destroyed]</span>}
    </div>
  );
}

function StatsPreview({ stats }: { stats: ResolvedStats }) {
  return (
    <div className="combat-stats-preview">
      <div className="stat-box damage">
        <span className="stat-label">DMG</span>
        <span className="stat-value">{stats.damage}</span>
      </div>
      <div className="stat-box health">
        <span className="stat-label">HP</span>
        <span className="stat-value">{stats.health}</span>
      </div>
      <div className="stat-box initiative">
        <span className="stat-label">INIT</span>
        <span className="stat-value">{stats.initiative}</span>
      </div>
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
        <StatsPreview stats={myCommit.finalStats} />
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
        <StatsPreview stats={opponentCommit.finalStats} />
        {opponentOutcome && <ScoreBreakdown outcome={opponentOutcome} />}
      </div>
    </div>
  );
}
