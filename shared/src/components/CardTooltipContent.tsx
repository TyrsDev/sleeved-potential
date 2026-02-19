import type { CardDefinition } from "../types/index.js";
import { StatsDisplay } from "./StatsDisplay.js";

interface CardTooltipContentProps {
  card: CardDefinition;
}

/**
 * Rich tooltip content for a single card.
 * Shows card name + type badge, stats, and description.
 * Sleeves show two StatsDisplay sections (FG and BG).
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
          <StatsDisplay label="Foreground" variant="fg" stats={card.foregroundStats} />
          <StatsDisplay label="Background" variant="bg" stats={card.backgroundStats} />
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
