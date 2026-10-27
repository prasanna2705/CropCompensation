require("dotenv").config();
const app = require("./app");
const { pool } = require("./config/db");
const { startBlockchainListener } = require("./services/blockchainListener");

const PORT = process.env.PORT || 4000;

async function startServer() {
  // DB self-check
  try {
    await pool.query("SELECT 1");
    const tables = await pool.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"
    );
    const count = parseInt(tables.rows[0].count, 10);
    if (count < 8) {
      console.error(`[startup] ❌ Schema incomplete — only ${count} tables found. Run: psql agrishield -f src/db/schema.sql`);
      process.exit(1);
    }
    console.log(`[startup] ✅ Database connection OK, schema looks loaded (${count} tables).`);
  } catch (err) {
    console.error("[startup] ❌ Database connection failed:", err.message);
    console.error("  Check DATABASE_URL in .env and that PostgreSQL is running.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`AgriShield backend running on http://localhost:${PORT}`);
    startBlockchainListener();
  });
}

startServer();
