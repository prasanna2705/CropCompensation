import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { api } from "../api/client";

/**
 * Lets a demo "oracle" account submit a signed rainfall reading directly on-chain.
 * This is the centerpiece of the live demo: submitting 2 readings below threshold
 * from two different authorized oracle wallets should visibly trigger an automatic
 * payout with no admin approval step anywhere in the flow.
 */
export default function OracleSimulatorPanel({ regionId = 1 }) {
  const { getSignerContracts, address } = useWallet();
  const [rainfall, setRainfall] = useState(30);
  const [windowStart, setWindowStart] = useState(Math.floor(Date.now() / 1000));
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setStatus(null);
      const { oracleAggregator } = await getSignerContracts();

      const tx = await oracleAggregator.submitReading(regionId, rainfall, windowStart);
      setStatus(`Transaction sent: ${tx.hash} — waiting for confirmation...`);
      const receipt = await tx.wait();

      await api.recordReading({
        regionId,
        rainfallMm: rainfall,
        windowStart,
        submittedBy: address,
        txHash: receipt.hash,
      });

      setStatus(`✅ Confirmed in block ${receipt.blockNumber}. If this was the Nth confirmation, payout should already be executing.`);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="oracle-simulator-panel">
      <h3>Oracle Reading Simulator</h3>
      <p>
        Submit a rainfall reading as this connected wallet, acting as an authorized oracle node.
        Once enough independent oracle wallets confirm a below-threshold reading for a region,
        the payout fires automatically — try it with two different wallets to see it live.
      </p>
      <label>
        Region ID
        <input type="number" value={regionId} disabled />
      </label>
      <label>
        Rainfall (mm)
        <input type="number" value={rainfall} onChange={(e) => setRainfall(Number(e.target.value))} />
      </label>
      <label>
        Window Start (unix timestamp)
        <input type="number" value={windowStart} onChange={(e) => setWindowStart(Number(e.target.value))} />
      </label>
      <button onClick={handleSubmit} disabled={submitting || !address}>
        {submitting ? "Submitting..." : "Submit Reading On-Chain"}
      </button>
      {!address && <p className="hint">Connect a wallet authorized as an oracle to submit readings.</p>}
      {status && <p className="status-line">{status}</p>}
    </div>
  );
}
