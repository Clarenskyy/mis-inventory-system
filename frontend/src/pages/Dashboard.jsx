// src/pages/Dashboard.jsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getItems, getCategories } from "../lib/api.js";
import { getUser } from "../lib/auth.js";
import "./dashboard.css";

function getCatSeverity(total, buffer) {
  const b = Number(buffer || 0);
  if (b <= 0) return { key: "ok", label: "OK" };
  const ratio = total / b;
  if (ratio < 0.5) return { key: "critical", label: "Critical" };
  if (ratio < 1)   return { key: "low",      label: "Low" };
  if (ratio < 1.25)return { key: "warn",     label: "Watch" };
  return { key: "ok", label: "OK" };
}

const pillStyle = {
  base: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },
  ok:       { background: "#dcfce7", color: "#166534" },
  warn:     { background: "#fef3c7", color: "#92400e" },
  low:      { background: "#fee2e2", color: "#991b1b" },
  critical: { background: "#fecaca", color: "#7f1d1d" },
};

export default function DashboardPage() {
  const user = getUser();
  const firstName = (user?.name || "").split(" ")[0] || "User";

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems({ limit: 1000 }), // bump a bit so totals are accurate
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const totalItems = items.length;

  // Build totals per category
  const totalsByCategory = useMemo(() => {
    const m = new Map();
    (items || []).forEach((it) => {
      const cid = Number(it.category_id);
      m.set(cid, (m.get(cid) || 0) + Number(it.quantity ?? 0));
    });
    return m;
  }, [items]);

  // Compute category statuses; keep only non-OK
  const attentionCats = useMemo(() => {
    const rows = (categories || []).map((c) => {
      const total = totalsByCategory.get(Number(c.id)) || 0;
      const sev = getCatSeverity(total, c.buffer);
      return { id: c.id, name: c.name, buffer: Number(c.buffer || 0), total, sev };
    });
    // filter non-OK
    const filtered = rows.filter((r) => r.sev.key !== "ok");
    // sort by severity (critical > low > warn), then by how far below buffer
    const order = { critical: 3, low: 2, warn: 1, ok: 0 };
    filtered.sort((a, b) => {
      const diff = order[b.sev.key] - order[a.sev.key];
      if (diff !== 0) return diff;
      // secondary: distance from buffer
      const da = a.buffer - a.total;
      const db = b.buffer - b.total;
      return db - da;
    });
    return filtered;
  }, [categories, totalsByCategory]);

  return (
    <section className="dash-wrap">
      <h1 className="dash-title">Dashboard</h1>
      <p className="muted">
        Welcome <span className="welcome-user">{firstName}</span>, to our Storage Inventory.
      </p>

      {/* Intro panel with clipboard on the right */}
      <div className="intro-panel card">
        <div className="intro-text">
          <h2>This is MIS Inventory</h2>
          <p>
            Manage Items, Monitor Category Buffers, and Keep Stock in Check with Clear,
            Simple Tools.
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

      {/* Attention Needed card */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Attention Needed</h2>
          <span className="muted">
            {attentionCats.length ? `${attentionCats.length} categories` : "All categories are OK"}
          </span>
        </div>

        {attentionCats.length === 0 ? (
          <div className="muted" style={{ marginTop: 8 }}>
            Nothing to show. All categories are above their buffers. 🎉
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 8px", borderBottom: "1px solid #eef1f5" }}>Category</th>
                <th style={{ textAlign: "left", padding: "8px 8px", borderBottom: "1px solid #eef1f5" }}>Total / Buffer</th>
                <th style={{ textAlign: "left", padding: "8px 8px", borderBottom: "1px solid #eef1f5" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {attentionCats.slice(0, 8).map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: "10px 8px", borderTop: "1px solid #f3f4f7" }}>{r.name}</td>
                  <td style={{ padding: "10px 8px", borderTop: "1px solid #f3f4f7" }}>
                    <b>{r.total}</b> / {r.buffer}
                  </td>
                  <td style={{ padding: "10px 8px", borderTop: "1px solid #f3f4f7" }}>
                    <span
                      style={{
                        ...pillStyle.base,
                        ...(pillStyle[r.sev.key] || pillStyle.ok),
                      }}
                    >
                      {r.sev.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Small hint */}
        <p className="muted" style={{ marginTop: 8 }}>
          Tip: Go to <b>Product Category</b> to adjust buffers or view all items per category.
        </p>
      </div>
    </section>
  );
}
