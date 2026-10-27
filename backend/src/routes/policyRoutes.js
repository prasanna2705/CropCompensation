const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  myPolicies, recordPolicyPurchase, getPolicyDetail,
} = require("../controllers/policyController");

const router = express.Router();

router.get("/mine", requireAuth, requireRole("farmer"), myPolicies);
router.post("/", requireAuth, requireRole("farmer"), recordPolicyPurchase);
router.get("/:id", requireAuth, getPolicyDetail);

module.exports = router;
