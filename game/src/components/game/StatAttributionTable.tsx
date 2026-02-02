import { useMemo } from "react";
import { getStatAttribution } from "@sleeved-potential/shared";
import type { CardDefinition, StatLayerInfo } from "@sleeved-potential/shared";

interface SelectedEquipment {
  card: CardDefinition;
  order: number;
}

interface StatAttributionTableProps {
  sleeve: CardDefinition | null;
  animal: CardDefinition | null;
  equipment: SelectedEquipment[];
  onRemoveSleeve?: () => void;
  onRemoveAnimal?: () => void;
  onRemoveEquipment?: (order: number) => void;
}

/**
 * Format trigger name to short abbreviation for table display
 */
function formatTriggerShort(trigger: string): string {
  const triggerMap: Record<string, string> = {
    on_play: "PLAY",
    if_survives: "SURV",
    if_destroyed: "DEAD",
    if_defeats: "KILL",
    if_doesnt_defeat: "MISS",
  };
  return triggerMap[trigger] || trigger.slice(0, 4).toUpperCase();
}

/**
 * Format effect action to short form for table display
 */
function formatEffectShort(
  effect: { type: string; count?: number; amount?: number; stat?: string }
): string {
  switch (effect.type) {
    case "draw_cards":
      return `+${effect.count} card`;
    case "modify_initiative":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} init`;
    case "add_persistent_modifier":
      return `${effect.amount! > 0 ? "+" : ""}${effect.amount} ${effect.stat === "damage" ? "dmg" : "hp"}`;
    default:
      return effect.type.slice(0, 8);
  }
}

/**
 * StatAttributionTable - Shows which stats each layer contributes
 *
 * Displays a table with columns: Layer, Effect, Modifier, Damage, Health, Init, Remove
 * Overwritten values are shown with strikethrough and faded opacity.
 */
export function StatAttributionTable({
  sleeve,
  animal,
  equipment,
  onRemoveSleeve,
  onRemoveAnimal,
  onRemoveEquipment,
}: StatAttributionTableProps) {
  // Sort equipment by order
  const sortedEquipment = useMemo(
    () => [...equipment].sort((a, b) => a.order - b.order),
    [equipment]
  );
  const equipmentCards = sortedEquipment.map((e) => e.card);

  // Get stat attribution
  const attribution = useMemo(
    () => getStatAttribution(sleeve, animal, equipmentCards),
    [sleeve, animal, equipmentCards]
  );

  // Build a map from equipment cardId to order for remove button
  const equipmentOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of sortedEquipment) {
      map.set(e.card.id, e.order);
    }
    return map;
  }, [sortedEquipment]);

  // If nothing selected, show placeholder
  if (!sleeve && !animal && equipment.length === 0) {
    return (
      <div className="stat-attribution-empty">
        Select cards to see stat breakdown
      </div>
    );
  }

  /**
   * Determine if a value is "active" (winning) for its stat
   */
  function isActive(layer: StatLayerInfo, stat: "damage" | "health" | "initiative" | "modifier" | "specialEffect"): boolean {
    return attribution.activeLayer[stat] === layer.cardId;
  }

  /**
   * Render a stat cell with appropriate styling
   */
  function renderStatCell(
    layer: StatLayerInfo,
    stat: "damage" | "health" | "initiative",
    value: number | undefined
  ) {
    if (value === undefined || (stat !== "initiative" && value === 0)) {
      return <td className="stat-cell empty">&mdash;</td>;
    }
    const active = isActive(layer, stat);
    const displayValue = stat === "initiative"
      ? `${value >= 0 ? "+" : ""}${value}`
      : String(value);
    return (
      <td className={`stat-cell ${stat} ${active ? "active" : "overwritten"}`}>
        {displayValue}
      </td>
    );
  }

  /**
   * Render the effect cell
   */
  function renderEffectCell(layer: StatLayerInfo) {
    if (!layer.specialEffect) {
      return <td className="stat-cell empty">&mdash;</td>;
    }
    const active = isActive(layer, "specialEffect");
    const triggerShort = formatTriggerShort(layer.specialEffect.trigger);
    const actionShort = formatEffectShort(layer.specialEffect.effect);
    return (
      <td className={`stat-cell effect ${active ? "active" : "overwritten"}`}>
        {triggerShort}: {actionShort}
      </td>
    );
  }

  /**
   * Render the modifier cell
   */
  function renderModifierCell(layer: StatLayerInfo) {
    if (!layer.modifier) {
      return <td className="stat-cell empty">&mdash;</td>;
    }
    const active = isActive(layer, "modifier");
    const sign = layer.modifier.amount > 0 ? "+" : "";
    const statAbbrev = layer.modifier.type === "damage" ? "DMG" : "HP";
    return (
      <td className={`stat-cell modifier ${active ? "active" : "overwritten"}`}>
        {sign}{layer.modifier.amount} {statAbbrev}
      </td>
    );
  }

  /**
   * Render remove button based on layer type
   */
  function renderRemoveButton(layer: StatLayerInfo) {
    // Sleeve BG row gets the remove button for the whole sleeve
    if (layer.layerType === "sleeve_bg" && onRemoveSleeve) {
      return (
        <td className="stat-cell remove">
          <button onClick={onRemoveSleeve} className="remove-btn">&times;</button>
        </td>
      );
    }
    // Sleeve FG row has no button (it's removed with BG)
    if (layer.layerType === "sleeve_fg") {
      return <td className="stat-cell"></td>;
    }
    // Animal
    if (layer.layerType === "animal" && onRemoveAnimal) {
      return (
        <td className="stat-cell remove">
          <button onClick={onRemoveAnimal} className="remove-btn">&times;</button>
        </td>
      );
    }
    // Equipment
    if (layer.layerType === "equipment" && onRemoveEquipment) {
      const order = equipmentOrderMap.get(layer.cardId);
      if (order !== undefined) {
        return (
          <td className="stat-cell remove">
            <button onClick={() => onRemoveEquipment(order)} className="remove-btn">&times;</button>
          </td>
        );
      }
    }
    return <td className="stat-cell"></td>;
  }

  return (
    <div className="stat-attribution-table-container">
      <table className="stat-attribution-table">
        <thead>
          <tr>
            <th className="col-layer">Layer</th>
            <th className="col-effect">Effect</th>
            <th className="col-modifier">Mod</th>
            <th className="col-damage">DMG</th>
            <th className="col-health">HP</th>
            <th className="col-init">Init</th>
            <th className="col-remove"></th>
          </tr>
        </thead>
        <tbody>
          {attribution.layers.map((layer, index) => (
            <tr key={`${layer.cardId}-${index}`} className={`layer-row layer-${layer.layerType}`}>
              <td className="stat-cell layer-name">{layer.cardName}</td>
              {renderEffectCell(layer)}
              {renderModifierCell(layer)}
              {renderStatCell(layer, "damage", layer.damage)}
              {renderStatCell(layer, "health", layer.health)}
              {renderStatCell(layer, "initiative", layer.initiative)}
              {renderRemoveButton(layer)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
