import { useQuery } from "@tanstack/react-query";
import { getItems } from "../lib/api.js";
import { getUser } from "../lib/auth.js";
import "./dashboard.css";

export default function DashboardPage() {
  const user = getUser();
  const firstName = (user?.name || "").split(" ")[0] || "User";

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: getItems,
  });

  const totalItems = items.length;

  return (
    <section className="dash-wrap">
      <h1 className="dash-title">Dashboard</h1>
      <p className="muted">
        Welcome, <span className="welcome-user">{firstName}</span> to our Storage Inventory.
      </p>
      
      {/* Intro panel with clipboard on the right */}
      <div className="intro-panel card">
        <div className="intro-text">
          <h2>This is MIS Inventory</h2>
          <p>
            Manage items, monitor category buffers, and keep stock in check with clear,
            simple tools.
          </p>
        </div>

        {/* Clipboard card on the right */}
        <div className="clipboard">
          <div className="clip-head">
            <span className="clip-icon" aria-hidden>📋</span>
            <span className="clip-title">Inventory Items</span>
          </div>
          <div className="clip-count">{totalItems}</div>
        </div>
      </div>
    </section>
  );
}
