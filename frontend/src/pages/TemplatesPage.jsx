import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseEther } from "ethers";
import { api } from "../api/client";
import { useWallet } from "../context/WalletContext";
import TemplateTable from "../components/TemplateTable";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasingId, setPurchasingId] = useState(null);
  const { getSignerContracts, address, connect } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  function loadTemplates() {
    setLoading(true);
    api.listTemplates()
      .then(setTemplates)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handlePurchase(template) {
    setError(null);
    if (!address) {
      await connect();
      return;
    }
    try {
      setPurchasingId(template.id);
      const { policyManager } = await getSignerContracts();

      const tx = await policyManager.purchasePolicy(template.on_chain_template_id, {
        value: BigInt(template.premium_wei),
      });
      const receipt = await tx.wait();

      // Parse the PolicyPurchased event to get the on-chain policy id
      const iface = policyManager.interface;
      let onChainPolicyId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed.name === "PolicyPurchased") {
            onChainPolicyId = parsed.args.policyId.toString();
          }
        } catch (_) { /* not our event, ignore */ }
      }

      const saved = await api.recordPolicyPurchase({
        onChainPolicyId,
        templateId: template.id,
        txHash: receipt.hash,
      });

      navigate(`/policies/${saved.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPurchasingId(null);
    }
  }

  return (
    <div className="page">
      <h2>Available Insurance Policies</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      <TemplateTable templates={templates} onPurchase={handlePurchase} purchasingId={purchasingId} />
    </div>
  );
}
