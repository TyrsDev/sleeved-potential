import { useState, useCallback, useMemo } from "react";
import { useGame } from "../../contexts/GameContext";
import {
  resolveStats,
  formatEffectAction,
  formatTriggerName,
} from "@sleeved-potential/shared";
import type { CardDefinition, ResolvedStats } from "@sleeved-potential/shared";
import {
  MiniCardDisplay,
  ComposedCardPreview,
  StatAttributionTable,
  CardTooltip,
  CardTooltipContent,
  type SelectedEquipment,
} from "@sleeved-potential/shared/components";

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
        {/* Visual Card Preview */}
        <ComposedCardPreview
          sleeve={selectedSleeve}
          animal={selectedAnimal}
          equipment={selectedEquipment}
          resolvedStats={resolvedStats}
        />

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

        {/* Stat Attribution Table */}
        <StatAttributionTable
          sleeve={selectedSleeve}
          animal={selectedAnimal}
          equipment={selectedEquipment}
          persistentModifiers={playerState?.persistentModifiers}
          initiativeModifier={playerState?.initiativeModifier}
          onRemoveSleeve={() => handleSleeveSelect(null)}
          onRemoveAnimal={() => handleAnimalSelect(null)}
          onRemoveEquipment={handleEquipmentRemove}
        />

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
              >
                <CardTooltip content={<CardTooltipContent card={card} />}>
                  <MiniCardDisplay card={card} />
                </CardTooltip>
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
              >
                <CardTooltip content={<CardTooltipContent card={card} />}>
                  <MiniCardDisplay card={card} />
                </CardTooltip>
              </div>
            ))}
          </div>
        </details>

        <details open>
          <summary>Equipment ({equipmentHand.length})</summary>
          <div className="mini-selection-grid">
            {equipmentHand.map((card) => {
              const equipped = selectedEquipment.find((e) => e.card.id === card.id);
              const isSelected = equipped !== undefined;
              return (
                <div
                  key={card.id}
                  className={`mini-selection-item ${isSelected ? "selected" : ""}`}
                  onClick={() =>
                    isSelected ? handleEquipmentRemove(equipped.order) : handleEquipmentAdd(card)
                  }
                >
                  <CardTooltip content={<CardTooltipContent card={card} />}>
                    <MiniCardDisplay card={card} />
                  </CardTooltip>
                </div>
              );
            })}
          </div>
        </details>
      </div>
    </div>
  );
}
