const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  listTemplates, recordTemplate, verifyTemplateOnChain,
} = require("../controllers/templateController");

const router = express.Router();

router.get("/", requireAuth, listTemplates);
router.post("/", requireAuth, requireRole("admin"), recordTemplate);
router.get("/on-chain/:onChainId", requireAuth, verifyTemplateOnChain);

module.exports = router;
