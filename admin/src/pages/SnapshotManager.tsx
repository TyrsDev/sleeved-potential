import { useState } from "react";
import { useData } from "../hooks/useData";
import { seedBotSnapshot, migrateGames } from "../firebase";
import type { CardDefinition } from "@sleeved-potential/shared";
import type { SnapshotCommit } from "@sleeved-potential/shared";

interface RoundCommitForm {
  sleeveId: string;
  animalId: string;
  equipmentIds: string[];
}

const emptyRound = (): RoundCommitForm => ({
  sleeveId: "",
  animalId: "",
  equipmentIds: [],
});

export function SnapshotManager() {
  const { cards } = useData();

  // Seed snapshot form
  const [botName, setBotName] = useState("");
  const [elo, setElo] = useState("1000");
  const [rounds, setRounds] = useState<RoundCommitForm[]>([
    emptyRound(),
    emptyRound(),
    emptyRound(),
    emptyRound(),
    emptyRound(),
  ]);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  // Migration
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);
  const [migrateError, setMigrateError] = useState<string | null>(null);

  const sleeves = cards.filter((c: CardDefinition) => c.type === "sleeve");
  const animals = cards.filter((c: CardDefinition) => c.type === "animal");
  const equipment = cards.filter((c: CardDefinition) => c.type === "equipment");

  const updateRound = (index: number, field: keyof RoundCommitForm, value: string | string[]) => {
    setRounds((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleEquipment = (roundIndex: number, equipId: string) => {
    setRounds((prev) => {
      const updated = [...prev];
      const round = updated[roundIndex];
      const eqIds = round.equipmentIds.includes(equipId)
        ? round.equipmentIds.filter((id) => id !== equipId)
        : [...round.equipmentIds, equipId];
      updated[roundIndex] = { ...round, equipmentIds: eqIds };
      return updated;
    });
  };

  const handleSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeedError(null);
    setSeedResult(null);

    // Validate all rounds have sleeve + animal
    for (let i = 0; i < rounds.length; i++) {
      if (!rounds[i].sleeveId || !rounds[i].animalId) {
        setSeedError(`Round ${i + 1} must have a sleeve and animal selected`);
        return;
      }
    }

    setSeeding(true);
    try {
      const commits: SnapshotCommit[] = rounds.map((r) => ({
        sleeveId: r.sleeveId,
        animalId: r.animalId,
        equipmentIds: r.equipmentIds,
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

          {rounds.map((round, i) => (
            <fieldset key={i}>
              <legend>Round {i + 1}</legend>
              <div className="form-row">
                <div className="form-group">
                  <label>Sleeve</label>
                  <select
                    value={round.sleeveId}
                    onChange={(e) => updateRound(i, "sleeveId", e.target.value)}
                    required
                  >
                    <option value="">Select sleeve...</option>
                    {sleeves.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Animal</label>
                  <select
                    value={round.animalId}
                    onChange={(e) => updateRound(i, "animalId", e.target.value)}
                    required
                  >
                    <option value="">Select animal...</option>
                    {animals.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Equipment (click to toggle)</label>
                <div className="equipment-toggles">
                  {equipment.map((eq) => (
                    <button
                      key={eq.id}
                      type="button"
                      className={`btn btn-small ${round.equipmentIds.includes(eq.id) ? "btn-primary" : ""}`}
                      onClick={() => toggleEquipment(i, eq.id)}
                    >
                      {eq.name}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
          ))}

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
