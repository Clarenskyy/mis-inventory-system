import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import Modal from "../components/Modal.jsx";
import ItemForm from "../components/ItemForm.jsx";
import "./productCategory.css";

/* ---------- API helpers ---------- */
async function fetchCategories() {
  const r = await api.get("/categories");
  return Array.isArray(r.data) ? r.data : [];
}

async function fetchItems() {
  const r = await api.get("/items");
  return Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
}

async function createCategory(payload) {
  const r = await api.post("/categories", payload);
  return r.data;
}

async function updateCategory({ id, data }) {
  const r = await api.patch(`/categories/${id}`, data);
  return r.data;
}

async function deleteCategory(id) {
  await api.delete(`/categories/${id}`);
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

/* ---------- Status helpers (category-level) ---------- */
// A category is LOW if any item in it is <= buffer.
// A category is OUT if total qty across its items is 0.
function categoryStatus(totalQty, lowCount) {
  if ((totalQty ?? 0) <= 0) return { label: "Out", cls: "danger" };
  if ((lowCount ?? 0) > 0) return { label: "Low", cls: "warn" };
  return { label: "OK", cls: "ok" };
}

export default function ProductCategoryPage() {
  /* UI state */
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Drill-down: show items of a clicked category
  const [openItemsForCat, setOpenItemsForCat] = useState(null);

  // Item-level modals within the drill-down
  const [confirmEditItem, setConfirmEditItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState(null);
  const [createError, setCreateError] = useState("");

  /* Data queries */
  const {
    data: categories = [],
    isLoading: catLoading,
    isError: catError,
    refetch: refetchCategories,
  } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories, staleTime: 0 });

  const {
    data: items = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["items"],
    queryFn: fetchItems,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  /* Build category stats from items */
  const catStats = useMemo(() => {
    // Map each category id to { totalQty, lowCount }
    const stats = {};
    categories.forEach((c) => (stats[c.id] = { totalQty: 0, lowCount: 0 }));

    items.forEach((it) => {
      const catId = it.category_id;
      const cat = categories.find((c) => c.id === catId);
      if (!cat) return;
      const buffer = Number(cat.buffer ?? 0);
      const qty = Number(it.quantity ?? 0);
      stats[catId].totalQty += qty;
      if (qty <= buffer) stats[catId].lowCount += 1;
    });
    return stats;
  }, [categories, items]);

  /* Filtered view of categories */
  const filteredCats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return categories
      .filter((c) => {
        const nameMatch =
          !needle ||
          c.name?.toLowerCase().includes(needle) ||
          c.code?.toLowerCase().includes(needle);
        if (!nameMatch) return false;

        const s = catStats[c.id] ?? { totalQty: 0, lowCount: 0 };
        const stat = categoryStatus(s.totalQty, s.lowCount);
        if (!lowOnly) return true;
        return stat.label === "Low" || stat.label === "Out";
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, query, lowOnly, catStats]);

  /* Mutations for categories */
  const mCatCreate = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      await refetchCategories();
      setShowCreate(false);
    },
  });

  const mCatUpdate = useMutation({
    mutationFn: updateCategory,
    onSuccess: async () => {
      await refetchCategories();
      setEditTarget(null);
    },
  });

  const mCatDelete = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      await Promise.all([refetchCategories(), refetchItems()]);
      setConfirmDelete(null);
    },
  });

  /* Mutations for items (inside drill-down) */
  const mItemCreate = useMutation({
    mutationFn: createItem,
    onMutate: () => setCreateError(""),
    onError: (err) => {
      const detail = err?.response?.data?.detail ?? err?.message ?? "Failed to create item.";
      let msg = "";
      try {
        msg = Array.isArray(detail)
          ? detail.map((d) => `${(d.loc || []).join(".")}: ${d.msg}`).join(" | ")
          : String(detail);
      } catch {
        msg = "Failed to create item.";
      }
      setCreateError(msg);
    },
    onSuccess: async () => {
      await refetchItems();
      setCreateError("");
    },
  });

  const mItemUpdate = useMutation({
    mutationFn: updateItem,
    onSuccess: async () => {
      await refetchItems();
      setEditItem(null);
    },
  });

  const mItemDelete = useMutation({
    mutationFn: deleteItem,
    onSuccess: async () => {
      await refetchItems();
      setDeleteItemTarget(null);
    },
  });

  useEffect(() => {
    document.getElementById("pcat-search")?.focus();
  }, []);

  async function refreshAll() {
    await Promise.all([refetchCategories(), refetchItems()]);
  }

  /* Drill-down items for selected category */
  const visibleItems = useMemo(() => {
    if (!openItemsForCat) return [];
    return items
      .filter((it) => it.category_id === openItemsForCat.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, openItemsForCat]);

  return (
    <section className="pc-wrap">
      {/* Header */}
      <div className="pc-head">
        <h1 className="pc-title">Product Categories</h1>
        <div className="head-actions">
          <button className="btn ghost" onClick={refreshAll} title="Refresh categories & items">
            Refresh
          </button>
          <button className="btn primary" onClick={() => setShowCreate(true)}>
            + Add Product Category
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="pc-toolbar">
        <div className="search">
          <span aria-hidden>🔎</span>
          <input
            id="pcat-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code or name…"
          />
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
          />
          <span>Low stock only</span>
        </label>
      </div>

      {/* Table */}
      <div className="card">
        {catLoading || itemsLoading ? (
          <LoadingRows />
        ) : catError || itemsError ? (
          <div className="empty">
            <div className="emoji" aria-hidden>⚠️</div>
            <h3>Couldn’t load categories</h3>
            <p>Check your backend, CORS, or auth.</p>
            <div className="actions">
              <button className="btn ghost" onClick={refreshAll}>Try again</button>
            </div>
          </div>
        ) : filteredCats.length === 0 ? (
          <EmptyState
            onClear={() => { setQuery(""); setLowOnly(false); }}
            onAdd={() => setShowCreate(true)}
          />
        ) : (
          <table className="pc-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th className="num">Buffer</th>
                <th className="num">Total Qty</th>
                <th className="num">Low Items</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCats.map((c) => {
                const stat = catStats[c.id] ?? { totalQty: 0, lowCount: 0 };
                const s = categoryStatus(stat.totalQty, stat.lowCount);
                return (
                  <tr key={c.id} className="pc-row" onClick={() => setOpenItemsForCat(c)}>
                    <td className="mono">{c.code ?? "-"}</td>
                    <td>{c.name}</td>
                    <td className="num">{c.buffer ?? 0}</td>
                    <td className="num">{stat.totalQty}</td>
                    <td className="num">{stat.lowCount}</td>
                    <td><span className={`pill ${s.cls}`}>{s.label}</span></td>
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <button className="btn tiny" onClick={() => setOpenItemsForCat(c)}>
                        View Items
                      </button>
                      <button className="btn tiny" onClick={() => setEditTarget(c)}>
                        Edit
                      </button>
                      <button className="btn tiny danger" onClick={() => setConfirmDelete(c)}>
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

      {/* Create Category */}
      <Modal open={showCreate} title="New Product Category" onClose={() => setShowCreate(false)}>
        <CategoryForm
          onSubmit={(form) => mCatCreate.mutate(form)}
          onCancel={() => setShowCreate(false)}
          loading={mCatCreate.isPending}
        />
      </Modal>

      {/* Edit Category */}
      <Modal
        open={!!editTarget}
        title={`Edit: ${editTarget?.name ?? ""}`}
        onClose={() => setEditTarget(null)}
      >
        {editTarget && (
          <CategoryForm
            initial={editTarget}
            onSubmit={(form) => mCatUpdate.mutate({ id: editTarget.id, data: form })}
            onCancel={() => setEditTarget(null)}
            loading={mCatUpdate.isPending}
          />
        )}
      </Modal>

      {/* Delete Category — mini confirm */}
      <Modal open={!!confirmDelete} title="" size="sm" onClose={() => setConfirmDelete(null)}>
        <div className="mini-confirm">
          <p>Delete <b>{confirmDelete?.name}</b>?</p>
          <div className="mini-actions">
            <button className="btn ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="btn danger" onClick={() => mCatDelete.mutate(confirmDelete.id)}>
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Drill-down: Items in selected Product Category */}
      <Modal
        open={!!openItemsForCat}
        title={openItemsForCat ? `Items in ${openItemsForCat.name}` : ""}
        onClose={() => setOpenItemsForCat(null)}
        size="lg"
      >
        {openItemsForCat && (
          <div className="pc-items">
            {/* Inline create item for this category */}
            <div className="pc-items-head">
              <button className="btn primary" onClick={() => setEditItem({ _createForCat: openItemsForCat.id })}>
                + Add Item
              </button>
            </div>

            {/* Items table (same columns as Items page, minus Status) */}
            {visibleItems.length === 0 ? (
              <div className="empty small">
                <div className="emoji" aria-hidden>📦</div>
                <p>No items in this product category yet.</p>
              </div>
            ) : (
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th className="num">Qty</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((it) => (
                    <tr key={it.id}>
                      <td className="mono">{it.code}</td>
                      <td>{it.name}</td>
                      <td className="num">{it.quantity}</td>
                      <td className="right">
                        <button className="btn tiny" onClick={() => setConfirmEditItem(it)}>
                          Edit
                        </button>
                        <button className="btn tiny danger" onClick={() => setDeleteItemTarget(it)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Confirm before Edit (item) */}
            <Modal open={!!confirmEditItem} title="" size="sm" onClose={() => setConfirmEditItem(null)}>
              <div className="mini-confirm">
                <p>Edit <b>{confirmEditItem?.name}</b>?</p>
                <div className="mini-actions">
                  <button className="btn ghost" onClick={() => setConfirmEditItem(null)}>Cancel</button>
                  <button
                    className="btn primary"
                    onClick={() => {
                      setEditItem(confirmEditItem);
                      setConfirmEditItem(null);
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </Modal>

            {/* Create/Edit Item form */}
            <Modal
              open={!!editItem}
              title={
                editItem?._createForCat
                  ? "New Item"
                  : `Edit: ${editItem?.name ?? ""}`
              }
              onClose={() => setEditItem(null)}
            >
              {editItem && (
                <ItemForm
                  // For create-in-category: provide a fake initial that sets category_id
                  initial={
                    editItem._createForCat
                      ? { category_id: editItem._createForCat, quantity: 0 }
                      : editItem
                  }
                  categories={categories}
                  onSubmit={(form) => {
                    if (editItem._createForCat) {
                      // ensure category_id locked to the opened category
                      const payload = { ...form, category_id: openItemsForCat.id };
                      mItemCreate.mutate(payload);
                      setEditItem(null);
                    } else {
                      mItemUpdate.mutate({ id: editItem.id, data: form });
                    }
                  }}
                  onCancel={() => setEditItem(null)}
                  loading={mItemCreate.isPending || mItemUpdate.isPending}
                  serverError={createError}
                />
              )}
            </Modal>

            {/* Delete item confirm */}
            <Modal
              open={!!deleteItemTarget}
              title=""
              size="sm"
              onClose={() => setDeleteItemTarget(null)}
            >
              <div className="mini-confirm">
                <p>Delete <b>{deleteItemTarget?.name}</b>?</p>
                <div className="mini-actions">
                  <button className="btn ghost" onClick={() => setDeleteItemTarget(null)}>
                    Cancel
                  </button>
                  <button className="btn danger" onClick={() => mItemDelete.mutate(deleteItemTarget.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </Modal>
          </div>
        )}
      </Modal>
    </section>
  );
}

/* ---------- tiny inline components ---------- */
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
      <div className="emoji" aria-hidden>🗂️</div>
      <h3>No product categories</h3>
      <p>Try adding a new product category or clear filters.</p>
      <div className="actions">
        <button className="btn primary" onClick={onAdd}>+ Add Product Category</button>
        <button className="btn ghost" onClick={onClear}>Clear filters</button>
      </div>
    </div>
  );
}

/* ---------- small Category form (inline) ---------- */
function CategoryForm({ initial = null, onSubmit, onCancel, loading = false }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [buffer, setBuffer] = useState(
    Number.isFinite(Number(initial?.buffer)) ? Number(initial?.buffer) : 0
  );
  const [err, setErr] = useState("");

  useEffect(() => {
    document.getElementById("cat-name")?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const bufNum = Number(buffer);
    if (!trimmedName) return setErr("Name is required.");
    if (!Number.isFinite(bufNum) || bufNum < 0) return setErr("Buffer must be ≥ 0.");

    onSubmit?.({ name: trimmedName, code: trimmedCode || null, buffer: bufNum });
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      {err && <div className="alert error">{err}</div>}

      <label className="field">
        <span>Name</span>
        <input
          id="cat-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. PSU"
        />
      </label>

      <label className="field">
        <span>Code</span>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. CAT-PSU"
        />
      </label>

      <label className="field">
        <span>Buffer</span>
        <input
          type="number"
          min={0}
          step={1}
          value={buffer}
          onChange={(e) => setBuffer(e.target.value)}
        />
      </label>

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? "Saving…" : initial ? "Save changes" : "Create product category"}
        </button>
      </div>
    </form>
  );
}
