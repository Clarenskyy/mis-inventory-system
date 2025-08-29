import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import "./dashboard.css";

export default function Dashboard() {
  const [username, setUsername] = useState("User");
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Replace this with however you save the username at login
    const storedName =
      localStorage.getItem("username") || // adjust to your actual key
      localStorage.getItem("user_name") ||
      "User";
    setUsername(storedName);

    // ✅ fetch total inventory items
    let isMounted = true;
    api
      .get("/items")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data.items ?? [];
        if (isMounted) setTotalItems(data.length);
      })
      .catch(() => {
        if (isMounted) setTotalItems(0);
      })
      .finally(() => isMounted && setLoading(false));

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="dash-wrap">
      <h1 className="dash-title">Dashboard</h1>

      <div className="dash-welcome card">
        <div className="welcome-text">
          <div className="welcome-title">
            Welcome, <span className="welcome-name">{username}</span> to our Storage Inventory.
          </div>
          <p className="welcome-sub">
            Manage items, monitor stock levels, and keep everything organized.
          </p>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-label">Inventory Items</div>
            <div className="stat-value">{loading ? "…" : totalItems}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
