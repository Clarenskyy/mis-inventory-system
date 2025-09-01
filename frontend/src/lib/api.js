// src/lib/api.js
import axios from "axios";

const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ---------- Items ----------
export async function getItems() {
  const r = await api.get("/items");
  // backend returns either array or {items:[]}
  return Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
}
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
export async function getCategories() {
  const r = await api.get("/categories");
  return Array.isArray(r.data) ? r.data : [];
}
export async function createCategory(data) {
  const r = await api.post("/categories", data);
  return r.data;
}
export async function updateCategory(id, data) {
  const r = await api.patch(`/categories/${id}`, data);
  return r.data;
}
