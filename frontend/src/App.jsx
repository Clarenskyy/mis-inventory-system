// src/App.jsx
import { useState } from "react";
import DashboardPage from "./pages/DashboardPage.jsx";
import ItemsPage from "./pages/ItemsPage.jsx";
import ProductCategoryPage from "./pages/ProductCategoryPage.jsx";
import "./app.css";

export default function App() {
  const [active, setActive] = useState("dashboard");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className={`nav-btn ${active === "dashboard" ? "active" : ""}`} onClick={() => setActive("dashboard")}>
          <span className="nav-icon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="10" width="4" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="10" y="4" width="4" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="17" y="7" width="4" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </span>
          <span className="nav-text">Dashboard</span>
        </button>

        <button className={`nav-btn ${active === "items" ? "active" : ""}`} onClick={() => setActive("items")}>
          <span className="nav-icon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M3 7.5V16.5L12 21l9-4.5V7.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M12 12V21" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </span>
          <span className="nav-text">Items</span>
        </button>

        {/* NEW BUTTON */}
        <button className={`nav-btn ${active === "categories" ? "active" : ""}`} onClick={() => setActive("categories")}>
          <span className="nav-icon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </span>
          <span className="nav-text">Product Category</span>
        </button>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="brand"><span className="brand-dot" /> NIDEC MIS Inventory</div>
          <div className="user-chip"><span className="avatar">👤</span></div>
        </header>
        <main className="panel">
          {active === "dashboard" && <DashboardPage />}
          {active === "items" && <ItemsPage />}
          {active === "categories" && <ProductCategoryPage />}
        </main>
      </div>
    </div>
  );
}
