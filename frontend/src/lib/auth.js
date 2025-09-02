// src/lib/auth.js
const TOKEN_KEY = "token";
const USER_KEY = "user";

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}
export function isAuthed() {
  return !!getToken();
}

export function saveUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  } catch {
    localStorage.setItem(USER_KEY, "{}");
  }
}
export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
