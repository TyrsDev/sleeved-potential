import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscribeToCardStats, computeCardStats } from "../firebase";
import { useData } from "../hooks/useData";
import { CardTooltip, CardTooltipContent } from "@sleeved-potential/shared/components";
import type { CardUsageStats, CardDefinition } from "@sleeved-potential/shared";

type SortKey = "cardName" | "timesUsed" | "timesInHand" | "usageRate" | "defeatRate" | "survivalRate";
type SortDir = "asc" | "desc";

function pct(num: number, denom: number): string {
  if (denom === 0) return "—";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

export function CardStats() {
  const { cards } = useData();
  const [stats, setStats] = useState<CardUsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("timesUsed");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Build a lookup map from cardId → CardDefinition for tooltip content
  const cardMap = new Map<string, CardDefinition>(cards.map((c) => [c.id, c]));

  useEffect(() => {
    const unsub = subscribeToCardStats((incoming) => {
      setStats(incoming);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const sorted = [...stats].sort((a, b) => {
    let av: number | string;
    let bv: number | string;

    switch (sortKey) {
      case "cardName":
        av = a.cardName.toLowerCase();
        bv = b.cardName.toLowerCase();
        break;
      case "timesUsed":
        av = a.timesUsed;
        bv = b.timesUsed;
        break;
      case "timesInHand":
        av = a.timesInHand;
        bv = b.timesInHand;
        break;
      case "usageRate":
        av = a.timesInHand > 0 ? a.timesUsed / a.timesInHand : 0;
        bv = b.timesInHand > 0 ? b.timesUsed / b.timesInHand : 0;
        break;
      case "defeatRate":
        av = a.timesUsed > 0 ? a.timesDefeated / a.timesUsed : 0;
        bv = b.timesUsed > 0 ? b.timesDefeated / b.timesUsed : 0;
        break;
      case "survivalRate":
        av = a.timesUsed > 0 ? a.timesSurvived / a.timesUsed : 0;
        bv = b.timesUsed > 0 ? b.timesSurvived / b.timesUsed : 0;
        break;
      default:
        return 0;
    }

    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    setToast(null);
    try {
      const result = await computeCardStats();
      setToast({
        type: "success",
        message: `Done! ${result.cardsUpdated} cards updated across ${result.gamesAnalyzed} games.`,
      });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to compute stats",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const lastComputed =
    stats.length > 0
      ? stats.reduce((latest, s) => (s.lastComputedAt > latest ? s.lastComputedAt : latest), "")
      : null;

  if (loading) {
    return <div className="loading">Loading card stats...</div>;
  }

  return (
    <div className="card-stats-page">
      <div className="page-header">
        <div>
          <h2>Card Usage Statistics</h2>
          {lastComputed && (
            <p className="meta-info">
              Last computed: {new Date(lastComputed).toLocaleString()}
            </p>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Computing..." : "Refresh Stats"}
        </button>
      </div>

      {toast && (
        <div className={`alert alert-${toast.type === "success" ? "success" : "error"}`}>
          {toast.message}
        </div>
      )}

      {stats.length === 0 ? (
        <p className="empty-state">
          No stats yet. Click "Refresh Stats" to compute usage statistics from completed games.
        </p>
      ) : (
        <div className="card-stats-table-container">
          <table className="data-table card-stats-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort("cardName")}>
                  Card Name{sortIndicator("cardName")}
                </th>
                <th>Type</th>
                <th className="sortable" onClick={() => handleSort("timesUsed")}>
                  Times Used{sortIndicator("timesUsed")}
                </th>
                <th className="sortable" onClick={() => handleSort("timesInHand")}>
                  In Hand{sortIndicator("timesInHand")}
                </th>
                <th className="sortable" onClick={() => handleSort("usageRate")}>
                  Usage Rate{sortIndicator("usageRate")}
                </th>
                <th className="sortable" onClick={() => handleSort("defeatRate")}>
                  Defeat Rate{sortIndicator("defeatRate")}
                </th>
                <th className="sortable" onClick={() => handleSort("survivalRate")}>
                  Survival Rate{sortIndicator("survivalRate")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const card = cardMap.get(s.cardId);
                return (
                  <tr key={s.cardId}>
                    <td>
                      <CardTooltip
                        content={card ? <CardTooltipContent card={card} /> : s.cardName}
                        placement="right"
                      >
                        <Link to={`/cards/${s.cardId}`} className="card-stats-name-link">
                          {s.cardName}
                        </Link>
                      </CardTooltip>
                    </td>
                    <td>
                      <span className={`card-type type-${s.cardType}`}>{s.cardType}</span>
                    </td>
                    <td>{s.timesUsed}</td>
                    <td>{s.timesInHand > 0 ? s.timesInHand : <span className="muted">—</span>}</td>
                    <td>{pct(s.timesUsed, s.timesInHand)}</td>
                    <td>{pct(s.timesDefeated, s.timesUsed)}</td>
                    <td>{pct(s.timesSurvived, s.timesUsed)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
