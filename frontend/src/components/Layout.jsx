// src/components/Layout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { getUser, clearAuth } from "../lib/auth.js";
import "./layout.css";

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const user = getUser(); // { name, email, username } if stored at login

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function signOut() {
    clearAuth();            // remove token + user
    setMenuOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <nav className="nav">
          <NavItem to="/dashboard" label="Dashboard" icon="📊" />
          <NavItem to="/items" label="Items" icon="📦" />
          <NavItem to="/categories" label="Product Category" icon="🗂️" />
        </nav>
      </aside>

      {/* Main Panel */}
      <div className="main">
        <header className="topbar">
          <div className="brand">
            <span className="brand-swatch" />
            <span className="brand-text">NIDEC MIS Inventory</span>
          </div>

          <div className="user" ref={menuRef}>
            <button
              className="avatar"
              onClick={() => setMenuOpen((v) => !v)}
              title={user?.name || user?.username || "Account"}
            >
              👤
            </button>
            {menuOpen && (
              <div className="menu">
                <div className="menu-email">
                  {user?.email || user?.username || "user"}
                </div>
                <button className="menu-item" onClick={signOut}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-text">{label}</span>
    </NavLink>
  );
}
