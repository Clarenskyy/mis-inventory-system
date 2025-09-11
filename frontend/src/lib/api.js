// src/lib/api.js
import axios from "axios";
import { getToken, clearAuth } from "./auth.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8000",
});

// ---- attach token on startup
const existing = getToken();
if (existing) {
  api.defaults.headers.common.Authorization = `Bearer ${existing}`;
}

// expose a helper so login can update axios header immediately
export function setAccessToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// 401 -> force re-login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/* ---------------- Auth ---------------- */
export async function login(username, password) {
  const { data } = await api.post("/auth/login", { username, password });
  return data; // { access_token, token_type }
}
export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

/* ------------- Items / Categories ------------- */
export async function getItems(params = {}) {
  const cleaned = {};
  if (params.q && params.q.trim()) cleaned.q = params.q.trim();

  if (params.limit != null) {
    const n = Number(params.limit);
    if (!Number.isNaN(n)) cleaned.limit = Math.min(Math.max(1, n), 200); // cap to API
  }
  if (params.offset != null) {
    const o = Number(params.offset);
    if (!Number.isNaN(o)) cleaned.offset = Math.max(0, o);
  }

  const res = await api.get("/items", { params: cleaned }); // "/items" is fine; FastAPI may 307 to "/items/"
  return res.data;
}

export async function getCategories({ q = "", limit = 50, offset = 0 } = {}) {
  const { data } = await api.get("/categories", { params: { q, limit, offset } });
  return data;
}

/* ---------------- Items ---------------- */
export async function createItem(payload) {
  const { data } = await api.post("/items", payload);
  return data;
}
export async function updateItem(id, payload) {
  const { data } = await api.patch(`/items/${id}`, payload);
  return data;
}
export async function deleteItem(id) {
  await api.delete(`/items/${id}`);
}
export async function adjustItem(id, change, note = "") {
  const { data } = await api.patch(`/items/${id}/adjust`, null, {
    params: { change, note },
  });
  return data;
}

/* -------------- Categories -------------- */
export async function createCategory(payload) {
  const { data } = await api.post("/categories", payload);
  return data;
}
export async function updateCategory(id, payload) {
  const { data } = await api.patch(`/categories/${id}`, payload);
  return data;
}
export async function deleteCategory(id) {
  await api.delete(`/categories/${id}`);
}

/* --------------- Admin: Users --------------- */
export async function adminListUsers() {
  const { data } = await api.get("/admin/users");
  return data;
}
export async function adminCreateUser(payload) {
  const { data } = await api.post("/admin/users", payload);
  return data;
}
export async function adminUpdateUser(id, payload) {
  const { data } = await api.patch(`/admin/users/${id}`, payload);
  return data;
}
export async function adminDeleteUser(id) {
  await api.delete(`/admin/users/${id}`);
  return true;
}

/* -------- Admin: Email Recipients -------- */
export async function listRecipients() {
  const { data } = await api.get("/admin/recipients");
  return data;
}
export async function createRecipient(email) {
  const { data } = await api.post("/admin/recipients", { email });
  return data;
}
export async function setRecipientActive(id, active) {
  const { data } = await api.patch(`/admin/recipients/${id}`, { active });
  return data;
}
export async function deleteRecipient(id) {
  await api.delete(`/admin/recipients/${id}`);
}
export async function deleteItemsBulk(ids, note = "") {
  // ensure ids are numbers
  const payload = { ids: ids.map((x) => Number(x)), note };
  const res = await api.delete("/items/bulk", {
    data: payload,                     // <-- DELETE must put JSON here
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}

export async function getNextItemCode(categoryId) {
  const res = await api.get("/items/next-code", {
    params: { category_id: Number(categoryId) },
  });
  return res.data; // { code: "MISCPU0007" }
}



export default api;
