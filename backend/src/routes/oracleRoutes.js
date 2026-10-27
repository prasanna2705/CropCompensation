const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { recordReading, listReadings } = require("../controllers/oracleController");

const router = express.Router();

router.post("/readings", requireAuth, requireRole("oracle", "admin"), recordReading);
router.get("/readings/:regionId", requireAuth, listReadings);

module.exports = router;
