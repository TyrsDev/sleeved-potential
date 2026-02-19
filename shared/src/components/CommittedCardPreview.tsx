import { useMemo } from "react";
import type { CommittedCard, CardDefinition, RoundOutcome } from "../types/index.js";
import { formatTriggerName, formatEffectAction } from "../combat.js";

interface CommittedCardPreviewProps {
  commit: CommittedCard;
  getSleeve: (id: string) => CardDefinition | undefined;
  getAnimal: (id: string) => CardDefinition | undefined;
  getEquipment: (id: string) => CardDefinition | undefined;
  label?: string;
  outcome?: RoundOutcome;
  effectTriggered?: boolean;
  showStats?: boolean;
  className?: string;
}

/**
 * Visual preview of a committed card with layered images.
 * Similar to ComposedCardPreview but uses CommittedCard data (IDs + finalStats).
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
  className = "",
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
    <div className={`sp-composed-card-preview ${outcome ? (outcome.survived ? "sp-outcome-survived" : "sp-outcome-destroyed") : ""} ${className}`}>
      {label && <div className="sp-composed-card-label">{label}</div>}

      {!showStats && outcome && stats.specialEffect && (
        <div className={`sp-effect-result ${effectTriggered ? "sp-effect-triggered" : "sp-effect-not-triggered"}`}>
          {effectTriggered ? (
            <span className="sp-effect-icon triggered">✓</span>
          ) : (
            <span className="sp-effect-icon not-triggered">✗</span>
          )}
          <span className="sp-effect-text">
            {formatTriggerName(stats.specialEffect.trigger)}:{" "}
            {formatEffectAction(stats.specialEffect)}
          </span>
        </div>
      )}

      <div className="sp-composed-card-frame">
        <div className="sp-composed-card-layers">
          {sleeve?.imageUrl && (
            <img src={sleeve.imageUrl} alt={sleeve.name} className="sp-composed-layer sp-layer-sleeve" />
          )}
          {animal?.imageUrl && (
            <img src={animal.imageUrl} alt={animal.name} className="sp-composed-layer sp-layer-animal" />
          )}
          {equipment.map((eq, index) =>
            eq.imageUrl ? (
              <img
                key={index}
                src={eq.imageUrl}
                alt={eq.name}
                className="sp-composed-layer sp-layer-equipment"
                style={{ zIndex: 30 + index }}
              />
            ) : null
          )}

          {showStats && (
            <div className="sp-composed-stats-overlay">
              <div className="sp-composed-overlay-top">
                {stats.specialEffect && (
                  <div className={`sp-composed-effect ${effectTriggered ? "sp-effect-triggered" : ""}`}>
                    {effectTriggered && <span className="sp-effect-check">✓ </span>}
                    {formatTriggerName(stats.specialEffect.trigger)}:{" "}
                    {formatEffectAction(stats.specialEffect)}
                  </div>
                )}
              </div>
              <div className="sp-composed-overlay-middle">
                {stats.modifier && (
                  <div className="sp-composed-modifier">
                    {stats.modifier.amount > 0 ? "+" : ""}
                    {stats.modifier.amount}{" "}
                    {stats.modifier.type === "damage" ? "DMG" : "HP"}
                  </div>
                )}
              </div>
              <div className="sp-composed-overlay-bottom">
                <span className="sp-composed-stat damage">{stats.damage}</span>
                <span className="sp-composed-stat initiative">
                  {stats.initiative !== 0
                    ? `${stats.initiative > 0 ? "+" : ""}${stats.initiative}`
                    : ""}
                </span>
                <span className="sp-composed-stat health">{stats.health}</span>
              </div>
            </div>
          )}

          {outcome && (
            <div className={`sp-outcome-overlay ${outcome.survived ? "survived" : "destroyed"}`}>
              <div className="sp-outcome-status">
                {outcome.survived ? "SURVIVED" : "DESTROYED"}
              </div>
              <div className="sp-outcome-hp">{outcome.finalHealth} HP</div>
            </div>
          )}
        </div>
      </div>

      <div className="sp-composed-card-labels">
        {sleeve && <span className="sp-label-sleeve">{sleeve.name}</span>}
        {animal && <span className="sp-label-animal">{animal.name}</span>}
        {equipment.map((eq, i) => (
          <span key={i} className="sp-label-equipment">
            {eq.name}
          </span>
        ))}
      </div>
    </div>
  );
}
