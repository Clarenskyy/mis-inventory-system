import { api } from "../lib/api.js"; // or ../lib/api.js

async function fetchItems() {
  const res = await api.get("/items");
  return res.data;
}
