import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AuditorPage() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  function load() {
    api.listTransactions().then(setTransactions).catch((err) => setError(err.message));
  }

  return (
    <div className="page">
      <h2>Public Transparency Feed</h2>
      <p>Every on-chain event, indexed as it happens. This is the same data anyone could independently verify on a block explorer.</p>
      {error && <p className="error-text">{error}</p>}
      <table className="audit-table">
        <thead>
          <tr><th>Event</th><th>Entity</th><th>Tx Hash</th><th>Time</th></tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.event_type}</td>
              <td>#{tx.related_entity_id}</td>
              <td><code>{tx.tx_hash?.slice(0, 10)}...</code></td>
              <td>{new Date(tx.indexed_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
