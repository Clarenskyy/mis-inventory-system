import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getItems,
  getCategories,
  createItem,
  updateItem,
  deleteItem,
  adjustItem,
  createCategory,
} from "../lib/api.js";
import "./items.css";

/* -----------------------------------------------------------
   Unit handling (frontend only, persisted in localStorage)
----------------------------------------------------------- */
const UNIT_STORE_KEY = "mis.units.v1";
function loadUnitMap() {
  try {
    return JSON.parse(localStorage.getItem(UNIT_STORE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveUnitMap(map) {
  localStorage.setItem(UNIT_STORE_KEY, JSON.stringify(map));
}
function getUnit(id) {
  const m = loadUnitMap();
  return m?.[String(id)] || "";
}
function setUnit(id, unit) {
  const m = loadUnitMap();
  m[String(id)] = (unit ?? "").trim();
  saveUnitMap(m);
}
function deleteUnit(id) {
  const m = loadUnitMap();
  delete m[String(id)];
  saveUnitMap(m);
}

export default function ItemsPage() {
  const qc = useQueryClient();

  // UI state
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmEditTarget, setConfirmEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // data
  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["items"],
    queryFn: getItems,
  });
  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const catMap = useMemo(() => {
    const m = new Map();
    (cats || []).forEach((c) => m.set(c.id, c));
    return m;
  }, [cats]);
  const categoryOptions = useMemo(
    () => ["ALL", ...(cats || []).map((c) => c.name)],
    [cats]
  );

  // filter client-side
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (items || []).filter((it) => {
      const matchesText =
        !needle ||
        it.code?.toLowerCase().includes(needle) ||
        it.name?.toLowerCase().includes(needle);

      const catName = (catMap.get(it.category_id)?.name ?? "").toLowerCase();
      const matchesCat = category === "ALL" || catName === category.toLowerCase();

      return matchesText && matchesCat;
    });
  }, [items, query, category, catMap]);

  /* ---------- mutations ---------- */
const mCreateCategory = useMutation({
  mutationFn: (payload) => createCategory(payload),
  onSuccess: (created) => {
    qc.invalidateQueries({ queryKey: ["categories"] });
  },
});

  const mCreate = useMutation({
    mutationFn: async ({ form, unit }) => {
      const created = await createItem(form);
      if (created?.id != null) setUnit(created.id, unit);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setShowCreate(false);
    },
  });

  // Save with: quantity via PATCH /items/{id}/adjust, other fields via PUT /items/{id}
  const mSave = useMutation({
    mutationFn: async ({ original, form, unit }) => {
      const prevQty = Number(original.quantity ?? 0);
      const nextQty = Number(form.quantity ?? 0);
      const delta = nextQty - prevQty;

      // quantity change via adjust endpoint (emails + low stock handled by backend)
      if (delta !== 0) {
        await adjustItem(original.id, delta, form.note || "");
      }

      // other fields
      const patch = {};
      if ((form.code ?? "").trim() !== (original.code ?? "")) patch.code = form.code.trim();
      if ((form.name ?? "").trim() !== (original.name ?? "")) patch.name = form.name.trim();
      if (
        form.category_id !== undefined &&
        Number(form.category_id) !== Number(original.category_id)
      ) {
        patch.category_id = Number(form.category_id);
      }
      if (Object.keys(patch).length > 0) {
        await updateItem(original.id, patch);
      }

      setUnit(original.id, unit);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setEditItem(null);
    },
  });

  const mDelete = useMutation({
    mutationFn: (item) => deleteItem(item.id),
    onSuccess: (_, item) => {
      deleteUnit(item.id);
      qc.invalidateQueries({ queryKey: ["items"] });
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    document.getElementById("item-search")?.focus();
  }, []);

  return (
    <section className="items-wrap">
      {/* Header */}
      <div className="items-head">
        <h1 className="items-title">Items</h1>
        <div className="head-actions">
          <button className="btn ghost" onClick={() => refetch()}>Refresh</button>
          <button className="btn primary" onClick={() => setShowCreate(true)}>+ Add Item</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="items-toolbar">
        <div className="search">
          <span aria-hidden>🔎</span>
          <input
            id="item-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code or name…"
          />
        </div>

        <div className="category-filter">
          <label htmlFor="cat" className="cat-label">Product Category</label>
          <select
            id="cat"
            className="cat-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="loading">{Array.from({ length: 6 }).map((_, i) => <div className="row" key={i} />)}</div>
        ) : isError ? (
          <div className="empty">
            <div className="emoji" aria-hidden>⚠️</div>
            <h3>Couldn’t load items</h3>
            <p>Check your backend, CORS, or auth.</p>
            <div className="actions">
              <button className="btn ghost" onClick={() => refetch()}>Try again</button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="emoji" aria-hidden>📦</div>
            <h3>No items</h3>
            <p>Try clearing filters or add a new item.</p>
            <div className="actions">
              <button className="btn ghost" onClick={() => { setQuery(""); setCategory("ALL"); }}>
                Clear filters
              </button>
              <button className="btn primary" onClick={() => setShowCreate(true)}>+ Add Item</button>
            </div>
          </div>
        ) : (
          <table className="items-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th className="num">Qty</th>
                <th>Product Category</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const catName = catMap.get(it.category_id)?.name ?? "-";
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
                    <td>{catName}</td>
                    <td className="right">
                      <button className="btn tiny" onClick={() => setConfirmEditTarget(it)}>Edit</button>
                      <button className="btn tiny danger" onClick={() => setDeleteTarget(it)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm before edit (mini modal) */}
      <MiniConfirm
        open={!!confirmEditTarget}
        title="Proceed to edit?"
        message={confirmEditTarget ? `Edit "${confirmEditTarget.name}"?` : ""}
        onCancel={() => setConfirmEditTarget(null)}
        onConfirm={() => { setEditItem(confirmEditTarget); setConfirmEditTarget(null); }}
      />

      {/* Edit panel */}
      {editItem && (
        <EditPanel
          item={editItem}
          unit={getUnit(editItem.id)}
          categories={cats}
          onClose={() => setEditItem(null)}
          onSave={(form, chosenUnit) => mSave.mutate({ original: editItem, form, unit: chosenUnit })}
          saving={mSave.isPending}
        />
      )}

      {/* Delete confirm */}
      <MiniConfirm
        open={!!deleteTarget}
        title="Delete item?"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => mDelete.mutate(deleteTarget)}
        danger
      />

      {/* Create panel */}
      {showCreate && (
        <CreatePanel
          categories={cats}
          onClose={() => setShowCreate(false)}
          onCreate={(form, chosenUnit) => mCreate.mutate({ form, unit: chosenUnit })}
          creating={mCreate.isPending}
        />
      )}
    </section>
  );
}

