import { useMemo } from "react";
import { useGame } from "../../contexts/GameContext";
import { useUser } from "../../contexts/UserContext";
import { formatEffectAction, formatTriggerName } from "@sleeved-potential/shared";
import type { CommittedCard, CardDefinition } from "@sleeved-potential/shared";

interface CardPreviewProps {
  commit: CommittedCard;
  getSleeve: (id: string) => CardDefinition | undefined;
  getAnimal: (id: string) => CardDefinition | undefined;
  getEquipment: (id: string) => CardDefinition | undefined;
  label: string;
}

function CardPreview({ commit, getSleeve, getAnimal, getEquipment, label }: CardPreviewProps) {
  const sleeve = getSleeve(commit.sleeveId);
  const animal = getAnimal(commit.animalId);
  const equipment = commit.equipmentIds
    .map((id) => getEquipment(id))
    .filter((c): c is CardDefinition => c !== undefined);

  const stats = commit.finalStats;

  return (
    <div className="combat-card-preview">
      <div className="combat-card-label">{label}</div>

      {/* Card image stack */}
      <div className="combat-card-stack">
        {animal?.imageUrl ? (
          <img src={animal.imageUrl} alt={animal.name} className="combat-card-image" />
        ) : (
          <div className="combat-card-placeholder">
            {animal?.name ?? "Unknown"}
          </div>
        )}
      </div>

      {/* Card names */}
      <div className="combat-card-names">
        <div className="combat-card-name sleeve">{sleeve?.name ?? "Unknown Sleeve"}</div>
        <div className="combat-card-name animal">{animal?.name ?? "Unknown Animal"}</div>
        {equipment.map((eq, i) => (
          <div key={i} className="combat-card-name equipment">{eq.name}</div>
        ))}
      </div>

      {/* Stats */}
      <div className="combat-card-stats">
        <div className="stat-box damage">
          <span className="stat-label">DMG</span>
          <span className="stat-value">{stats.damage}</span>
        </div>
        <div className="stat-box health">
          <span className="stat-label">HP</span>
          <span className="stat-value">{stats.health}</span>
        </div>
        <div className="stat-box initiative">
          <span className="stat-label">INIT</span>
          <span className="stat-value">{stats.initiative}</span>
        </div>
      </div>

      {/* Effect/Modifier */}
      {stats.specialEffect && (
        <div className="combat-effect">
          {formatTriggerName(stats.specialEffect.trigger)}: {formatEffectAction(stats.specialEffect)}
        </div>
      )}
      {stats.modifier && (
        <div className="combat-modifier">
          Modifier: {stats.modifier.amount > 0 ? "+" : ""}
          {stats.modifier.amount} {stats.modifier.type}
        </div>
      )}
    </div>
  );
}

export function CombatDisplay() {
  const { latestRound, getSleeve, getAnimal, getEquipment, opponentId } = useGame();
  const { user } = useUser();

  const userId = user?.id;

  const myCommit = useMemo(() => {
    if (!latestRound || !userId) return null;
    return latestRound.commits[userId] ?? null;
  }, [latestRound, userId]);

  const opponentCommit = useMemo(() => {
    if (!latestRound || !opponentId) return null;
    return latestRound.commits[opponentId] ?? null;
  }, [latestRound, opponentId]);

  if (!myCommit || !opponentCommit) {
    return null;
  }

  return (
    <div className="combat-display">
      <CardPreview
        commit={myCommit}
        getSleeve={getSleeve}
        getAnimal={getAnimal}
        getEquipment={getEquipment}
        label="You"
      />

      <div className="combat-vs">VS</div>

      <CardPreview
        commit={opponentCommit}
        getSleeve={getSleeve}
        getAnimal={getAnimal}
        getEquipment={getEquipment}
        label="Opponent"
      />
    </div>
  );
}
