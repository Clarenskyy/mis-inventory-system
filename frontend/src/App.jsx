import { Outlet, Link, useLocation } from "react-router-dom";

export default function App() {
  const { pathname } = useLocation();
  const LinkBtn = ({ to, label }) => (
    <Link
      to={to}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        background: pathname === to ? "#eee" : "transparent",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <header style={{ position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 960, margin: "0 auto", padding: 12 }}>
          <div style={{ fontWeight: 600 }}>Nidec MIS Inventory</div>
          <nav style={{ display: "flex", gap: 8 }}>
            <LinkBtn to="/items" label="Items" />
            <LinkBtn to="/login" label="Login" />
          </nav>
        </div>
      </header>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}