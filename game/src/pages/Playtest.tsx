import { useEffect, useState, useCallback } from "react";
import { subscribeToCards, subscribeToRules } from "../firebase";
import {
  resolveStats,
  resolveCombat,
  formatEffectAction,
  formatTriggerName,
  type CombatResult,
} from "@sleeved-potential/shared";
import type {
  CardDefinition,
  CardStats,
  ResolvedStats,
  RoundOutcome,
  GameRules,
  TriggeredEffect,
} from "@sleeved-potential/shared";

/**
 * Format a card's stats into a tooltip string
 */
function formatCardTooltip(card: CardDefinition): string {
  const lines: string[] = [card.name];

  if (card.type === "sleeve") {
    if (card.backgroundStats) {
      lines.push("", "Background:");
      lines.push(...formatStatsLines(card.backgroundStats));
    }
    if (card.foregroundStats) {
      lines.push("", "Foreground:");
      lines.push(...formatStatsLines(card.foregroundStats));
    }
  } else if (card.stats) {
    lines.push(...formatStatsLines(card.stats));
  }

  if (card.description) {
    lines.push("", card.description);
  }

  return lines.join("\n");
}

function formatStatsLines(stats: CardStats): string[] {
  const lines: string[] = [];
  if (stats.damage !== undefined) lines.push(`  Damage: ${stats.damage}`);
  if (stats.health !== undefined) lines.push(`  Health: ${stats.health}`);
  if (stats.initiative !== undefined && stats.initiative !== 0) {
    lines.push(`  Initiative: ${stats.initiative > 0 ? "+" : ""}${stats.initiative}`);
  }
  if (stats.modifier) {
    lines.push(
      `  Modifier: ${stats.modifier.amount > 0 ? "+" : ""}${stats.modifier.amount} ${stats.modifier.type}`
    );
  }
  if (stats.specialEffect) {
    lines.push(
      `  Effect: ${formatTriggerName(stats.specialEffect.trigger)} → ${formatEffectAction(stats.specialEffect)}`
    );
  }
  return lines;
}

/**
 * Mini card display with label, image (if available), and stats overlay
 */
