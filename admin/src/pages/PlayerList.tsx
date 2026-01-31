import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { User } from "@sleeved-potential/shared";

export function PlayerList() {
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map((doc) => doc.data() as User);
      setPlayers(userData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="loading">Loading players...</div>;
  }

  return (
    <div className="player-list-page">
      <h2>Players</h2>

      {players.length === 0 ? (
        <p className="empty-state">No players yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Username</th>
              <th>Type</th>
              <th>Roles</th>
              <th>Games</th>
              <th>W/L/D</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id}>
                <td>
                  {player.photoURL && (
                    <img src={player.photoURL} alt="" className="avatar" />
                  )}
                  {player.displayName}
                </td>
                <td className="username">{player.username}</td>
                <td>
                  <span className={`badge ${player.isGuest ? "guest" : "account"}`}>
                    {player.isGuest ? "Guest" : "Account"}
                  </span>
                </td>
                <td>
                  {player.roles.length > 0 ? (
                    player.roles.map((role) => (
                      <span key={role} className="badge role">
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
                <td>{player.stats.gamesPlayed}</td>
                <td>
                  {player.stats.wins}/{player.stats.losses}/{player.stats.draws}
                </td>
                <td>{new Date(player.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
