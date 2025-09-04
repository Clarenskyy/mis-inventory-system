// src/pages/AdminUsersPage.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// at the top of AdminUsersPage.jsx
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
} from "../lib/api.js";   // ← not "/src/lib/api.js"
import "./users.css"; // optional (create or ignore)

const emptyForm = {
  username: "",
  password: "",
  name: "",
  email: "",
  role: "staff",
  is_admin: false,
};

export default function AdminUsersPage() {
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
      username: u.username, // read-only in UI; backend doesn't require it for PATCH
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
    <section className="page-wrap">
      <h1 className="page-title">Admin · Users</h1>

      {/* Form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={onSubmit} className="form-grid">
          {!editingId && (
            <>
              <label>
                Username
                <input
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  required
                />
              </label>
            </>
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
      </div>

      {/* Table */}
      <div className="card">
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
    </section>
  );
}
