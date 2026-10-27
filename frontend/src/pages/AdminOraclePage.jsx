import { useState } from "react";
import { useWallet } from "../context/WalletContext";

export default function AdminOraclePage() {
  const { getSignerContracts, address, connect } = useWallet();
  const [oracleAddress, setOracleAddress] = useState("");
  const [status, setStatus] = useState(null);

  async function handleAdd() {
    await handleAction("addOracle");
  }

  async function handleRemove() {
    await handleAction("removeOracle");
  }

  async function handleAction(method) {
    setStatus(null);
    if (!address) { await connect(); return; }
    try {
      const { oracleAggregator } = await getSignerContracts();
      const tx = await oracleAggregator[method](oracleAddress);
      setStatus(`Transaction sent: ${tx.hash} — waiting for confirmation...`);
      await tx.wait();
      setStatus(`✅ ${method === "addOracle" ? "Added" : "Removed"} oracle ${oracleAddress}`);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  return (
    <div className="page">
      <h2>Admin — Manage Authorized Oracle Nodes</h2>
      <p>
        Only wallet addresses added here may submit weather readings to the OracleAggregator
        contract. In production these would belong to independent, trust-minimized data providers.
      </p>
      <label>
        Oracle wallet address
        <input
          value={oracleAddress}
          onChange={(e) => setOracleAddress(e.target.value)}
          placeholder="0x..."
        />
      </label>
      <div className="button-row">
        <button onClick={handleAdd}>Add Oracle</button>
        <button onClick={handleRemove}>Remove Oracle</button>
      </div>
      {status && <p className="status-line">{status}</p>}
    </div>
  );
}
