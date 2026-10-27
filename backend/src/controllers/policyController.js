const { pool } = require("../config/db");
const { getReadOnlyPolicyManager } = require("../config/blockchain");

// GET /api/policies/mine — farmer's own policies, joined with template info
async function myPolicies(req, res) {
  try {
    const result = await pool.query(
      `SELECT p.*, pt.threshold_mm, pt.payout_wei, pt.region_id
       FROM policies p
       JOIN policy_templates pt ON pt.id = p.template_id
       WHERE p.farmer_user_id = $1
       ORDER BY p.purchased_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load policies" });
  }
}

// POST /api/policies — record a policy purchase after the frontend's on-chain tx confirms
async function recordPolicyPurchase(req, res) {
  try {
    const { onChainPolicyId, templateId, txHash } = req.body;
    if (!onChainPolicyId || !templateId)
      return res.status(400).json({ error: "onChainPolicyId and templateId are required" });

    const result = await pool.query(
      `INSERT INTO policies (on_chain_policy_id, farmer_user_id, template_id, tx_hash, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [onChainPolicyId, req.user.id, templateId, txHash]
    );

    await pool.query(
      `INSERT INTO blockchain_tx_log (tx_hash, event_type, related_entity_id, raw_event_json)
       VALUES ($1, 'PolicyPurchased', $2, $3)`,
      [txHash, result.rows[0].id, JSON.stringify(req.body)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record policy purchase" });
  }
}

// GET /api/policies/:id — detail view, cross-checked live against the chain
async function getPolicyDetail(req, res) {
  try {
    const dbResult = await pool.query(
      `SELECT p.*, pt.threshold_mm, pt.payout_wei
       FROM policies p JOIN policy_templates pt ON pt.id = p.template_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    const policy = dbResult.rows[0];
    if (!policy) return res.status(404).json({ error: "Policy not found" });

    let onChain = null;
    if (policy.on_chain_policy_id) {
      const policyManager = getReadOnlyPolicyManager();
      const p = await policyManager.getPolicy(policy.on_chain_policy_id);
      onChain = {
        farmer: p.farmer,
        status: ["Active", "Paid", "Expired"][p.status],
      };
    }

    res.json({ ...policy, onChain });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load policy detail" });
  }
}

module.exports = { myPolicies, recordPolicyPurchase, getPolicyDetail };
