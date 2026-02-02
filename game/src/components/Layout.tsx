import { NavLink, Outlet } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

export function Layout() {
  const { user, firebaseUser, logout } = useUser();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-content">
          <h1>Sleeved Potential</h1>
          <nav className="main-nav">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/cards">Cards</NavLink>
            <NavLink to="/rules">Rules</NavLink>
            <NavLink to="/playtest">Theorycraft</NavLink>
            <NavLink to="/leaderboard">Leaderboard</NavLink>
            <NavLink to="/changelog">Changelog</NavLink>
            <NavLink to="/profile">Profile</NavLink>
          </nav>
          <div className="user-info">
            {firebaseUser?.photoURL && (
              <img src={firebaseUser.photoURL} alt="Avatar" className="avatar" />
            )}
            <span className="username">{user?.displayName || "Loading..."}</span>
            {user?.isGuest && <span className="badge guest">Guest</span>}
            <button onClick={logout}>Sign Out</button>
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
