import { useMemo } from "react";
import type { CommittedCard, CardDefinition, RoundOutcome } from "@sleeved-potential/shared";
import { formatTriggerName, formatEffectAction } from "@sleeved-potential/shared";

interface CommittedCardPreviewProps {
  commit: CommittedCard;
  getSleeve: (id: string) => CardDefinition | undefined;
  getAnimal: (id: string) => CardDefinition | undefined;
  getEquipment: (id: string) => CardDefinition | undefined;
  label?: string;
  outcome?: RoundOutcome;
  effectTriggered?: boolean;
  showStats?: boolean;
}

/**
 * Visual preview of a committed card with layered images.
 * Similar to ComposedCardPreview but works with CommittedCard data.
 * Optionally shows outcome (survived/destroyed) and effect trigger status.
 */
export function CommittedCardPreview({
  commit,
  getSleeve,
  getAnimal,
  getEquipment,
  label,
  outcome,
  effectTriggered,
  showStats = true,
}: CommittedCardPreviewProps) {
  const sleeve = useMemo(() => getSleeve(commit.sleeveId), [commit.sleeveId, getSleeve]);
  const animal = useMemo(() => getAnimal(commit.animalId), [commit.animalId, getAnimal]);
  const equipment = useMemo(
    () =>
      commit.equipmentIds
        .map((id) => getEquipment(id))
        .filter((c): c is CardDefinition => c !== undefined),
    [commit.equipmentIds, getEquipment]
  );

  const stats = commit.finalStats;

  return (
    <div className={`composed-card-preview ${outcome ? (outcome.survived ? "outcome-survived" : "outcome-destroyed") : ""}`}>
      {label && <div className="composed-card-label">{label}</div>}

      {/* Effect display for round results (shown above card when stats are hidden but outcome is shown) */}
      {!showStats && outcome && stats.specialEffect && (
        <div className={`effect-result ${effectTriggered ? "effect-triggered" : "effect-not-triggered"}`}>
          {effectTriggered ? (
            <span className="effect-icon triggered">✓</span>
          ) : (
            <span className="effect-icon not-triggered">✗</span>
          )}
          <span className="effect-text">
            {formatTriggerName(stats.specialEffect.trigger)}:{" "}
            {formatEffectAction(stats.specialEffect)}
          </span>
        </div>
      )}

      <div className="composed-card-frame">
        <div className="composed-card-layers">
          {/* Sleeve layer (background) */}
          {sleeve?.imageUrl && (
            <img
              src={sleeve.imageUrl}
              alt={sleeve.name}
              className="composed-layer layer-sleeve"
            />
          )}

          {/* Animal layer */}
          {animal?.imageUrl && (
            <img
              src={animal.imageUrl}
              alt={animal.name}
              className="composed-layer layer-animal"
            />
          )}

          {/* Equipment layers (in order, bottom to top) */}
          {equipment.map((eq, index) =>
            eq.imageUrl ? (
              <img
                key={index}
                src={eq.imageUrl}
                alt={eq.name}
                className="composed-layer layer-equipment"
                style={{ zIndex: 30 + index }}
              />
            ) : null
          )}

          {/* Stats overlay */}
          {showStats && (
            <div className="composed-stats-overlay">
              <div className="composed-overlay-top">
                {stats.specialEffect && (
                  <div className={`composed-effect ${effectTriggered ? "effect-triggered" : ""}`}>
                    {effectTriggered && <span className="effect-check">✓ </span>}
                    {formatTriggerName(stats.specialEffect.trigger)}:{" "}
                    {formatEffectAction(stats.specialEffect)}
                  </div>
                )}
              </div>
              <div className="composed-overlay-middle">
                {stats.modifier && (
                  <div className="composed-modifier">
                    {stats.modifier.amount > 0 ? "+" : ""}
                    {stats.modifier.amount}{" "}
                    {stats.modifier.type === "damage" ? "DMG" : "HP"}
                  </div>
                )}
              </div>
              <div className="composed-overlay-bottom">
                <span className="composed-stat damage">{stats.damage}</span>
                <span className="composed-stat initiative">
                  {stats.initiative !== 0
                    ? `${stats.initiative > 0 ? "+" : ""}${stats.initiative}`
                    : ""}
                </span>
                <span className="composed-stat health">{stats.health}</span>
              </div>
            </div>
          )}

          {/* Outcome overlay */}
          {outcome && (
            <div className={`outcome-overlay ${outcome.survived ? "survived" : "destroyed"}`}>
              <div className="outcome-status">
                {outcome.survived ? "SURVIVED" : "DESTROYED"}
              </div>
              <div className="outcome-hp">{outcome.finalHealth} HP</div>
            </div>
          )}
        </div>
      </div>

      {/* Card name labels */}
      <div className="composed-card-labels">
        {sleeve && <span className="label-sleeve">{sleeve.name}</span>}
        {animal && <span className="label-animal">{animal.name}</span>}
        {equipment.map((eq, i) => (
          <span key={i} className="label-equipment">
            {eq.name}
          </span>
        ))}
      </div>
    </div>
  );
}
