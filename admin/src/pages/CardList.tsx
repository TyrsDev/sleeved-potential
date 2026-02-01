import { Link, useSearchParams } from "react-router-dom";
import { useData } from "../hooks/useData";
import { CardStatsFallback } from "../components/CardStatsFallback";
import { CardStatsOverlay } from "../components/CardStatsOverlay";
import type { CardType } from "@sleeved-potential/shared";

export function CardList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { cards, loading } = useData();

  const typeFilter = (searchParams.get("type") as CardType | null) || null;

  // Filter cards client-side (avoids needing composite index)
  const filteredCards = typeFilter
    ? cards.filter((c) => c.type === typeFilter)
    : cards;

  const setTypeFilter = (type: CardType | null) => {
    if (type) {
      setSearchParams({ type });
    } else {
      setSearchParams({});
    }
  };

  const cardsByType = {
    sleeve: cards.filter((c) => c.type === "sleeve"),
    animal: cards.filter((c) => c.type === "animal"),
    equipment: cards.filter((c) => c.type === "equipment"),
  };

  if (loading.cards) {
    return <div className="loading">Loading cards...</div>;
  }

  return (
    <div className="card-list-page">
      <div className="page-header">
        <h2>Cards</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/cards/compose" className="btn">
            Compose Preview
          </Link>
          <Link to="/cards/new" className="btn btn-primary">
            + New Card
          </Link>
        </div>
      </div>

      <div className="filter-tabs">
        <button
          className={`tab ${typeFilter === null ? "active" : ""}`}
          onClick={() => setTypeFilter(null)}
        >
          All ({cards.length})
        </button>
        <button
          className={`tab ${typeFilter === "sleeve" ? "active" : ""}`}
          onClick={() => setTypeFilter("sleeve")}
        >
          Sleeves ({cardsByType.sleeve.length})
        </button>
        <button
          className={`tab ${typeFilter === "animal" ? "active" : ""}`}
          onClick={() => setTypeFilter("animal")}
        >
          Animals ({cardsByType.animal.length})
        </button>
        <button
          className={`tab ${typeFilter === "equipment" ? "active" : ""}`}
          onClick={() => setTypeFilter("equipment")}
        >
          Equipment ({cardsByType.equipment.length})
        </button>
      </div>

      {filteredCards.length === 0 ? (
        <p className="empty-state">
          {typeFilter
            ? `No ${typeFilter}s yet. Create your first ${typeFilter}!`
            : "No cards yet. Create your first card!"}
        </p>
      ) : (
        <div className="card-grid">
          {filteredCards.map((card) => (
            <Link
              key={card.id}
              to={`/cards/${card.id}`}
              className={`card-item ${card.active === false ? "card-inactive" : ""}`}
            >
              {card.imageUrl ? (
                <>
                  <img src={card.imageUrl} alt={card.name} className="card-image" />
                  <CardStatsOverlay card={card} />
                </>
              ) : (
                <CardStatsFallback card={card} />
              )}
              <div className="card-info">
                <h3>
                  {card.name}
                  {card.active === false && <span className="inactive-badge">Inactive</span>}
                </h3>
                <span className={`card-type type-${card.type}`}>{card.type}</span>
                <p className="card-description">{card.description || "No description"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
