import { useEffect, useMemo, useState } from "react";

/**
 * Props:
 * - initial: item when editing, or null when creating
 * - categories: array of { id, name }
 * - onSubmit(payload)
 * - onCancel()
 * - loading: boolean
 * - serverError: string
 */
export default function ItemForm({
  initial = null,
  categories = [],
  onSubmit,
  onCancel,
  loading = false,
  serverError = "",
}) {
  const isEdit = !!initial?.id;

  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [quantity, setQuantity] = useState(
    typeof initial?.quantity === "number" ? initial.quantity : 0
  );
  const [categoryId, setCategoryId] = useState(
    isEdit ? initial?.category_id ?? "" : ""
  );
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    document.getElementById("item-code")?.focus();
  }, []);

  const categoryOptions = useMemo(
    () =>
      (categories || [])
        .map((c) => ({ value: String(c.id), label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [categories]
  );

  function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const qtyNum = Number(quantity);

    if (!trimmedCode) return setLocalError("Code is required.");
    if (!trimmedName) return setLocalError("Name is required.");
    if (!Number.isFinite(qtyNum) || qtyNum < 0) {
      return setLocalError("Quantity must be ≥ 0.");
    }

    // Category required on create
    if (!isEdit && !categoryId) {
      return setLocalError("Please select a category.");
    }

    const payload = {
      code: trimmedCode,
      name: trimmedName,
      quantity: qtyNum,
    };

    if (isEdit) {
      payload.category_id = Number(initial?.category_id);
    } else {
      payload.category_id = Number(categoryId);
    }

    onSubmit?.(payload);
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      {(localError || serverError) && (
        <div className="alert error">{localError || serverError}</div>
      )}

      <label className="field">
        <span>Code</span>
        <input
          id="item-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. ITM-0001"
        />
      </label>

      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. HDMI Cable"
        />
      </label>

      <label className="field">
        <span>Quantity</span>
        <input
          type="number"
          min={0}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>

      {!isEdit && (
        <label className="field">
          <span>Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">— Select category —</option>
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="btn ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Create item"}
        </button>
      </div>
    </form>
  );
}
