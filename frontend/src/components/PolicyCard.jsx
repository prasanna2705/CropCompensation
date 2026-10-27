import { Link } from "react-router-dom";
import { formatEther } from "ethers";

export default function PolicyCard({ policy }) {
  const statusColor = { active: "#2563eb", paid: "#16a34a", expired: "#6b7280" }[policy.status] || "#6b7280";

  return (
    <div className="policy-card">
      <div className="policy-card-header">
        <h3>Policy #{policy.on_chain_policy_id ?? policy.id}</h3>
        <span className="status-badge" style={{ backgroundColor: statusColor }}>
          {policy.status?.toUpperCase()}
        </span>
      </div>
      <p>Threshold: below {policy.threshold_mm} mm rainfall</p>
      <p>Payout: {policy.payout_wei ? formatEther(policy.payout_wei) : "-"} ETH</p>
      <p>Purchased: {new Date(policy.purchased_at).toLocaleDateString()}</p>
      <Link to={`/policies/${policy.id}`}>View details →</Link>
    </div>
  );
}
