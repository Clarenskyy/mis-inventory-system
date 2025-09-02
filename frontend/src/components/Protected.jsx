// src/components/Protected.jsx
import { Navigate, useLocation } from "react-router-dom";
import { isAuthed } from "../lib/auth.js";

export default function Protected({ children }) {
  const authed = isAuthed();
  const loc = useLocation();
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  return children;
}
