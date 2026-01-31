import { Link } from "react-router-dom";
import { useData } from "../contexts/DataContext";

export function Dashboard() {
  const { stats, cardCounts, loading } = useData();

  const isLoading = loading.users || loading.cards || loading.games;

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Users</h3>
          <p className="stat-value">{isLoading ? "..." : stats.users}</p>
        </div>
        <div className="stat-card">
          <h3>Cards</h3>
          <p className="stat-value">{isLoading ? "..." : stats.cards}</p>
        </div>
        <div className="stat-card">
          <h3>Games</h3>
          <p className="stat-value">{isLoading ? "..." : stats.games}</p>
        </div>
        <div className="stat-card">
          <h3>Active Games</h3>
          <p className="stat-value">{isLoading ? "..." : stats.activeGames}</p>
        </div>
      </div>

      <h3 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Cards by Type</h3>
      <div className="stats-grid">
        <Link to="/cards?type=sleeve" className="stat-card clickable">
          <h3>Sleeves</h3>
          <p className="stat-value">{isLoading ? "..." : cardCounts.sleeves}</p>
        </Link>
        <Link to="/cards?type=animal" className="stat-card clickable">
          <h3>Animals</h3>
          <p className="stat-value">{isLoading ? "..." : cardCounts.animals}</p>
        </Link>
        <Link to="/cards?type=equipment" className="stat-card clickable">
          <h3>Equipment</h3>
          <p className="stat-value">{isLoading ? "..." : cardCounts.equipment}</p>
        </Link>
      </div>

      <h3 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Quick Actions</h3>
      <div className="quick-actions">
        <Link to="/cards/new" className="btn btn-primary">
          + New Card
        </Link>
        <Link to="/cards/compose" className="btn">
          Compose Preview
        </Link>
        <Link to="/rules" className="btn">
          Edit Rules
        </Link>
      </div>
    </div>
  );
}
