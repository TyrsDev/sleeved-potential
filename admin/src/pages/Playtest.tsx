import { useEffect, useState, useCallback } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CardStatsFallback } from "../components/CardStatsFallback";
import type {
  CardDefinition,
  CardStats,
  ResolvedStats,
  GameRules,
  SpecialEffect,
  TriggeredEffect,
} from "@sleeved-potential/shared";

interface SelectedEquipment {
  card: CardDefinition;
  order: number;
}

interface PlayerComposition {
  sleeve: CardDefinition | null;
  animal: CardDefinition | null;
  equipment: SelectedEquipment[];
}

interface RoundOutcome {
  pointsEarned: number;
  survived: boolean;
  defeated: boolean;
  finalHealth: number;
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

// Stat merging (same as backend)
function mergeStats(base: CardStats, overlay: CardStats): CardStats {
  const result: CardStats = { ...base };
  if (overlay.damage !== undefined) result.damage = overlay.damage;
  if (overlay.health !== undefined) result.health = overlay.health;
  if (overlay.modifier !== undefined) result.modifier = overlay.modifier;
  if (overlay.specialEffect !== undefined) result.specialEffect = overlay.specialEffect;
  if (overlay.initiative !== undefined) result.initiative = overlay.initiative;
  return result;
}

// Resolve stats (mirrors backend logic)
function resolveCompositeStats(composition: PlayerComposition): ResolvedStats {
  const { sleeve, animal, equipment } = composition;
  let stats: CardStats = {};

  // 1. Sleeve background
  if (sleeve?.backgroundStats) {
    stats = mergeStats(stats, sleeve.backgroundStats);
  }

  // 2. Animal
  if (animal?.stats) {
    stats = mergeStats(stats, animal.stats);
  }

  // 3. Equipment (in order)
  const sortedEquipment = [...equipment].sort((a, b) => a.order - b.order);
  for (const equip of sortedEquipment) {
    if (equip.card.stats) {
      stats = mergeStats(stats, equip.card.stats);
    }
  }

  // 4. Sleeve foreground
  if (sleeve?.foregroundStats) {
    stats = mergeStats(stats, sleeve.foregroundStats);
  }

  // Extract values
  let damage = stats.damage ?? 0;
  let health = stats.health ?? 0;
  const initiative = stats.initiative ?? 0;
  const modifier = stats.modifier ?? null;
  const specialEffect = stats.specialEffect ?? null;

  // Apply modifier
  if (modifier) {
    if (modifier.type === "damage") damage += modifier.amount;
    if (modifier.type === "health") health += modifier.amount;
  }

  return {
    damage: Math.max(0, damage),
    health: Math.max(0, health),
    initiative,
    modifier,
    specialEffect,
  };
}

// Simulate combat (mirrors backend commitCard.ts logic)
function simulateBattle(
  p1Composition: PlayerComposition,
  p2Composition: PlayerComposition,
  rules: GameRules
): BattleResult {
  const p1Stats = resolveCompositeStats(p1Composition);
  const p2Stats = resolveCompositeStats(p2Composition);
  const combatLog: string[] = [];
  const effectsTriggered: TriggeredEffect[] = [];

  combatLog.push(`=== ROUND START ===`);
  combatLog.push(`Player 1: ${p1Stats.damage} DMG, ${p1Stats.health} HP, ${p1Stats.initiative} INIT`);
  combatLog.push(`Player 2: ${p2Stats.damage} DMG, ${p2Stats.health} HP, ${p2Stats.initiative} INIT`);

  // Check for on_play effects
  if (p1Stats.specialEffect?.trigger === "on_play") {
    effectsTriggered.push({
      odIdplayerId: "player1",
      effect: p1Stats.specialEffect,
      resolved: true,
    });
    combatLog.push(`Player 1 triggers ON_PLAY: ${formatEffect(p1Stats.specialEffect)}`);
  }
  if (p2Stats.specialEffect?.trigger === "on_play") {
    effectsTriggered.push({
      odIdplayerId: "player2",
      effect: p2Stats.specialEffect,
      resolved: true,
    });
    combatLog.push(`Player 2 triggers ON_PLAY: ${formatEffect(p2Stats.specialEffect)}`);
  }

  // Combat resolution
  let p1Health = p1Stats.health;
  let p2Health = p2Stats.health;

  combatLog.push(`\n=== COMBAT ===`);

  if (p1Stats.initiative === p2Stats.initiative) {
    // Simultaneous attack
    combatLog.push(`Initiative tied (${p1Stats.initiative}) - Simultaneous attack!`);
    p1Health -= p2Stats.damage;
    p2Health -= p1Stats.damage;
    combatLog.push(`Player 1 deals ${p1Stats.damage} damage to Player 2 (${p2Stats.health} -> ${p2Health})`);
    combatLog.push(`Player 2 deals ${p2Stats.damage} damage to Player 1 (${p1Stats.health} -> ${p1Health})`);
  } else if (p1Stats.initiative > p2Stats.initiative) {
    // Player 1 attacks first
    combatLog.push(`Player 1 has higher initiative (${p1Stats.initiative} > ${p2Stats.initiative})`);
    p2Health -= p1Stats.damage;
    combatLog.push(`Player 1 attacks first: ${p1Stats.damage} damage (${p2Stats.health} -> ${p2Health})`);
    if (p2Health > 0) {
      p1Health -= p2Stats.damage;
      combatLog.push(`Player 2 counterattacks: ${p2Stats.damage} damage (${p1Stats.health} -> ${p1Health})`);
    } else {
      combatLog.push(`Player 2 is destroyed before attacking!`);
    }
  } else {
    // Player 2 attacks first
    combatLog.push(`Player 2 has higher initiative (${p2Stats.initiative} > ${p1Stats.initiative})`);
    p1Health -= p2Stats.damage;
    combatLog.push(`Player 2 attacks first: ${p2Stats.damage} damage (${p1Stats.health} -> ${p1Health})`);
    if (p1Health > 0) {
      p2Health -= p1Stats.damage;
      combatLog.push(`Player 1 counterattacks: ${p1Stats.damage} damage (${p2Stats.health} -> ${p2Health})`);
    } else {
      combatLog.push(`Player 1 is destroyed before attacking!`);
    }
  }

  // Determine outcomes
  const p1Survived = p1Health > 0;
  const p2Survived = p2Health > 0;
  const p1Defeated = !p2Survived;
  const p2Defeated = !p1Survived;

  combatLog.push(`\n=== RESULTS ===`);
  combatLog.push(`Player 1: ${p1Survived ? "SURVIVED" : "DESTROYED"} (${Math.max(0, p1Health)} HP)`);
  combatLog.push(`Player 2: ${p2Survived ? "SURVIVED" : "DESTROYED"} (${Math.max(0, p2Health)} HP)`);

  // Check post-combat effects
  const checkEffect = (
    playerId: string,
    stats: ResolvedStats,
    survived: boolean,
    defeated: boolean,
    opponentSurvived: boolean
  ) => {
    if (!stats.specialEffect || stats.specialEffect.trigger === "on_play") return;

    const trigger = stats.specialEffect.trigger;
    let shouldTrigger = false;

    switch (trigger) {
      case "if_survives":
        shouldTrigger = survived;
        break;
      case "if_destroyed":
        shouldTrigger = !survived;
        break;
      case "if_defeats":
        shouldTrigger = defeated;
        break;
      case "if_doesnt_defeat":
        shouldTrigger = opponentSurvived;
        break;
    }

    if (shouldTrigger) {
      effectsTriggered.push({
        odIdplayerId: playerId,
        effect: stats.specialEffect,
        resolved: true,
      });
      combatLog.push(`${playerId === "player1" ? "Player 1" : "Player 2"} triggers ${trigger.toUpperCase()}: ${formatEffect(stats.specialEffect)}`);
    }
  };

  checkEffect("player1", p1Stats, p1Survived, p1Defeated, p2Survived);
  checkEffect("player2", p2Stats, p2Survived, p2Defeated, p1Survived);

  // Calculate points
  let p1Points = 0;
  let p2Points = 0;

  if (p1Survived) p1Points += rules.pointsForSurviving;
  if (p2Survived) p2Points += rules.pointsForSurviving;
  if (p1Defeated) p1Points += rules.pointsForDefeating;
  if (p2Defeated) p2Points += rules.pointsForDefeating;

  combatLog.push(`\n=== SCORING ===`);
  combatLog.push(`Player 1: ${p1Points} points${p1Survived ? ` (+${rules.pointsForSurviving} survive)` : ""}${p1Defeated ? ` (+${rules.pointsForDefeating} defeat)` : ""}`);
  combatLog.push(`Player 2: ${p2Points} points${p2Survived ? ` (+${rules.pointsForSurviving} survive)` : ""}${p2Defeated ? ` (+${rules.pointsForDefeating} defeat)` : ""}`);

  return {
    player1: {
      composition: p1Composition,
      resolvedStats: p1Stats,
      outcome: {
        pointsEarned: p1Points,
        survived: p1Survived,
        defeated: p1Defeated,
        finalHealth: Math.max(0, p1Health),
      },
    },
    player2: {
      composition: p2Composition,
      resolvedStats: p2Stats,
      outcome: {
        pointsEarned: p2Points,
        survived: p2Survived,
        defeated: p2Defeated,
        finalHealth: Math.max(0, p2Health),
      },
    },
    effectsTriggered,
    combatLog,
  };
}

function formatEffect(effect: SpecialEffect): string {
  const action = effect.effect;
  switch (action.type) {
    case "draw_cards":
      return `Draw ${action.count} cards`;
    case "modify_initiative":
      return `${action.amount > 0 ? "+" : ""}${action.amount} Initiative next round`;
    case "add_persistent_modifier":
      return `${action.amount > 0 ? "+" : ""}${action.amount} ${action.stat} permanent`;
  }
}

function formatTriggerName(trigger: string): string {
  const map: Record<string, string> = {
    on_play: "On Play",
    if_survives: "If Survives",
    if_destroyed: "If Destroyed",
    if_defeats: "If Defeats",
    if_doesnt_defeat: "If Doesn't Defeat",
  };
  return map[trigger] || trigger;
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
  const resolvedStats = resolveCompositeStats(composition);
  const sortedEquipment = [...composition.equipment].sort((a, b) => a.order - b.order);

  return (
    <div className="player-selector">
      <div className="player-selector-header">
        <h3>{title}</h3>
        <button onClick={onClear} className="btn btn-small">Clear</button>
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
          {formatEffect(resolvedStats.specialEffect)}
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
              <button onClick={() => onSleeveSelect(null)} className="remove-btn">&times;</button>
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
              <button onClick={() => onAnimalSelect(null)} className="remove-btn">&times;</button>
            </>
          ) : (
            <span className="not-selected">Not selected</span>
          )}
        </div>
        {sortedEquipment.map((e, i) => (
          <div key={e.order} className="selected-card-item">
            <span className="card-type-label equipment">Equip {i + 1}:</span>
            <span>{e.card.name}</span>
            <button onClick={() => onEquipmentRemove(e.order)} className="remove-btn">&times;</button>
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
                title={card.name}
              >
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.name} />
                ) : (
                  <CardStatsFallback card={card} className="selection-fallback" />
                )}
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
                title={card.name}
              >
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.name} />
                ) : (
                  <CardStatsFallback card={card} className="selection-fallback" />
                )}
              </div>
            ))}
          </div>
        </details>

        <details open>
          <summary>Equipment ({equipment.length})</summary>
          <div className="mini-selection-grid">
            {equipment.map((card) => {
              const count = composition.equipment.filter((e) => e.card.id === card.id).length;
              return (
                <div
                  key={card.id}
                  className={`mini-selection-item ${count > 0 ? "selected" : ""}`}
                  onClick={() => onEquipmentAdd(card)}
                  title={card.name}
                >
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.name} />
                  ) : (
                    <CardStatsFallback card={card} className="selection-fallback" />
                  )}
                  {count > 0 && <span className="selection-count">{count}</span>}
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
    const q = query(collection(db, "cards"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cardData = snapshot.docs.map((doc) => doc.data() as CardDefinition);
      setCards(cardData);
    });

    // Load rules
    getDoc(doc(db, "rules", "current")).then((snapshot) => {
      if (snapshot.exists()) {
        setRules(snapshot.data() as GameRules);
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
      setLoading(false);
    });

    return unsubscribe;
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

  const handleP1EquipmentAdd = useCallback((card: CardDefinition) => {
    setP1Composition((prev) => ({
      ...prev,
      equipment: [...prev.equipment, { card, order: p1NextOrder }],
    }));
    setP1NextOrder((prev) => prev + 1);
    setBattleResult(null);
  }, [p1NextOrder]);

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

  const handleP2EquipmentAdd = useCallback((card: CardDefinition) => {
    setP2Composition((prev) => ({
      ...prev,
      equipment: [...prev.equipment, { card, order: p2NextOrder }],
    }));
    setP2NextOrder((prev) => prev + 1);
    setBattleResult(null);
  }, [p2NextOrder]);

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
      <div className="page-header">
        <h2>Playtest - Battle Simulator</h2>
        <div className="rules-info">
          <span>Survive: +{rules?.pointsForSurviving}</span>
          <span>Defeat: +{rules?.pointsForDefeating}</span>
        </div>
      </div>

      <p className="help-text">
        Compose cards for each player and simulate a round of combat.
        The battle uses the same logic as the backend.
      </p>

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
            Simulate Battle
          </button>
          {!canSimulate && (
            <p className="help-text">Select an animal for each player</p>
          )}
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
            <div className={`result-card ${battleResult.player1.outcome.survived ? "survived" : "destroyed"}`}>
              <h4>Player 1</h4>
              <div className="result-status">
                {battleResult.player1.outcome.survived ? "SURVIVED" : "DESTROYED"}
              </div>
              <div className="result-health">
                {battleResult.player1.outcome.finalHealth} HP remaining
              </div>
              <div className="result-points">
                +{battleResult.player1.outcome.pointsEarned} points
              </div>
              {battleResult.player1.outcome.defeated && (
                <div className="result-badge">Defeated opponent</div>
              )}
            </div>

            {/* VS */}
            <div className="vs-divider">VS</div>

            {/* Player 2 Result */}
            <div className={`result-card ${battleResult.player2.outcome.survived ? "survived" : "destroyed"}`}>
              <h4>Player 2</h4>
              <div className="result-status">
                {battleResult.player2.outcome.survived ? "SURVIVED" : "DESTROYED"}
              </div>
              <div className="result-health">
                {battleResult.player2.outcome.finalHealth} HP remaining
              </div>
              <div className="result-points">
                +{battleResult.player2.outcome.pointsEarned} points
              </div>
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
                    <strong>{effect.odIdplayerId === "player1" ? "Player 1" : "Player 2"}:</strong>{" "}
                    {formatTriggerName(effect.effect.trigger)} → {formatEffect(effect.effect)}
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
