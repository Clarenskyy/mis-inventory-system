// src/lib/api.jsx
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

/* Reads */
export const getItems = () =>
  api.get("/items").then(r => (Array.isArray(r.data) ? r.data : r.data?.items ?? []));
export const getCategories = () =>
  api.get("/categories").then(r => (Array.isArray(r.data) ? r.data : []));

/* Create / Update / Delete */
export const createItem = (data) =>
  api.post("/items", data).then(r => r.data);

export const updateItem = (id, data) =>
  api.patch(`/items/${id}`, data).then(r => r.data);

export const deleteItem = (id) =>
  api.delete(`/items/${id}`).then(r => r.data);

/* ✅ Quantity adjust via QUERY PARAMS (emails + low-stock handled server-side) */
export const adjustItem = (id, change, note = "") =>
  api.patch(`/items/${id}/adjust`, null, {
    params: { change: Number(change), note },
  }).then(r => r.data).catch(err => {
    // Some servers reply 204 No Content on success; treat as OK
    if (err?.response?.status === 204) return;
    throw err;
  });
