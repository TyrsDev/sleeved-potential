import { useState, useCallback, useMemo } from "react";
import { useData } from "../hooks/useData";
import { seedBotSnapshot } from "../firebase";
import { resolveStats, DEFAULT_GAME_RULES } from "@sleeved-potential/shared";
import type { CardDefinition, SnapshotCommit } from "@sleeved-potential/shared";
import { CompositionPreview } from "../components/CompositionPreview";
import { MiniCardDisplay } from "../components/MiniCardDisplay";
import { formatCardTooltip } from "../components/cardUtils";
import type { SelectedEquipment } from "../components/types";

// ============================================================================
// TYPES
// ============================================================================

interface RoundComposition {
  sleeve: CardDefinition | null;
  animal: CardDefinition | null;
  equipment: SelectedEquipment[];
  nextEquipmentOrder: number;
}

interface DeckState {
  availableSleeves: string[];
  animalHand: string[];
  animalDeck: string[];
  animalDiscard: string[];
  equipmentHand: string[];
  equipmentDeck: string[];
  equipmentDiscard: string[];
}

interface RoundDraws {
  animalsDrawn: string[];
  equipmentDrawn: string[];
}

const emptyRound = (): RoundComposition => ({
  sleeve: null,
  animal: null,
  equipment: [],
  nextEquipmentOrder: 0,
});

const { startingAnimalHand, startingEquipmentHand, equipmentDrawPerRound, maxRounds } =
  DEFAULT_GAME_RULES;

// ============================================================================
// DECK STATE COMPUTATION
// ============================================================================

function computeDeckState(
  allCards: CardDefinition[],
  initialAnimalHand: string[],
  initialEquipmentHand: string[],
  rounds: RoundComposition[],
  roundDraws: (RoundDraws | null)[],
  upToRound: number
): DeckState {
  const allSleeves = allCards.filter((c) => c.type === "sleeve").map((c) => c.id);
  const allAnimals = allCards.filter((c) => c.type === "animal").map((c) => c.id);
  const allEquipment = allCards.filter((c) => c.type === "equipment").map((c) => c.id);

  // Initial state
  const state: DeckState = {
    availableSleeves: [...allSleeves],
    animalHand: [...initialAnimalHand],
    animalDeck: allAnimals.filter((id) => !initialAnimalHand.includes(id)),
    animalDiscard: [],
    equipmentHand: [...initialEquipmentHand],
    equipmentDeck: allEquipment.filter((id) => !initialEquipmentHand.includes(id)),
    equipmentDiscard: [],
  };

  // Process each completed round up to upToRound
  for (let i = 0; i < upToRound; i++) {
    const round = rounds[i];
    if (!round.sleeve || !round.animal) break; // round not complete

    // Remove committed sleeve; cycle all back when exhausted (matches commitCard.ts)
    const remainingSleeves = state.availableSleeves.filter((id) => id !== round.sleeve!.id);
    state.availableSleeves = remainingSleeves.length === 0
      ? [...allSleeves] // All sleeves cycle back (including the just-played one)
      : remainingSleeves;

    // Move committed animal from hand → discard
    state.animalHand = state.animalHand.filter((id) => id !== round.animal!.id);
    state.animalDiscard.push(round.animal!.id);

    // Move committed equipment from hand → discard
    const committedEquipIds = round.equipment.map((e) => e.card.id);
    for (const eid of committedEquipIds) {
      const idx = state.equipmentHand.indexOf(eid);
      if (idx !== -1) {
        state.equipmentHand.splice(idx, 1);
        state.equipmentDiscard.push(eid);
      }
    }

    // Apply draws for the next round (if draws were selected)
    const draws = roundDraws[i + 1];
    if (draws) {
      // Animal draws
      for (const aid of draws.animalsDrawn) {
        let idx = state.animalDeck.indexOf(aid);
        if (idx === -1) {
          // Reshuffle discard into deck
          state.animalDeck.push(...state.animalDiscard);
          state.animalDiscard = [];
          idx = state.animalDeck.indexOf(aid);
        }
        if (idx !== -1) {
          state.animalDeck.splice(idx, 1);
          state.animalHand.push(aid);
        }
      }

      // Equipment draws
      for (const eid of draws.equipmentDrawn) {
        let idx = state.equipmentDeck.indexOf(eid);
        if (idx === -1) {
          // Reshuffle discard into deck
          state.equipmentDeck.push(...state.equipmentDiscard);
          state.equipmentDiscard = [];
          idx = state.equipmentDeck.indexOf(eid);
        }
        if (idx !== -1) {
          state.equipmentDeck.splice(idx, 1);
          state.equipmentHand.push(eid);
        }
      }
    }
  }

  return state;
}

