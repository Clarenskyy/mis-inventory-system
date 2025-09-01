import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setUser } from "../lib/auth.js";
import "./login.css";

export default function Login() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    // Save user in localStorage using your auth.js
    setUser({ name: trimmed, email: email.trim() || null });

    // Go to the interface
    nav("/dashboard", { replace: true });
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h2>Sign in</h2>

        <label>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Name</div>
          <input
            placeholder="e.g., Juan Dela Cruz"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Email (optional)</div>
          <input
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <button type="submit">Continue</button>

        <p>This demo login is frontend-only. You can wire it to your backend later.</p>
      </form>
    </div>
  );
}
