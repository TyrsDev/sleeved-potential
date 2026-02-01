import { useEffect, useState } from "react";
import { subscribeToCards } from "../firebase";
import { CardStatsFallback } from "../components/CardStatsFallback";
import type { CardDefinition, CardType } from "@sleeved-potential/shared";

type FilterType = "all" | CardType;

export function Cards() {
  const [cards, setCards] = useState<CardDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToCards((loadedCards) => {
      setCards(loadedCards);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredCards = filter === "all" ? cards : cards.filter((card) => card.type === filter);

  const cardsByType = {
    sleeve: filteredCards.filter((c) => c.type === "sleeve"),
    animal: filteredCards.filter((c) => c.type === "animal"),
    equipment: filteredCards.filter((c) => c.type === "equipment"),
  };

  if (loading) {
    return <div className="loading">Loading cards...</div>;
  }

  return (
    <div className="cards-page">
      <h2>Card Browser</h2>
      <p className="page-description">
        Browse all cards available in the game. Cards are layered to create composite cards.
      </p>

      <div className="filter-tabs">
        <button className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          All ({cards.length})
        </button>
        <button
          className={`tab ${filter === "sleeve" ? "active" : ""}`}
          onClick={() => setFilter("sleeve")}
        >
          Sleeves ({cards.filter((c) => c.type === "sleeve").length})
        </button>
        <button
          className={`tab ${filter === "animal" ? "active" : ""}`}
          onClick={() => setFilter("animal")}
        >
          Animals ({cards.filter((c) => c.type === "animal").length})
        </button>
        <button
          className={`tab ${filter === "equipment" ? "active" : ""}`}
          onClick={() => setFilter("equipment")}
        >
          Equipment ({cards.filter((c) => c.type === "equipment").length})
        </button>
      </div>

      {filteredCards.length === 0 ? (
        <div className="empty-state">
          <p>No cards found.</p>
        </div>
      ) : (
        <>
          {filter === "all" ? (
            <>
              {cardsByType.sleeve.length > 0 && (
                <section className="card-section">
                  <h3>Sleeves</h3>
                  <div className="card-grid">
                    {cardsByType.sleeve.map((card) => (
                      <CardItem key={card.id} card={card} onClick={() => setSelectedCard(card)} />
                    ))}
                  </div>
                </section>
              )}
              {cardsByType.animal.length > 0 && (
                <section className="card-section">
                  <h3>Animals</h3>
                  <div className="card-grid">
                    {cardsByType.animal.map((card) => (
                      <CardItem key={card.id} card={card} onClick={() => setSelectedCard(card)} />
                    ))}
                  </div>
                </section>
              )}
              {cardsByType.equipment.length > 0 && (
                <section className="card-section">
                  <h3>Equipment</h3>
                  <div className="card-grid">
                    {cardsByType.equipment.map((card) => (
                      <CardItem key={card.id} card={card} onClick={() => setSelectedCard(card)} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="card-grid">
              {filteredCards.map((card) => (
                <CardItem key={card.id} card={card} onClick={() => setSelectedCard(card)} />
              ))}
            </div>
          )}
        </>
      )}

      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  );
}

interface CardItemProps {
  card: CardDefinition;
  onClick: () => void;
}

function CardItem({ card, onClick }: CardItemProps) {
  return (
    <div className="card-item" onClick={onClick}>
      {card.imageUrl ? (
        <img src={card.imageUrl} alt={card.name} className="card-image" />
      ) : (
        <CardStatsFallback card={card} />
      )}
      <div className="card-info">
        <span className={`card-type type-${card.type}`}>{card.type}</span>
        <h4>{card.name}</h4>
        <CardStats card={card} />
      </div>
    </div>
  );
}

interface CardDetailModalProps {
  card: CardDefinition;
  onClose: () => void;
}

function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-detail" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <div className="card-detail-layout">
          <div className="card-detail-image">
            {card.imageUrl ? (
              <img src={card.imageUrl} alt={card.name} />
            ) : (
              <CardStatsFallback card={card} className="large" />
            )}
          </div>
          <div className="card-detail-info">
            <span className={`card-type type-${card.type}`}>{card.type}</span>
            <h2>{card.name}</h2>
            {card.description && <p className="card-description">{card.description}</p>}
            <div className="card-stats-detail">
              <CardStatsDetail card={card} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardStats({ card }: { card: CardDefinition }) {
  if (card.type === "sleeve") {
    const bgStats = card.backgroundStats;
    const fgStats = card.foregroundStats;
    return (
      <div className="card-stats">
        {bgStats?.damage !== undefined && <span>BG Dmg: {bgStats.damage}</span>}
        {bgStats?.health !== undefined && <span>BG HP: {bgStats.health}</span>}
        {fgStats?.damage !== undefined && <span>FG Dmg: {fgStats.damage}</span>}
        {fgStats?.health !== undefined && <span>FG HP: {fgStats.health}</span>}
      </div>
    );
  }

  const stats = card.stats;
  return (
    <div className="card-stats">
      {stats?.damage !== undefined && <span>Dmg: {stats.damage}</span>}
      {stats?.health !== undefined && <span>HP: {stats.health}</span>}
    </div>
  );
}

function CardStatsDetail({ card }: { card: CardDefinition }) {
  if (card.type === "sleeve") {
    const bgStats = card.backgroundStats;
    const fgStats = card.foregroundStats;
    return (
      <>
        <h4>Background Stats (easily overwritten)</h4>
        <div className="stats-row">
          <div className="stat">
            <span className="stat-label">Damage</span>
            <span className="stat-value">{bgStats?.damage ?? "-"}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Health</span>
            <span className="stat-value">{bgStats?.health ?? "-"}</span>
          </div>
        </div>
        <h4>Foreground Stats (guaranteed)</h4>
        <div className="stats-row">
          <div className="stat">
            <span className="stat-label">Damage</span>
            <span className="stat-value">{fgStats?.damage ?? "-"}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Health</span>
            <span className="stat-value">{fgStats?.health ?? "-"}</span>
          </div>
        </div>
      </>
    );
  }

  const stats = card.stats;
  return (
    <div className="stats-row">
      <div className="stat">
        <span className="stat-label">Damage</span>
        <span className="stat-value">{stats?.damage ?? "-"}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Health</span>
        <span className="stat-value">{stats?.health ?? "-"}</span>
      </div>
    </div>
  );
}
