// src/components/Protected.jsx
import { Navigate, useLocation } from "react-router-dom";
import { isAuthed } from "../lib/auth.js";

export default function Protected({ children }) {
  const loc = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  return children;
}