/* ---------- small UI helpers ---------- */

function MiniConfirm({ open, title, message, onCancel, onConfirm, danger }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal mini">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="flex-right">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? "danger" : "primary"}`} onClick={onConfirm}>
            {danger ? "Delete" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPanel({ item, unit, categories, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    code: item.code,
    name: item.name,
    quantity: item.quantity,
    category_id: item.category_id,
    note: "",
  });
  const [chosenUnit, setChosenUnit] = useState(unit || "");

  return (
    <div className="modal-backdrop">
      <div className="modal sheet">
        <h3>Edit Item</h3>
        <div className="grid2">
          <label>
            <span>Code</span>
            <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </label>
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label>
            <span>Quantity</span>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </label>
          <label>
            <span>Unit (free-text)</span>
            <input
              value={chosenUnit}
              onChange={(e) => setChosenUnit(e.target.value)}
              placeholder="e.g., pc, pack, box, roll…"
              maxLength={20}
            />
          </label>
          <label>
            <span>Product Category</span>
            <select
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: Number(e.target.value) }))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="full">
            <span>Note (optional)</span>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Why this change?"
            />
          </label>
        </div>
        <div className="flex-right">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(form, chosenUnit)} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePanel({ categories, onClose, onCreate, creating }) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    quantity: 0,
    category_id: categories[0]?.id ?? "",
  });
  const [chosenUnit, setChosenUnit] = useState("");
  const [catModalOpen, setCatModalOpen] = useState(false); // ← new

  return (
    <div className="modal-backdrop">
      <div className="modal sheet">
        <h3>Add Item</h3>
        <div className="grid2">
          <label>
            <span>Code</span>
            <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </label>
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label>
            <span>Quantity</span>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </label>
          <label>
            <span>Unit (free-text)</span>
            <input
              value={chosenUnit}
              onChange={(e) => setChosenUnit(e.target.value)}
              placeholder="e.g., pc, pack, box, roll…"
              maxLength={20}
            />
          </label>

          {/* Category + “+ New” button side-by-side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <label style={{ margin: 0 }}>
              <span>Product Category</span>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: Number(e.target.value) }))}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn tiny"
              style={{ alignSelf: "end" }}
              onClick={() => setCatModalOpen(true)}
            >
              + New
            </button>
          </div>
        </div>

        <div className="flex-right">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onCreate(form, chosenUnit)} disabled={creating}>
            {creating ? "Creating…" : "Create Item"}
          </button>
        </div>

        {/* inline modal for creating a category */}
        {catModalOpen && (
          <NewCategoryModal
            onClose={() => setCatModalOpen(false)}
            onCreated={(created) => {
              // set the newly created category as selected
              setForm((f) => ({ ...f, category_id: created.id }));
              setCatModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function NewCategoryModal({ onClose, onCreated }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", code: "", buffer: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setSaving(true);
    try {
      // call the API directly or via a tiny helper hook
      const res = await createCategory({
        name: form.name.trim(),
        code: form.code?.trim() || null,
        buffer: Number(form.buffer || 0),
      });
      await qc.invalidateQueries({ queryKey: ["categories"] });
      onCreated?.(res);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal mini" onMouseDown={(e) => e.stopPropagation()}>
        <h3>New Product Category</h3>
        <div className="grid1" style={{ marginTop: 8 }}>
          <label>
            <span>Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., PSU, LAN Cable…"
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
              onChange={(e) => setForm((f) => ({ ...f, buffer: Number(e.target.value || 0) }))}
            />
          </label>
        </div>
        {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
        <div className="flex-right" style={{ marginTop: 10 }}>
          <button className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
