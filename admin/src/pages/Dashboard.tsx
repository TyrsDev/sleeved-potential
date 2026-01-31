import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "../firebase";

interface Stats {
  users: number;
  cards: number;
  games: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersSnap, cardsSnap, gamesSnap] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(collection(db, "cards")),
          getCountFromServer(collection(db, "games")),
        ]);

        setStats({
          users: usersSnap.data().count,
          cards: cardsSnap.data().count,
          games: gamesSnap.data().count,
        });
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return <div className="loading">Loading stats...</div>;
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Users</h3>
          <p className="stat-value">{stats?.users ?? 0}</p>
        </div>
        <div className="stat-card">
          <h3>Cards</h3>
          <p className="stat-value">{stats?.cards ?? 0}</p>
        </div>
        <div className="stat-card">
          <h3>Games</h3>
          <p className="stat-value">{stats?.games ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
