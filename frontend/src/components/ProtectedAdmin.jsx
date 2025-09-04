// src/components/ProtectedAdmin.jsx
import { Navigate, useLocation } from "react-router-dom";
import { getUser } from "../lib/auth";

function ProtectedAdmin({ children }) {
  const user = getUser();
  const loc = useLocation();

  if (!user || !user.is_admin) {
    // not an admin → shove them away politely
    return <Navigate to="/dashboard" replace state={{ from: loc }} />;
  }
  return children;
}

export default ProtectedAdmin;
