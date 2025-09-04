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

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected branch */}
      <Route path="/" element={<Protected />}>
        {/* Layout shell (sidebar/topbar) */}
        <Route element={<Layout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="categories" element={<ProductCategoryPage />} />
          <Route
            path="admin-users"
            element={
              <ProtectedAdmin>
                <AdminUsersPage />
              </ProtectedAdmin>
            }
          />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
