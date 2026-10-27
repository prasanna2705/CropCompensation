const { pool } = require("../config/db");
const { getReadOnlyPolicyManager, getReadOnlyOracleAggregator } = require("../config/blockchain");

/**
 * Subscribes to on-chain events and mirrors them into PostgreSQL so the frontend
 * can query fast, indexed history without repeatedly scanning the chain.
 * The blockchain remains the source of truth; this is a read-side cache only.
 */
function startBlockchainListener() {
  if (!process.env.POLICY_MANAGER_ADDRESS || !process.env.ORACLE_AGGREGATOR_ADDRESS) {
    console.warn("[listener] Contract addresses not set — skipping event listener startup.");
    return;
  }

  const policyManager = getReadOnlyPolicyManager();
  const oracleAggregator = getReadOnlyOracleAggregator();

  policyManager.on("PolicyPurchased", async (policyId, farmer, templateId, event) => {
    await logEvent("PolicyPurchased", policyId, event, { farmer, templateId: templateId.toString() });
    console.log(`[listener] PolicyPurchased #${policyId} by ${farmer}`);
  });

  policyManager.on("PayoutExecuted", async (policyId, farmer, amount, event) => {
    await logEvent("PayoutExecuted", policyId, event, { farmer, amount: amount.toString() });
    await pool.query(
      `UPDATE policies SET status = 'paid' WHERE on_chain_policy_id = $1`,
      [policyId.toString()]
    );
    await pool.query(
      `INSERT INTO payouts (policy_id, amount_wei, tx_hash)
       SELECT id, $2, $3 FROM policies WHERE on_chain_policy_id = $1`,
      [policyId.toString(), amount.toString(), event.log.transactionHash]
    );
    console.log(`[listener] PayoutExecuted #${policyId} -> ${farmer} (${amount.toString()} wei)`);
  });

  oracleAggregator.on("ThresholdTriggered", async (regionId, rainfallMM, windowStart, event) => {
    await logEvent("ThresholdTriggered", regionId, event, {
      rainfallMM: rainfallMM.toString(),
      windowStart: windowStart.toString(),
    });
    console.log(`[listener] ThresholdTriggered region=${regionId} rainfall=${rainfallMM}mm`);
  });

  console.log("[listener] Blockchain event listener started.");
}

async function logEvent(eventType, relatedEntityId, event, extra) {
  try {
    await pool.query(
      `INSERT INTO blockchain_tx_log (tx_hash, event_type, related_entity_id, block_number, raw_event_json)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        event.log.transactionHash,
        eventType,
        relatedEntityId.toString(),
        event.log.blockNumber,
        JSON.stringify(extra),
      ]
    );
  } catch (err) {
    console.error("[listener] Failed to log event", err);
  }
}

module.exports = { startBlockchainListener };
