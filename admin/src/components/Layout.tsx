import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import type { User } from "@sleeved-potential/shared";

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: LayoutProps) {
  const isAdmin = user.roles.includes("ADMIN");
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

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-content">
          <h1>Sleeved Potential Admin</h1>
          <nav className="main-nav">
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/cards">Cards</NavLink>
          </nav>

          <div className="user-info">
            <span className="admin-username">{user.displayName}</span>
            {!isAdmin && <span className="badge warning">Not Admin</span>}

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
                  <NavLink to="/images" onClick={() => setMenuOpen(false)}>Images</NavLink>
                  <NavLink to="/rules" onClick={() => setMenuOpen(false)}>Rules</NavLink>
                  <NavLink to="/players" onClick={() => setMenuOpen(false)}>Players</NavLink>
                  <NavLink to="/playtest" onClick={() => setMenuOpen(false)}>Playtest</NavLink>
                  <NavLink to="/changelog" onClick={() => setMenuOpen(false)}>Changelog</NavLink>
                  <NavLink to="/snapshots" onClick={() => setMenuOpen(false)}>Snapshots</NavLink>
                  <div className="nav-dropdown-divider" />
                  <button onClick={() => { setMenuOpen(false); onLogout(); }}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="app-main">
        {!isAdmin && (
          <div className="alert alert-warning">
            You don't have admin privileges. Some features may be restricted.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
