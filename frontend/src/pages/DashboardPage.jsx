import { useEffect, useState } from "react";
import { api } from "../api/client";
import PolicyCard from "../components/PolicyCard";

export default function DashboardPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.myPolicies()
      .then(setPolicies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h2>My Policies</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && policies.length === 0 && (
        <p>You don't have any policies yet. Head to "Browse Policies" to purchase one.</p>
      )}
      <div className="policy-grid">
        {policies.map((p) => <PolicyCard key={p.id} policy={p} />)}
      </div>
    </div>
  );
}
