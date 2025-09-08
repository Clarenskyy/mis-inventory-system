// src/pages/AdminUsersPage.jsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  // Users admin APIs
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  // Recipients admin APIs
  listRecipients,
  createRecipient,
  setRecipientActive,
  deleteRecipient,
} from "../lib/api.js";
import "./users.css"; // optional

const emptyForm = {
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
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showPwd, setShowPwd] = useState(false);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminListUsers,
  });

  const createMut = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setForm(emptyForm);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => adminUpdateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      cancelEdit();
    },
  });

  const deleteMut = useMutation({
    mutationFn: adminDeleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  function startEdit(u) {
    setEditingId(u.id);
    setForm({
      username: u.username, // read-only in UI for edit
      password: "",
      name: u.name || "",
      email: u.email || "",
      role: u.role || "staff",
      is_admin: !!u.is_admin,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setShowPwd(false);
  }

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    if (editingId) {
      const payload = {
        name: form.name,
        email: form.email || null,
        role: form.role,
        is_admin: form.is_admin,
      };
      if (form.password) payload.password = form.password;
      updateMut.mutate({ id: editingId, payload });
    } else {
      createMut.mutate({
        username: form.username,
        password: form.password,
        name: form.name,
        email: form.email || null,
        role: form.role,
        is_admin: form.is_admin,
      });
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>Users</h2>

      {/* Form */}
      <form onSubmit={onSubmit} className="form-grid">
        {!editingId && (
          <label>
            Username
            <input
              name="username"
              value={form.username}
              onChange={onChange}
              required
            />
          </label>
        )}

        <label>
          Name
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            required
          />
        </label>

        <label>
          Email (optional)
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="user@example.com"
          />
        </label>

        <label>
          Role
          <select name="role" value={form.role} onChange={onChange}>
            <option value="staff">staff</option>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
        </label>

        <label className="row">
          <input
            type="checkbox"
            name="is_admin"
            checked={form.is_admin}
            onChange={onChange}
          />
          <span>Is Admin</span>
        </label>

        <label>
          {editingId ? "New Password (optional)" : "Password"}
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
              className="btn ghost"
              onClick={() => setShowPwd((v) => !v)}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <div className="row right">
          {editingId && (
            <button type="button" className="btn ghost" onClick={cancelEdit}>
              Cancel
            </button>
          )}
          <button
            className="btn"
            type="submit"
            disabled={createMut.isPending || updateMut.isPending}
          >
            {editingId ? "Save Changes" : "Create User"}
          </button>
        </div>

        {(createMut.isError || updateMut.isError) && (
          <div className="error">
            {createMut.error?.response?.data?.detail ||
              updateMut.error?.response?.data?.detail ||
              "Something went wrong"}
          </div>
        )}
        {(createMut.isSuccess || updateMut.isSuccess) && (
          <div className="ok">Saved.</div>
        )}
      </form>

      {/* Table */}
      <div style={{ marginTop: 16 }}>
        {isLoading ? (
          <div>Loading users…</div>
        ) : isError ? (
          <div className="error">Failed to load users.</div>
        ) : users.length === 0 ? (
          <div>No users yet.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.name}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.role}</td>
                  <td>{u.is_admin ? "Yes" : "No"}</td>
                  <td className="row">
                    <button className="btn small" onClick={() => startEdit(u)}>
                      Edit
                    </button>
                    <button
                      className="btn danger small"
                      onClick={() => {
                        if (window.confirm("Delete this user?")) {
                          deleteMut.mutate(u.id);
                        }
                      }}
                    >
                      Delete
                    </button>
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

/* -------------------- Recipients Admin -------------------- */

function RecipientsAdminCard() {
  const [items, setItems] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const data = await listRecipients();
    setItems(data);
  }

  useEffect(() => { refresh(); }, []);

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await createRecipient(email);
      setEmail("");
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to add");
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Email Recipients (Alerts)</h2>

      <form onSubmit={add} style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
        <input
          type="email"
          placeholder="someone@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>
      {error && <div className="error">{error}</div>}

      <table className="tbl">
        <thead>
          <tr>
            <th style={{textAlign:"left"}}>Email</th>
            <th>Status</th>
            <th style={{width: 120}} />
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td>{r.email}</td>
              <td>
                <label style={{display:"inline-flex",alignItems:"center",gap:6}}>
                  <input
                    type="checkbox"
                    checked={r.active}
                    onChange={async (e) => {
                      await setRecipientActive(r.id, e.target.checked);
                      await refresh();
                    }}
                  />
                  {r.active ? "Active" : "Muted"}
                </label>
              </td>
              <td style={{ textAlign: "right" }}>
                <button
                  className="btn danger small"
                  onClick={async () => {
                    if (window.confirm("Delete this recipient?")) {
                      await deleteRecipient(r.id);
                      await refresh();
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={3} style={{ color: "#6b7280" }}>No recipients yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <p style={{color:"#6b7280", marginTop:8}}>
        Notes: active recipients are merged with your <code>EMAIL_TO_DEFAULT</code> list.
      </p>
    </div>
  );
}
