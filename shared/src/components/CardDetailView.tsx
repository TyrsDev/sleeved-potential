import type { CardDefinition } from "../types/index.js";
import { CardStatsFallback } from "./CardStatsFallback.js";
import { StatsDisplay } from "./StatsDisplay.js";

interface CardDetailViewProps {
  card: CardDefinition;
  className?: string;
}

/**
 * Full card detail panel showing image/fallback, type badge, name,
 * description, and stat sections (BG/FG for sleeves).
 */
export function CardDetailView({ card, className = "" }: CardDetailViewProps) {
  return (
    <div className={`sp-card-detail-view ${className}`}>
      <div className="sp-card-detail-image">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} />
        ) : (
          <CardStatsFallback card={card} className="large" />
        )}
      </div>
      <div className="sp-card-detail-info">
        <span className={`sp-card-type sp-type-${card.type}`}>{card.type}</span>
        <h2>{card.name}</h2>
        {card.description && <p className="sp-card-description">{card.description}</p>}
        <div className="sp-card-stats-detail">
          {card.type === "sleeve" ? (
            <>
              <StatsDisplay stats={card.backgroundStats} label="Background (may be overwritten)" variant="bg" />
              <StatsDisplay stats={card.foregroundStats} label="Foreground (guaranteed)" variant="fg" />
            </>
          ) : (
            <StatsDisplay stats={card.stats} />
          )}
        </div>
      </div>
    </div>
  );
}
