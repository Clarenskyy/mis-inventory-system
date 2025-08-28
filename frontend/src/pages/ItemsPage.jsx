import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

async function fetchItems() {
  const res = await api.get("/items"); // adjust if your API wraps data (e.g., res.data.items)
  return res.data;
}

export default function ItemsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["items"],
    queryFn: fetchItems,
  });

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ fontWeight: 600 }}>Items</h1>
        <button onClick={() => refetch()}>Refresh</button>
      </div>

      {isLoading && <div>Loading…</div>}
      {isError && <div style={{ color: "red" }}>Failed to load items.</div>}

      {Array.isArray(data) && data.length > 0 ? (
        <table>
          <thead>
            <tr><th>ID</th><th>Code</th><th>Name</th><th>Qty</th><th>Buffer</th></tr>
          </thead>
          <tbody>
            {data.map((it) => (
              <tr key={it.id}>
                <td>{it.id}</td>
                <td>{it.code}</td>
                <td>{it.name}</td>
                <td>{it.quantity}</td>
                <td>{it.buffer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (!isLoading && <div>No items yet.</div>)}
    </section>
  );
}
