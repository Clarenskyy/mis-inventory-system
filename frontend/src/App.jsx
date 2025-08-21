import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import "./App.css";

const Topbar = () => (
  <div className="topbar">
    <div className="topbar-logo">
      <div className="topbar-logo-box"></div>
      NIDEC MIS Inventory
    </div>
    <div className="topbar-user">Signed in as you@nidec.local</div>
  </div>
);

const Sidebar = () => (
  <div className="sidebar">
    {[
      ["/dashboard", "🏠 Dashboard"],
      ["/items", "📦 Items"],
      ["/transactions", "🔁 Transactions"],
      ["/alerts", "⚠️ Alerts"],
      ["/reports", "📈 Reports"],
      ["/users", "👥 Users"],
      ["/settings", "⚙️ Settings"],
    ].map(([to, label]) => (
      <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
        {label}
      </NavLink>
    ))}
  </div>
);

const Page = ({ title, children }) => (
  <div className="page">
    <div className="page-header">
      <h1>{title}</h1>
    </div>
    {children}
  </div>
);

const Login = () => (
  <div className="login-container">
    <div className="login-box">
      <h2>NIDEC Sign In</h2>
      <input type="email" placeholder="you@nidec.local" />
      <input type="password" placeholder="•••••••" />
      <button>Sign In</button>
    </div>
  </div>
);

const Dashboard = () => (
  <Page title="Dashboard">
    <div className="card">📦 Items summary here</div>
    <div className="card">⚠️ Alerts summary here</div>
  </Page>
);

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <div style={{ display: "flex" }}>
              <Sidebar />
              <div style={{ flex: 1 }}>
                <Topbar />
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="*" element={<Dashboard />} />
                </Routes>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}
