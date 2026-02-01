import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db, createCard, updateCard, deleteCard, uploadCardImage } from "../firebase";
import { ImageSelector } from "../components/ImageSelector";
import type {
  CardDefinition,
  CardType,
  CardStats,
  CreateCardData,
  SpecialEffectTrigger,
  SpecialEffectAction,
  Modifier,
  SpecialEffect,
} from "@sleeved-potential/shared";

type EffectActionType = "draw_cards" | "modify_initiative" | "add_persistent_modifier";

/**
 * Component for editing stats (damage, health, initiative, modifier, special effect)
 * Used for both animal/equipment stats and sleeve background/foreground stats
 */
function StatsEditor({
  prefix,
  damage,
  setDamage,
  health,
  setHealth,
  initiative,
  setInitiative,
  hasModifier,
  setHasModifier,
  modifierType,
  setModifierType,
  modifierAmount,
  setModifierAmount,
  hasSpecialEffect,
  setHasSpecialEffect,
  effectTrigger,
  setEffectTrigger,
  effectActionType,
  setEffectActionType,
  effectCount,
  setEffectCount,
  effectAmount,
  setEffectAmount,
  effectStat,
  setEffectStat,
}: {
  prefix: string;
  damage: string;
  setDamage: (v: string) => void;
  health: string;
  setHealth: (v: string) => void;
  initiative: string;
  setInitiative: (v: string) => void;
  hasModifier: boolean;
  setHasModifier: (v: boolean) => void;
  modifierType: "damage" | "health";
  setModifierType: (v: "damage" | "health") => void;
  modifierAmount: string;
  setModifierAmount: (v: string) => void;
  hasSpecialEffect: boolean;
  setHasSpecialEffect: (v: boolean) => void;
  effectTrigger: SpecialEffectTrigger;
  setEffectTrigger: (v: SpecialEffectTrigger) => void;
  effectActionType: EffectActionType;
  setEffectActionType: (v: EffectActionType) => void;
  effectCount: string;
  setEffectCount: (v: string) => void;
  effectAmount: string;
  setEffectAmount: (v: string) => void;
  effectStat: "damage" | "health";
  setEffectStat: (v: "damage" | "health") => void;
}) {
  return (
    <>
      {/* Basic Stats Row */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`${prefix}Damage`}>Damage</label>
          <input
            id={`${prefix}Damage`}
            type="number"
            value={damage}
            onChange={(e) => setDamage(e.target.value)}
            min="0"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${prefix}Health`}>Health</label>
          <input
            id={`${prefix}Health`}
            type="number"
            value={health}
            onChange={(e) => setHealth(e.target.value)}
            min="0"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${prefix}Initiative`}>Initiative</label>
          <input
            id={`${prefix}Initiative`}
            type="number"
            value={initiative}
            onChange={(e) => setInitiative(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Modifier Section */}
      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={hasModifier}
            onChange={(e) => setHasModifier(e.target.checked)}
          />
          Has Modifier
        </label>
      </div>
      {hasModifier && (
        <div className="form-row indented">
          <div className="form-group">
            <label htmlFor={`${prefix}ModifierType`}>Modifier Type</label>
            <select
              id={`${prefix}ModifierType`}
              value={modifierType}
              onChange={(e) => setModifierType(e.target.value as "damage" | "health")}
            >
              <option value="damage">Damage</option>
              <option value="health">Health</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor={`${prefix}ModifierAmount`}>Amount (+/-)</label>
            <input
              id={`${prefix}ModifierAmount`}
              type="number"
              value={modifierAmount}
              onChange={(e) => setModifierAmount(e.target.value)}
              placeholder="e.g. +2 or -1"
            />
          </div>
        </div>
      )}

      {/* Special Effect Section */}
      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={hasSpecialEffect}
            onChange={(e) => setHasSpecialEffect(e.target.checked)}
          />
          Has Special Effect
        </label>
      </div>
      {hasSpecialEffect && (
        <div className="special-effect-editor indented">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor={`${prefix}EffectTrigger`}>Trigger</label>
              <select
                id={`${prefix}EffectTrigger`}
                value={effectTrigger}
                onChange={(e) => setEffectTrigger(e.target.value as SpecialEffectTrigger)}
              >
                <option value="on_play">On Play</option>
                <option value="if_survives">If Survives</option>
                <option value="if_destroyed">If Destroyed</option>
                <option value="if_defeats">If Defeats</option>
                <option value="if_doesnt_defeat">If Doesn't Defeat</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor={`${prefix}EffectAction`}>Effect Action</label>
            <select
              id={`${prefix}EffectAction`}
              value={effectActionType}
              onChange={(e) => setEffectActionType(e.target.value as EffectActionType)}
            >
              <option value="draw_cards">Draw Cards</option>
              <option value="modify_initiative">Modify Initiative</option>
              <option value="add_persistent_modifier">Add Persistent Modifier</option>
            </select>
          </div>

          {/* Conditional inputs based on effect action type */}
          {effectActionType === "draw_cards" && (
            <div className="form-group">
              <label htmlFor={`${prefix}EffectCount`}>Cards to Draw</label>
              <input
                id={`${prefix}EffectCount`}
                type="number"
                min="1"
                max="5"
                value={effectCount}
                onChange={(e) => setEffectCount(e.target.value)}
              />
            </div>
          )}

          {effectActionType === "modify_initiative" && (
            <div className="form-group">
              <label htmlFor={`${prefix}EffectAmount`}>Initiative Change (+/-)</label>
              <input
                id={`${prefix}EffectAmount`}
                type="number"
                value={effectAmount}
                onChange={(e) => setEffectAmount(e.target.value)}
                placeholder="e.g. +1 or -1"
              />
            </div>
          )}

          {effectActionType === "add_persistent_modifier" && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`${prefix}EffectStat`}>Stat</label>
                <select
                  id={`${prefix}EffectStat`}
                  value={effectStat}
                  onChange={(e) => setEffectStat(e.target.value as "damage" | "health")}
                >
                  <option value="damage">Damage</option>
                  <option value="health">Health</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor={`${prefix}EffectModAmount`}>Amount (+/-)</label>
                <input
                  id={`${prefix}EffectModAmount`}
                  type="number"
                  value={effectAmount}
                  onChange={(e) => setEffectAmount(e.target.value)}
                  placeholder="e.g. +1 or -1"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function CardForm() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const isNew = cardId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - basic
  const [type, setType] = useState<CardType>("animal");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [active, setActive] = useState(true);

  // Stats for animal/equipment
  const [damage, setDamage] = useState<string>("");
  const [health, setHealth] = useState<string>("");
  const [initiative, setInitiative] = useState<string>("");
  const [hasModifier, setHasModifier] = useState(false);
  const [modifierType, setModifierType] = useState<"damage" | "health">("damage");
  const [modifierAmount, setModifierAmount] = useState<string>("");
  const [hasSpecialEffect, setHasSpecialEffect] = useState(false);
  const [effectTrigger, setEffectTrigger] = useState<SpecialEffectTrigger>("on_play");
  const [effectActionType, setEffectActionType] = useState<EffectActionType>("draw_cards");
  const [effectCount, setEffectCount] = useState<string>("1");
  const [effectAmount, setEffectAmount] = useState<string>("1");
  const [effectStat, setEffectStat] = useState<"damage" | "health">("damage");

  // Sleeve background stats
  const [bgDamage, setBgDamage] = useState<string>("");
  const [bgHealth, setBgHealth] = useState<string>("");
  const [bgInitiative, setBgInitiative] = useState<string>("");
  const [bgHasModifier, setBgHasModifier] = useState(false);
  const [bgModifierType, setBgModifierType] = useState<"damage" | "health">("damage");
  const [bgModifierAmount, setBgModifierAmount] = useState<string>("");
  const [bgHasSpecialEffect, setBgHasSpecialEffect] = useState(false);
  const [bgEffectTrigger, setBgEffectTrigger] = useState<SpecialEffectTrigger>("on_play");
  const [bgEffectActionType, setBgEffectActionType] = useState<EffectActionType>("draw_cards");
  const [bgEffectCount, setBgEffectCount] = useState<string>("1");
  const [bgEffectAmount, setBgEffectAmount] = useState<string>("1");
  const [bgEffectStat, setBgEffectStat] = useState<"damage" | "health">("damage");

  // Sleeve foreground stats
  const [fgDamage, setFgDamage] = useState<string>("");
  const [fgHealth, setFgHealth] = useState<string>("");
  const [fgInitiative, setFgInitiative] = useState<string>("");
  const [fgHasModifier, setFgHasModifier] = useState(false);
  const [fgModifierType, setFgModifierType] = useState<"damage" | "health">("damage");
  const [fgModifierAmount, setFgModifierAmount] = useState<string>("");
  const [fgHasSpecialEffect, setFgHasSpecialEffect] = useState(false);
  const [fgEffectTrigger, setFgEffectTrigger] = useState<SpecialEffectTrigger>("on_play");
  const [fgEffectActionType, setFgEffectActionType] = useState<EffectActionType>("draw_cards");
  const [fgEffectCount, setFgEffectCount] = useState<string>("1");
  const [fgEffectAmount, setFgEffectAmount] = useState<string>("1");
  const [fgEffectStat, setFgEffectStat] = useState<"damage" | "health">("damage");

  // Helper to parse stats from a CardStats object
  const parseStatsIntoState = useCallback(
    (
      stats: CardStats | undefined,
      setters: {
        setDamage: (v: string) => void;
        setHealth: (v: string) => void;
        setInitiative: (v: string) => void;
        setHasModifier: (v: boolean) => void;
        setModifierType: (v: "damage" | "health") => void;
        setModifierAmount: (v: string) => void;
        setHasSpecialEffect: (v: boolean) => void;
        setEffectTrigger: (v: SpecialEffectTrigger) => void;
        setEffectActionType: (v: EffectActionType) => void;
        setEffectCount: (v: string) => void;
        setEffectAmount: (v: string) => void;
        setEffectStat: (v: "damage" | "health") => void;
      }
    ) => {
      if (!stats) {
        setters.setDamage("");
        setters.setHealth("");
        setters.setInitiative("");
        setters.setHasModifier(false);
        setters.setModifierType("damage");
        setters.setModifierAmount("");
        setters.setHasSpecialEffect(false);
        setters.setEffectTrigger("on_play");
        setters.setEffectActionType("draw_cards");
        setters.setEffectCount("1");
        setters.setEffectAmount("1");
        setters.setEffectStat("damage");
        return;
      }

      setters.setDamage(stats.damage?.toString() ?? "");
      setters.setHealth(stats.health?.toString() ?? "");
      setters.setInitiative(stats.initiative?.toString() ?? "");

      if (stats.modifier) {
        setters.setHasModifier(true);
        setters.setModifierType(stats.modifier.type);
        setters.setModifierAmount(stats.modifier.amount.toString());
      } else {
        setters.setHasModifier(false);
        setters.setModifierType("damage");
        setters.setModifierAmount("");
      }

      if (stats.specialEffect) {
        setters.setHasSpecialEffect(true);
        setters.setEffectTrigger(stats.specialEffect.trigger);

        const action = stats.specialEffect.effect;
        setters.setEffectActionType(action.type);

        if (action.type === "draw_cards") {
          setters.setEffectCount(action.count.toString());
        } else if (action.type === "modify_initiative") {
          setters.setEffectAmount(action.amount.toString());
        } else if (action.type === "add_persistent_modifier") {
          setters.setEffectStat(action.stat);
          setters.setEffectAmount(action.amount.toString());
        }
      } else {
        setters.setHasSpecialEffect(false);
        setters.setEffectTrigger("on_play");
        setters.setEffectActionType("draw_cards");
        setters.setEffectCount("1");
        setters.setEffectAmount("1");
        setters.setEffectStat("damage");
      }
    },
    []
  );

  // Reset form when creating new card
  useEffect(() => {
    if (isNew) {
      setType("animal");
      setName("");
      setDescription("");
      setImageUrl(null);
      setActive(true);
      setError(null);

      // Reset animal/equipment stats
      parseStatsIntoState(undefined, {
        setDamage,
        setHealth,
        setInitiative,
        setHasModifier,
        setModifierType,
        setModifierAmount,
        setHasSpecialEffect,
        setEffectTrigger,
        setEffectActionType,
        setEffectCount,
        setEffectAmount,
        setEffectStat,
      });

      // Reset sleeve background stats
      parseStatsIntoState(undefined, {
        setDamage: setBgDamage,
        setHealth: setBgHealth,
        setInitiative: setBgInitiative,
        setHasModifier: setBgHasModifier,
        setModifierType: setBgModifierType,
        setModifierAmount: setBgModifierAmount,
        setHasSpecialEffect: setBgHasSpecialEffect,
        setEffectTrigger: setBgEffectTrigger,
        setEffectActionType: setBgEffectActionType,
        setEffectCount: setBgEffectCount,
        setEffectAmount: setBgEffectAmount,
        setEffectStat: setBgEffectStat,
      });

      // Reset sleeve foreground stats
      parseStatsIntoState(undefined, {
        setDamage: setFgDamage,
        setHealth: setFgHealth,
        setInitiative: setFgInitiative,
        setHasModifier: setFgHasModifier,
        setModifierType: setFgModifierType,
        setModifierAmount: setFgModifierAmount,
        setHasSpecialEffect: setFgHasSpecialEffect,
        setEffectTrigger: setFgEffectTrigger,
        setEffectActionType: setFgEffectActionType,
        setEffectCount: setFgEffectCount,
        setEffectAmount: setFgEffectAmount,
        setEffectStat: setFgEffectStat,
      });
    }
  }, [isNew, parseStatsIntoState]);

  // Load existing card
  useEffect(() => {
    if (isNew || !cardId) return;

    const unsubscribe = onSnapshot(doc(db, "cards", cardId), (snapshot) => {
      if (snapshot.exists()) {
        const card = snapshot.data() as CardDefinition;
        setType(card.type);
        setName(card.name);
        setDescription(card.description);
        setImageUrl(card.imageUrl);
        setActive(card.active ?? true); // Default to true for existing cards without the field

        if (card.type === "sleeve") {
          parseStatsIntoState(card.backgroundStats, {
            setDamage: setBgDamage,
            setHealth: setBgHealth,
            setInitiative: setBgInitiative,
            setHasModifier: setBgHasModifier,
            setModifierType: setBgModifierType,
            setModifierAmount: setBgModifierAmount,
            setHasSpecialEffect: setBgHasSpecialEffect,
            setEffectTrigger: setBgEffectTrigger,
            setEffectActionType: setBgEffectActionType,
            setEffectCount: setBgEffectCount,
            setEffectAmount: setBgEffectAmount,
            setEffectStat: setBgEffectStat,
          });

          parseStatsIntoState(card.foregroundStats, {
            setDamage: setFgDamage,
            setHealth: setFgHealth,
            setInitiative: setFgInitiative,
            setHasModifier: setFgHasModifier,
            setModifierType: setFgModifierType,
            setModifierAmount: setFgModifierAmount,
            setHasSpecialEffect: setFgHasSpecialEffect,
            setEffectTrigger: setFgEffectTrigger,
            setEffectActionType: setFgEffectActionType,
            setEffectCount: setFgEffectCount,
            setEffectAmount: setFgEffectAmount,
            setEffectStat: setFgEffectStat,
          });
        } else {
          parseStatsIntoState(card.stats, {
            setDamage,
            setHealth,
            setInitiative,
            setHasModifier,
            setModifierType,
            setModifierAmount,
            setHasSpecialEffect,
            setEffectTrigger,
            setEffectActionType,
            setEffectCount,
            setEffectAmount,
            setEffectStat,
          });
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [cardId, isNew, parseStatsIntoState]);

  // Build effect action from state
  const buildEffectAction = useCallback(
    (
      actionType: EffectActionType,
      count: string,
      amount: string,
      stat: "damage" | "health"
    ): SpecialEffectAction => {
      switch (actionType) {
        case "draw_cards":
          return { type: "draw_cards", count: parseInt(count, 10) || 1 };
        case "modify_initiative":
          return { type: "modify_initiative", amount: parseInt(amount, 10) || 0 };
        case "add_persistent_modifier":
          return {
            type: "add_persistent_modifier",
            stat,
            amount: parseInt(amount, 10) || 0,
          };
      }
    },
    []
  );

  // Build CardStats from state values
  const buildStatsFromValues = useCallback(
    (
      damageVal: string,
      healthVal: string,
      initiativeVal: string,
      hasModVal: boolean,
      modTypeVal: "damage" | "health",
      modAmountVal: string,
      hasEffectVal: boolean,
      triggerVal: SpecialEffectTrigger,
      actionTypeVal: EffectActionType,
      countVal: string,
      amountVal: string,
      statVal: "damage" | "health"
    ): CardStats | undefined => {
      const stats: CardStats = {};

      if (damageVal !== "") stats.damage = parseInt(damageVal, 10);
      if (healthVal !== "") stats.health = parseInt(healthVal, 10);
      if (initiativeVal !== "") stats.initiative = parseInt(initiativeVal, 10);

      if (hasModVal && modAmountVal !== "") {
        const modifier: Modifier = {
          type: modTypeVal,
          amount: parseInt(modAmountVal, 10),
        };
        stats.modifier = modifier;
      }

      if (hasEffectVal) {
        const specialEffect: SpecialEffect = {
          trigger: triggerVal,
          effect: buildEffectAction(actionTypeVal, countVal, amountVal, statVal),
        };
        stats.specialEffect = specialEffect;
      }

      return Object.keys(stats).length > 0 ? stats : undefined;
    },
    [buildEffectAction]
  );

  const buildStats = useCallback((): CardStats | undefined => {
    return buildStatsFromValues(
      damage,
      health,
      initiative,
      hasModifier,
      modifierType,
      modifierAmount,
      hasSpecialEffect,
      effectTrigger,
      effectActionType,
      effectCount,
      effectAmount,
      effectStat
    );
  }, [
    damage,
    health,
    initiative,
    hasModifier,
    modifierType,
    modifierAmount,
    hasSpecialEffect,
    effectTrigger,
    effectActionType,
    effectCount,
    effectAmount,
    effectStat,
    buildStatsFromValues,
  ]);

  const buildSleeveStats = useCallback((): {
    backgroundStats?: CardStats;
    foregroundStats?: CardStats;
  } => {
    const backgroundStats = buildStatsFromValues(
      bgDamage,
      bgHealth,
      bgInitiative,
      bgHasModifier,
      bgModifierType,
      bgModifierAmount,
      bgHasSpecialEffect,
      bgEffectTrigger,
      bgEffectActionType,
      bgEffectCount,
      bgEffectAmount,
      bgEffectStat
    );

    const foregroundStats = buildStatsFromValues(
      fgDamage,
      fgHealth,
      fgInitiative,
      fgHasModifier,
      fgModifierType,
      fgModifierAmount,
      fgHasSpecialEffect,
      fgEffectTrigger,
      fgEffectActionType,
      fgEffectCount,
      fgEffectAmount,
      fgEffectStat
    );

    return { backgroundStats, foregroundStats };
  }, [
    bgDamage,
    bgHealth,
    bgInitiative,
    bgHasModifier,
    bgModifierType,
    bgModifierAmount,
    bgHasSpecialEffect,
    bgEffectTrigger,
    bgEffectActionType,
    bgEffectCount,
    bgEffectAmount,
    bgEffectStat,
    fgDamage,
    fgHealth,
    fgInitiative,
    fgHasModifier,
    fgModifierType,
    fgModifierAmount,
    fgHasSpecialEffect,
    fgEffectTrigger,
    fgEffectActionType,
    fgEffectCount,
    fgEffectAmount,
    fgEffectStat,
    buildStatsFromValues,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isNew) {
        const cardData: CreateCardData = {
          type,
          name,
          description,
        };

        if (type === "sleeve") {
          const { backgroundStats, foregroundStats } = buildSleeveStats();
          cardData.backgroundStats = backgroundStats;
          cardData.foregroundStats = foregroundStats;
        } else {
          cardData.stats = buildStats();
        }

        const result = await createCard(cardData);
        navigate(`/cards/${result.card.id}`);
      } else if (cardId) {
        const updates: Partial<CardDefinition> = {
          name,
          description,
          imageUrl,
          active,
        };

        if (type === "sleeve") {
          const { backgroundStats, foregroundStats } = buildSleeveStats();
          updates.backgroundStats = backgroundStats;
          updates.foregroundStats = foregroundStats;
        } else {
          updates.stats = buildStats();
        }

        await updateCard(cardId, updates);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!cardId || isNew) return;
    if (!confirm("Are you sure you want to delete this card?")) return;

    setSaving(true);
    try {
      await deleteCard(cardId);
      navigate("/cards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete card");
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cardId || isNew) return;

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setSaving(true);
      try {
        const result = await uploadCardImage(cardId, base64, file.type);
        setImageUrl(result.imageUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload image");
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="loading">Loading card...</div>;
  }

  return (
    <div className="card-form-page">
      <div className="page-header">
        <h2>{isNew ? "Create Card" : "Edit Card"}</h2>
        {!isNew && (
          <Link to="/cards/new" className="btn btn-primary">
            + New Card
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as CardType)}
            disabled={!isNew}
          >
            <option value="animal">Animal</option>
            <option value="equipment">Equipment</option>
            <option value="sleeve">Sleeve</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {!isNew && (
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active (include in new games)
            </label>
          </div>
        )}

        {type === "sleeve" ? (
          <>
            <fieldset>
              <legend>Background Stats (easily overwritten)</legend>
              <StatsEditor
                prefix="bg"
                damage={bgDamage}
                setDamage={setBgDamage}
                health={bgHealth}
                setHealth={setBgHealth}
                initiative={bgInitiative}
                setInitiative={setBgInitiative}
                hasModifier={bgHasModifier}
                setHasModifier={setBgHasModifier}
                modifierType={bgModifierType}
                setModifierType={setBgModifierType}
                modifierAmount={bgModifierAmount}
                setModifierAmount={setBgModifierAmount}
                hasSpecialEffect={bgHasSpecialEffect}
                setHasSpecialEffect={setBgHasSpecialEffect}
                effectTrigger={bgEffectTrigger}
                setEffectTrigger={setBgEffectTrigger}
                effectActionType={bgEffectActionType}
                setEffectActionType={setBgEffectActionType}
                effectCount={bgEffectCount}
                setEffectCount={setBgEffectCount}
                effectAmount={bgEffectAmount}
                setEffectAmount={setBgEffectAmount}
                effectStat={bgEffectStat}
                setEffectStat={setBgEffectStat}
              />
            </fieldset>

            <fieldset>
              <legend>Foreground Stats (guaranteed)</legend>
              <StatsEditor
                prefix="fg"
                damage={fgDamage}
                setDamage={setFgDamage}
                health={fgHealth}
                setHealth={setFgHealth}
                initiative={fgInitiative}
                setInitiative={setFgInitiative}
                hasModifier={fgHasModifier}
                setHasModifier={setFgHasModifier}
                modifierType={fgModifierType}
                setModifierType={setFgModifierType}
                modifierAmount={fgModifierAmount}
                setModifierAmount={setFgModifierAmount}
                hasSpecialEffect={fgHasSpecialEffect}
                setHasSpecialEffect={setFgHasSpecialEffect}
                effectTrigger={fgEffectTrigger}
                setEffectTrigger={setFgEffectTrigger}
                effectActionType={fgEffectActionType}
                setEffectActionType={setFgEffectActionType}
                effectCount={fgEffectCount}
                setEffectCount={setFgEffectCount}
                effectAmount={fgEffectAmount}
                setEffectAmount={setFgEffectAmount}
                effectStat={fgEffectStat}
                setEffectStat={setFgEffectStat}
              />
            </fieldset>
          </>
        ) : (
          <fieldset>
            <legend>Stats</legend>
            <StatsEditor
              prefix="stats"
              damage={damage}
              setDamage={setDamage}
              health={health}
              setHealth={setHealth}
              initiative={initiative}
              setInitiative={setInitiative}
              hasModifier={hasModifier}
              setHasModifier={setHasModifier}
              modifierType={modifierType}
              setModifierType={setModifierType}
              modifierAmount={modifierAmount}
              setModifierAmount={setModifierAmount}
              hasSpecialEffect={hasSpecialEffect}
              setHasSpecialEffect={setHasSpecialEffect}
              effectTrigger={effectTrigger}
              setEffectTrigger={setEffectTrigger}
              effectActionType={effectActionType}
              setEffectActionType={setEffectActionType}
              effectCount={effectCount}
              setEffectCount={setEffectCount}
              effectAmount={effectAmount}
              setEffectAmount={setEffectAmount}
              effectStat={effectStat}
              setEffectStat={setEffectStat}
            />
          </fieldset>
        )}

        {!isNew && cardId && (
          <fieldset>
            <legend>Card Image</legend>
            <ImageSelector
              currentImageUrl={imageUrl}
              currentCardId={cardId}
              onSelect={setImageUrl}
            />
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Or upload a new image:</label>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} />
            </div>
          </fieldset>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : isNew ? "Create Card" : "Save Changes"}
          </button>
          <button type="button" className="btn" onClick={() => navigate("/cards")}>
            Cancel
          </button>
          {!isNew && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
