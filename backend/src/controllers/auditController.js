const { pool } = require("../config/db");

// GET /api/audit/transactions — full public transaction feed for auditors/regulators
async function listTransactions(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM blockchain_tx_log ORDER BY indexed_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load transaction log" });
  }
}

// GET /api/payouts/:policyId
async function getPayout(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM payouts WHERE policy_id = $1 ORDER BY executed_at DESC LIMIT 1`,
      [req.params.policyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No payout recorded for this policy yet" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load payout" });
  }
}

module.exports = { listTransactions, getPayout };
