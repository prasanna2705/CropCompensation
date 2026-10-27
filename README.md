# AgriShield — Decentralized Parametric Crop Insurance

A full-stack DApp: farmers buy parametric crop-insurance policies whose payouts are
triggered **automatically** by smart-contract logic once independent, on-chain-verified
rainfall readings cross an agreed threshold — no manual claims process, no insurer
discretion.

## Project Structure

```
agrishield/
├── contracts/     Hardhat project — PolicyManager.sol, OracleAggregator.sol, tests, deploy script
├── backend/       Node/Express API + PostgreSQL — auth, templates, policies, oracle relay, audit log
├── frontend/      React (Vite) + ethers.js — farmer, admin, oracle-simulator, and auditor UIs
└── docs/          (space for your diagrams / PDF documentation as you build them)
```

## 1. Smart Contracts (`/contracts`)

```bash
cd contracts
npm install                 # already run for you
cp .env.example .env        # only needed for testnet deployment
npx hardhat compile
npx hardhat test
```

Run a local blockchain and deploy:

```bash
npx hardhat node                       # in one terminal — leave running
npx hardhat run scripts/deploy.js --network localhost   # in another terminal
```

Copy the two printed contract addresses — you'll need them for both the backend and frontend `.env` files.

> **Note on this sandbox:** contract compilation in this environment (this chat's sandbox) is blocked
> from reaching `binaries.soliditylang.org` to download the Solidity compiler, so I validated the
> contracts with `solc-js` directly instead (confirmed clean compile, correct bytecode). On your own
> machine `npx hardhat compile` will download the compiler once (cached after) and work normally.

## 2. Backend (`/backend`)

```bash
cd backend
npm install                 # already run for you
cp .env.example .env
# create the database and load the schema:
createdb agrishield
psql agrishield -f src/db/schema.sql
# fill in .env: DATABASE_URL, JWT_SECRET, RPC_URL, POLICY_MANAGER_ADDRESS, ORACLE_AGGREGATOR_ADDRESS
npm run dev
```

Health check: `curl http://localhost:4000/health` → `{"status":"ok"}`

## 3. Frontend (`/frontend`)

```bash
cd frontend
npm install                 # already run for you
cp .env.example .env
# fill in VITE_POLICY_MANAGER_ADDRESS / VITE_ORACLE_AGGREGATOR_ADDRESS from the deploy step
npm run dev
```

Open the printed local URL. You'll need MetaMask (or another injected wallet) configured to
point at your local Hardhat node (`http://127.0.0.1:8545`, chain id `31337`), with a couple of
the Hardhat test accounts imported so you can act as farmer / admin / oracle in the demo.

## Demo Flow

1. Register an **admin** account → go to *Manage Templates* → connect wallet → fund the reserve → create a template.
2. Register a **farmer** account → *Browse Policies* → connect a different wallet → purchase a policy.
3. Back in the admin/oracle account, go to *Manage Oracles* and authorize two wallet addresses as oracles.
4. Open *Oracle Simulator*, connect oracle wallet #1, submit a below-threshold rainfall reading.
5. Switch wallets to oracle #2, submit the same region/reading again — this should trigger the payout automatically.
6. Open the farmer's *Policy Detail* page — status flips to PAID in real time, with the transaction hash visible.
7. Open the *Transparency Feed* (auditor/admin) to show the full public event trail.

