// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getMe } from "../lib/api.js";
import { setAuth } from "../lib/auth.js";
import "./login.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // 1) authenticate
      const { access_token } = await login(username, password);
      if (!access_token) {
        throw new Error("No access_token in response");
      }

      // 2) fetch profile (requires header set by setAuth)
      // set a temporary token in axios so /auth/me works even before setAuth
      setAuth(access_token);
      const me = await getMe();

      // 3) persist + route
      setAuth(access_token, me);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Login failed. Check username/password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Sign in</h1>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {error && <div className="err">{error}</div>}
        <button type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
