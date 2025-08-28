import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // reads from .env
  headers: { "Content-Type": "application/json" },
});
