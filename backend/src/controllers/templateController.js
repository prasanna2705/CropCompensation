const { pool } = require("../config/db");
const { getReadOnlyPolicyManager } = require("../config/blockchain");

// GET /api/templates — list active templates (served from the indexed DB copy for speed)
async function listTemplates(req, res) {
  try {
    const result = await pool.query(
      `SELECT pt.*, r.name AS region_name
       FROM policy_templates pt
       JOIN regions r ON r.id = pt.region_id
       WHERE pt.active = true
       ORDER BY pt.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load templates" });
  }
}

// POST /api/templates — admin creates a template.
// NOTE: The actual on-chain `createTemplate` transaction is expected to be signed
// by the admin's own wallet in the frontend. This endpoint records the resulting
// on-chain template id + tx hash into the DB index once the frontend confirms it,
// keeping the blockchain as the source of truth and the DB as a fast read cache.
async function recordTemplate(req, res) {
  try {
    const {
      onChainTemplateId, thresholdMm, premiumWei, payoutWei,
      seasonStart, seasonEnd, regionId, txHash,
    } = req.body;
    if (!onChainTemplateId || !thresholdMm || !premiumWei || !payoutWei || !seasonStart || !seasonEnd || !regionId)
      return res.status(400).json({ error: "Missing required template fields" });
    if (isNaN(Number(thresholdMm)) || Number(thresholdMm) <= 0)
      return res.status(400).json({ error: "thresholdMm must be a positive number" });
    if (isNaN(Number(regionId)) || Number(regionId) <= 0)
      return res.status(400).json({ error: "regionId must be a positive integer" });

    const result = await pool.query(
      `INSERT INTO policy_templates
        (on_chain_template_id, threshold_mm, premium_wei, payout_wei, season_start, season_end, region_id, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [onChainTemplateId, thresholdMm, premiumWei, payoutWei, seasonStart, seasonEnd, regionId]
    );

    await pool.query(
      `INSERT INTO blockchain_tx_log (tx_hash, event_type, related_entity_id, raw_event_json)
       VALUES ($1, 'TemplateCreated', $2, $3)`,
      [txHash, result.rows[0].id, JSON.stringify(req.body)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record template" });
  }
}

// GET /api/templates/:id/on-chain — verify a template directly against the contract
async function verifyTemplateOnChain(req, res) {
  try {
    const { onChainId } = req.params;
    const policyManager = getReadOnlyPolicyManager();
    const t = await policyManager.templates(onChainId);
    res.json({
      threshold: t.threshold.toString(),
      premium: t.premium.toString(),
      payoutAmount: t.payoutAmount.toString(),
      seasonStart: t.seasonStart.toString(),
      seasonEnd: t.seasonEnd.toString(),
      regionId: t.regionId.toString(),
      active: t.active,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read template from chain" });
  }
}

module.exports = { listTemplates, recordTemplate, verifyTemplateOnChain };
