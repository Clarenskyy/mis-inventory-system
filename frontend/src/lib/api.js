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

// --- Auth endpoints ---
export async function login(username, password) {
  const { data } = await api.post("/auth/login", { username, password });
  // data = { access_token, token_type }
  return data;
}

export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

// --- Items / Categories ---
export async function getItems({ q = "", limit = 50, offset = 0 } = {}) {
  const { data } = await api.get("/items", { params: { q, limit, offset } });
  return data;
}
export async function getCategories({ q = "", limit = 50, offset = 0 } = {}) {
  const { data } = await api.get("/categories", { params: { q, limit, offset } });
  return data;
}

// ---------- Items ----------
export async function createItem(payload) {
  const r = await api.post("/items", payload);
  return r.data;
}
export async function updateItem(id, payload) {
  const r = await api.patch(`/items/${id}`, payload);
  return r.data;
}
export async function deleteItem(id) {
  await api.delete(`/items/${id}`);
}
export async function adjustItem(id, change, note = "") {
  const r = await api.patch(`/items/${id}/adjust`, null, { params: { change, note } });
  return r.data;
}

// ---------- Categories ----------
export async function createCategory(payload) {
  const r = await api.post("/categories", payload);
  return r.data;
}
export async function updateCategory(id, payload) {
  const r = await api.patch(`/categories/${id}`, payload);
  return r.data;
}

// --- Admin Users API ---
export async function adminListUsers() {
  const res = await api.get("/admin/users");
  return res.data;
}
export async function adminCreateUser(payload) {
  const res = await api.post("/admin/users", payload);
  return res.data;
}
export async function adminUpdateUser(id, payload) {
  const res = await api.patch(`/admin/users/${id}`, payload);
  return res.data;
}
export async function adminDeleteUser(id) {
  await api.delete(`/admin/users/${id}`);
  return true;
}

// src/lib/api.js
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


export default api;
