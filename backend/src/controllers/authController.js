const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  try {
    const { name, email, password, role, walletAddress } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2)
      return res.status(400).json({ error: "name must be at least 2 characters" });
    if (!email || !EMAIL_RE.test(email))
      return res.status(400).json({ error: "A valid email address is required" });
    if (!password || password.length < 8)
      return res.status(400).json({ error: "password must be at least 8 characters" });

    const allowedRoles = ["farmer", "admin", "oracle", "auditor"];
    const finalRole = allowedRoles.includes(role) ? role : "farmer";

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "An account with this email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, wallet_address)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, wallet_address`,
      [name.trim(), email.toLowerCase(), passwordHash, finalRole, walletAddress || null]
    );

    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error("[register]", err);
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(user);
    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ error: err.message });
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

module.exports = { register, login };
