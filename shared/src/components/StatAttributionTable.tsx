import { useMemo } from "react";
import { getStatAttribution } from "../combat.js";
import type { CardDefinition, StatLayerInfo, PersistentModifier } from "../types/index.js";
import type { SelectedEquipment } from "./types.js";
import { formatTriggerShort, formatEffectShort } from "./formatUtils.js";

interface StatAttributionTableProps {
  sleeve: CardDefinition | null;
  animal: CardDefinition | null;
  equipment: SelectedEquipment[];
  persistentModifiers?: PersistentModifier[];
  initiativeModifier?: number;
  onRemoveSleeve?: () => void;
  onRemoveAnimal?: () => void;
  onRemoveEquipment?: (order: number) => void;
  className?: string;
}

/**
 * StatAttributionTable - Shows which stats each layer contributes.
 * Columns: Layer, Effect, Modifier, Damage, Health, Init, Remove.
 * Overwritten values shown with strikethrough and faded opacity.
 */
export function StatAttributionTable({
  sleeve,
  animal,
  equipment,
  persistentModifiers = [],
  initiativeModifier = 0,
  onRemoveSleeve,
  onRemoveAnimal,
  onRemoveEquipment,
  className = "",
}: StatAttributionTableProps) {
  const sortedEquipment = useMemo(
    () => [...equipment].sort((a, b) => a.order - b.order),
    [equipment]
  );
  const equipmentCards = sortedEquipment.map((e) => e.card);

  const attribution = useMemo(
    () => getStatAttribution(sleeve, animal, equipmentCards, persistentModifiers, initiativeModifier),
    [sleeve, animal, equipmentCards, persistentModifiers, initiativeModifier]
  );

  const equipmentOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of sortedEquipment) {
      map.set(e.card.id, e.order);
    }
    return map;
  }, [sortedEquipment]);

  if (!sleeve && !animal && equipment.length === 0) {
    return (
      <div className="sp-stat-attribution-empty">
        Select cards to see stat breakdown
      </div>
    );
  }

  function isActive(layer: StatLayerInfo, stat: "damage" | "health" | "initiative" | "modifier" | "specialEffect"): boolean {
    return attribution.activeLayer[stat] === layer.cardId;
  }

  function renderStatCell(layer: StatLayerInfo, stat: "damage" | "health" | "initiative", value: number | undefined) {
    if (value === undefined || (stat !== "initiative" && value === 0)) {
      return <td className="sp-stat-cell sp-empty">&mdash;</td>;
    }
    if (layer.isAdditive) {
      const displayValue = `${value >= 0 ? "+" : ""}${value}`;
      return <td className={`sp-stat-cell ${stat} sp-active sp-additive`}>{displayValue}</td>;
    }
    const active = isActive(layer, stat);
    const displayValue = stat === "initiative" ? `${value >= 0 ? "+" : ""}${value}` : String(value);
    return <td className={`sp-stat-cell ${stat} ${active ? "sp-active" : "sp-overwritten"}`}>{displayValue}</td>;
  }

  function renderEffectCell(layer: StatLayerInfo) {
    if (!layer.specialEffect) {
      return <td className="sp-stat-cell sp-empty">&mdash;</td>;
    }
    const active = isActive(layer, "specialEffect");
    const triggerShort = formatTriggerShort(layer.specialEffect.trigger);
    const actionShort = formatEffectShort(layer.specialEffect.effect);
    return (
      <td className={`sp-stat-cell effect ${active ? "sp-active" : "sp-overwritten"}`}>
        {triggerShort}: {actionShort}
      </td>
    );
  }

  function renderModifierCell(layer: StatLayerInfo) {
    if (!layer.modifier) {
      return <td className="sp-stat-cell sp-empty">&mdash;</td>;
    }
    const active = isActive(layer, "modifier");
    const sign = layer.modifier.amount > 0 ? "+" : "";
    const statAbbrev = layer.modifier.type === "damage" ? "DMG" : "HP";
    return (
      <td className={`sp-stat-cell modifier ${active ? "sp-active" : "sp-overwritten"}`}>
        {sign}{layer.modifier.amount} {statAbbrev}
      </td>
    );
  }

  function renderRemoveButton(layer: StatLayerInfo) {
    if (layer.layerType === "sleeve_bg" && onRemoveSleeve) {
      return (
        <td className="sp-stat-cell sp-remove">
          <button onClick={onRemoveSleeve} className="sp-remove-btn">&times;</button>
        </td>
      );
    }
    if (layer.layerType === "sleeve_fg") {
      return <td className="sp-stat-cell"></td>;
    }
    if (layer.layerType === "animal" && onRemoveAnimal) {
      return (
        <td className="sp-stat-cell sp-remove">
          <button onClick={onRemoveAnimal} className="sp-remove-btn">&times;</button>
        </td>
      );
    }
    if (layer.layerType === "equipment" && onRemoveEquipment) {
      const order = equipmentOrderMap.get(layer.cardId);
      if (order !== undefined) {
        return (
          <td className="sp-stat-cell sp-remove">
            <button onClick={() => onRemoveEquipment(order)} className="sp-remove-btn">&times;</button>
          </td>
        );
      }
    }
    return <td className="sp-stat-cell"></td>;
  }

  return (
    <div className={`sp-stat-attribution-table-container ${className}`}>
      <table className="sp-stat-attribution-table">
        <thead>
          <tr>
            <th className="sp-col-layer">Layer</th>
            <th className="sp-col-effect">Effect</th>
            <th className="sp-col-modifier">Mod</th>
            <th className="sp-col-damage">DMG</th>
            <th className="sp-col-health">HP</th>
            <th className="sp-col-init">Init</th>
            <th className="sp-col-remove"></th>
          </tr>
        </thead>
        <tbody>
          {attribution.layers.map((layer, index) => (
            <tr key={`${layer.cardId}-${index}`} className={`sp-layer-row sp-layer-${layer.layerType}`}>
              <td className="sp-stat-cell sp-layer-name">{layer.cardName}</td>
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
