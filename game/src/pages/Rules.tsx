import { useEffect, useState } from "react";
import { subscribeToRules } from "../firebase";
import type { GameRules } from "@sleeved-potential/shared";
import { DEFAULT_GAME_RULES } from "@sleeved-potential/shared";

export function Rules() {
  const [rules, setRules] = useState<GameRules | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToRules((loadedRules) => {
      setRules(loadedRules);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="loading">Loading rules...</div>;
  }

  if (!rules) {
    return (
      <div className="rules-page">
        <h2>Game Rules</h2>
        <div className="alert alert-warning">Rules not configured yet.</div>
      </div>
    );
  }

  const maxRounds = rules.maxRounds ?? DEFAULT_GAME_RULES.maxRounds;
  const pointsForKill = rules.pointsForKill ?? DEFAULT_GAME_RULES.pointsForKill;
  const pointsPerOverkill = rules.pointsPerOverkill ?? DEFAULT_GAME_RULES.pointsPerOverkill;
  const pointsPerAbsorbed = rules.pointsPerAbsorbed ?? DEFAULT_GAME_RULES.pointsPerAbsorbed;

  return (
    <div className="rules-page">
      <h2>Game Rules</h2>

      <section className="rules-section">
        <h3>Overview</h3>
        <p>
          Sleeved Potential is a 1v1 composite card game where you "build" cards by layering
          transparent components inside sleeves. Each round, both players commit a composed card
          (Sleeve + Animal + optional Equipment), then cards fight. After {maxRounds} rounds,
          the player with more points wins.
        </p>
      </section>

      <section className="rules-section">
        <h3>Scoring</h3>
        <div className="rules-grid">
          <div className="rule-item">
            <span className="rule-label">Rounds per Game</span>
            <span className="rule-value">{maxRounds}</span>
          </div>
          <div className="rule-item">
            <span className="rule-label">Kill Bonus</span>
            <span className="rule-value">+{pointsForKill}</span>
          </div>
        </div>
        <p className="rules-explanation-text">
          Score points by defeating your opponent's card (kill bonus + overkill damage dealt) and by
          absorbing damage while your card survives.
        </p>
        <div className="rules-detail-row">
          <span>+{pointsPerAbsorbed} pt per HP absorbed (damage taken while surviving)</span>
          <span>+{pointsPerOverkill} pt per HP of overkill dealt</span>
        </div>
      </section>

      <section className="rules-section">
        <h3>Card Draw</h3>
        <div className="rules-grid">
          <div className="rule-item">
            <span className="rule-label">Starting Animals</span>
            <span className="rule-value">{rules.startingAnimalHand}</span>
          </div>
          <div className="rule-item">
            <span className="rule-label">Starting Equipment</span>
            <span className="rule-value">{rules.startingEquipmentHand}</span>
          </div>
          <div className="rule-item">
            <span className="rule-label">Equipment Draw / Round</span>
            <span className="rule-value">+{rules.equipmentDrawPerRound}</span>
          </div>
        </div>
      </section>

      <section className="rules-section">
        <h3>Combat</h3>
        <div className="rules-explanation">
          <ul>
            <li>
              <strong>Equal Initiative:</strong> Both cards attack simultaneously
            </li>
            <li>
              <strong>Different Initiative:</strong> Higher initiative attacks first; defender
              counterattacks only if they survive
            </li>
          </ul>
          <p className="rules-detail-text">
            Default initiative for all cards: {rules.defaultInitiative}
          </p>
        </div>
      </section>

      <section className="rules-section">
        <h3>Card Composition</h3>
        <div className="rules-explanation">
          <p>Cards are composed by stacking transparent components in order:</p>
          <ol>
            <li>
              <strong>Sleeve Background</strong> (bottom layer) — easily overwritten
            </li>
            <li>
              <strong>Animal</strong> — the champion
            </li>
            <li>
              <strong>Equipment</strong> (0 or more) — stacked in player-chosen order
            </li>
            <li>
              <strong>Sleeve Foreground</strong> (top layer) — guaranteed stat
            </li>
          </ol>
          <p>
            <strong>Stat Resolution:</strong> Higher layers overwrite same stats from lower layers.
          </p>
        </div>
      </section>

      <section className="rules-section">
        <h3>Card Types</h3>
        <div className="rules-explanation">
          <h4>Sleeves</h4>
          <ul>
            <li>Both players share the same sleeve pool</li>
            <li>All sleeves available each round; used sleeves go to graveyard and return when all are used</li>
          </ul>

          <h4>Animals</h4>
          <ul>
            <li>Each player gets their own shuffled deck</li>
            <li>Always hold {rules.startingAnimalHand} animals; used ones go to your discard pile</li>
          </ul>

          <h4>Equipment</h4>
          <ul>
            <li>Starting hand: {rules.startingEquipmentHand} cards; draw {rules.equipmentDrawPerRound} per round</li>
            <li>No hand limit; unlimited stacking per composed card</li>
          </ul>
        </div>
      </section>

      <p className="meta-info">Rules version: {rules.version}</p>
    </div>
  );
}
