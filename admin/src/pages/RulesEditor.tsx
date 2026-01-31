import { useEffect, useState } from "react";
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
      } else {
        // Use defaults
        setPointsForSurviving(DEFAULT_GAME_RULES.pointsForSurviving.toString());
        setPointsForDefeating(DEFAULT_GAME_RULES.pointsForDefeating.toString());
        setPointsToWin(DEFAULT_GAME_RULES.pointsToWin.toString());
        setStartingEquipmentHand(DEFAULT_GAME_RULES.startingEquipmentHand.toString());
        setEquipmentDrawPerRound(DEFAULT_GAME_RULES.equipmentDrawPerRound.toString());
        setStartingAnimalHand(DEFAULT_GAME_RULES.startingAnimalHand.toString());
        setDefaultInitiative(DEFAULT_GAME_RULES.defaultInitiative.toString());
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
          <legend>Scoring</legend>
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
              <small>Points awarded when your card survives combat</small>
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
              <small>Points awarded when you destroy opponent's card</small>
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
              <small>First player to reach this score wins</small>
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
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Rules"}
          </button>
        </div>
      </form>
    </div>
  );
}
