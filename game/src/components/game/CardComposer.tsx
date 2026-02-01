import { useState, useCallback, useMemo } from "react";
import { useGame } from "../../contexts/GameContext";
import {
  resolveStats,
  formatEffectAction,
  formatTriggerName,
} from "@sleeved-potential/shared";
import type { CardDefinition, CardStats, ResolvedStats } from "@sleeved-potential/shared";

interface SelectedEquipment {
  card: CardDefinition;
  order: number;
}

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
  const stats =
    card.type === "sleeve"
      ? { ...card.backgroundStats, ...card.foregroundStats }
      : card.stats;

  const typeLabel = card.type.toUpperCase();
  const typeClass = `fallback-${card.type}`;

  const effectText =
    stats?.specialEffect
      ? `${formatTriggerName(stats.specialEffect.trigger)}: ${formatEffectAction(stats.specialEffect)}`
      : null;

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
          <div className="mini-card-top">
            {effectText && <div className="mini-card-effect">{effectText}</div>}
          </div>
          <div className="mini-card-middle">
            {modifierText && <div className="mini-card-modifier">{modifierText}</div>}
          </div>
          <div className="mini-card-stats">
            {stats?.damage !== undefined && (
              <span className="mini-stat damage">{stats.damage}</span>
            )}
            {stats?.health !== undefined && (
              <span className="mini-stat health">{stats.health}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardComposer() {
  const { game, playerState, commitCard, getSleeve, getAnimal, getEquipment } = useGame();

  const [selectedSleeve, setSelectedSleeve] = useState<CardDefinition | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<CardDefinition | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<SelectedEquipment[]>([]);
  const [nextOrder, setNextOrder] = useState(0);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get available cards from player state
  const availableSleeves = useMemo(() => {
    if (!playerState) return [];
    return playerState.availableSleeves
      .map((id) => getSleeve(id))
      .filter((c): c is CardDefinition => c !== undefined);
  }, [playerState, getSleeve]);

  const animalHand = useMemo(() => {
    if (!playerState) return [];
    return playerState.animalHand
      .map((id) => getAnimal(id))
      .filter((c): c is CardDefinition => c !== undefined);
  }, [playerState, getAnimal]);

  const equipmentHand = useMemo(() => {
    if (!playerState) return [];
    return playerState.equipmentHand
      .map((id) => getEquipment(id))
      .filter((c): c is CardDefinition => c !== undefined);
  }, [playerState, getEquipment]);

  // Resolve stats for current composition
  const resolvedStats: ResolvedStats = useMemo(() => {
    const sortedEquipment = [...selectedEquipment]
      .sort((a, b) => a.order - b.order)
      .map((e) => e.card);

    return resolveStats(
      selectedSleeve,
      selectedAnimal,
      sortedEquipment,
      playerState?.persistentModifiers ?? [],
      playerState?.initiativeModifier ?? 0
    );
  }, [selectedSleeve, selectedAnimal, selectedEquipment, playerState]);

  const sortedEquipment = useMemo(
    () => [...selectedEquipment].sort((a, b) => a.order - b.order),
    [selectedEquipment]
  );

  // Handlers
  const handleSleeveSelect = useCallback((card: CardDefinition | null) => {
    setSelectedSleeve(card);
    setError(null);
  }, []);

  const handleAnimalSelect = useCallback((card: CardDefinition | null) => {
    setSelectedAnimal(card);
    setError(null);
  }, []);

  const handleEquipmentAdd = useCallback(
    (card: CardDefinition) => {
      setSelectedEquipment((prev) => [...prev, { card, order: nextOrder }]);
      setNextOrder((prev) => prev + 1);
      setError(null);
    },
    [nextOrder]
  );

  const handleEquipmentRemove = useCallback((order: number) => {
    setSelectedEquipment((prev) => prev.filter((e) => e.order !== order));
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedSleeve(null);
    setSelectedAnimal(null);
    setSelectedEquipment([]);
    setNextOrder(0);
    setError(null);
  }, []);

  const handleCommit = useCallback(async () => {
    if (!selectedSleeve || !selectedAnimal) {
      setError("Select a sleeve and an animal");
      return;
    }

    setCommitting(true);
    setError(null);

    try {
      const equipmentIds = sortedEquipment.map((e) => e.card.id);
      await commitCard(selectedSleeve.id, selectedAnimal.id, equipmentIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to commit");
    } finally {
      setCommitting(false);
    }
  }, [selectedSleeve, selectedAnimal, sortedEquipment, commitCard]);

  const canCommit = selectedSleeve !== null && selectedAnimal !== null && !committing;

  if (!game || !playerState) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="card-composer">
      <div className="composer-main">
        {/* Stats Preview */}
        <div className="composer-stats-preview">
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
          <div className="composer-effect-preview">
            <strong>{formatTriggerName(resolvedStats.specialEffect.trigger)}:</strong>{" "}
            {formatEffectAction(resolvedStats.specialEffect)}
          </div>
        )}
        {resolvedStats.modifier && (
          <div className="composer-modifier-preview">
            <strong>Modifier:</strong> {resolvedStats.modifier.amount > 0 ? "+" : ""}
            {resolvedStats.modifier.amount} {resolvedStats.modifier.type}
          </div>
        )}

        {/* Selected cards list */}
        <div className="selected-cards-list">
          <div className="selected-card-item">
            <span className="card-type-label sleeve">Sleeve:</span>
            {selectedSleeve ? (
              <>
                <span>{selectedSleeve.name}</span>
                <button onClick={() => handleSleeveSelect(null)} className="remove-btn">
                  &times;
                </button>
              </>
            ) : (
              <span className="not-selected">Not selected</span>
            )}
          </div>
          <div className="selected-card-item">
            <span className="card-type-label animal">Animal:</span>
            {selectedAnimal ? (
              <>
                <span>{selectedAnimal.name}</span>
                <button onClick={() => handleAnimalSelect(null)} className="remove-btn">
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
              <button onClick={() => handleEquipmentRemove(e.order)} className="remove-btn">
                &times;
              </button>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="composer-actions">
          <button
            onClick={handleCommit}
            disabled={!canCommit}
            className="btn btn-primary"
          >
            {committing ? "Committing..." : "Commit Card"}
          </button>
          <button onClick={handleClear} className="btn btn-small">
            Clear
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
      </div>

      {/* Card selection grids */}
      <div className="card-selection-sections">
        <details open>
          <summary>Sleeves ({availableSleeves.length})</summary>
          <div className="mini-selection-grid">
            {availableSleeves.map((card) => (
              <div
                key={card.id}
                className={`mini-selection-item ${selectedSleeve?.id === card.id ? "selected" : ""}`}
                onClick={() => handleSleeveSelect(card)}
                title={formatCardTooltip(card)}
              >
                <MiniCardDisplay card={card} />
              </div>
            ))}
          </div>
        </details>

        <details open>
          <summary>Animals ({animalHand.length})</summary>
          <div className="mini-selection-grid">
            {animalHand.map((card) => (
              <div
                key={card.id}
                className={`mini-selection-item ${selectedAnimal?.id === card.id ? "selected" : ""}`}
                onClick={() => handleAnimalSelect(card)}
                title={formatCardTooltip(card)}
              >
                <MiniCardDisplay card={card} />
              </div>
            ))}
          </div>
        </details>

        <details open>
          <summary>Equipment ({equipmentHand.length})</summary>
          <div className="mini-selection-grid">
            {equipmentHand.map((card) => {
              const count = selectedEquipment.filter((e) => e.card.id === card.id).length;
              return (
                <div
                  key={card.id}
                  className={`mini-selection-item ${count > 0 ? "selected" : ""}`}
                  onClick={() => handleEquipmentAdd(card)}
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
  );
}
