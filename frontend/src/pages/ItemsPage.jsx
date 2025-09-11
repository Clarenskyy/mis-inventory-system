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
  deleteItemsBulk,
  getNextItemCode,
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
  const [selected, setSelected] = useState(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false); // ← new

  // data
  const {
    data: items = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
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
      const matchesCat =
        category === "ALL" || catName === category.toLowerCase();

      return matchesText && matchesCat;
    });
  }, [items, query, category, catMap]);

  /* ---------- selection helpers (INSIDE component) ---------- */
  const toggleOne = (id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleAllInView = (checked, rows) => {
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      });
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  /* ---------- mutations ---------- */
  const mCreateCategory = useMutation({
    mutationFn: (payload) => createCategory(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const mCreate = useMutation({
    mutationFn: async ({ form, unit }) => {
      const created = await createItem({
        ...form,
        name: form.name.trim(),
        quantity: Number(form.quantity) || 0,
        category_id: Number(form.category_id) || undefined,
      });
      if (created?.id != null) setUnit(created.id, unit);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setShowCreate(false);
    },
    onError: (err) => {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to create item.";
      alert(detail);
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: ({ ids, note }) => deleteItemsBulk(ids, note), // support note
    onSuccess: () => {
      clearSelection();
      qc.invalidateQueries({ queryKey: ["items"] });
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
      if ((form.code ?? "").trim() !== (original.code ?? "")) {
        patch.code = form.code.trim();
      }
      if ((form.name ?? "").trim() !== (original.name ?? "")) {
        patch.name = form.name.trim();
      }
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
          <button className="btn ghost" onClick={() => refetch()}>
            Refresh
          </button>
          <button className="btn primary" onClick={() => setShowCreate(true)}>
            + Add Item
          </button>
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
          <label htmlFor="cat" className="cat-label">
            Product Category
          </label>
          <select
            id="cat"
            className="cat-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk action bar (visible when anything is selected) */}
      <>
        {selected.size > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span className="dim">{selected.size} selected</span>
            <button
              className="btn danger"
              disabled={bulkDeleteMut.isPending}
              onClick={() => setBulkConfirmOpen(true)} // ← open modal instead of immediate delete
            >
              {bulkDeleteMut.isPending ? "Deleting…" : "Delete Selected"}
            </button>
            <button className="btn ghost" onClick={clearSelection}>
              Clear
            </button>
          </div>
        )}
      </>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="row" key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="empty">
            <div className="emoji" aria-hidden>
              ⚠️
            </div>
            <h3>Couldn’t load items</h3>
            <p>Check your Network.</p>
            <div className="actions">
              <button className="btn ghost" onClick={() => refetch()}>
                Try again
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="emoji" aria-hidden>
              📦
            </div>
            <h3>No items</h3>
            <p>Try clearing filters or add a new item.</p>
            <div className="actions">
              <button
                className="btn ghost"
                onClick={() => {
                  setQuery("");
                  setCategory("ALL");
                }}
              >
                Clear filters
              </button>
              <button
                className="btn primary"
                onClick={() => setShowCreate(true)}
              >
                + Add Item
              </button>
            </div>
          </div>
        ) : (
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((r) => selected.has(r.id))
                    }
                    onChange={(e) => toggleAllInView(e.target.checked, filtered)}
                    aria-label="Select all visible"
                  />
                </th>
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
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(it.id)}
                        onChange={(e) => toggleOne(it.id, e.target.checked)}
                        aria-label={`Select ${it.name}`}
                      />
                    </td>
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
                      <button
                        className="btn tiny"
                        onClick={() => setConfirmEditTarget(it)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn tiny danger"
                        onClick={() => setDeleteTarget(it)}
                      >
                        Delete
                      </button>
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
        onConfirm={() => {
          setEditItem(confirmEditTarget);
          setConfirmEditTarget(null);
        }}
      />

      {/* Edit panel */}
      {editItem && (
        <EditPanel
          item={editItem}
          unit={getUnit(editItem.id)}
          categories={cats}
          onClose={() => setEditItem(null)}
          onSave={(form, chosenUnit) =>
            mSave.mutate({ original: editItem, form, unit: chosenUnit })
          }
          saving={mSave.isPending}
        />
      )}

      {/* Delete confirm (single) */}
      <MiniConfirm
        open={!!deleteTarget}
        title="Delete item?"
        message={
          deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ""
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => mDelete.mutate(deleteTarget)}
        danger
      />

      {/* Bulk delete confirm (new) */}
      <BulkDeleteConfirm
        open={bulkConfirmOpen}
        count={selected.size}
        pending={bulkDeleteMut.isPending}
        allCount={items?.length}
        onCancel={() => setBulkConfirmOpen(false)}
        onConfirm={(note) => {
          const ids = Array.from(selected).map(Number);
          if (!ids.length) return;
          bulkDeleteMut.mutate(
            { ids, note: note || "" },
            { onSuccess: () => setBulkConfirmOpen(false) }
          );
        }}
      />

      {/* Create panel */}
      {showCreate && (
        <CreatePanel
          categories={cats}
          onClose={() => setShowCreate(false)}
          onCreate={(form, chosenUnit) =>
            mCreate.mutate({ form, unit: chosenUnit })
          }
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
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? "danger" : "primary"}`}
            onClick={onConfirm}
          >
            {danger ? "Delete" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkDeleteConfirm({ open, count, pending, onCancel, onConfirm, allCount }) {
  const [note, setNote] = useState("");
  const [ack, setAck] = useState(""); // user must type DELETE
  if (!open) return null;

  const disabled = ack.trim().toUpperCase() !== "DELETE";

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal mini" onMouseDown={(e) => e.stopPropagation()}>
        <h3>Delete {count} selected item{count > 1 ? "s" : ""}?</h3>
        <p><b>This cannot be undone.</b></p>

        {allCount && count >= allCount ? (
          <p className="error">⚠️ You’re about to delete <b>ALL</b> items.</p>
        ) : null}

        <label className="full" style={{ display: "block", marginTop: 8 }}>
          <span>Type <b>DELETE</b> to confirm</span>
          <input
            value={ack}
            onChange={(e) => setAck(e.target.value)}
            placeholder="DELETE"
            autoFocus
          />
        </label>

        <label className="full" style={{ display: "block", marginTop: 8 }}>
          <span>Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why are these being deleted?"
          />
        </label>

        <div className="flex-right" style={{ marginTop: 10 }}>
          <button className="btn ghost" onClick={onCancel} disabled={pending}>Cancel</button>
          <button
            className="btn danger"
            onClick={() => onConfirm(note)}
            disabled={pending || disabled}
          >
            {pending ? "Deleting…" : "Delete"}
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
            <input
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value }))
              }
            />
          </label>
          <label>
            <span>Name</span>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </label>
          <label>
            <span>Quantity</span>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: e.target.value }))
              }
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
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category_id: Number(e.target.value),
                }))
              }
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            <span>Note (optional)</span>
            <input
              value={form.note}
              onChange={(e) =>
                setForm((f) => ({ ...f, note: e.target.value }))
              }
              placeholder="Why this change?"
            />
          </label>
        </div>
        <div className="flex-right">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => onSave(form, chosenUnit)}
            disabled={saving}
          >
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
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ensure a valid category once categories load
  useEffect(() => {
    if (!form.category_id && categories?.length) {
      setForm((f) => ({ ...f, category_id: categories[0].id, code: "" }));
      setCodeTouched(false);
    }
  }, [categories, form.category_id]);

  // fetch next code when category changes
  const { data: nextCode } = useQuery({
    queryKey: ["items", "next-code", form.category_id],
    queryFn: () => getNextItemCode(form.category_id),
    enabled: !!form.category_id,
  });

  // prefill if user hasn't typed yet
  useEffect(() => {
    if (!codeTouched && nextCode?.code) {
      setForm((f) => ({ ...f, code: nextCode.code }));
    }
  }, [nextCode, codeTouched]);

  const canSubmit =
    (form.name?.trim().length >= 2) &&
    Number(form.category_id) > 0 &&
    Number.isFinite(Number(form.quantity));

  return (
    <div className="modal-backdrop">
      <div className="modal sheet">
        <h3>Add Item</h3>
        <div className="grid2">
          <label>
            <span>Code</span>
            <input
              value={form.code}
              onChange={(e) => {
                setForm((f) => ({ ...f, code: e.target.value }));
                setCodeTouched(true);
              }}
              placeholder="MISCPU0001"
            />
          </label>
          <label>
            <span>Name</span>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              required
              minLength={2}
            />
          </label>
          <label>
            <span>Quantity</span>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: e.target.value }))
              }
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
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category_id: Number(e.target.value),
                    code: "",
                  }))
                }
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
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

        {errorMsg && (
          <div className="error" style={{ marginTop: 8 }}>
            {errorMsg}
          </div>
        )}

        <div className="flex-right">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setErrorMsg("");
              onCreate(
                {
                  ...form,
                  name: form.name.trim(),
                  quantity: Number(form.quantity) || 0,
                  category_id: Number(form.category_id) || undefined,
                },
                chosenUnit
              );
            }}
            disabled={creating || !canSubmit}
          >
            {creating ? "Creating…" : "Create Item"}
          </button>
        </div>

        {/* inline modal for creating a category */}
        {catModalOpen && (
          <NewCategoryModal
            onClose={() => setCatModalOpen(false)}
            onCreated={(created) => {
              // set the newly created category as selected
              setForm((f) => ({ ...f, category_id: created.id, code: "" }));
              setCodeTouched(false);
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
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g., Power Supply, LAN Cable…"
              required
              minLength={2}
            />
          </label>
          <label>
            <span>Code (optional)</span>
            <input
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value }))
              }
              placeholder="e.g., PSU"
            />
          </label>
          <label>
            <span>Buffer</span>
            <input
              type="number"
              min={0}
              value={form.buffer}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  buffer: Number(e.target.value || 0),
                }))
              }
            />
          </label>
        </div>
        {error && (
          <div className="error" style={{ marginTop: 8 }}>
            {error}
          </div>
        )}
        <div className="flex-right" style={{ marginTop: 10 }}>
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={submit}
            disabled={saving || !form.name.trim()}
          >
            {saving ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
