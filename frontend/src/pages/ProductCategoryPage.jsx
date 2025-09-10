// src/pages/ProductCategoryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getItems,
  getCategories,
  updateCategory,
  createCategory,
  deleteCategory,
} from "../lib/api.js";
import "./product-category.css";

/* ---------- unit helpers (same as Items page) ---------- */
const UNIT_STORE_KEY = "mis.units.v1";
function loadUnitMap() {
  try { return JSON.parse(localStorage.getItem(UNIT_STORE_KEY) || "{}"); }
  catch { return {}; }
}
function getUnit(id) {
  const m = loadUnitMap();
  return m?.[String(id)] || "";
}

function getCatSeverity(total, buffer) {
  const b = Number(buffer || 0);
  if (b <= 0) return { key: "ok", label: "OK" };     // no buffer configured
  const ratio = total / b;
  if (ratio < 0.5) return { key: "critical", label: "Critical" };
  if (ratio < 1)   return { key: "low",      label: "Low" };
  if (ratio < 1.25)return { key: "warn",     label: "Watch" };
  return { key: "ok", label: "OK" };
}

export default function ProductCategoryPage() {
  const qc = useQueryClient();

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["items"],
    queryFn: getItems,
  });

  const [activeId, setActiveId] = useState(null);
  const [needle, setNeedle] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);

  // modals
  const [showAdd, setShowAdd] = useState(false);
  const [showEditCat, setShowEditCat] = useState(false);  // <-- renamed
  const [showConfirmDel, setShowConfirmDel] = useState(false);

  /* ---------- totals per category (cid -> total qty) ---------- */
  const totalsByCategory = useMemo(() => {
    const map = new Map();
    (items || []).forEach((it) => {
      const cid = Number(it.category_id);
      const prev = map.get(cid) || 0;
      map.set(cid, prev + Number(it.quantity ?? 0));
    });
    return map;
  }, [items]);

  /* ---------- categories shown on the left (respect onlyLow) ---------- */
  const visibleCats = useMemo(() => {
    if (!onlyLow) return categories;
    return (categories || []).filter((c) => {
      const total = totalsByCategory.get(Number(c.id)) || 0;
      const buffer = Number(c.buffer ?? 0);
      return total < buffer;
    });
  }, [categories, totalsByCategory, onlyLow]);

  // keep selection in sync with filtered list
  useEffect(() => {
    if (!activeId && visibleCats.length) {
      setActiveId(visibleCats[0].id);
    }
  }, [visibleCats, activeId]);

  useEffect(() => {
    if (activeId && visibleCats.every((c) => c.id !== activeId)) {
      setActiveId(visibleCats[0]?.id ?? null);
    }
  }, [visibleCats, activeId]);

  const activeCat = useMemo(
    () => (visibleCats || []).find((c) => c.id === activeId) || null,
    [visibleCats, activeId]
  );

  const mUpdate = useMutation({
    mutationFn: ({ id, patch }) => updateCategory(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      setShowEditCat(false);
    },
  });

  const mCreate = useMutation({
    mutationFn: (payload) => createCategory(payload),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      if (created?.id) setActiveId(created.id);
      setShowAdd(false);
    },
  });

  const mDelete = useMutation({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => {
      setShowConfirmDel(false);
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });

  // items within active category + search + low item filter vs buffer
  const tableRows = useMemo(() => {
    if (!activeCat) return [];
    const n = needle.trim().toLowerCase();
    const buffer = Number(activeCat.buffer ?? 0);
    return (items || []).filter((it) => {
      const inCat = Number(it.category_id) === Number(activeCat.id);
      if (!inCat) return false;

      const text =
        (it.code || "").toLowerCase().includes(n) ||
        (it.name || "").toLowerCase().includes(n);
      const low = Number(it.quantity ?? 0) <= buffer;

      return (!n || text) && (!onlyLow || low);
    });
  }, [items, activeCat, needle, onlyLow]);

  const totalQtyInCat = useMemo(() => {
    if (!activeCat) return 0;
    return (items || [])
      .filter((it) => Number(it.category_id) === Number(activeCat.id))
      .reduce((sum, it) => sum + Number(it.quantity ?? 0), 0);
  }, [items, activeCat]);

  const canDeleteActive = !!activeCat && totalQtyInCat === 0;

  return (
    <section className="cat-wrap">
      <div className="cat-head">
        <h1>Product Category</h1>

        <div className="head-actions">
          <button
            className="btn ghost"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["categories"] });
              qc.invalidateQueries({ queryKey: ["items"] });
            }}
          >
            Refresh
          </button>
          <button className="btn primary" onClick={() => setShowAdd(true)}>
            + Add Category
          </button>
        </div>
      </div>

      <div className="cat-grid">
        {/* LEFT: header + categories list */}
        <aside className="cat-list">
          <div className="cat-list-head">
            <h3>Categories</h3>
            <label className="toggle small">
              <input
                type="checkbox"
                checked={onlyLow}
                onChange={(e) => setOnlyLow(e.target.checked)}
              />
              <span>Low stock only</span>
            </label>
          </div>

          <div className="cat-list-body">
            {loadingCats ? (
              <div className="dim">Loading…</div>
            ) : visibleCats.length === 0 ? (
              <div className="dim">
                {onlyLow ? "No categories below buffer." : "No categories."}
              </div>
            ) : (
              visibleCats.map((c) => {
                const total = totalsByCategory.get(Number(c.id)) || 0;
                const sev = getCatSeverity(total, c.buffer);
                return (
                  <button
                    key={c.id}
                    className={`cat-pill ${c.id === activeId ? "active" : ""}`}
                    onClick={() => setActiveId(c.id)}
                  >
                    <div className="row">
                      <span className="name">{c.name}</span>
                      <span className={`pill tiny ${sev.key}`}>{sev.label}</span>
                    </div>
                    <div className="sub">Buffer: {c.buffer ?? 0}</div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT: details + items */}
        <main className="cat-main">
          {!activeCat ? (
            <div className="card dim">Select a category.</div>
          ) : (
            <>
              <div className="card cat-meta">
                <div className="meta-title">{activeCat.name}</div>

                <div className="meta-row">
                  <div>
                    <span className="muted">Buffer:&nbsp;</span>
                    <b>{activeCat.buffer ?? 0}</b>
                    <button
                      className="btn tiny"
                      style={{ marginLeft: 8 }}
                      onClick={() => setShowEditCat(true)}
                      disabled={mUpdate.isPending}
                      title="Edit category"
                    >
                      ✎ Edit
                    </button>
                    <button
                      className="btn tiny danger"
                      style={{ marginLeft: 8 }}
                      onClick={() => setShowConfirmDel(true)}
                      disabled={!canDeleteActive || mDelete.isPending}
                      title={
                        canDeleteActive
                          ? "Delete this category"
                          : "Cannot delete while it still has items"
                      }
                    >
                      🗑 Delete
                    </button>
                  </div>

                  <div className="dot">•</div>

                  <div>
                    <span className="muted">Total Qty:&nbsp;</span>
                    <b>{totalQtyInCat}</b>
                  </div>

                  <div className="dot">•</div>
                  {(() => {
                    const sev = getCatSeverity(totalQtyInCat, activeCat.buffer);
                    return (
                      <div>
                        <span className="muted">Status:&nbsp;</span>
                        <span className={`pill big ${sev.key}`}>{sev.label}</span>
                      </div>
                    );
                  })()}

                  <div className="spacer" />

                  <div className="search small">
                    <span aria-hidden>🔎</span>
                    <input
                      placeholder="Search code or name…"
                      value={needle}
                      onChange={(e) => setNeedle(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                {loadingItems ? (
                  <div className="dim">Loading items…</div>
                ) : tableRows.length === 0 ? (
                  <div className="dim">No items in this category.</div>
                ) : (
                  <table className="cat-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th className="num">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((it) => {
                        const unit = getUnit(it.id);
                        return (
                          <tr key={it.id}>
                            <td className="mono">{it.code}</td>
                            <td>{it.name}</td>
                            <td className="num">
                              <span className="qty">
                                <span className="q">{it.quantity}</span>
                                {unit ? <sub className="unit">{unit}</sub> : null}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreate={(payload) => mCreate.mutate(payload)}
        creating={mCreate.isPending}
      />

      {/* Edit Category Modal (name/code/buffer) */}
      <EditCategoryModal
        open={showEditCat}
        category={activeCat}
        onClose={() => setShowEditCat(false)}
        onSave={(patch) => mUpdate.mutate({ id: activeCat.id, patch })}
        saving={mUpdate.isPending}
      />

      {/* Confirm Delete Modal */}
      {showConfirmDel && activeCat && (
        <ConfirmModal
          title="Delete Category"
          message={
            canDeleteActive
              ? `Delete “${activeCat.name}”? This cannot be undone.`
              : `“${activeCat.name}” still has items (Total Qty: ${totalQtyInCat}). 
                 Please move or delete items before deleting this category.`
          }
          confirmText="Delete"
          confirmDisabled={!canDeleteActive || mDelete.isPending}
          onCancel={() => setShowConfirmDel(false)}
          onConfirm={() => mDelete.mutate(activeCat.id)}
        />
      )}
    </section>
  );
}

/* ---------- Modals ---------- */

function AddCategoryModal({ open, onClose, onCreate, creating }) {
  const [form, setForm] = useState({ name: "", code: "", buffer: 0 });

  useEffect(() => {
    if (open) setForm({ name: "", code: "", buffer: 0 });
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal sheet">
        <h3>New Product Category</h3>
        <div className="grid2">
          <label>
            <span>Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., PSU, LAN Cable…"
            />
          </label>
          <label>
            <span>Code (optional)</span>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g., PSU-01"
            />
          </label>
          <label>
            <span>Buffer</span>
            <input
              type="number"
              min={0}
              value={form.buffer}
              onChange={(e) =>
                setForm((f) => ({ ...f, buffer: Number(e.target.value || 0) }))
              }
            />
          </label>
        </div>
        <div className="flex-right">
          <button className="btn ghost" onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={creating || !form.name.trim()}
            onClick={() =>
              onCreate({
                name: form.name.trim(),
                code: form.code?.trim() || null,
                buffer: Number(form.buffer || 0),
              })
            }
          >
            {creating ? "Creating…" : "Create Category"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Edit modal now allows Name + Code + Buffer **/
function EditCategoryModal({ open, category, onClose, onSave, saving }) {
  const [form, setForm] = useState({ name: "", code: "", buffer: 0 });

  useEffect(() => {
    if (open && category) {
      setForm({
        name: category.name || "",
        code: category.code || "",
        buffer: Number(category.buffer ?? 0),
      });
    }
  }, [open, category]);

  if (!open || !category) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal sheet">
        <h3>Edit Category</h3>
        <div className="grid2">
          <label>
            <span>Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label>
            <span>Code (optional)</span>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g., PSU-01"
            />
          </label>
          <label>
            <span>Buffer</span>
            <input
              type="number"
              min={0}
              value={form.buffer}
              onChange={(e) =>
                setForm((f) => ({ ...f, buffer: Number(e.target.value || 0) }))
              }
            />
          </label>
        </div>
        <div className="flex-right">
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() =>
              onSave({
                name: form.name.trim(),
                code: form.code?.trim() || null,
                buffer: Number(form.buffer || 0),
              })
            }
            disabled={saving || !form.name.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title = "Confirm",
  message,
  confirmText = "Confirm",
  confirmDisabled = false,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal mini" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p style={{ marginTop: 6 }}>{message}</p>
        <div className="flex-right">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn danger" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
