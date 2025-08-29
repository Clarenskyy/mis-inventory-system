// src/components/Sidebar.jsx
import React from "react";
import "./sidebar.css";

export default function Sidebar({ active, setActive }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-group">
        <button
          className={active === "dashboard" ? "nav-btn active" : "nav-btn"}
          onClick={() => setActive("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={active === "items" ? "nav-btn active" : "nav-btn"}
          onClick={() => setActive("items")}
        >
          Items
        </button>

        {/* NEW: Product Categories (under Dashboard and Items) */}
        <button
          className={active === "categories" ? "nav-btn active" : "nav-btn"}
          onClick={() => setActive("categories")}
        >
          Product Categories
        </button>
      </div>
    </aside>
  );
}
