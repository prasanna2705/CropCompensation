const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { listTransactions, getPayout } = require("../controllers/auditController");

const router = express.Router();

router.get("/transactions", requireAuth, requireRole("admin", "auditor"), listTransactions);
router.get("/payouts/:policyId", requireAuth, getPayout);

module.exports = router;
