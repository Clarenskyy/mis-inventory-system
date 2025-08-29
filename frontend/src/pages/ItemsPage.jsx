// src/pages/ItemsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import ItemForm from "../components/ItemForm.jsx";
import Modal from "../components/Modal.jsx";
import "./items.css";

/* ---- API calls ---- */
async function fetchCategories() {
  const r = await api.get("/categories");
  return Array.isArray(r.data) ? r.data : [];
}
async function fetchItems() {
  const r = await api.get("/items");
  return Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
}
async function createItem(payload) {
  const r = await api.post("/items", payload); 
  return r.data;
}
async function updateItem({ id, data }) {
  const r = await api.patch(`/items/${id}`, data);
  return r.data;
}
async function deleteItem(id) {
  await api.delete(`/items/${id}`);
}

export default function ItemsPage() {
  const [query, setQuery] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [category, setCategory] = useState("ALL");

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmEditTarget, setConfirmEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createError, setCreateError] = useState("");

  /* Items */
  const {
    data: items = [],
    isLoading,
    isError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["items"],
    queryFn: fetchItems,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  /* Categories */
  const {
    data: categories = [],
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 0,
  });

  /* category maps/options */
  const { catMap, categoryOptions } = useMemo(() => {
    const map = {};
    const names = [];
    (categories || []).forEach((c) => {
      map[c.id] = { name: c.name, buffer: Number(c.buffer ?? 0) };
      names.push(c.name);
    });
    names.sort((a, b) => a.localeCompare(b));
    return { catMap: map, categoryOptions: ["ALL", ...names] };
  }, [categories]);

  // Save handler: uses /adjust ONLY when quantity changed (so emails + low-stock fire)
const mSave = useMutation({
  mutationFn: async ({ original, form }) => {
    const prevQty = Number(original.quantity ?? 0);
    const nextQty = Number(form.quantity ?? 0);
    const change = nextQty - prevQty;

    // 1) qty changed -> call /adjust via QUERY PARAMS
    if (change !== 0) {
      await adjustItem(original.id, change, form.note || "");
    }

    // 2) other fields -> normal update
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
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["items"] });
    setEditItem(null);
  },
});


  const mDelete = useMutation({
    mutationFn: deleteItem,
    onSuccess: async () => {
      await refetchItems();
      setDeleteTarget(null);
    },
  });

  /* Filtering; "low stock only" uses category buffer */
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (items || []).filter((it) => {
      const matchesText =
        !needle ||
        it.code?.toLowerCase().includes(needle) ||
        it.name?.toLowerCase().includes(needle);

      const catName = catMap[it.category_id]?.name ?? "";
      const catBuffer = catMap[it.category_id]?.buffer ?? 0;

      const low = (it.quantity ?? 0) <= catBuffer;
      const matchesLow = !onlyLow || low;

      const matchesCat =
        category === "ALL" || catName.toLowerCase() === category.toLowerCase();

      return matchesText && matchesLow && matchesCat;
    });
  }, [items, query, onlyLow, category, catMap]);

  useEffect(() => {
    document.getElementById("item-search")?.focus();
  }, []);

  async function handleRefresh() {
    try {
      setIsRefreshing(true);
      await Promise.all([refetchItems(), refetchCategories()]);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section className="items-wrap">
      {/* Header */}
      <div className="items-head">
        <h1 className="items-title">Items</h1>
        <div className="head-actions">
          <button
            className="btn ghost"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Reload items and categories"
          >
            {isRefreshing ? "Refreshing…" : "Refresh"}
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
          <LoadingRows />
        ) : isError ? (
          <div className="empty">
            <div className="emoji" aria-hidden>⚠️</div>
            <h3>Couldn’t load items</h3>
            <p>Check your backend, CORS, or auth.</p>
            <div className="actions">
              <button className="btn ghost" onClick={handleRefresh}>
                Try again
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            onClear={() => {
              setQuery("");
              setOnlyLow(false);
              setCategory("ALL");
            }}
            onAdd={() => setShowCreate(true)}
          />
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
                const cat = catMap[it.category_id];
                const catName = cat?.name ?? "-";

                return (
                  <tr key={it.id}>
                    <td className="mono">{it.code}</td>
                    <td>{it.name}</td>
                    <td className="num">{it.quantity}</td>
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

      {/* Create */}
      <Modal open={showCreate} title="New Item" onClose={() => setShowCreate(false)}>
        <ItemForm
          categories={categories}
          onSubmit={(form) => mCreate.mutate(form)}
          onCancel={() => setShowCreate(false)}
          loading={mCreate.isPending}
          serverError={createError}
        />
      </Modal>

      {/* Confirm before Edit — mini panel */}
      <Modal
        open={!!confirmEditTarget}
        title=""
        size="sm"
        onClose={() => setConfirmEditTarget(null)}
      >
        <div className="mini-confirm">
          <p>Edit <b>{confirmEditTarget?.name}</b>?</p>
          <div className="mini-actions">
            <button className="btn ghost" onClick={() => setConfirmEditTarget(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setEditItem(confirmEditTarget);
                setConfirmEditTarget(null);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit */}
      <Modal
        open={!!editItem}
        title={`Edit: ${editItem?.name ?? ""}`}
        onClose={() => setEditItem(null)}
      >
        {editItem && (
          <ItemForm
            initial={editItem}
            onSubmit={(form) => mUpdate.mutate({ id: editItem.id, data: form })}
            onCancel={() => setEditItem(null)}
            loading={mUpdate.isPending}
          />
        )}
      </Modal>

      {/* Delete — mini panel */}
      <Modal
        open={!!deleteTarget}
        title=""
        size="sm"
        onClose={() => setDeleteTarget(null)}
      >
        <div className="mini-confirm">
          <p>Delete <b>{deleteTarget?.name}</b>?</p>
          <div className="mini-actions">
            <button className="btn ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="btn danger" onClick={() => mDelete.mutate(deleteTarget.id)}>
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

/* ---------- small inline components ---------- */

function LoadingRows() {
  return (
    <div className="loading">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="row" key={i} />
      ))}
    </div>
  );
}

function EmptyState({ onClear, onAdd }) {
  return (
    <div className="empty">
      <div className="emoji" aria-hidden>📦</div>
      <h3>No items</h3>
      <p>Try adding a new item or clear filters.</p>
      <div className="actions">
        <button className="btn primary" onClick={onAdd}>+ Add Item</button>
        <button className="btn ghost" onClick={onClear}>Clear filters</button>
      </div>
    </div>
  );
}
