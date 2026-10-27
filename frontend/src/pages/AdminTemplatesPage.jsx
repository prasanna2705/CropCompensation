import { useEffect, useState } from "react";
import { parseEther } from "ethers";
import { api } from "../api/client";
import { useWallet } from "../context/WalletContext";
import TemplateTable from "../components/TemplateTable";

export default function AdminTemplatesPage() {
  const { getSignerContracts, address, connect } = useWallet();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    thresholdMm: 50, premiumEth: "0.01", payoutEth: "0.1",
    seasonDays: 90, regionId: 1,
  });
  const [status, setStatus] = useState(null);
  const [fundAmount, setFundAmount] = useState("1");

  useEffect(() => { loadTemplates(); }, []);

  function loadTemplates() {
    api.listTemplates().then(setTemplates).catch((err) => setStatus(err.message));
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreateTemplate(e) {
    e.preventDefault();
    setStatus(null);
    if (!address) { await connect(); return; }
    try {
      const { policyManager } = await getSignerContracts();
      const now = Math.floor(Date.now() / 1000);
      const seasonEnd = now + Number(form.seasonDays) * 86400;

      const tx = await policyManager.createTemplate(
        form.thresholdMm,
        parseEther(form.premiumEth),
        parseEther(form.payoutEth),
        now,
        seasonEnd,
        form.regionId
      );
      setStatus(`Transaction sent: ${tx.hash} — waiting for confirmation...`);
      const receipt = await tx.wait();

      const iface = policyManager.interface;
      let onChainTemplateId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed.name === "TemplateCreated") onChainTemplateId = parsed.args.templateId.toString();
        } catch (_) {}
      }

      await api.recordTemplate({
        onChainTemplateId,
        thresholdMm: form.thresholdMm,
        premiumWei: parseEther(form.premiumEth).toString(),
        payoutWei: parseEther(form.payoutEth).toString(),
        seasonStart: new Date(now * 1000).toISOString(),
        seasonEnd: new Date(seasonEnd * 1000).toISOString(),
        regionId: form.regionId,
        txHash: receipt.hash,
      });

      setStatus(`✅ Template #${onChainTemplateId} created on-chain and indexed.`);
      loadTemplates();
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  async function handleFundReserve() {
    setStatus(null);
    if (!address) { await connect(); return; }
    try {
      const { policyManager } = await getSignerContracts();
      const tx = await policyManager.fundReserve({ value: parseEther(fundAmount) });
      setStatus(`Funding reserve — tx: ${tx.hash}`);
      await tx.wait();
      setStatus(`✅ Reserve funded with ${fundAmount} ETH.`);
    } catch (err) {
      setStatus(`❌ ${err.message}`);
    }
  }

  return (
    <div className="page">
      <h2>Admin — Manage Policy Templates</h2>

      <section>
        <h3>Fund Reserve Pool</h3>
        <input value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} />
        <button onClick={handleFundReserve}>Fund Reserve (ETH)</button>
      </section>

      <section>
        <h3>Create New Template</h3>
        <form onSubmit={handleCreateTemplate}>
          <label>Threshold (mm)
            <input type="number" value={form.thresholdMm} onChange={(e) => update("thresholdMm", Number(e.target.value))} />
          </label>
          <label>Premium (ETH)
            <input value={form.premiumEth} onChange={(e) => update("premiumEth", e.target.value)} />
          </label>
          <label>Payout (ETH)
            <input value={form.payoutEth} onChange={(e) => update("payoutEth", e.target.value)} />
          </label>
          <label>Season length (days)
            <input type="number" value={form.seasonDays} onChange={(e) => update("seasonDays", Number(e.target.value))} />
          </label>
          <label>Region ID
            <input type="number" value={form.regionId} onChange={(e) => update("regionId", Number(e.target.value))} />
          </label>
          <button type="submit">Create Template On-Chain</button>
        </form>
        {status && <p className="status-line">{status}</p>}
      </section>

      <section>
        <h3>Existing Templates</h3>
        <TemplateTable templates={templates} showActions={false} />
      </section>
    </div>
  );
}
