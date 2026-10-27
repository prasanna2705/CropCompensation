const { pool } = require("../config/db");

// POST /api/oracle/readings
// Records a reading that was submitted directly on-chain by the frontend/oracle
// simulator (the wallet that holds the authorized oracle key signs the tx itself).
// This endpoint only mirrors the event into the DB for fast querying/auditing.
async function recordReading(req, res) {
  try {
    const { regionId, rainfallMm, windowStart, submittedBy, txHash } = req.body;
    if (!regionId || rainfallMm === undefined || rainfallMm === null || !windowStart || !submittedBy)
      return res.status(400).json({ error: "regionId, rainfallMm, windowStart, and submittedBy are required" });
    if (isNaN(Number(rainfallMm)) || Number(rainfallMm) < 0)
      return res.status(400).json({ error: "rainfallMm must be a non-negative number" });

    const result = await pool.query(
      `INSERT INTO oracle_readings (region_id, rainfall_mm, window_start, submitted_by, tx_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [regionId, rainfallMm, windowStart, submittedBy, txHash]
    );

    await pool.query(
      `INSERT INTO blockchain_tx_log (tx_hash, event_type, related_entity_id, raw_event_json)
       VALUES ($1, 'ReadingSubmitted', $2, $3)`,
      [txHash, result.rows[0].id, JSON.stringify(req.body)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record oracle reading" });
  }
}

// GET /api/oracle/readings/:regionId — recent readings for a region
async function listReadings(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM oracle_readings WHERE region_id = $1 ORDER BY submitted_at DESC LIMIT 50`,
      [req.params.regionId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load readings" });
  }
}

module.exports = { recordReading, listReadings };
