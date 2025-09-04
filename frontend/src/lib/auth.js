// src/lib/auth.js
const TOKEN_KEY = "mis_token";
const USER_KEY = "mis_user";

// Save auth after login
export function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
}

// Read token/user
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}
export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

// Is authenticated?
export function isAuthed() {
  return !!getToken();
}

// Clear everything on logout / 401
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// src/lib/auth.js
export function saveToken(t){ localStorage.setItem("token", t); }
export function saveUser(u){ localStorage.setItem("user", JSON.stringify(u)); }