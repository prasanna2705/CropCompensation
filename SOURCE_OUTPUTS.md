# AgriShield Source Outputs and Percentage Check

**Verification context:** local Hardhat chain and existing frontend code, checked 27 October 2026. The numbers below separate observed test-chain outputs from manual sample values. No external weather, satellite, or soil service was called.

## The three sources described in the report

The report proposes:

| Proposed source | Intended data and processing in report | Actual project integration | Actual source output captured |
|---|---|---|---|
| Weather | Open-Meteo historical rainfall, seasonal sum compared with a historical baseline, then a drought/loss tier. | No API client, data-fetching service, baseline processor, or source-specific on-chain input found. The DApp's oracle UI lets the connected user type a rainfall amount. | **None from Open-Meteo.** The separate rainfall-only demo used a manually supplied 30 mm value. |
| Satellite crop health | Sentinel-2 imagery; report describes NDVI `(NIR − Red) / (NIR + Red)` via Earth Engine, with cloud filtering and crop/season context. | No Earth Engine/Sentinel client or NDVI calculation in the app. `/prototype` has a manual tier selector labelled “Satellite · crop health (NDVI)”. | **None from Sentinel-2.** Current prototype's manually selected satellite tier is 2 (Severe) by default. |
| Soil moisture | NASA SMAP Level-4 root-zone moisture via Earth Engine, compared against a historical baseline, then a tier. | No SMAP/Earth Engine fetch, moisture baseline, or soil processing function in the app. `/prototype` has a manual tier selector labelled “Soil · root-zone moisture”. | **None from SMAP.** Current prototype's manually selected soil tier is 1 (Moderate) by default. |

The weather, satellite, and soil labels in `/prototype` represent the **proposed model**, not connected source adapters. Those controls produce tier numbers only when a user selects them. There is no raw sensor/API output to show for those sources and no way to reproduce or verify those source results from this repository.

## Outputs that were actually produced

### 1. Existing on-chain rainfall flow

The included `contracts/scripts/verify-flow.js` was run against the local Hardhat node after deploying the contracts. Its real local-chain inputs and outputs were:

| Step | Observed input/output |
|---|---|
| Template | Region 1; rainfall threshold 50 mm; premium 0.01 ETH; fixed payout 0.1 ETH. |
| Policy | Policy #1 purchased by the farmer wallet; policy began Active. |
| Oracle 1 | Submitted rainfall `30 mm`; `30 < 50`, but one confirmation left policy Active. |
| Oracle 2 | Submitted the same region, same reading `30 mm`, and same time-window value from another authorized wallet. |
| Result | `PayoutExecuted` fired; policy #1 became Paid; event amount was `0.1 ETH`. Farmer balance delta in the script was `0.0898618081679595 ETH` because that measurement spans the premium paid and transaction gas as well as the payout. |
| Receipt verification | Payout transaction `0x897875c94879256843950bdedfdd1496d0c684e466f85fd0440e022f7793b5c6`; block 10; status `0x1` (success); gas used 155,216. |

This is a **single rainfall input confirmed by two wallets**, not three different environmental data sources. Oracle wallet confirmations are not weather, satellite, and soil outputs.

### 2. Current `/prototype` default values

These are the values the interactive page currently initializes; they are sample UI inputs, not external source readings:

| Control label | Default tier selection | Display label |
|---|---:|---|
| Weather · seasonal rainfall | 2 | Severe · 50% |
| Satellite · crop health (NDVI) | 2 | Severe · 50% |
| Soil · root-zone moisture | 1 | Moderate · 25% |
| Sum insured | ₹100,000 | — |

The page counts selected tier IDs: tier 2 appears twice and tier 1 once. The majority is tier 2, so its hard-coded compensation rate is 0.5. Calculation: `₹100,000 × 0.5 = ₹50,000`. Changing selections can show other rates, but it still does not call any dataset or blockchain contract.

## Percentage calculation verification

In `frontend/src/pages/PrototypePage.jsx` the relevant values are:

```js
const tierNames = ["No loss · 0%", "Moderate · 25%", "Severe · 50%", "Total · 100%"];
const [reports, setReports] = useState([2, 2, 1]);
const winner = Number(Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]);
const payout = Math.round(Number(form.insured || 0) * [0, 0.25, 0.5, 1][winner]);
```

With defaults:

1. Reports are `[2, 2, 1]`.
2. Counts: tier 2 = 2 votes; tier 1 = 1 vote.
3. Winning tier = 2, displayed rate = 50% (`0.5`).
4. `Number(form.insured)` = 100000.
5. `Math.round(100000 × 0.5)` = **₹50,000**.

For 25%, the input would have to produce winning tier 1. With the same sum insured: `Math.round(100000 × 0.25)` = **₹25,000**. The same formula gives 0% → ₹0 and 100% → ₹100,000. No deviation-from-baseline formula is implemented in this page; it accepts the tier directly.

The separate on-chain contract's verified calculation is **not a percentage**: once reading is below threshold, `PolicyManager.executePayout` transfers `templates[templateId].payoutAmount`. In the run above that fixed amount was 0.1 ETH. Thus the 25% and 50% display values are valid as calculations in the illustrative UI, but should not be described as blockchain payout percentages from the current Solidity implementation.

`tierAmounts = [0, 25000, 50000, 100000]` is also declared in the page but is unused; the actual rendered amount is calculated from `insured × rate`.

## Smallest path to verifiable three-source outputs

For a defensible data-source demonstration, each source needs (1) a real or clearly labelled fixture input, (2) its raw value and units shown separately, (3) the processing rule and baseline/thresholds recorded in code/config, and (4) the resulting tier plus source/timestamp/provenance displayed and saved. The current repository is missing those adapters and rules, so no true weather/satellite/soil percentage can be recalculated or audited. Do not present the sample tier selections as measurements.

To make the current percentage itself verifiable for a demo, the smallest change is already represented by the page's visible tier controls plus explicit sample labels: record the exact selected tiers and insured sum alongside the displayed majority and formula. That would verify the mock calculation only; connecting real environmental sources remains separate work.
