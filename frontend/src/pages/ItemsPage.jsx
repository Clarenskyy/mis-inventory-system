import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js"; // adjust if your path/filename differs
import "./items.css";

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.get("/items")
      .then((res) => isMounted && setItems(Array.isArray(res.data) ? res.data : res.data.items ?? []))
      .catch(() => isMounted && setItems([]))
      .finally(() => isMounted && setLoading(false));
    return () => { isMounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      const matches =
        !needle ||
        it.code?.toLowerCase().includes(needle) ||
        it.name?.toLowerCase().includes(needle);
      const low = (it.quantity ?? 0) <= (it.buffer ?? 0);
      return matches && (!onlyLow || low);
    });
  }, [items, q, onlyLow]);

  return (
    <div className="items-wrap">
      {/* Page header */}
      <div className="items-head">
        <h1>Items</h1>
        <div className="head-actions">
          <button className="btn ghost" onClick={() => window.location.reload()}>Refresh</button>
          <button className="btn primary">+ Add Item</button>
        </div>
      </div>

      {/* Tools */}
      <div className="items-toolbar">
        <div className="search">
          <span aria-hidden>🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code or name…"
          />
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={onlyLow}
            onChange={(e) => setOnlyLow(e.target.checked)}
          />
          <span>Low stock only</span>
        </label>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <EmptyState onClear={() => { setQ(""); setOnlyLow(false); }} />
        ) : (
          <table className="items-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th className="num">Qty</th>
                <th className="num">Buffer</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id}>
                  <td className="mono">{it.code}</td>
                  <td>{it.name}</td>
                  <td className="num">{it.quantity}</td>
                  <td className="num">{it.buffer}</td>
                  <td>
                    <Status quantity={it.quantity} buffer={it.buffer} />
                  </td>
                  <td className="right">
                    <button className="btn tiny">Edit</button>
                    <button className="btn tiny danger">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------- Small components ---------- */

function Status({ quantity = 0, buffer = 0 }) {
  if (quantity <= 0) return <span className="pill danger">Out</span>;
  if (quantity <= buffer) return <span className="pill warn">Low</span>;
  return <span className="pill ok">OK</span>;
}

function LoadingRows() {
  return (
    <div className="loading">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="row" key={i} />
      ))}
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="empty">
      <div className="emoji" aria-hidden>📦</div>
      <h3>No items</h3>
      <p>Try clearing filters or add a new item.</p>
      <div className="actions">
        <button className="btn ghost" onClick={onClear}>Clear filters</button>
        <button className="btn primary">+ Add Item</button>
      </div>
    </div>
  );
}