function MiniCardDisplay({ card }: { card: CardDefinition }) {
  // Get the stats to display
  const stats =
    card.type === "sleeve"
      ? { ...card.backgroundStats, ...card.foregroundStats }
      : card.stats;

  const typeLabel = card.type.toUpperCase();
  const typeClass = `fallback-${card.type}`;

  // Format effect for display
  const effectText =
    stats?.specialEffect
      ? `${formatTriggerName(stats.specialEffect.trigger)}: ${formatEffectAction(stats.specialEffect)}`
      : null;

  // Format modifier for display
  const modifierText = stats?.modifier
    ? `${stats.modifier.amount > 0 ? "+" : ""}${stats.modifier.amount} ${stats.modifier.type === "damage" ? "dmg" : "hp"}`
    : null;

  return (
    <div className={`mini-card-display ${typeClass}`}>
      <div className="mini-card-label">{typeLabel}</div>
      <div className="mini-card-content">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="mini-card-image" />
        ) : (
          <div className="mini-card-placeholder" />
        )}
        <div className="mini-card-overlay">
          {/* TOP: Special Effect */}
          <div className="mini-card-top">
            {effectText && <div className="mini-card-effect">{effectText}</div>}
          </div>
          {/* MIDDLE: Modifier */}
          <div className="mini-card-middle">
            {modifierText && <div className="mini-card-modifier">{modifierText}</div>}
          </div>
          {/* BOTTOM: Combat stats */}
          <div className="mini-card-stats">
            <span className="mini-stat damage">
              {stats?.damage !== undefined && stats.damage !== 0 ? stats.damage : ""}
            </span>
            <span className="mini-stat initiative">
              {stats?.initiative !== undefined && stats.initiative !== 0
                ? `${stats.initiative > 0 ? "+" : ""}${stats.initiative}`
                : ""}
            </span>
            <span className="mini-stat health">
              {stats?.health !== undefined && stats.health !== 0 ? stats.health : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SelectedEquipment {
  card: CardDefinition;
  order: number;
}

interface PlayerComposition {
  sleeve: CardDefinition | null;
  animal: CardDefinition | null;
  equipment: SelectedEquipment[];
}

interface BattleResult {
  player1: {
    composition: PlayerComposition;
    resolvedStats: ResolvedStats;
    outcome: RoundOutcome;
  };
  player2: {
    composition: PlayerComposition;
    resolvedStats: ResolvedStats;
    outcome: RoundOutcome;
  };
  effectsTriggered: TriggeredEffect[];
  combatLog: string[];
}

/**
 * Resolve stats for a player composition using shared logic
 */
function resolveCompositionStats(composition: PlayerComposition): ResolvedStats {
  const sortedEquipment = [...composition.equipment]
    .sort((a, b) => a.order - b.order)
    .map((e) => e.card);

  return resolveStats(composition.sleeve, composition.animal, sortedEquipment);
}

/**
 * Simulate a battle between two players using shared combat logic
 */
function simulateBattle(
  p1Composition: PlayerComposition,
  p2Composition: PlayerComposition,
  rules: GameRules
): BattleResult {
  const p1Stats = resolveCompositionStats(p1Composition);
  const p2Stats = resolveCompositionStats(p2Composition);

  const combatResult: CombatResult = resolveCombat({
    player1: { playerId: "Player 1", stats: p1Stats },
    player2: { playerId: "Player 2", stats: p2Stats },
    rules,
  });

  const effectsTriggered: TriggeredEffect[] = [];
  if (combatResult.player1.effectTriggered) {
    effectsTriggered.push(combatResult.player1.effectTriggered);
  }
  if (combatResult.player2.effectTriggered) {
    effectsTriggered.push(combatResult.player2.effectTriggered);
  }

  return {
    player1: {
      composition: p1Composition,
      resolvedStats: p1Stats,
      outcome: combatResult.player1.outcome,
    },
    player2: {
      composition: p2Composition,
      resolvedStats: p2Stats,
      outcome: combatResult.player2.outcome,
    },
    effectsTriggered,
    combatLog: combatResult.combatLog,
  };
}

// Card selection component for one player
function PlayerCardSelector({
  title,
  cards,
  composition,
  onSleeveSelect,
  onAnimalSelect,
  onEquipmentAdd,
  onEquipmentRemove,
  onClear,
}: {
  title: string;
  cards: CardDefinition[];
  composition: PlayerComposition;
  onSleeveSelect: (card: CardDefinition | null) => void;
  onAnimalSelect: (card: CardDefinition | null) => void;
  onEquipmentAdd: (card: CardDefinition) => void;
  onEquipmentRemove: (order: number) => void;
  onClear: () => void;
}) {
  const sleeves = cards.filter((c) => c.type === "sleeve");
  const animals = cards.filter((c) => c.type === "animal");
  const equipment = cards.filter((c) => c.type === "equipment");
  const resolvedStats = resolveCompositionStats(composition);
  const sortedEquipment = [...composition.equipment].sort((a, b) => a.order - b.order);

  return (
    <div className="player-selector">
      <div className="player-selector-header">
        <h3>{title}</h3>
        <button onClick={onClear} className="btn btn-small">
          Clear
        </button>
      </div>

      {/* Stats Preview */}
      <div className="player-stats-preview">
        <div className="stat-box damage">
          <span className="stat-label">DMG</span>
          <span className="stat-value">{resolvedStats.damage}</span>
        </div>
        <div className="stat-box health">
          <span className="stat-label">HP</span>
          <span className="stat-value">{resolvedStats.health}</span>
        </div>
        <div className="stat-box initiative">
          <span className="stat-label">INIT</span>
          <span className="stat-value">{resolvedStats.initiative}</span>
        </div>
      </div>

      {/* Effect/Modifier display */}
      {resolvedStats.specialEffect && (
        <div className="player-effect-preview">
          <strong>{formatTriggerName(resolvedStats.specialEffect.trigger)}:</strong>{" "}
          {formatEffectAction(resolvedStats.specialEffect)}
        </div>
      )}
      {resolvedStats.modifier && (
        <div className="player-modifier-preview">
          <strong>Modifier:</strong> {resolvedStats.modifier.amount > 0 ? "+" : ""}
          {resolvedStats.modifier.amount} {resolvedStats.modifier.type}
        </div>
      )}

      {/* Selected cards list */}
      <div className="selected-cards-list">
        <div className="selected-card-item">
          <span className="card-type-label sleeve">Sleeve:</span>
          {composition.sleeve ? (
            <>
              <span>{composition.sleeve.name}</span>
              <button onClick={() => onSleeveSelect(null)} className="remove-btn">
                &times;
              </button>
            </>
          ) : (
            <span className="not-selected">Not selected</span>
          )}
        </div>
        <div className="selected-card-item">
          <span className="card-type-label animal">Animal:</span>
          {composition.animal ? (
            <>
              <span>{composition.animal.name}</span>
              <button onClick={() => onAnimalSelect(null)} className="remove-btn">
                &times;
              </button>
            </>
          ) : (
            <span className="not-selected">Not selected</span>
          )}
        </div>
        {sortedEquipment.map((e, i) => (
          <div key={e.order} className="selected-card-item">
            <span className="card-type-label equipment">Equip {i + 1}:</span>
            <span>{e.card.name}</span>
            <button onClick={() => onEquipmentRemove(e.order)} className="remove-btn">
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Card selection grids */}
      <div className="card-selection-sections">
        <details open>
          <summary>Sleeves ({sleeves.length})</summary>
          <div className="mini-selection-grid">
            {sleeves.map((card) => (
              <div
                key={card.id}
                className={`mini-selection-item ${composition.sleeve?.id === card.id ? "selected" : ""}`}
                onClick={() => onSleeveSelect(card)}
                title={formatCardTooltip(card)}
              >
                <MiniCardDisplay card={card} />
              </div>
            ))}
          </div>
        </details>

        <details open>
          <summary>Animals ({animals.length})</summary>
          <div className="mini-selection-grid">
            {animals.map((card) => (
              <div
                key={card.id}
                className={`mini-selection-item ${composition.animal?.id === card.id ? "selected" : ""}`}
                onClick={() => onAnimalSelect(card)}
                title={formatCardTooltip(card)}
              >
                <MiniCardDisplay card={card} />
              </div>
            ))}
          </div>
        </details>

        <details open>
          <summary>Equipment ({equipment.length})</summary>
          <div className="mini-selection-grid">
            {equipment.map((card) => {
              const equipped = composition.equipment.find((e) => e.card.id === card.id);
              const isSelected = equipped !== undefined;
              return (
                <div
                  key={card.id}
                  className={`mini-selection-item ${isSelected ? "selected" : ""}`}
                  onClick={() =>
                    isSelected ? onEquipmentRemove(equipped.order) : onEquipmentAdd(card)
                  }
                  title={formatCardTooltip(card)}
                >
                  <MiniCardDisplay card={card} />
                </div>
              );
            })}
          </div>
        </details>
      </div>
    </div>
  );
}

export function Playtest() {
  const [cards, setCards] = useState<CardDefinition[]>([]);
  const [rules, setRules] = useState<GameRules | null>(null);
  const [loading, setLoading] = useState(true);

  const [p1Composition, setP1Composition] = useState<PlayerComposition>({
    sleeve: null,
    animal: null,
    equipment: [],
  });
  const [p1NextOrder, setP1NextOrder] = useState(0);

  const [p2Composition, setP2Composition] = useState<PlayerComposition>({
    sleeve: null,
    animal: null,
    equipment: [],
  });
  const [p2NextOrder, setP2NextOrder] = useState(0);

  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  // Load cards and rules
  useEffect(() => {
    let cardsLoaded = false;
    let rulesLoaded = false;

    const checkLoaded = () => {
      if (cardsLoaded && rulesLoaded) {
        setLoading(false);
      }
    };

    const unsubscribeCards = subscribeToCards((loadedCards) => {
      setCards(loadedCards);
      cardsLoaded = true;
      checkLoaded();
    });

    const unsubscribeRules = subscribeToRules((loadedRules) => {
      if (loadedRules) {
        setRules(loadedRules);
      } else {
        // Use defaults
        setRules({
          id: "current",
          version: 1,
          pointsForSurviving: 1,
          pointsForDefeating: 2,
          pointsToWin: 15,
          startingEquipmentHand: 5,
          equipmentDrawPerRound: 1,
          startingAnimalHand: 3,
          defaultInitiative: 0,
          updatedAt: new Date().toISOString(),
          updatedBy: "system",
        });
      }
      rulesLoaded = true;
      checkLoaded();
    });

    return () => {
      unsubscribeCards();
      unsubscribeRules();
    };
  }, []);

  // Player 1 handlers
  const handleP1SleeveSelect = useCallback((card: CardDefinition | null) => {
    setP1Composition((prev) => ({ ...prev, sleeve: card }));
    setBattleResult(null);
  }, []);

  const handleP1AnimalSelect = useCallback((card: CardDefinition | null) => {
    setP1Composition((prev) => ({ ...prev, animal: card }));
    setBattleResult(null);
  }, []);

  const handleP1EquipmentAdd = useCallback(
    (card: CardDefinition) => {
      setP1Composition((prev) => ({
        ...prev,
        equipment: [...prev.equipment, { card, order: p1NextOrder }],
      }));
      setP1NextOrder((prev) => prev + 1);
      setBattleResult(null);
    },
    [p1NextOrder]
  );

  const handleP1EquipmentRemove = useCallback((order: number) => {
    setP1Composition((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((e) => e.order !== order),
    }));
    setBattleResult(null);
  }, []);

  const handleP1Clear = useCallback(() => {
    setP1Composition({ sleeve: null, animal: null, equipment: [] });
    setP1NextOrder(0);
    setBattleResult(null);
  }, []);

  // Player 2 handlers
  const handleP2SleeveSelect = useCallback((card: CardDefinition | null) => {
    setP2Composition((prev) => ({ ...prev, sleeve: card }));
    setBattleResult(null);
  }, []);

  const handleP2AnimalSelect = useCallback((card: CardDefinition | null) => {
    setP2Composition((prev) => ({ ...prev, animal: card }));
    setBattleResult(null);
  }, []);

  const handleP2EquipmentAdd = useCallback(
    (card: CardDefinition) => {
      setP2Composition((prev) => ({
        ...prev,
        equipment: [...prev.equipment, { card, order: p2NextOrder }],
      }));
      setP2NextOrder((prev) => prev + 1);
      setBattleResult(null);
    },
    [p2NextOrder]
  );

  const handleP2EquipmentRemove = useCallback((order: number) => {
    setP2Composition((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((e) => e.order !== order),
    }));
    setBattleResult(null);
  }, []);

  const handleP2Clear = useCallback(() => {
    setP2Composition({ sleeve: null, animal: null, equipment: [] });
    setP2NextOrder(0);
    setBattleResult(null);
  }, []);

  // Simulate battle
  const handleSimulate = useCallback(() => {
    if (!rules) return;
    const result = simulateBattle(p1Composition, p2Composition, rules);
    setBattleResult(result);
  }, [p1Composition, p2Composition, rules]);

  // Check if both players have at least an animal selected
  const canSimulate = p1Composition.animal !== null && p2Composition.animal !== null;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="playtest-page">
      <h2>Theorycraft</h2>
      <p className="page-description">
        Compose cards and simulate combat to test strategies before playing.
      </p>

      <div className="rules-info-bar">
        <span>
          Survive: <strong>+{rules?.pointsForSurviving}</strong>
        </span>
        <span>
          Defeat: <strong>+{rules?.pointsForDefeating}</strong>
        </span>
        <span>
          Win at: <strong>{rules?.pointsToWin} pts</strong>
        </span>
      </div>

      <div className="playtest-layout">
        {/* Player 1 */}
        <PlayerCardSelector
          title="Player 1"
          cards={cards}
          composition={p1Composition}
          onSleeveSelect={handleP1SleeveSelect}
          onAnimalSelect={handleP1AnimalSelect}
          onEquipmentAdd={handleP1EquipmentAdd}
          onEquipmentRemove={handleP1EquipmentRemove}
          onClear={handleP1Clear}
        />

        {/* Battle Controls */}
        <div className="battle-controls">
          <button
            onClick={handleSimulate}
            disabled={!canSimulate}
            className="btn btn-primary btn-large"
          >
            Battle!
          </button>
          {!canSimulate && <p className="help-text">Select an animal for each player</p>}
        </div>

        {/* Player 2 */}
        <PlayerCardSelector
          title="Player 2"
          cards={cards}
          composition={p2Composition}
          onSleeveSelect={handleP2SleeveSelect}
          onAnimalSelect={handleP2AnimalSelect}
          onEquipmentAdd={handleP2EquipmentAdd}
          onEquipmentRemove={handleP2EquipmentRemove}
          onClear={handleP2Clear}
        />
      </div>

      {/* Battle Results */}
      {battleResult && (
        <div className="battle-results">
          <h3>Battle Results</h3>

          <div className="results-grid">
            {/* Player 1 Result */}
            <div
              className={`result-card ${battleResult.player1.outcome.survived ? "survived" : "destroyed"}`}
            >
              <h4>Player 1</h4>
              <div className="result-status">
                {battleResult.player1.outcome.survived ? "SURVIVED" : "DESTROYED"}
              </div>
              <div className="result-health">
                {battleResult.player1.outcome.finalHealth} HP remaining
              </div>
              <div className="result-points">+{battleResult.player1.outcome.pointsEarned} points</div>
              {battleResult.player1.outcome.defeated && (
                <div className="result-badge">Defeated opponent</div>
              )}
            </div>

            {/* VS */}
            <div className="vs-divider">VS</div>

            {/* Player 2 Result */}
            <div
              className={`result-card ${battleResult.player2.outcome.survived ? "survived" : "destroyed"}`}
            >
              <h4>Player 2</h4>
              <div className="result-status">
                {battleResult.player2.outcome.survived ? "SURVIVED" : "DESTROYED"}
              </div>
              <div className="result-health">
                {battleResult.player2.outcome.finalHealth} HP remaining
              </div>
              <div className="result-points">+{battleResult.player2.outcome.pointsEarned} points</div>
              {battleResult.player2.outcome.defeated && (
                <div className="result-badge">Defeated opponent</div>
              )}
            </div>
          </div>

          {/* Effects Triggered */}
          {battleResult.effectsTriggered.length > 0 && (
            <div className="effects-triggered">
              <h4>Effects Triggered</h4>
              <ul>
                {battleResult.effectsTriggered.map((effect, i) => (
                  <li key={i}>
                    <strong>{effect.odIdplayerId}:</strong>{" "}
                    {formatTriggerName(effect.effect.trigger)} → {formatEffectAction(effect.effect)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Combat Log */}
          <details className="combat-log">
            <summary>Combat Log</summary>
            <pre>{battleResult.combatLog.join("\n")}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
