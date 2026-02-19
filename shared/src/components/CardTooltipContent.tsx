import type { CardDefinition, CardStats } from "../types/index.js";
import { formatTriggerName, formatEffectAction } from "../combat.js";
import { StatsDisplay } from "./StatsDisplay.js";

interface CardTooltipContentProps {
  card: CardDefinition;
}

/**
 * Rich tooltip content for a single card.
 * Shows card name + type badge, stats (with FG/BG sections for sleeves),
 * and description.
 */
export function CardTooltipContent({ card }: CardTooltipContentProps) {
  return (
    <div className="sp-card-tooltip-content">
      <div className="sp-tooltip-header">
        <span className={`sp-card-type sp-type-${card.type}`}>{card.type}</span>
        <span className="sp-tooltip-name">{card.name}</span>
      </div>

      {card.type === "sleeve" ? (
        <div className="sp-sleeve-tooltip-stats">
          <SleeveSection stats={card.foregroundStats} variant="fg" />
          <SleeveSection stats={card.backgroundStats} variant="bg" />
        </div>
      ) : (
        <StatsDisplay stats={card.stats} />
      )}

      {card.description && (
        <p className="sp-tooltip-description">{card.description}</p>
      )}
    </div>
  );
}

function SleeveSection({
  stats,
  variant,
}: {
  stats: CardStats | undefined;
  variant: "fg" | "bg";
}) {
  const isFg = variant === "fg";
  const title = isFg ? "Foreground" : "Background";
  const hint = isFg ? "guaranteed" : "overwritable";

  const hasDamage = (stats?.damage ?? 0) !== 0;
  const hasHealth = (stats?.health ?? 0) !== 0;
  const hasInit = (stats?.initiative ?? 0) !== 0;
  const hasModifier = stats?.modifier !== undefined;
  const hasEffect = stats?.specialEffect !== undefined;
  const hasAnything = hasDamage || hasHealth || hasInit || hasModifier || hasEffect;

  return (
    <div className={`sp-sleeve-section sp-sleeve-section-${variant}`}>
      <div className="sp-sleeve-section-header">
        <span className="sp-sleeve-section-title">{title}</span>
        <span className="sp-sleeve-section-hint">{hint}</span>
      </div>
      {hasAnything ? (
        <div className="sp-sleeve-section-body">
          {(hasDamage || hasHealth || hasInit) && (
            <div className="sp-sleeve-combat-row">
              {hasDamage && (
                <span className="sp-sleeve-chip damage">{stats!.damage} DMG</span>
              )}
              {hasInit && (
                <span className="sp-sleeve-chip initiative">
                  {stats!.initiative! > 0 ? "+" : ""}{stats!.initiative} INIT
                </span>
              )}
              {hasHealth && (
                <span className="sp-sleeve-chip health">{stats!.health} HP</span>
              )}
            </div>
          )}
          {hasEffect && (
            <div className="sp-sleeve-effect-row">
              {formatTriggerName(stats!.specialEffect!.trigger)}: {formatEffectAction(stats!.specialEffect!)}
            </div>
          )}
          {hasModifier && (
            <div className="sp-sleeve-modifier-row">
              {stats!.modifier!.amount > 0 ? "+" : ""}{stats!.modifier!.amount} {stats!.modifier!.type}
            </div>
          )}
        </div>
      ) : (
        <div className="sp-sleeve-section-empty">None</div>
      )}
    </div>
  );
}
