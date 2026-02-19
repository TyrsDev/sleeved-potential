import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, updateRules } from "../firebase";
import type { GameRules } from "@sleeved-potential/shared";
import { DEFAULT_GAME_RULES } from "@sleeved-potential/shared";

export function RulesEditor() {
  const [rules, setRules] = useState<GameRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [pointsForSurviving, setPointsForSurviving] = useState("");
  const [pointsForDefeating, setPointsForDefeating] = useState("");
  const [pointsToWin, setPointsToWin] = useState("");
  const [startingEquipmentHand, setStartingEquipmentHand] = useState("");
  const [equipmentDrawPerRound, setEquipmentDrawPerRound] = useState("");
  const [startingAnimalHand, setStartingAnimalHand] = useState("");
  const [defaultInitiative, setDefaultInitiative] = useState("");
  const [maxRounds, setMaxRounds] = useState("");
  const [pointsForKill, setPointsForKill] = useState("");
  const [pointsPerOverkill, setPointsPerOverkill] = useState("");
  const [pointsPerAbsorbed, setPointsPerAbsorbed] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "rules", "current"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameRules;
        setRules(data);
        setPointsForSurviving(data.pointsForSurviving.toString());
        setPointsForDefeating(data.pointsForDefeating.toString());
        setPointsToWin(data.pointsToWin.toString());
        setStartingEquipmentHand(data.startingEquipmentHand.toString());
        setEquipmentDrawPerRound(data.equipmentDrawPerRound.toString());
        setStartingAnimalHand(data.startingAnimalHand.toString());
        setDefaultInitiative(data.defaultInitiative.toString());
        setMaxRounds((data.maxRounds ?? DEFAULT_GAME_RULES.maxRounds).toString());
        setPointsForKill((data.pointsForKill ?? DEFAULT_GAME_RULES.pointsForKill).toString());
        setPointsPerOverkill((data.pointsPerOverkill ?? DEFAULT_GAME_RULES.pointsPerOverkill).toString());
        setPointsPerAbsorbed((data.pointsPerAbsorbed ?? DEFAULT_GAME_RULES.pointsPerAbsorbed).toString());
      } else {
        // Use defaults
        setPointsForSurviving(DEFAULT_GAME_RULES.pointsForSurviving.toString());
        setPointsForDefeating(DEFAULT_GAME_RULES.pointsForDefeating.toString());
        setPointsToWin(DEFAULT_GAME_RULES.pointsToWin.toString());
        setStartingEquipmentHand(DEFAULT_GAME_RULES.startingEquipmentHand.toString());
        setEquipmentDrawPerRound(DEFAULT_GAME_RULES.equipmentDrawPerRound.toString());
        setStartingAnimalHand(DEFAULT_GAME_RULES.startingAnimalHand.toString());
        setDefaultInitiative(DEFAULT_GAME_RULES.defaultInitiative.toString());
        setMaxRounds(DEFAULT_GAME_RULES.maxRounds.toString());
        setPointsForKill(DEFAULT_GAME_RULES.pointsForKill.toString());
        setPointsPerOverkill(DEFAULT_GAME_RULES.pointsPerOverkill.toString());
        setPointsPerAbsorbed(DEFAULT_GAME_RULES.pointsPerAbsorbed.toString());
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const isDirty = useMemo(() => {
    if (!rules) return false;
    const saved = {
      pointsForSurviving: rules.pointsForSurviving,
      pointsForDefeating: rules.pointsForDefeating,
      pointsToWin: rules.pointsToWin,
      startingEquipmentHand: rules.startingEquipmentHand,
      equipmentDrawPerRound: rules.equipmentDrawPerRound,
      startingAnimalHand: rules.startingAnimalHand,
      defaultInitiative: rules.defaultInitiative,
      maxRounds: rules.maxRounds ?? DEFAULT_GAME_RULES.maxRounds,
      pointsForKill: rules.pointsForKill ?? DEFAULT_GAME_RULES.pointsForKill,
      pointsPerOverkill: rules.pointsPerOverkill ?? DEFAULT_GAME_RULES.pointsPerOverkill,
      pointsPerAbsorbed: rules.pointsPerAbsorbed ?? DEFAULT_GAME_RULES.pointsPerAbsorbed,
    };
    return (
      parseInt(pointsForSurviving, 10) !== saved.pointsForSurviving ||
      parseInt(pointsForDefeating, 10) !== saved.pointsForDefeating ||
      parseInt(pointsToWin, 10) !== saved.pointsToWin ||
      parseInt(startingEquipmentHand, 10) !== saved.startingEquipmentHand ||
      parseInt(equipmentDrawPerRound, 10) !== saved.equipmentDrawPerRound ||
      parseInt(startingAnimalHand, 10) !== saved.startingAnimalHand ||
      parseInt(defaultInitiative, 10) !== saved.defaultInitiative ||
      parseInt(maxRounds, 10) !== saved.maxRounds ||
      parseInt(pointsForKill, 10) !== saved.pointsForKill ||
      parseInt(pointsPerOverkill, 10) !== saved.pointsPerOverkill ||
      parseInt(pointsPerAbsorbed, 10) !== saved.pointsPerAbsorbed
    );
  }, [
    rules,
    pointsForSurviving,
    pointsForDefeating,
    pointsToWin,
    startingEquipmentHand,
    equipmentDrawPerRound,
    startingAnimalHand,
    defaultInitiative,
    maxRounds,
    pointsForKill,
    pointsPerOverkill,
    pointsPerAbsorbed,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      await updateRules({
        pointsForSurviving: parseInt(pointsForSurviving, 10),
        pointsForDefeating: parseInt(pointsForDefeating, 10),
        pointsToWin: parseInt(pointsToWin, 10),
        startingEquipmentHand: parseInt(startingEquipmentHand, 10),
        equipmentDrawPerRound: parseInt(equipmentDrawPerRound, 10),
        startingAnimalHand: parseInt(startingAnimalHand, 10),
        defaultInitiative: parseInt(defaultInitiative, 10),
        maxRounds: parseInt(maxRounds, 10),
        pointsForKill: parseInt(pointsForKill, 10),
        pointsPerOverkill: parseInt(pointsPerOverkill, 10),
        pointsPerAbsorbed: parseInt(pointsPerAbsorbed, 10),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rules");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading rules...</div>;
  }

  return (
    <div className="rules-editor-page">
      <h2>Game Rules</h2>
      <p className="help-text">
        Changes to rules only affect new games. Ongoing games use the rules that were active when
        they started.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Rules saved successfully!</div>}

      {rules && (
        <p className="meta-info">
          Version {rules.version} • Last updated: {new Date(rules.updatedAt).toLocaleString()}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend>Scoring (v1.2.0)</legend>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxRounds">Max Rounds</label>
              <input
                id="maxRounds"
                type="number"
                value={maxRounds}
                onChange={(e) => setMaxRounds(e.target.value)}
                min="1"
                required
              />
              <small>Number of rounds per game</small>
            </div>
            <div className="form-group">
              <label htmlFor="pointsForKill">Points for Kill</label>
              <input
                id="pointsForKill"
                type="number"
                value={pointsForKill}
                onChange={(e) => setPointsForKill(e.target.value)}
                min="0"
                required
              />
              <small>Bonus points for killing opponent's card</small>
            </div>
            <div className="form-group">
              <label htmlFor="pointsPerOverkill">Points per Overkill HP</label>
              <input
                id="pointsPerOverkill"
                type="number"
                value={pointsPerOverkill}
                onChange={(e) => setPointsPerOverkill(e.target.value)}
                min="0"
                required
              />
              <small>Points per excess damage beyond lethal</small>
            </div>
            <div className="form-group">
              <label htmlFor="pointsPerAbsorbed">Points per Absorbed HP</label>
              <input
                id="pointsPerAbsorbed"
                type="number"
                value={pointsPerAbsorbed}
                onChange={(e) => setPointsPerAbsorbed(e.target.value)}
                min="0"
                required
              />
              <small>Points per damage taken if survived</small>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Scoring (Legacy)</legend>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="pointsForSurviving">Points for Surviving</label>
              <input
                id="pointsForSurviving"
                type="number"
                value={pointsForSurviving}
                onChange={(e) => setPointsForSurviving(e.target.value)}
                min="0"
                required
              />
              <small>Legacy: Points awarded when your card survives combat</small>
            </div>
            <div className="form-group">
              <label htmlFor="pointsForDefeating">Points for Defeating</label>
              <input
                id="pointsForDefeating"
                type="number"
                value={pointsForDefeating}
                onChange={(e) => setPointsForDefeating(e.target.value)}
                min="0"
                required
              />
              <small>Legacy: Points awarded when you destroy opponent's card</small>
            </div>
            <div className="form-group">
              <label htmlFor="pointsToWin">Points to Win</label>
              <input
                id="pointsToWin"
                type="number"
                value={pointsToWin}
                onChange={(e) => setPointsToWin(e.target.value)}
                min="1"
                required
              />
              <small>Legacy: First player to reach this score wins</small>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Card Draw</legend>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startingAnimalHand">Starting Animal Hand</label>
              <input
                id="startingAnimalHand"
                type="number"
                value={startingAnimalHand}
                onChange={(e) => setStartingAnimalHand(e.target.value)}
                min="1"
                required
              />
              <small>Animals dealt at game start</small>
            </div>
            <div className="form-group">
              <label htmlFor="startingEquipmentHand">Starting Equipment Hand</label>
              <input
                id="startingEquipmentHand"
                type="number"
                value={startingEquipmentHand}
                onChange={(e) => setStartingEquipmentHand(e.target.value)}
                min="0"
                required
              />
              <small>Equipment drawn at game start</small>
            </div>
            <div className="form-group">
              <label htmlFor="equipmentDrawPerRound">Equipment Draw per Round</label>
              <input
                id="equipmentDrawPerRound"
                type="number"
                value={equipmentDrawPerRound}
                onChange={(e) => setEquipmentDrawPerRound(e.target.value)}
                min="0"
                required
              />
              <small>Equipment drawn each round</small>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Combat</legend>
          <div className="form-group">
            <label htmlFor="defaultInitiative">Default Initiative</label>
            <input
              id="defaultInitiative"
              type="number"
              value={defaultInitiative}
              onChange={(e) => setDefaultInitiative(e.target.value)}
              required
            />
            <small>Base initiative value for all cards (usually 0)</small>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !isDirty}>
            {saving ? "Saving..." : "Save Rules"}
          </button>
          {!isDirty && !saving && (
            <span className="form-hint">No changes to save</span>
          )}
        </div>
      </form>
    </div>
  );
}