/** Compute how many draws are needed before a given round */
function getDrawNeeds(
  deckState: DeckState,
  roundIndex: number
): { animalDrawCount: number; equipmentDrawCount: number } {
  if (roundIndex === 0) return { animalDrawCount: 0, equipmentDrawCount: 0 };
  const animalDrawCount = Math.max(0, startingAnimalHand - deckState.animalHand.length);
  // No equipment draw before the round after the last one (i.e., round 5 doesn't draw after)
  // But we draw BEFORE this round (which means after previous round)
  // Equipment draw happens after every round except the last
  const equipmentDrawCount = roundIndex < maxRounds ? equipmentDrawPerRound : 0;
  return { animalDrawCount, equipmentDrawCount };
}

/** Get available cards for drawing (deck + reshuffled discard if deck insufficient) */
function getDrawPool(deck: string[], discard: string[], drawCount: number): string[] {
  if (deck.length >= drawCount) return deck;
  // Deck insufficient — include reshuffled discard as available pool
  return [...deck, ...discard];
}

// ============================================================================
// STARTING HAND SETUP
// ============================================================================

function StartingHandSetup({
  cards,
  onComplete,
}: {
  cards: CardDefinition[];
  onComplete: (animalHand: string[], equipmentHand: string[]) => void;
}) {
  const animals = useMemo(() => cards.filter((c) => c.type === "animal"), [cards]);
  const equipment = useMemo(() => cards.filter((c) => c.type === "equipment"), [cards]);
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());

  // Cap required counts at available cards
  const requiredAnimals = Math.min(startingAnimalHand, animals.length);
  const requiredEquipment = Math.min(startingEquipmentHand, equipment.length);

  const toggleAnimal = (id: string) => {
    setSelectedAnimals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < requiredAnimals) {
        next.add(id);
      }
      return next;
    });
  };

  const toggleEquipment = (id: string) => {
    setSelectedEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < requiredEquipment) {
        next.add(id);
      }
      return next;
    });
  };

  const canLockIn =
    requiredAnimals > 0 &&
    requiredEquipment > 0 &&
    selectedAnimals.size === requiredAnimals &&
    selectedEquipment.size === requiredEquipment;

  return (
    <div className="starting-hand-setup">
      <h4>Starting Hand Setup</h4>
      <p className="help-text">
        Pick the bot&apos;s starting hand. These cards will be available for Round 1.
        Remaining cards go into their respective decks for drawing between rounds.
      </p>

      <div className="hand-setup-section">
        <div className="hand-setup-header">
          <span>Animals</span>
          <span className={`hand-counter ${selectedAnimals.size === requiredAnimals ? "complete" : ""}`}>
            {selectedAnimals.size}/{requiredAnimals}
          </span>
        </div>
        <div className="mini-selection-grid">
          {animals.map((card) => (
            <div
              key={card.id}
              className={`mini-selection-item ${selectedAnimals.has(card.id) ? "selected" : ""}`}
              onClick={() => toggleAnimal(card.id)}
              title={formatCardTooltip(card)}
            >
              <MiniCardDisplay card={card} />
            </div>
          ))}
        </div>
      </div>

      <div className="hand-setup-section">
        <div className="hand-setup-header">
          <span>Equipment</span>
          <span className={`hand-counter ${selectedEquipment.size === requiredEquipment ? "complete" : ""}`}>
            {selectedEquipment.size}/{requiredEquipment}
          </span>
        </div>
        <div className="mini-selection-grid">
          {equipment.map((card) => (
            <div
              key={card.id}
              className={`mini-selection-item ${selectedEquipment.has(card.id) ? "selected" : ""}`}
              onClick={() => toggleEquipment(card.id)}
              title={formatCardTooltip(card)}
            >
              <MiniCardDisplay card={card} />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!canLockIn}
        onClick={() => onComplete([...selectedAnimals], [...selectedEquipment])}
      >
        {canLockIn ? "Lock In Starting Hands" : `Select ${requiredAnimals} animals and ${requiredEquipment} equipment`}
      </button>
    </div>
  );
}

// ============================================================================
// DRAW PHASE
// ============================================================================

function DrawPhase({
  cards,
  animalPool,
  equipmentPool,
  animalDrawCount,
  equipmentDrawCount,
  onComplete,
}: {
  cards: CardDefinition[];
  animalPool: string[];
  equipmentPool: string[];
  animalDrawCount: number;
  equipmentDrawCount: number;
  onComplete: (draws: RoundDraws) => void;
}) {
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());

  const cardMap = useMemo(() => {
    const map = new Map<string, CardDefinition>();
    for (const c of cards) map.set(c.id, c);
    return map;
  }, [cards]);

  const availableAnimals = useMemo(
    () => animalPool.map((id) => cardMap.get(id)).filter(Boolean) as CardDefinition[],
    [animalPool, cardMap]
  );
  const availableEquipment = useMemo(
    () => equipmentPool.map((id) => cardMap.get(id)).filter(Boolean) as CardDefinition[],
    [equipmentPool, cardMap]
  );

  const toggleAnimal = (id: string) => {
    setSelectedAnimals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < animalDrawCount) {
        next.add(id);
      }
      return next;
    });
  };

  const toggleEquipment = (id: string) => {
    setSelectedEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < equipmentDrawCount) {
        next.add(id);
      }
      return next;
    });
  };

  const isComplete =
    selectedAnimals.size === Math.min(animalDrawCount, availableAnimals.length) &&
    selectedEquipment.size === Math.min(equipmentDrawCount, availableEquipment.length);

  return (
    <div className="draw-phase">
      <h4>Draw Phase</h4>
      <p className="help-text">Pick which cards the bot draws from its deck before this round.</p>

      {animalDrawCount > 0 && availableAnimals.length > 0 && (
        <div className="draw-section">
          <div className="hand-setup-header">
            <span>Draw Animals</span>
            <span className={`hand-counter ${selectedAnimals.size === Math.min(animalDrawCount, availableAnimals.length) ? "complete" : ""}`}>
              {selectedAnimals.size}/{Math.min(animalDrawCount, availableAnimals.length)}
            </span>
          </div>
          <div className="mini-selection-grid">
            {availableAnimals.map((card) => (
              <div
                key={card.id}
                className={`mini-selection-item ${selectedAnimals.has(card.id) ? "selected" : ""}`}
                onClick={() => toggleAnimal(card.id)}
                title={formatCardTooltip(card)}
              >
                <MiniCardDisplay card={card} />
              </div>
            ))}
          </div>
        </div>
      )}

      {equipmentDrawCount > 0 && availableEquipment.length > 0 && (
        <div className="draw-section">
          <div className="hand-setup-header">
            <span>Draw Equipment</span>
            <span className={`hand-counter ${selectedEquipment.size === Math.min(equipmentDrawCount, availableEquipment.length) ? "complete" : ""}`}>
              {selectedEquipment.size}/{Math.min(equipmentDrawCount, availableEquipment.length)}
            </span>
          </div>
          <div className="mini-selection-grid">
            {availableEquipment.map((card) => (
              <div
                key={card.id}
                className={`mini-selection-item ${selectedEquipment.has(card.id) ? "selected" : ""}`}
                onClick={() => toggleEquipment(card.id)}
                title={formatCardTooltip(card)}
              >
                <MiniCardDisplay card={card} />
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-small"
        disabled={!isComplete}
        onClick={() =>
          onComplete({
            animalsDrawn: [...selectedAnimals],
            equipmentDrawn: [...selectedEquipment],
          })
        }
      >
        Confirm Draws
      </button>
    </div>
  );
}

// ============================================================================
// ROUND COMPOSER
// ============================================================================

function RoundComposer({
  roundIndex,
  composition,
  isExpanded,
  onToggleExpand,
  cards,
  deckState,
  needsDraws,
  drawsComplete,
  animalDrawCount,
  equipmentDrawCount,
  onDrawComplete,
  onSleeveSelect,
  onAnimalSelect,
  onEquipmentAdd,
  onEquipmentRemove,
  onClear,
}: {
  roundIndex: number;
  composition: RoundComposition;
  isExpanded: boolean;
  onToggleExpand: () => void;
  cards: CardDefinition[];
  deckState: DeckState;
  needsDraws: boolean;
  drawsComplete: boolean;
  animalDrawCount: number;
  equipmentDrawCount: number;
  onDrawComplete: (draws: RoundDraws) => void;
  onSleeveSelect: (card: CardDefinition | null) => void;
  onAnimalSelect: (card: CardDefinition | null) => void;
  onEquipmentAdd: (card: CardDefinition) => void;
  onEquipmentRemove: (order: number) => void;
  onClear: () => void;
}) {
  const sleeves = useMemo(() => cards.filter((c) => c.type === "sleeve"), [cards]);
  const animals = useMemo(() => cards.filter((c) => c.type === "animal"), [cards]);
  const equipmentList = useMemo(() => cards.filter((c) => c.type === "equipment"), [cards]);

  const availableSleeveIds = useMemo(() => new Set(deckState.availableSleeves), [deckState.availableSleeves]);
  const animalHandIds = useMemo(() => new Set(deckState.animalHand), [deckState.animalHand]);
  const equipmentHandIds = useMemo(() => new Set(deckState.equipmentHand), [deckState.equipmentHand]);

  // Track equipment already committed this round so each hand copy can only be used once
  const committedEquipmentIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of composition.equipment) {
      counts.set(e.card.id, (counts.get(e.card.id) || 0) + 1);
    }
    return counts;
  }, [composition.equipment]);

  const equipmentAvailableInHand = useMemo(() => {
    // Count how many of each equipment ID are in hand
    const handCounts = new Map<string, number>();
    for (const id of deckState.equipmentHand) {
      handCounts.set(id, (handCounts.get(id) || 0) + 1);
    }
    // Subtract committed counts
    const available = new Map<string, number>();
    for (const [id, count] of handCounts) {
      const committed = committedEquipmentIds.get(id) || 0;
      const remaining = count - committed;
      if (remaining > 0) available.set(id, remaining);
    }
    return available;
  }, [deckState.equipmentHand, committedEquipmentIds]);

  const sortedEquipment = useMemo(
    () => [...composition.equipment].sort((a, b) => a.order - b.order),
    [composition.equipment]
  );
  const equipmentCards = useMemo(
    () => sortedEquipment.map((e) => e.card),
    [sortedEquipment]
  );
  const resolvedStats = useMemo(
    () => resolveStats(composition.sleeve, composition.animal, equipmentCards),
    [composition.sleeve, composition.animal, equipmentCards]
  );

  const isComplete = composition.sleeve !== null && composition.animal !== null;
  const summaryParts: string[] = [];
  if (composition.sleeve) summaryParts.push(composition.sleeve.name);
  if (composition.animal) summaryParts.push(composition.animal.name);
  if (sortedEquipment.length > 0) summaryParts.push(`${sortedEquipment.length} equip`);
  const summaryText = summaryParts.length > 0 ? summaryParts.join(" + ") : "Not configured";

  // Whether composition UI should be active (draws must be done first)
  const compositionActive = !needsDraws || drawsComplete;

  // Draw pool (deck + reshuffled discard if deck insufficient)
  const animalDrawPool = useMemo(
    () => getDrawPool(deckState.animalDeck, deckState.animalDiscard, animalDrawCount),
    [deckState.animalDeck, deckState.animalDiscard, animalDrawCount]
  );
  const equipmentDrawPool = useMemo(
    () => getDrawPool(deckState.equipmentDeck, deckState.equipmentDiscard, equipmentDrawCount),
    [deckState.equipmentDeck, deckState.equipmentDiscard, equipmentDrawCount]
  );

  return (
    <div className={`round-composer ${isExpanded ? "expanded" : "collapsed"}`}>
      {/* Compact Header */}
      <div className="round-composer-header" onClick={onToggleExpand}>
        <div className="round-number">
          <span className={`round-status ${isComplete ? "complete" : needsDraws && !drawsComplete ? "needs-draw" : "incomplete"}`}>
            {isComplete ? "\u2713" : needsDraws && !drawsComplete ? "\u21A7" : "!"}
          </span>
          Round {roundIndex + 1}
        </div>
        <div className="round-summary">{summaryText}</div>
        {isComplete && (
          <div className="round-stats-preview">
            <span className="stat-badge damage">DMG {resolvedStats.damage}</span>
            <span className="stat-badge health">HP {resolvedStats.health}</span>
            {resolvedStats.initiative !== 0 && (
              <span className="stat-badge initiative">
                INIT {resolvedStats.initiative > 0 ? "+" : ""}{resolvedStats.initiative}
              </span>
            )}
          </div>
        )}
        <span className="round-expand-icon">{isExpanded ? "\u25BC" : "\u25B6"}</span>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="round-composer-content">
          {/* Draw Phase (rounds 2+, before composition) */}
          {needsDraws && !drawsComplete && (
            <DrawPhase
              cards={cards}
              animalPool={animalDrawPool}
              equipmentPool={equipmentDrawPool}
              animalDrawCount={animalDrawCount}
              equipmentDrawCount={equipmentDrawCount}
              onComplete={onDrawComplete}
            />
          )}

          {/* Composition (active after draws are done) */}
          {compositionActive && (
            <div className="round-composer-layout">
              {/* Left: Full composition preview */}
              <CompositionPreview
                sleeve={composition.sleeve}
                animal={composition.animal}
                equipment={composition.equipment}
                onRemoveSleeve={() => onSleeveSelect(null)}
                onRemoveAnimal={() => onAnimalSelect(null)}
                onRemoveEquipment={onEquipmentRemove}
                placeholderText="Select cards for this round"
              />

              {/* Right: Card Selection */}
              <div className="round-selection-panel">
                <div className="round-selection-header">
                  <span className="hand-info">
                    Hand: {deckState.animalHand.length} animals, {deckState.equipmentHand.length} equip
                  </span>
                  <button type="button" onClick={onClear} className="btn btn-small">
                    Clear Round
                  </button>
                </div>

                <details open>
                  <summary>Sleeves ({sleeves.length})</summary>
                  <div className="mini-selection-grid">
                    {sleeves.map((card) => {
                      const available = availableSleeveIds.has(card.id);
                      return (
                        <div
                          key={card.id}
                          className={`mini-selection-item ${composition.sleeve?.id === card.id ? "selected" : ""} ${!available ? "unavailable" : ""}`}
                          onClick={available ? () => onSleeveSelect(card) : undefined}
                          title={formatCardTooltip(card)}
                        >
                          <MiniCardDisplay card={card} />
                          {!available && <span className="unavailable-label">Used</span>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                <details open>
                  <summary>Animals — in hand: {deckState.animalHand.length}</summary>
                  <div className="mini-selection-grid">
                    {animals.map((card) => {
                      const inHand = animalHandIds.has(card.id);
                      return (
                        <div
                          key={card.id}
                          className={`mini-selection-item ${composition.animal?.id === card.id ? "selected" : ""} ${!inHand ? "unavailable" : ""}`}
                          onClick={inHand ? () => onAnimalSelect(card) : undefined}
                          title={formatCardTooltip(card)}
                        >
                          <MiniCardDisplay card={card} />
                        </div>
                      );
                    })}
                  </div>
                </details>

                <details open>
                  <summary>
                    Equipment — in hand: {deckState.equipmentHand.length}
                    {sortedEquipment.length > 0 && ` — ${sortedEquipment.length} committed`}
                  </summary>
                  <div className="mini-selection-grid">
                    {equipmentList.map((card) => {
                      const inHand = equipmentHandIds.has(card.id);
                      const canAdd = (equipmentAvailableInHand.get(card.id) || 0) > 0;
                      const isSelected = composition.equipment.some((e) => e.card.id === card.id);
                      const count = composition.equipment.filter((e) => e.card.id === card.id).length;
                      return (
                        <div
                          key={card.id}
                          className={`mini-selection-item ${isSelected ? "selected" : ""} ${!inHand ? "unavailable" : ""} ${inHand && !canAdd ? "exhausted" : ""}`}
                          onClick={canAdd ? () => onEquipmentAdd(card) : undefined}
                          title={formatCardTooltip(card)}
                        >
                          <MiniCardDisplay card={card} />
                          {count > 0 && <span className="selection-count">{count}</span>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SNAPSHOT MANAGER (main export)
// ============================================================================

export function SnapshotManager() {
  const { cards } = useData();

  // Bot info
  const [botName, setBotName] = useState("");
  const [elo, setElo] = useState("1000");

  // Setup phase
  const [setupComplete, setSetupComplete] = useState(false);
  const [initialAnimalHand, setInitialAnimalHand] = useState<string[]>([]);
  const [initialEquipmentHand, setInitialEquipmentHand] = useState<string[]>([]);

  // Round compositions
  const [rounds, setRounds] = useState<RoundComposition[]>(() =>
    Array.from({ length: maxRounds }, () => emptyRound())
  );
  const [expandedRound, setExpandedRound] = useState<number>(0);

  // Draw selections per round (index 0 is null since round 1 has no draws)
  const [roundDraws, setRoundDraws] = useState<(RoundDraws | null)[]>(() =>
    Array.from({ length: maxRounds }, () => null)
  );

  // Submit state
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  // Compute deck state for each round
  const deckStates = useMemo(() => {
    if (!setupComplete) return [];
    return Array.from({ length: maxRounds }, (_, i) =>
      computeDeckState(cards, initialAnimalHand, initialEquipmentHand, rounds, roundDraws, i)
    );
  }, [cards, initialAnimalHand, initialEquipmentHand, rounds, roundDraws, setupComplete]);

  const handleSetupComplete = useCallback((animalHand: string[], equipmentHand: string[]) => {
    setInitialAnimalHand(animalHand);
    setInitialEquipmentHand(equipmentHand);
    setSetupComplete(true);
    setExpandedRound(0);
  }, []);

  const handleResetSetup = useCallback(() => {
    setSetupComplete(false);
    setInitialAnimalHand([]);
    setInitialEquipmentHand([]);
    setRounds(Array.from({ length: maxRounds }, () => emptyRound()));
    setRoundDraws(Array.from({ length: maxRounds }, () => null));
    setExpandedRound(0);
  }, []);

  const updateRound = useCallback(
    (index: number, updater: (prev: RoundComposition) => RoundComposition) => {
      setRounds((prev) => {
        const updated = [...prev];
        updated[index] = updater(updated[index]);
        // Clear subsequent rounds when editing an earlier round
        for (let i = index + 1; i < maxRounds; i++) {
          updated[i] = emptyRound();
        }
        return updated;
      });
      // Clear subsequent draws
      setRoundDraws((prev) => {
        const updated = [...prev];
        for (let i = index + 1; i < maxRounds; i++) {
          updated[i] = null;
        }
        return updated;
      });
    },
    []
  );

  const handleSleeveSelect = useCallback(
    (roundIndex: number, card: CardDefinition | null) => {
      updateRound(roundIndex, (r) => ({ ...r, sleeve: card }));
    },
    [updateRound]
  );

  const handleAnimalSelect = useCallback(
    (roundIndex: number, card: CardDefinition | null) => {
      updateRound(roundIndex, (r) => ({ ...r, animal: card }));
    },
    [updateRound]
  );

  const handleEquipmentAdd = useCallback(
    (roundIndex: number, card: CardDefinition) => {
      updateRound(roundIndex, (r) => ({
        ...r,
        equipment: [...r.equipment, { card, order: r.nextEquipmentOrder }],
        nextEquipmentOrder: r.nextEquipmentOrder + 1,
      }));
    },
    [updateRound]
  );

  const handleEquipmentRemove = useCallback(
    (roundIndex: number, order: number) => {
      updateRound(roundIndex, (r) => ({
        ...r,
        equipment: r.equipment.filter((e) => e.order !== order),
      }));
    },
    [updateRound]
  );

  const handleClearRound = useCallback(
    (roundIndex: number) => {
      updateRound(roundIndex, () => emptyRound());
    },
    [updateRound]
  );

  const handleDrawComplete = useCallback(
    (roundIndex: number, draws: RoundDraws) => {
      setRoundDraws((prev) => {
        const updated = [...prev];
        updated[roundIndex] = draws;
        return updated;
      });
    },
    []
  );

  const handleSeed = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSeedError(null);
    setSeedResult(null);

    for (let i = 0; i < rounds.length; i++) {
      if (!rounds[i].sleeve || !rounds[i].animal) {
        setSeedError(`Round ${i + 1} must have a sleeve and animal selected`);
        return;
      }
    }

    setSeeding(true);
    try {
      const commits: SnapshotCommit[] = rounds.map((r) => ({
        sleeveId: r.sleeve!.id,
        animalId: r.animal!.id,
        equipmentIds: [...r.equipment]
          .sort((a, b) => a.order - b.order)
          .map((e) => e.card.id),
      }));
      const result = await seedBotSnapshot(botName.trim(), parseInt(elo, 10), commits);
      setSeedResult(`Snapshot created: ${result.snapshotId}`);
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : "Failed to seed snapshot");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="snapshot-manager-page">
      <h2>Seed Bot Snapshot</h2>
      <p className="help-text">
        Create a bot snapshot with predefined card compositions for {maxRounds} rounds.
        Players will be matched against these when no live opponent is available.
      </p>

      {seedError && <div className="alert alert-error">{seedError}</div>}
      {seedResult && <div className="alert alert-success">{seedResult}</div>}

      <form onSubmit={handleSeed}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="botName">Bot Name</label>
            <input
              id="botName"
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="e.g. TrainingBot"
              required
              minLength={2}
              maxLength={20}
            />
          </div>
          <div className="form-group">
            <label htmlFor="botElo">ELO Rating</label>
            <input
              id="botElo"
              type="number"
              value={elo}
              onChange={(e) => setElo(e.target.value)}
              min="100"
              max="3000"
              required
            />
          </div>
        </div>

        {/* Starting Hand Setup */}
        {!setupComplete && (
          <StartingHandSetup cards={cards} onComplete={handleSetupComplete} />
        )}

        {/* Round Composers (visible after setup) */}
        {setupComplete && (
          <>
            <div className="setup-summary">
              <span>Starting hands locked in</span>
              <button type="button" className="btn btn-small" onClick={handleResetSetup}>
                Reset Hands
              </button>
            </div>

            <div className="round-composers">
              {rounds.map((round, i) => {
                const ds = deckStates[i];
                if (!ds) return null;
                const drawNeeds = getDrawNeeds(ds, i);
                const needsDraws = i > 0 && (drawNeeds.animalDrawCount > 0 || drawNeeds.equipmentDrawCount > 0);
                const drawsComplete = !needsDraws || roundDraws[i] !== null;

                return (
                  <RoundComposer
                    key={i}
                    roundIndex={i}
                    composition={round}
                    isExpanded={expandedRound === i}
                    onToggleExpand={() => setExpandedRound(expandedRound === i ? -1 : i)}
                    cards={cards}
                    deckState={ds}
                    needsDraws={needsDraws}
                    drawsComplete={drawsComplete}
                    animalDrawCount={drawNeeds.animalDrawCount}
                    equipmentDrawCount={drawNeeds.equipmentDrawCount}
                    onDrawComplete={(draws) => handleDrawComplete(i, draws)}
                    onSleeveSelect={(card) => handleSleeveSelect(i, card)}
                    onAnimalSelect={(card) => handleAnimalSelect(i, card)}
                    onEquipmentAdd={(card) => handleEquipmentAdd(i, card)}
                    onEquipmentRemove={(order) => handleEquipmentRemove(i, order)}
                    onClear={() => handleClearRound(i)}
                  />
                );
              })}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={seeding}>
                {seeding ? "Creating..." : "Create Bot Snapshot"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
