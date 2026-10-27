import { formatEther } from "ethers";

export default function TemplateTable({ templates, onPurchase, purchasingId, showActions = true }) {
  if (!templates.length) {
    return <p>No active policy templates available right now.</p>;
  }

  return (
    <table className="template-table">
      <thead>
        <tr>
          <th>Region</th>
          <th>Threshold (mm)</th>
          <th>Premium</th>
          <th>Payout</th>
          <th>Season</th>
          {showActions && <th></th>}
        </tr>
      </thead>
      <tbody>
        {templates.map((t) => (
          <tr key={t.id}>
            <td>{t.region_name}</td>
            <td>&lt; {t.threshold_mm} mm</td>
            <td>{formatEther(t.premium_wei)} ETH</td>
            <td>{formatEther(t.payout_wei)} ETH</td>
            <td>
              {new Date(t.season_start).toLocaleDateString()} – {new Date(t.season_end).toLocaleDateString()}
            </td>
            {showActions && (
              <td>
                <button disabled={purchasingId === t.id} onClick={() => onPurchase(t)}>
                  {purchasingId === t.id ? "Purchasing..." : "Purchase"}
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
