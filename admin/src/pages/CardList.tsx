import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { CardDefinition, CardType } from "@sleeved-potential/shared";

export function CardList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState<CardDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const typeFilter = (searchParams.get("type") as CardType | null) || null;

  useEffect(() => {
    let q = query(collection(db, "cards"), orderBy("name"));

    if (typeFilter) {
      q = query(collection(db, "cards"), where("type", "==", typeFilter), orderBy("name"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cardData = snapshot.docs.map((doc) => doc.data() as CardDefinition);
      setCards(cardData);
      setLoading(false);
    });

    return unsubscribe;
  }, [typeFilter]);

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

  if (loading) {
    return <div className="loading">Loading cards...</div>;
  }

  return (
    <div className="card-list-page">
      <div className="page-header">
        <h2>Cards</h2>
        <Link to="/cards/new" className="btn btn-primary">
          + New Card
        </Link>
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

      {cards.length === 0 ? (
        <p className="empty-state">No cards yet. Create your first card!</p>
      ) : (
        <div className="card-grid">
          {cards.map((card) => (
            <Link key={card.id} to={`/cards/${card.id}`} className="card-item">
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.name} className="card-image" />
              ) : (
                <div className="card-image-placeholder">No image</div>
              )}
              <div className="card-info">
                <h3>{card.name}</h3>
                <span className={`card-type type-${card.type}`}>{card.type}</span>
                <p className="card-description">{card.description || "No description"}</p>
                {card.type === "sleeve" && (
                  <div className="card-stats">
                    {card.backgroundStats && (
                      <span>BG: {JSON.stringify(card.backgroundStats)}</span>
                    )}
                    {card.foregroundStats && (
                      <span>FG: {JSON.stringify(card.foregroundStats)}</span>
                    )}
                  </div>
                )}
                {card.type !== "sleeve" && card.stats && (
                  <div className="card-stats">
                    {card.stats.damage !== undefined && <span>DMG: {card.stats.damage}</span>}
                    {card.stats.health !== undefined && <span>HP: {card.stats.health}</span>}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
