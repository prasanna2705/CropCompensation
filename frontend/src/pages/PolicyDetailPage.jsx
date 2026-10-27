import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import TxTimeline from "../components/TxTimeline";

export default function PolicyDetailPage() {
  const { id } = useParams();
  const [policy, setPolicy] = useState(null);
  const [payout, setPayout] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // poll for live updates during a demo
    return () => clearInterval(interval);
  }, [id]);

  async function load() {
    try {
      const data = await api.getPolicyDetail(id);
      setPolicy(data);
      if (data.status === "paid") {
        try {
          const p = await api.getPayout(id);
          setPayout(p);
        } catch (_) { /* not indexed yet */ }
      }
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="error-text">{error}</p>;
  if (!policy) return <p>Loading...</p>;

  const steps = [
    { label: "Policy Purchased", done: true, txHash: policy.tx_hash, timestamp: policy.purchased_at },
    { label: "Awaiting Oracle Trigger", done: policy.status !== "active" },
    { label: "Payout Executed", done: policy.status === "paid", txHash: payout?.tx_hash, timestamp: payout?.executed_at },
  ];

  return (
    <div className="page">
      <h2>Policy #{policy.on_chain_policy_id ?? policy.id}</h2>
      <p><strong>Status:</strong> {policy.status.toUpperCase()}</p>
      <p><strong>Threshold:</strong> below {policy.threshold_mm} mm rainfall</p>
      {policy.onChain && (
        <p className="onchain-badge">✅ Verified directly against the smart contract — on-chain status: {policy.onChain.status}</p>
      )}
      <h3>Timeline</h3>
      <TxTimeline steps={steps} />
    </div>
  );
}
