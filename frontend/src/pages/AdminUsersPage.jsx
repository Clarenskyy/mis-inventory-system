// src/pages/AdminUsersPage.jsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminListUsers, adminCreateUser, adminUpdateUser, adminDeleteUser,
  listRecipients, createRecipient, setRecipientActive, deleteRecipient,
} from "../lib/api.js";
import "./users.css";

const EMPTY_USER = {
  username: "",
  password: "",
  name: "",
  email: "",
  role: "staff",
  is_admin: false,
};

export default function AdminUsersPage() {
  return (
    <section className="page-wrap">
      <h1 className="page-title">Admin</h1>
      <UsersAdminCard />
      <RecipientsAdminCard />
    </section>
  );
}

/* -------------------- Users Admin -------------------- */

function UsersAdminCard() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState(() => () => {});
  const [form, setForm] = useState(EMPTY_USER);
  const [editingId, setEditingId] = useState(null);
  const [showPwd, setShowPwd] = useState(false);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminListUsers,
  });

  const createMut = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); closeModal(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => adminUpdateUser(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); closeModal(); },
  });

  const deleteMut = useMutation({
    mutationFn: adminDeleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_USER);
    setShowPwd(false);
    setModalOpen(true);
  }
  function openEdit(u) {
    setEditingId(u.id);
    setForm({
    username: u.username,   // ✅ keep this visible + editable
    password: "",
    name: u.name || "",
    email: u.email || "",
    role: u.role || "staff",
    is_admin: !!u.is_admin,
  });
    setShowPwd(false);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_USER);
    setShowPwd(false);
  }

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function requestConfirm(message, action) {
    setConfirmMsg(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  }

  function submitUser(e) {
    e.preventDefault();
    if (editingId) {
      const payload = {
        username: form.username,
        name: form.name,
        email: form.email || null,
        role: form.role,
        is_admin: form.is_admin,
      };
      if (form.password) payload.password = form.password;
      requestConfirm(`Save changes to “${form.username}”?`, () =>
        updateMut.mutate({ id: editingId, payload })
      );
    } else {
      requestConfirm(`Create new user “${form.username}”?`, () =>
        createMut.mutate({
          username: form.username,
          password: form.password,
          name: form.name,
          email: form.email || null,
          role: form.role,
          is_admin: form.is_admin,
        })
      );
    }
  }

  function confirmDeleteUser(user) {
    requestConfirm(
      `Delete user “${user.username}”? This cannot be undone.`,
      () => deleteMut.mutate(user.id)
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="name-row">
        <h2 style={{ margin: 0 }}>Users</h2>
        <button className="btn primary" onClick={openCreate}>+ Add User</button>
      </div>

      <div style={{ marginTop: 10 }}>
        {isLoading ? (
          <div>Loading users…</div>
        ) : isError ? (
          <div className="error">Failed to load users.</div>
        ) : users.length === 0 ? (
          <div>No users yet.</div>
        ) : (
          <table className="cat-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Admin</th>
                <th className="num" style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.id}</td>
                  <td className="mono">{u.username}</td>
                  <td>{u.name}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.role}</td>
                  <td>{u.is_admin ? <span className="pill ok tiny">Yes</span> : "No"}</td>
                  <td className="num">
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button className="btn tiny" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn tiny danger" onClick={() => confirmDeleteUser(u)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal onClose={closeModal} dismissible={false}>
          <div className="modal sheet" style={{ width: "95%", maxWidth: 500 }}>
            <h3>{editingId ? "Edit User" : "Add User"}</h3>
            <form onSubmit={submitUser} className="grid2">
                <label>
                  Username
                  <input
                    name="username"
                    value={form.username}
                    onChange={onChange}
                    required
                  />
                </label>
              

              <label>
                <span>Name</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                />
              </label>

              <label>
                <span>Email (optional)</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="user@example.com"
                />
              </label>

              <label>
                <span>Role</span>
                <select name="role" value={form.role} onChange={onChange}>
                  <option value="staff">staff</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              </label>

              <label className="inline-check">
                <span>Admin</span>
                <input
                  type="checkbox"
                  name="is_admin"
                  checked={form.is_admin}
                  onChange={onChange}
                />
                
              </label>


              <label className="grid-span-2">
                <span>{editingId ? "New Password (optional)" : "Password"}</span>
                <div className="pwd-row">
                  <input
                    type={showPwd ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    {...(editingId ? {} : { required: true })}
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="btn ghost show-btn"
                    onClick={() => setShowPwd((v) => !v)}
                  >
                    {showPwd ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {(createMut.isError || updateMut.isError) && (
                <div className="error grid-span-2">
                  {createMut.error?.response?.data?.detail ||
                    updateMut.error?.response?.data?.detail ||
                    "Something went wrong"}
                </div>
              )}

              <div className="flex-right grid-span-2">
                <button type="button" className="btn ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className="btn primary"
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                >
                  {editingId ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {confirmOpen && (
        <ConfirmModal
          message={confirmMsg}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); confirmAction(); }}
        />
      )}
    </div>
  );
}

/* -------------------- Recipients Admin -------------------- */

function RecipientsAdminCard() {
  const [items, setItems] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState(() => () => {});
  const [addOpen, setAddOpen] = useState(false);

  async function refresh() { setItems(await listRecipients()); }
  useEffect(() => { refresh(); }, []);

  function ask(message, action) {
    setConfirmMsg(message);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  }

  async function submitAdd(e) {
    e.preventDefault();
    setError("");
    ask(`Add recipient “${email}”?`, async () => {
      try {
        await createRecipient(email);
        setEmail("");
        setAddOpen(false);
        await refresh();
      } catch (err) {
        setError(err?.response?.data?.detail || "Failed to add");
      }
    });
  }

  return (
    <div className="card">
      <div className="name-row">
        <h2 style={{ margin: 0 }}>Email Recipients (Alerts)</h2>
        <button className="btn primary" onClick={() => setAddOpen(true)}>
          + Add Email
        </button>
      </div>

      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}

      <table className="cat-table" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Email</th>
            <th>Status</th>
            <th className="num" style={{ width: 140 }} />
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td>{r.email}</td>
              <td>
                <label className="toggle-inline">
                  <input
                    type="checkbox"
                    checked={r.active}
                    onChange={() => ask(
                      `${r.active ? "Mute" : "Activate"} alerts for “${r.email}”?`,
                      async () => { await setRecipientActive(r.id, !r.active); await refresh(); }
                    )}
                  />
                  {r.active ? "Active" : "Muted"}
                </label>
              </td>
              <td className="num">
                <button
                  className="btn tiny danger"
                  onClick={() => ask(
                    `Delete recipient “${r.email}”? This cannot be undone.`,
                    async () => { await deleteRecipient(r.id); await refresh(); }
                  )}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={3} className="dim">No recipients yet.</td></tr>
          )}
        </tbody>
      </table>

      {addOpen && (
        <Modal onClose={() => setAddOpen(false)} dismissible={false}>
          <div className="modal mini">
            <h3>Add Recipient</h3>
            <form className="grid1" onSubmit={submitAdd}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  placeholder="someone@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <div className="flex-right">
                <button type="button" className="btn ghost" onClick={() => setAddOpen(false)}>
                  Cancel
                </button>
                <button className="btn primary" type="submit">Add</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {confirmOpen && (
        <ConfirmModal
          message={confirmMsg}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => { setConfirmOpen(false); await confirmAction(); }}
        />
      )}

      <p className="dim" style={{ marginTop: 8 }}>
        Notes: active recipients are merged with your <code>EMAIL_TO_DEFAULT</code> list.
      </p>
    </div>
  );
}

/* -------------------- Reusable Modals -------------------- */

function Modal({ children, onClose, dismissible = true }) {
  useEffect(() => {
    // lock body scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={dismissible ? onClose : undefined}
    >
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ message, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="modal mini" onMouseDown={(e) => e.stopPropagation()}>
        <h3>Confirm</h3>
        <p style={{ marginTop: 6 }}>{message}</p>
        <div className="flex-right">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onConfirm}>Yes</button>
        </div>
      </div>
    </div>
  );
}
