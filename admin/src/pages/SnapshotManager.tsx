import { useState, useCallback, useMemo } from "react";
import { useData } from "../hooks/useData";
import { seedBotSnapshot, migrateGames } from "../firebase";
import { resolveStats } from "@sleeved-potential/shared";
import type { CardDefinition, SnapshotCommit } from "@sleeved-potential/shared";
import { CompositionPreview } from "../components/CompositionPreview";
import { MiniCardDisplay } from "../components/MiniCardDisplay";
import { formatCardTooltip } from "../components/cardUtils";
import type { SelectedEquipment } from "../components/types";

interface RoundComposition {
  sleeve: CardDefinition | null;
  animal: CardDefinition | null;
  equipment: SelectedEquipment[];
  nextEquipmentOrder: number;
}

const emptyRound = (): RoundComposition => ({
  sleeve: null,
  animal: null,
  equipment: [],
  nextEquipmentOrder: 0,
});

function RoundComposer({
  roundIndex,
  composition,
  isExpanded,
  onToggleExpand,
  cards,
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
  onSleeveSelect: (card: CardDefinition | null) => void;
  onAnimalSelect: (card: CardDefinition | null) => void;
  onEquipmentAdd: (card: CardDefinition) => void;
  onEquipmentRemove: (order: number) => void;
  onClear: () => void;
}) {
  const sleeves = useMemo(() => cards.filter((c) => c.type === "sleeve"), [cards]);
  const animals = useMemo(() => cards.filter((c) => c.type === "animal"), [cards]);
  const equipmentList = useMemo(() => cards.filter((c) => c.type === "equipment"), [cards]);

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

  return (
    <div className={`round-composer ${isExpanded ? "expanded" : "collapsed"}`}>
      {/* Compact Header */}
      <div className="round-composer-header" onClick={onToggleExpand}>
        <div className="round-number">
          <span className={`round-status ${isComplete ? "complete" : "incomplete"}`}>
            {isComplete ? "\u2713" : "!"}
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
          <div className="round-composer-layout">
            {/* Left: Full composition preview (same component as CompositeCardViewer) */}
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
                <button type="button" onClick={onClear} className="btn btn-small">
                  Clear Round
                </button>
              </div>

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

              <details>
                <summary>
                  Equipment ({equipmentList.length})
                  {sortedEquipment.length > 0 && ` — ${sortedEquipment.length} selected`}
                </summary>
                <div className="mini-selection-grid">
                  {equipmentList.map((card) => {
                    const isSelected = composition.equipment.some((e) => e.card.id === card.id);
                    const count = composition.equipment.filter((e) => e.card.id === card.id).length;
                    return (
                      <div
                        key={card.id}
                        className={`mini-selection-item ${isSelected ? "selected" : ""}`}
                        onClick={() => onEquipmentAdd(card)}
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
        </div>
      )}
    </div>
  );
}

export function SnapshotManager() {
  const { cards } = useData();

  // Seed snapshot form
  const [botName, setBotName] = useState("");
  const [elo, setElo] = useState("1000");
  const [rounds, setRounds] = useState<RoundComposition[]>(() =>
    Array.from({ length: 5 }, () => emptyRound())
  );
  const [expandedRound, setExpandedRound] = useState<number>(0);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  // Migration
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);
  const [migrateError, setMigrateError] = useState<string | null>(null);

  const updateRound = useCallback(
    (index: number, updater: (prev: RoundComposition) => RoundComposition) => {
      setRounds((prev) => {
        const updated = [...prev];
        updated[index] = updater(updated[index]);
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

  const handleSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeedError(null);
    setSeedResult(null);

    // Validate all rounds have sleeve + animal
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

  const handleMigrate = async () => {
    setMigrateError(null);
    setMigrateResult(null);
    setMigrating(true);
    try {
      const result = await migrateGames();
      setMigrateResult(`Migration complete. Deleted ${result.deletedCount} old games.`);
    } catch (err) {
      setMigrateError(err instanceof Error ? err.message : "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="snapshot-manager-page">
      <h2>Snapshots & Migration</h2>

      {/* Seed Bot Snapshot */}
      <section className="admin-section">
        <h3>Seed Bot Snapshot</h3>
        <p className="help-text">
          Create a bot snapshot with predefined card compositions for 5 rounds.
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

          {/* Round Composers */}
          <div className="round-composers">
            {rounds.map((round, i) => (
              <RoundComposer
                key={i}
                roundIndex={i}
                composition={round}
                isExpanded={expandedRound === i}
                onToggleExpand={() => setExpandedRound(expandedRound === i ? -1 : i)}
                cards={cards}
                onSleeveSelect={(card) => handleSleeveSelect(i, card)}
                onAnimalSelect={(card) => handleAnimalSelect(i, card)}
                onEquipmentAdd={(card) => handleEquipmentAdd(i, card)}
                onEquipmentRemove={(order) => handleEquipmentRemove(i, order)}
                onClear={() => handleClearRound(i)}
              />
            ))}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={seeding}>
              {seeding ? "Creating..." : "Create Bot Snapshot"}
            </button>
          </div>
        </form>
      </section>

      {/* Migration */}
      <section className="admin-section">
        <h3>Migrate Old Games</h3>
        <p className="help-text">
          Delete all game documents that use the old format (games without maxRounds field).
          This also cleans up associated playerState subcollections.
        </p>

        {migrateError && <div className="alert alert-error">{migrateError}</div>}
        {migrateResult && <div className="alert alert-success">{migrateResult}</div>}

        <button
          className="btn btn-primary"
          onClick={handleMigrate}
          disabled={migrating}
        >
          {migrating ? "Migrating..." : "Run Migration"}
        </button>
      </section>
    </div>
  );
}
