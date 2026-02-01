import { useGame } from "../../contexts/GameContext";
import { useMemo } from "react";
import { formatEffectAction, formatTriggerName } from "@sleeved-potential/shared";

export function WaitingForOpponent() {
  const { playerState, getSleeve, getAnimal, getEquipment } = useGame();

  const commit = playerState?.currentCommit;

  const sleeve = useMemo(() => {
    if (!commit) return null;
    return getSleeve(commit.sleeveId) ?? null;
  }, [commit, getSleeve]);

  const animal = useMemo(() => {
    if (!commit) return null;
    return getAnimal(commit.animalId) ?? null;
  }, [commit, getAnimal]);

  const equipment = useMemo(() => {
    if (!commit) return [];
    return commit.equipmentIds
      .map((id) => getEquipment(id))
      .filter((c) => c !== undefined);
  }, [commit, getEquipment]);

  const stats = commit?.finalStats;

  return (
    <div className="waiting-for-opponent">
      <div className="waiting-spinner">
        <div className="spinner" />
        <p>Waiting for opponent to commit...</p>
      </div>

      {commit && (
        <div className="your-commit">
          <h3>Your Committed Card</h3>

          {/* Stats */}
          <div className="commit-stats">
            <div className="stat-box damage">
              <span className="stat-label">DMG</span>
              <span className="stat-value">{stats?.damage ?? 0}</span>
            </div>
            <div className="stat-box health">
              <span className="stat-label">HP</span>
              <span className="stat-value">{stats?.health ?? 0}</span>
            </div>
            <div className="stat-box initiative">
              <span className="stat-label">INIT</span>
              <span className="stat-value">{stats?.initiative ?? 0}</span>
            </div>
          </div>

          {/* Effect/Modifier */}
          {stats?.specialEffect && (
            <div className="commit-effect">
              <strong>{formatTriggerName(stats.specialEffect.trigger)}:</strong>{" "}
              {formatEffectAction(stats.specialEffect)}
            </div>
          )}
          {stats?.modifier && (
            <div className="commit-modifier">
              <strong>Modifier:</strong> {stats.modifier.amount > 0 ? "+" : ""}
              {stats.modifier.amount} {stats.modifier.type}
            </div>
          )}

          {/* Card list */}
          <div className="commit-cards">
            <div className="commit-card-item">
              <span className="card-type-label sleeve">Sleeve:</span>
              <span>{sleeve?.name ?? "Unknown"}</span>
            </div>
            <div className="commit-card-item">
              <span className="card-type-label animal">Animal:</span>
              <span>{animal?.name ?? "Unknown"}</span>
            </div>
            {equipment.map((eq, i) => (
              <div key={i} className="commit-card-item">
                <span className="card-type-label equipment">Equip {i + 1}:</span>
                <span>{eq?.name ?? "Unknown"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
