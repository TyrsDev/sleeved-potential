import { NavLink, Outlet } from "react-router-dom";
import type { User } from "@sleeved-potential/shared";

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export function Layout({ user, onLogout }: LayoutProps) {
  const isAdmin = user.roles.includes("ADMIN");

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-content">
          <h1>Sleeved Potential Admin</h1>
          <nav className="main-nav">
            <NavLink to="/" end>
              Dashboard
            </NavLink>
            <NavLink to="/cards">Cards</NavLink>
            <NavLink to="/images">Images</NavLink>
            <NavLink to="/rules">Rules</NavLink>
            <NavLink to="/players">Players</NavLink>
            <NavLink to="/playtest">Playtest</NavLink>
            <NavLink to="/changelog">Changelog</NavLink>
            <NavLink to="/snapshots">Snapshots</NavLink>
          </nav>
          <div className="user-info">
            <span>{user.displayName}</span>
            {!isAdmin && <span className="badge warning">Not Admin</span>}
            <button onClick={onLogout}>Sign Out</button>
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
