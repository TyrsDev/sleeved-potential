import { useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { setUsername as setUsernameApi } from "../firebase";
import { DEFAULT_ELO } from "@sleeved-potential/shared";

export function Profile() {
  const { user, firebaseUser, refreshUser, signInWithGoogle } = useUser();
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if user needs to set username (account user with UUID-like username)
  const needsUsername = user && !user.isGuest && user.username.length > 12;

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await setUsernameApi(newUsername.trim());
      await refreshUser();
      setSuccess("Username set successfully!");
      setEditing(false);
      setNewUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set username");
    } finally {
      setSaving(false);
    }
  };

  const handleUpgradeAccount = async () => {
    try {
      setError(null);
      await signInWithGoogle();
      // After sign-in, the auth state change will trigger user refresh
    } catch {
      setError("Failed to upgrade account");
    }
  };

  if (!user) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <h2>Profile</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="profile-card">
        <div className="profile-header">
          {firebaseUser?.photoURL && (
            <img src={firebaseUser.photoURL} alt="Avatar" className="profile-avatar" />
          )}
          <div className="profile-names">
            <h3>{user.displayName}</h3>
            <p className="username">@{user.username}</p>
            {user.isGuest && <span className="badge guest">Guest Account</span>}
          </div>
        </div>

        {needsUsername && !editing && (
          <div className="alert alert-info">
            <p>Choose a username to be found by other players!</p>
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              Set Username
            </button>
          </div>
        )}

        {editing && (
          <form className="username-form" onSubmit={handleSetUsername}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="3-12 letters"
                minLength={3}
                maxLength={12}
                pattern="[a-zA-Z]+"
                required
              />
              <small>3-12 letters only, no numbers or special characters</small>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Username"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setEditing(false);
                  setNewUsername("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {user.isGuest && (
          <div className="upgrade-section">
            <h4>Upgrade Your Account</h4>
            <p>Sign in with Google to:</p>
            <ul>
              <li>Save your progress permanently</li>
              <li>Choose a custom username</li>
              <li>Be challenged by other players</li>
            </ul>
            <button className="btn btn-primary" onClick={handleUpgradeAccount}>
              Upgrade to Google Account
            </button>
          </div>
        )}
      </div>

      <div className="stats-section">
        <h3>Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card elo-card">
            <h4>Rating</h4>
            <p className="stat-value elo-value">{user.stats.elo ?? DEFAULT_ELO}</p>
            <Link to="/leaderboard" className="leaderboard-link">
              View Leaderboard
            </Link>
          </div>
          <div className="stat-card">
            <h4>Games Played</h4>
            <p className="stat-value">{user.stats.gamesPlayed}</p>
          </div>
          <div className="stat-card">
            <h4>Wins</h4>
            <p className="stat-value">{user.stats.wins}</p>
          </div>
          <div className="stat-card">
            <h4>Losses</h4>
            <p className="stat-value">{user.stats.losses}</p>
          </div>
          <div className="stat-card">
            <h4>Draws</h4>
            <p className="stat-value">{user.stats.draws}</p>
          </div>
          <div className="stat-card">
            <h4>Win Rate</h4>
            <p className="stat-value">
              {user.stats.gamesPlayed > 0
                ? Math.round((user.stats.wins / user.stats.gamesPlayed) * 100)
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      <div className="account-info">
        <h3>Account Information</h3>
        <dl>
          <dt>Account Type</dt>
          <dd>{user.isGuest ? "Guest" : "Google Account"}</dd>
          <dt>Email</dt>
          <dd>{user.email || "N/A"}</dd>
          <dt>Member Since</dt>
          <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
        </dl>
      </div>
    </div>
  );
}
