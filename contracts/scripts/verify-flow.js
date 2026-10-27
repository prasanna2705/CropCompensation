const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [owner, farmer, oracle1, oracle2] = await ethers.getSigners();

  const pmAddr = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const oaAddr = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const pm = await ethers.getContractAt("PolicyManager", pmAddr);
  const oa = await ethers.getContractAt("OracleAggregator", oaAddr);

  // 1. Fund reserve
  let tx = await pm.connect(owner).fundReserve({ value: ethers.parseEther("2") });
  await tx.wait();
  console.log("✅ Reserve funded");

  // 2. Create template (region 1, threshold 50mm, premium 0.01 ETH, payout 0.1 ETH, 90-day season)
  const now = Math.floor(Date.now() / 1000);
  tx = await pm.connect(owner).createTemplate(
    50,
    ethers.parseEther("0.01"),
    ethers.parseEther("0.1"),
    now,
    now + 90 * 86400,
    1
  );
  const receipt1 = await tx.wait();
  const templateId = receipt1.logs
    .map(l => { try { return pm.interface.parseLog(l); } catch { return null; } })
    .find(e => e?.name === "TemplateCreated")?.args.templateId;
  console.log(`✅ Template #${templateId} created`);

  // 3. Purchase policy as farmer
  const farmerBalBefore = await ethers.provider.getBalance(farmer.address);
  tx = await pm.connect(farmer).purchasePolicy(templateId, { value: ethers.parseEther("0.01") });
  const receipt2 = await tx.wait();
  const policyId = receipt2.logs
    .map(l => { try { return pm.interface.parseLog(l); } catch { return null; } })
    .find(e => e?.name === "PolicyPurchased")?.args.policyId;
  console.log(`✅ Policy #${policyId} purchased by farmer ${farmer.address}`);

  // 4. Authorize two oracle wallets
  await (await oa.connect(owner).addOracle(oracle1.address)).wait();
  await (await oa.connect(owner).addOracle(oracle2.address)).wait();
  console.log(`✅ Oracles authorized: ${oracle1.address}, ${oracle2.address}`);

  // 5. Oracle 1 submits below-threshold reading (30mm < 50mm threshold)
  const windowStart = now;
  tx = await oa.connect(oracle1).submitReading(1, 30, windowStart);
  await tx.wait();
  let policy = await pm.getPolicy(policyId);
  console.log(`✅ Oracle1 submitted reading — policy status: ${["Active","Paid","Expired"][policy.status]}`);

  // 6. Oracle 2 submits same reading — should trigger payout automatically
  tx = await oa.connect(oracle2).submitReading(1, 30, windowStart);
  const receipt3 = await tx.wait();

  const payoutEvent = receipt3.logs
    .map(l => { try { return pm.interface.parseLog(l); } catch { return null; } })
    .find(e => e?.name === "PayoutExecuted");

  if (!payoutEvent) throw new Error("PayoutExecuted event NOT found — payout did not fire!");

  console.log(`✅ PayoutExecuted fired in tx ${receipt3.hash}`);
  console.log(`   Farmer: ${payoutEvent.args.farmer}, Amount: ${ethers.formatEther(payoutEvent.args.amount)} ETH`);

  policy = await pm.getPolicy(policyId);
  if (policy.status !== 1n) throw new Error(`Policy status is ${policy.status}, expected 1 (Paid)`);
  console.log(`✅ Policy #${policyId} status = PAID`);

  const farmerBalAfter = await ethers.provider.getBalance(farmer.address);
  const gain = farmerBalAfter - farmerBalBefore;
  console.log(`✅ Farmer balance increased by ${ethers.formatEther(gain)} ETH (net of gas)`);

  console.log("\n🎉 Full on-chain flow verified successfully.");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
