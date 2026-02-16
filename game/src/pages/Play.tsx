import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { joinGame, subscribeToChallenge, subscribeToUserActiveGames } from "../firebase";

export function Play() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to active games to detect when matched
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserActiveGames(user.id, (games) => {
      if (games.length > 0) {
        // Found an active game, navigate to it
        navigate(`/game/${games[0].id}`);
      }
    });

    return () => unsubscribe();
  }, [user?.id, navigate]);

  // Subscribe to challenge updates when waiting
  useEffect(() => {
    if (!challengeId) return;

    const unsubscribe = subscribeToChallenge(challengeId, (challenge) => {
      if (challenge?.status === "accepted" && challenge.gameId) {
        // Challenge was matched, navigate to game
        navigate(`/game/${challenge.gameId}`);
      }
    });

    unsubscribeRef.current = unsubscribe;
    return () => unsubscribe();
  }, [challengeId, navigate]);

  const handleFindMatch = async () => {
    setSearching(true);
    setError(null);

    try {
      const result = await joinGame();
      if ((result.type === "matched" || result.type === "async_matched") && result.gameId) {
        // Game created, navigate to it
        navigate(`/game/${result.gameId}`);
      } else if (result.type === "waiting" && result.challengeId) {
        // Waiting for opponent - subscribe to challenge for updates
        setChallengeId(result.challengeId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find match");
      setSearching(false);
    }
    // Don't set searching to false here - stay in searching state while waiting
  };

  const handleCancelSearch = () => {
    // Clean up subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setChallengeId(null);
    setSearching(false);
  };

  return (
    <div className="play-page">
      <h2>Play</h2>

      {error && <div className="alert alert-warning">{error}</div>}

      <div className="play-options">
        <div className="play-card">
          <h3>Quick Match</h3>
          {searching ? (
            <>
              <p className="searching-text">Searching for opponent...</p>
              <div className="searching-spinner"></div>
              <button className="btn" onClick={handleCancelSearch}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <p>Find a random opponent and start playing immediately.</p>
              <button
                className="btn btn-primary btn-large"
                onClick={handleFindMatch}
              >
                Find Match
              </button>
            </>
          )}
        </div>

        {!user?.isGuest && (
          <div className="play-card">
            <h3>Challenge a Friend</h3>
            <p>Challenge a specific player by their username.</p>
            <ChallengeForm />
          </div>
        )}

        {user?.isGuest && (
          <div className="play-card disabled">
            <h3>Challenge a Friend</h3>
            <p>Sign in with Google to challenge friends by username.</p>
            <button className="btn" disabled>
              Requires Account
            </button>
          </div>
        )}
      </div>

      <div className="play-info">
        <h3>How to Play</h3>
        <ol>
          <li>Find or wait for an opponent</li>
          <li>Each round, compose a card by selecting a Sleeve, Animal, and Equipment</li>
          <li>Cards are revealed simultaneously</li>
          <li>Combat resolves based on stats and initiative</li>
          <li>First to reach the point threshold wins!</li>
        </ol>
      </div>
    </div>
  );
}

function ChallengeForm() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement challengeByUsername function
      // For now, show placeholder message
      setSuccess(`Challenge sent to ${username}! (Not yet implemented)`);
      setUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send challenge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="challenge-form" onSubmit={handleChallenge}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="form-group">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          minLength={3}
          maxLength={12}
          pattern="[a-zA-Z]+"
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Sending..." : "Challenge"}
      </button>
    </form>
  );
}
