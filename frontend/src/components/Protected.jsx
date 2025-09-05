// src/components/Protected.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken } from "../lib/auth.js";

export default function Protected() {
  const token = getToken();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <Outlet />;
}
