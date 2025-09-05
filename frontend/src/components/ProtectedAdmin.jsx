// src/components/ProtectedAdmin.jsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUser, getToken, setAuth } from "../lib/auth.js";
import { getMe } from "../lib/api.js";

export default function ProtectedAdmin({ children }) {
  const loc = useLocation();
  const token = getToken();
  const [user, setUser] = useState(() => getUser());
  const [loading, setLoading] = useState(!user && !!token);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!user && token) {
        try {
          const me = await getMe();
          if (!mounted) return;
          // persist user alongside existing token
          setAuth(token, me);
          setUser(me);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    })();

    return () => { mounted = false; };
  }, [user, token]);

  if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (loading) return null; // or a spinner component
  if (!user?.is_admin) return <Navigate to="/dashboard" replace state={{ from: loc }} />;

  return children;
}
