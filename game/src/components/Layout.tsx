import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

export function Layout() {
  const { user, firebaseUser, logout } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const displayName = user
    ? user.username.length <= 12
      ? `@${user.username}`
      : user.displayName
    : "Loading...";

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-content">
          <h1>Sleeved Potential</h1>
          <nav className="main-nav">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/rules">Rules</NavLink>
            <NavLink to="/leaderboard">Leaderboard</NavLink>
          </nav>

          <div className="user-info">
            <NavLink to="/profile" className="profile-btn">
              {firebaseUser?.photoURL && (
                <img src={firebaseUser.photoURL} alt="Avatar" className="avatar" />
              )}
              <span className="username">{displayName}</span>
              {user?.isGuest && <span className="badge guest">Guest</span>}
            </NavLink>

            <div className="nav-menu" ref={menuRef}>
              <button
                className={`nav-menu-btn ${menuOpen ? "open" : ""}`}
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
              >
                ☰
              </button>
              {menuOpen && (
                <div className="nav-dropdown">
                  <NavLink to="/cards" onClick={() => setMenuOpen(false)}>Cards</NavLink>
                  <NavLink to="/rules" onClick={() => setMenuOpen(false)}>Rules</NavLink>
                  <NavLink to="/playtest" onClick={() => setMenuOpen(false)}>Theorycraft</NavLink>
                  <NavLink to="/changelog" onClick={() => setMenuOpen(false)}>Changelog</NavLink>
                  <div className="nav-dropdown-divider" />
                  <button onClick={() => { setMenuOpen(false); logout(); }}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
