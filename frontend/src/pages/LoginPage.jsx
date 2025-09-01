// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setUser } from "../lib/auth.js";
import "./login.css";

export default function LoginPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    // Frontend-only auth: store the user
    setUser({ name: cleanName, email: email.trim() || null, role: "staff" });
    nav("/app", { replace: true });
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <span className="dot" /> NIDEC MIS Inventory
        </div>
        <h1>Sign in</h1>

        <form className="login-form" onSubmit={onSubmit}>
          <label>
            <span>Name</span>
            <input
              autoFocus
              placeholder="e.g., Juan Dela Cruz"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label>
            <span>Email (optional)</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <button className="btn primary" type="submit" disabled={!name.trim()}>
            Continue
          </button>
        </form>

        <p className="muted note">
          This demo login is frontend-only. You can wire it to your backend later.
        </p>
      </div>
    </div>
  );
}
