import { Link } from "react-router-dom";
import { useGame } from "../../contexts/GameContext";
import { useUser } from "../../contexts/UserContext";
import { useMemo } from "react";
import type { RoundOutcome } from "@sleeved-potential/shared";

function RoundScoreCells({ outcome }: { outcome: RoundOutcome }) {
  const tooSlow = !outcome.survived && outcome.damageDealt === 0;

  if (tooSlow) {
    return (
      <>
        <td className="round-points too-slow">0</td>
        <td className="round-detail too-slow">
          <span className="detail-split">
            <span className="too-slow-label">too slow</span>
          </span>
        </td>
      </>
    );
  }

  return (
    <>
      <td className={`round-points ${outcome.pointsEarned === 0 ? "zero" : ""}`}>
        {outcome.pointsEarned}
      </td>
      <td className="round-detail">
        <span className="detail-split">
          <span className={`detail-left ${outcome.killBonus > 0 ? "kill-points" : "zero-points"}`}>
            {outcome.killBonus}
          </span>
          <span className="detail-sep">+</span>
          <span className={`detail-right ${outcome.damageAbsorbed > 0 ? "absorbed-points" : "zero-points"}`}>
            {outcome.damageAbsorbed}
          </span>
        </span>
      </td>
    </>
  );
}

export function GameOverScreen() {
  const { game, myScore, opponentScore, opponentId, isAsync, snapshotOpponentName } = useGame();
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

  // Get ELO change from game data (if available)
  const myEloChange = userId && game?.eloChanges?.[userId];

  const totals = useMemo(() => {
    if (!game || !userId || !opponentId) return null;
    let myKill = 0, myAbs = 0, oppKill = 0, oppAbs = 0;
    for (const round of game.rounds) {
      const my = round.results[userId];
      const opp = round.results[opponentId];
      if (my) { myKill += my.killBonus; myAbs += my.damageAbsorbed; }
      if (opp) { oppKill += opp.killBonus; oppAbs += opp.damageAbsorbed; }
    }
    return { myKill, myAbs, oppKill, oppAbs };
  }, [game, userId, opponentId]);

  return (
    <div className="game-over-screen">
      <div className="game-over-content">
        {isDraw ? (
          <>
            <h2 className="game-over-title draw">Draw!</h2>
            <p className="game-over-subtitle">
              {endReason === "rounds_complete" ? `Match tied after ${roundsPlayed} rounds` : "Neither player reached the goal"}
            </p>
          </>
        ) : isWinner ? (
          <>
            <h2 className="game-over-title winner">Victory!</h2>
            <p className="game-over-subtitle">
              {endReason === "surrender"
                ? (isAsync ? `${snapshotOpponentName ?? "Snapshot"}'s strategy fell short` : "Your opponent surrendered")
                : endReason === "rounds_complete"
                  ? `${myScore} - ${opponentScore} after ${roundsPlayed} rounds`
                  : `You reached ${myScore} points first`}
            </p>
          </>
        ) : (
          <>
            <h2 className="game-over-title loser">Defeat</h2>
            <p className="game-over-subtitle">
              {endReason === "surrender"
                ? "You surrendered"
                : endReason === "rounds_complete"
                  ? `${opponentScore} - ${myScore} after ${roundsPlayed} rounds`
                  : `Your opponent reached ${opponentScore} points first`}
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
            <div className="score-label">{isAsync ? (snapshotOpponentName ?? "Snapshot") : "Opponent"}</div>
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

        {game && userId && opponentId && game.rounds.length > 0 && (
          <div className="round-breakdown">
            <table>
              <thead>
                <tr>
                  <th className="col-round"></th>
                  <th className="col-points">You</th>
                  <th className="col-detail">
                    <span className="detail-split">
                      <span className="breakdown-legend">kill + abs</span>
                    </span>
                  </th>
                  <th className="col-points">Opp</th>
                  <th className="col-detail">
                    <span className="detail-split">
                      <span className="breakdown-legend">kill + abs</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {game.rounds.map((round) => {
                  const myOutcome = round.results[userId];
                  const oppOutcome = round.results[opponentId];
                  if (!myOutcome || !oppOutcome) return null;
                  return (
                    <tr key={round.roundNumber}>
                      <td className="round-number">R{round.roundNumber}</td>
                      <RoundScoreCells outcome={myOutcome} />
                      <RoundScoreCells outcome={oppOutcome} />
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="round-number">Total</td>
                  <td className="round-points round-total">{myScore}</td>
                  <td className="round-detail round-total">
                    {totals && (
                      <span className="detail-split">
                        <span className={`detail-left ${totals.myKill > 0 ? "kill-points" : "zero-points"}`}>{totals.myKill}</span>
                        <span className="detail-sep">+</span>
                        <span className={`detail-right ${totals.myAbs > 0 ? "absorbed-points" : "zero-points"}`}>{totals.myAbs}</span>
                      </span>
                    )}
                  </td>
                  <td className="round-points round-total">{opponentScore}</td>
                  <td className="round-detail round-total">
                    {totals && (
                      <span className="detail-split">
                        <span className={`detail-left ${totals.oppKill > 0 ? "kill-points" : "zero-points"}`}>{totals.oppKill}</span>
                        <span className="detail-sep">+</span>
                        <span className={`detail-right ${totals.oppAbs > 0 ? "absorbed-points" : "zero-points"}`}>{totals.oppAbs}</span>
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {myEloChange && (
          <div className="elo-change-section">
            <div className="elo-display">
              <span className="elo-label">Rating</span>
              <span className="elo-previous">{myEloChange.previousElo}</span>
              <span className="elo-arrow">→</span>
              <span className="elo-new">{myEloChange.newElo}</span>
              <span className={`elo-change ${myEloChange.change >= 0 ? "positive" : "negative"}`}>
                ({myEloChange.change >= 0 ? "+" : ""}{myEloChange.change})
              </span>
            </div>
          </div>
        )}

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
