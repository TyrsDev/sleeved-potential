import { useEffect, useState } from "react";
import { subscribeToRules } from "../firebase";
import type { GameRules } from "@sleeved-potential/shared";

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

  return (
    <div className="rules-page">
      <h2>Game Rules</h2>

      <section className="rules-section">
        <h3>Overview</h3>
        <p>
          Sleeved Potential is a 1v1 composite card game where you "build" cards by layering
          transparent components inside sleeves. Each round, both players commit a composed card
          (Sleeve + Animal + optional Equipment), then cards fight. After {rules.maxRounds} rounds,
          the player with more points wins.
        </p>
      </section>

      <section className="rules-section">
        <h3>Scoring</h3>
        <div className="rules-grid">
          <div className="rule-item">
            <span className="rule-label">Rounds per Game</span>
            <span className="rule-value">{rules.maxRounds}</span>
          </div>
          <div className="rule-item">
            <span className="rule-label">Kill Bonus</span>
            <span className="rule-value">+{rules.pointsForKill}</span>
          </div>
          <div className="rule-item">
            <span className="rule-label">Per Overkill HP</span>
            <span className="rule-value">+{rules.pointsPerOverkill}</span>
          </div>
          <div className="rule-item">
            <span className="rule-label">Per Damage Absorbed</span>
            <span className="rule-value">+{rules.pointsPerAbsorbed}</span>
          </div>
        </div>
        <div className="rules-explanation">
          <p>If your card is destroyed, you score 0 points for that round. If you survive, you earn
            points for damage absorbed plus kill/overkill bonuses.</p>
        </div>
      </section>

      <section className="rules-section">
        <h3>Starting Hands</h3>
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
            <span className="rule-label">Equipment Draw per Round</span>
            <span className="rule-value">{rules.equipmentDrawPerRound}</span>
          </div>
        </div>
      </section>

      <section className="rules-section">
        <h3>Combat</h3>
        <div className="rules-grid">
          <div className="rule-item">
            <span className="rule-label">Default Initiative</span>
            <span className="rule-value">{rules.defaultInitiative}</span>
          </div>
        </div>
        <div className="rules-explanation">
          <h4>Combat Resolution</h4>
          <ul>
            <li>
              <strong>Equal Initiative:</strong> Both cards attack simultaneously (1 attack round)
            </li>
            <li>
              <strong>Different Initiative:</strong> Higher initiative attacks first, then defender
              attacks back if they survive (2 attack rounds)
            </li>
          </ul>
        </div>
      </section>

      <section className="rules-section">
        <h3>Card Composition</h3>
        <div className="rules-explanation">
          <p>Cards are composed by stacking transparent components in order:</p>
          <ol>
            <li>
              <strong>Sleeve Background</strong> (bottom layer) - easily overwritten
            </li>
            <li>
              <strong>Animal</strong> - the "champion"
            </li>
            <li>
              <strong>Equipment</strong> (0+) - stacked in player-chosen order
            </li>
            <li>
              <strong>Sleeve Foreground</strong> (top layer) - guaranteed stat
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
          <h4>Sleeves (5 total)</h4>
          <ul>
            <li>Both players have copies of all sleeves</li>
            <li>All available each round; used sleeves go to graveyard</li>
            <li>When all used, graveyard returns</li>
          </ul>

          <h4>Animals (per-player deck)</h4>
          <ul>
            <li>Each player gets their own shuffled copy of all animals</li>
            <li>Hand: Always hold {rules.startingAnimalHand} Animals</li>
            <li>Used Animals go to your own discard pile</li>
          </ul>

          <h4>Equipment (20 total, per-player deck)</h4>
          <ul>
            <li>Starting hand: {rules.startingEquipmentHand} cards</li>
            <li>Per-round draw: {rules.equipmentDrawPerRound} card(s)</li>
            <li>No hand limit; unlimited stacking per composed card</li>
          </ul>
        </div>
      </section>

      <p className="meta-info">Rules version: {rules.version}</p>
    </div>
  );
}
