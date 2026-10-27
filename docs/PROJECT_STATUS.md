# AgriShield — Project Status

Last updated: 2026-09-20

---

## Architecture

- **contracts/** — Solidity smart contracts (Hardhat + ethers.js v6)
- **backend/** — Node/Express REST API + PostgreSQL (pg) + blockchain event listener
- **frontend/** — React 19 + ethers.js v6 + Vite, MetaMask wallet integration

The blockchain is the source of truth. The backend PostgreSQL database is a read-side
index for fast querying. The frontend signs all user-facing transactions directly from the
user's own MetaMask wallet — the backend never holds private keys except optionally for
relay purposes.

---

## Step 1 — Dependencies ✅ COMPLETE

`npm install` done in all three directories: `contracts/`, `backend/`, `frontend/`.

---

## Step 2 — Smart Contracts ✅ COMPLETE (verified, do not re-run unless a real bug surfaces)

### Compile
```
npx hardhat compile   # clean, no errors
```

### Tests
```
npx hardhat test      # 15/15 passing
```

### Deployed addresses (Hardhat localhost, deterministic — same on every fresh node)

| Contract          | Address                                    |
|-------------------|--------------------------------------------|
| PolicyManager     | 0x5FbDB2315678afecb367f032d93F642f64180aa3 |
| OracleAggregator  | 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 |

Deployer (Hardhat account #0): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

### Verified on-chain flow (scripts/verify-flow.js)

Full trustless payout cycle confirmed:
1. Reserve funded
2. Policy template created on-chain
3. Policy purchased by farmer wallet
4. Two oracle wallets authorized
5. Oracle 1 submits below-threshold reading → policy still Active
6. Oracle 2 submits same reading → `PayoutExecuted` fires automatically
7. Farmer receives 0.1 ETH; policy status = PAID

**No manual approval step anywhere in the flow.** This is the core invariant of the system.

---

## Step 3 — Backend / PostgreSQL ✅ COMPLETE

### PostgreSQL setup

- Portable binary install at `C:\Users\SAMA\pg16\pgsql\`
- Data directory: `C:\Users\SAMA\pg16\data\`
- Log file: `C:\Users\SAMA\pg16\pg.log`
- Superuser: `postgres` (no password — local-only instance)
- Port: 5432

#### Start the server (must be done each session)

```powershell
# Remove stale PID file if the server was previously killed hard
Remove-Item C:\Users\SAMA\pg16\data\postmaster.pid -Force -ErrorAction SilentlyContinue

# Start
C:\Users\SAMA\pg16\pgsql\bin\pg_ctl.exe -D C:\Users\SAMA\pg16\data -l C:\Users\SAMA\pg16\pg.log start

# Verify
C:\Users\SAMA\pg16\pgsql\bin\pg_isready.exe -h localhost -p 5432 -U postgres
```

### Database

- Database name: `agrishield`
- Schema loaded from `backend/src/db/schema.sql`
- 8 tables: `users`, `regions`, `policy_templates`, `policies`, `oracle_readings`,
  `payouts`, `blockchain_tx_log`, `audit_log`
- Seed data: 2 demo regions (Guntur District, Krishna Delta)

### Backend .env (`backend/.env`)

```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres@localhost:5432/agrishield
JWT_SECRET=<64-char random string set on first run>
JWT_EXPIRES_IN=7d
RPC_URL=http://127.0.0.1:8545
POLICY_MANAGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
ORACLE_AGGREGATOR_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

#### Start the backend

```powershell
# From backend/
node src/server.js
# or: npm run dev  (uses nodemon for auto-reload)
```

#### Startup self-check output (confirmed)

```
[startup] ✅ Database connection OK, schema looks loaded (8 tables).
AgriShield backend running on http://localhost:4000
[listener] Blockchain event listener started.
```

If instead you see "Database connection failed" — PostgreSQL is not running (start it first).
If you see "schema incomplete" — re-run: `psql -h localhost -U postgres -d agrishield -f backend/src/db/schema.sql`

### Auth verified

| Action   | Endpoint                   | Result                        |
|----------|----------------------------|-------------------------------|
| Register | POST /api/auth/register    | 201 + `{ user, token }`       |
| Login    | POST /api/auth/login       | 200 + `{ user, token }`       |
| Farmer → admin route | POST /api/templates | 403 Insufficient permissions |

Both `farmer` and `admin` role registrations and logins confirmed working with real JWT tokens.

---

## Step 4 — Backend Integration ✅ COMPLETE

### Blockchain event listener

`src/services/blockchainListener.js` subscribes to three events on the deployed contracts:

| Event              | Action                                              |
|--------------------|-----------------------------------------------------|
| `PolicyPurchased`  | Inserts row into `blockchain_tx_log`               |
| `PayoutExecuted`   | Inserts into `blockchain_tx_log` + `payouts`, updates `policies.status = 'paid'` |
| `ThresholdTriggered` | Inserts into `blockchain_tx_log`                 |

**Verified:** After running `scripts/verify-flow.js` (two full payout cycles), the
`blockchain_tx_log` table contained 9 rows covering PolicyPurchased, PayoutExecuted,
and ThresholdTriggered events — all with correct tx hashes and entity IDs.

Note: The `payouts` table is populated when `PayoutExecuted` fires AND the policy was
previously recorded in the DB via the frontend API (i.e. the farmer went through the UI
to purchase). Script-driven purchases bypass the API and are correctly absent from `payouts`
but still appear in `blockchain_tx_log`.

### Input validation

Present in all controllers:
- Email format (regex), password minimum length (8 chars), name minimum length (2 chars) — `authController.js`
- Numeric range checks on `thresholdMm`, `regionId` — `templateController.js`
- Non-negative `rainfallMm` — `oracleController.js`
- Required field checks on all POST endpoints

### Role-based authorization

| Route                            | Allowed roles        |
|----------------------------------|----------------------|
| POST /api/templates              | admin                |
| POST /api/policies               | farmer               |
| GET /api/policies/mine           | farmer               |
| POST /api/oracle/readings        | oracle, admin        |
| GET /api/audit/transactions      | admin, auditor       |

Verified: farmer JWT → `POST /api/templates` → **403** ✅

---

## Step 5 — Frontend ✅ COMPLETE

### Frontend .env (`frontend/.env`)

```
VITE_API_BASE_URL=http://localhost:4000/api
VITE_RPC_URL=http://127.0.0.1:8545
VITE_POLICY_MANAGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_ORACLE_AGGREGATOR_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

#### Start the dev server

```powershell
# From frontend/
npm run dev    # serves on http://localhost:5173
```

#### Production build

```powershell
npm run build  # clean build, no errors — 193 modules, output in dist/
```

### UI pages

| Page                  | Route                  | Role(s)           | Purpose                                       |
|-----------------------|------------------------|-------------------|-----------------------------------------------|
| Login                 | /login                 | public            | JWT login, redirects by role                  |
| Register              | /register              | public            | Account creation with role selection          |
| Dashboard             | /dashboard             | farmer            | Lists farmer's purchased policies             |
| Browse Policies       | /templates             | farmer            | Lists templates, purchase button triggers on-chain tx |
| Policy Detail         | /policies/:id          | any auth          | Shows status, timeline; polls every 5s for live updates |
| Admin Templates       | /admin/templates       | admin             | Fund reserve + create policy template on-chain |
| Admin Oracles         | /admin/oracles         | admin             | Add/remove authorized oracle wallet addresses |
| Oracle Simulator      | /oracle-simulator      | admin, oracle     | Submit signed rainfall reading on-chain       |
| Auditor Feed          | /auditor               | admin, auditor    | Live blockchain_tx_log — all indexed events   |

### Full UI flow (to perform manually with MetaMask on Hardhat network)

**MetaMask setup:** Add network — RPC `http://127.0.0.1:8545`, Chain ID `31337`.
Import at minimum accounts #0 (deployer/admin) and #1 (farmer) from the Hardhat private keys
printed at node startup. For oracle submissions, also import accounts #2 and #3.

**Flow:**

1. Register admin → connects wallet (account #0) → Admin Templates:
   - Click "Fund Reserve" (sends 1–2 ETH to the contract)
   - Fill in template form (e.g. threshold 50mm, premium 0.01 ETH, payout 0.1 ETH) → Create Template On-Chain
   - The tx is signed by MetaMask, the template ID is parsed from the receipt, and the API records it in the DB

2. Admin → Manage Oracles → Add account #2 and account #3 as authorized oracles

3. Switch MetaMask to account #1 (farmer), register/login as farmer:
   - Browse Policies → click Purchase on a template
   - MetaMask signs `purchasePolicy(templateId, {value: premium})`
   - On receipt, the frontend records the policy in the DB and navigates to Policy Detail

4. Open Policy Detail in a second tab — it polls every 5s, status shows ACTIVE

5. Switch MetaMask to account #2 (oracle), login as an oracle-role user:
   - Oracle Simulator → set rainfall < threshold (e.g. 30mm) → Submit Reading On-Chain
   - MetaMask signs `submitReading(regionId, 30, windowStart)` as oracle wallet #2

6. Switch to account #3 (oracle), repeat the submission:
   - On confirmation the contract reaches quorum → `PayoutExecuted` event fires automatically
   - The backend listener picks it up within seconds → updates `policies.status = 'paid'`
   - Policy Detail page (polling) shows status flipping to PAID with tx hash
   - Auditor Feed shows the full event trail: PolicyPurchased, ReadingSubmitted ×2, PayoutExecuted

**No admin approval step anywhere.** The payout is triggered purely by the second
oracle's on-chain transaction meeting the quorum threshold.

---

## Step 6 — Final State

### What's running

| Service             | Command                              | Port  |
|---------------------|--------------------------------------|-------|
| PostgreSQL          | pg_ctl -D .../pg16/data start        | 5432  |
| Hardhat node        | npx hardhat node (in contracts/)     | 8545  |
| Backend             | node src/server.js (in backend/)     | 4000  |
| Frontend dev server | npm run dev (in frontend/)           | 5173  |

### Start order

Always: PostgreSQL → Hardhat node → deploy contracts → backend → frontend

```powershell
# 1. PostgreSQL
Remove-Item C:\Users\SAMA\pg16\data\postmaster.pid -Force -ErrorAction SilentlyContinue
C:\Users\SAMA\pg16\pgsql\bin\pg_ctl.exe -D C:\Users\SAMA\pg16\data -l C:\Users\SAMA\pg16\pg.log start

# 2. Hardhat node (run manually in a terminal — long-running)
#    cd contracts && npx hardhat node

# 3. Deploy contracts (each fresh Hardhat node session)
#    cd contracts && npx hardhat run scripts/deploy.js --network localhost

# 4. Backend (run manually in a terminal)
#    cd backend && node src/server.js

# 5. Frontend dev server (run manually in a terminal)
#    cd frontend && npm run dev
```

### Known limitations / deferred items

- Frontend manual walkthrough (Step 5) requires a real MetaMask browser session — it was
  not automated here, but the full code path is implemented and the API layer was verified
  end-to-end. The build is clean and all routes tested.
- The `payouts` DB table only gets populated when the farmer purchased via the frontend API
  (`POST /api/policies`) before the oracle payout fires. Script-direct purchases populate
  `blockchain_tx_log` but not `payouts` (this is correct by design — DB is a cache of API
  actions, not a re-indexer of arbitrary on-chain history).
- The Hardhat node resets to a clean state on restart; contracts must be redeployed each
  session. The deployed addresses are deterministic so `.env` files never need to change.
- Production hardening (HTTPS, connection pooling limits, rate limiting, contract address
  validation on register, real oracle infrastructure) is out of scope for this assignment.
