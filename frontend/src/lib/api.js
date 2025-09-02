// src/lib/api.js
import axios from "axios";
import { getToken, clearAuth } from "./auth.js";

// Adjust to your backend origin if different
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8000",
});

// attach token
export function setAccessToken(token) {
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : undefined;
}

// keep header in sync on refresh
const existing = getToken();
if (existing) setAccessToken(existing);

// 401 -> force login
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
  return data; // { access_token, token_type }
}
export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data; // { id, username, name, email, role, is_admin, created_at }
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
export async function createItem(data) {
  const r = await api.post("/items", data);
  return r.data;
}
export async function updateItem(id, data) {
  const r = await api.put(`/items/${id}`, data);
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
export async function createCategory(data) {
  const r = await api.post("/categories", data);
  return r.data;
}
export async function updateCategory(id, data) {
  const r = await api.patch(`/categories/${id}`, data);
  return r.data;
}


export default api;
