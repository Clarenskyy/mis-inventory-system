// src/lib/auth.js
const TOKEN_KEY = "mis_token";
const USER_KEY  = "mis_user";

export function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}
export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
  catch { return null; }
}
export function isAuthed() { return !!getToken(); }
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
