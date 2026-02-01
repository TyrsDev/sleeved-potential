import { useMemo } from "react";
import { useGame } from "../../contexts/GameContext";
import { useUser } from "../../contexts/UserContext";
import { CombatDisplay } from "./CombatDisplay";
import { formatEffectAction, formatTriggerName } from "@sleeved-potential/shared";

interface RoundResultProps {
  onContinue: () => void;
}

export function RoundResult({ onContinue }: RoundResultProps) {
  const { latestRound, myScore, opponentScore, opponentId, game } = useGame();
  const { user } = useUser();

  const userId = user?.id;

  const myOutcome = useMemo(() => {
    if (!latestRound || !userId) return null;
    return latestRound.results[userId] ?? null;
  }, [latestRound, userId]);

  const opponentOutcome = useMemo(() => {
    if (!latestRound || !opponentId) return null;
    return latestRound.results[opponentId] ?? null;
  }, [latestRound, opponentId]);

  const effectsTriggered = latestRound?.effectsTriggered ?? [];
  const myEffects = effectsTriggered.filter((e) => e.odIdplayerId === userId);
  const opponentEffects = effectsTriggered.filter((e) => e.odIdplayerId === opponentId);

  if (!latestRound || !myOutcome || !opponentOutcome) {
    return null;
  }

  return (
    <div className="round-result">
      <h3>Round {latestRound.roundNumber} Results</h3>

      {/* Combat display */}
      <CombatDisplay />

      {/* Results grid */}
      <div className="results-grid">
        <div className={`result-card ${myOutcome.survived ? "survived" : "destroyed"}`}>
          <h4>You</h4>
          <div className="result-status">
            {myOutcome.survived ? "SURVIVED" : "DESTROYED"}
          </div>
          <div className="result-health">
            {myOutcome.finalHealth} HP remaining
          </div>
          <div className="result-points">+{myOutcome.pointsEarned} points</div>
          {myOutcome.defeated && (
            <div className="result-badge">Defeated opponent</div>
          )}
        </div>

        <div className="vs-divider">VS</div>

        <div className={`result-card ${opponentOutcome.survived ? "survived" : "destroyed"}`}>
          <h4>Opponent</h4>
          <div className="result-status">
            {opponentOutcome.survived ? "SURVIVED" : "DESTROYED"}
          </div>
          <div className="result-health">
            {opponentOutcome.finalHealth} HP remaining
          </div>
          <div className="result-points">+{opponentOutcome.pointsEarned} points</div>
          {opponentOutcome.defeated && (
            <div className="result-badge">Defeated opponent</div>
          )}
        </div>
      </div>

      {/* Score totals */}
      <div className="score-totals">
        <div className="score-total">You: <strong>{myScore}</strong></div>
        <div className="score-separator">/</div>
        <div className="score-total">Opponent: <strong>{opponentScore}</strong></div>
        <div className="score-target">Goal: {game?.rulesSnapshot.pointsToWin}</div>
      </div>

      {/* Effects triggered */}
      {effectsTriggered.length > 0 && (
        <div className="effects-triggered">
          <h4>Effects Triggered</h4>
          <ul>
            {myEffects.map((effect, i) => (
              <li key={`my-${i}`}>
                <strong>You:</strong>{" "}
                {formatTriggerName(effect.effect.trigger)} &rarr; {formatEffectAction(effect.effect)}
              </li>
            ))}
            {opponentEffects.map((effect, i) => (
              <li key={`opp-${i}`}>
                <strong>Opponent:</strong>{" "}
                {formatTriggerName(effect.effect.trigger)} &rarr; {formatEffectAction(effect.effect)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onContinue} className="btn btn-primary btn-large">
        Continue
      </button>
    </div>
  );
}
