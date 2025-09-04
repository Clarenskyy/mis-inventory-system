// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/Dashboard.jsx";
import ItemsPage from "./pages/ItemsPage.jsx";
import ProductCategoryPage from "./pages/ProductCategoryPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Layout from "./components/Layout.jsx";
import Protected from "./components/Protected.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import ProtectedAdmin from "./components/ProtectedAdmin.jsx";
import { getToken } from "./lib/auth.js";

// restore token on reload
const token = getToken();

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected branch (everything inside uses the Layout shell) */}
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="categories" element={<ProductCategoryPage />} />

        {/* Admin-only page */}
        <Route
          path="admin-users"
          element={
            <ProtectedAdmin>
              <AdminUsersPage />
            </ProtectedAdmin>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
