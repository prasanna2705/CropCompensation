const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("OracleAggregator", function () {
  let policyManager, oracleAggregator;
  let owner, farmer, oracle1, oracle2, oracle3, outsider;
  const premium = ethers.parseEther("0.01");
  const payoutAmount = ethers.parseEther("0.1");
  const threshold = 50; // mm — payout triggers if reading < threshold
  const regionId = 1;

  beforeEach(async function () {
    [owner, farmer, oracle1, oracle2, oracle3, outsider] = await ethers.getSigners();

    const PolicyManager = await ethers.getContractFactory("PolicyManager");
    policyManager = await PolicyManager.deploy();
    await policyManager.waitForDeployment();

    const OracleAggregator = await ethers.getContractFactory("OracleAggregator");
    oracleAggregator = await OracleAggregator.deploy(await policyManager.getAddress(), 2); // 2-of-N confirmations
    await oracleAggregator.waitForDeployment();

    await policyManager.connect(owner).setOracleAggregator(await oracleAggregator.getAddress());
    await policyManager.connect(owner).fundReserve({ value: ethers.parseEther("1") });

    await oracleAggregator.connect(owner).addOracle(oracle1.address);
    await oracleAggregator.connect(owner).addOracle(oracle2.address);
    await oracleAggregator.connect(owner).addOracle(oracle3.address);

    const now = await time.latest();
    await policyManager.connect(owner).createTemplate(
      threshold, premium, payoutAmount, now, now + 3600, regionId
    );
    await policyManager.connect(farmer).purchasePolicy(1, { value: premium });
  });

  it("rejects reading submission from a non-authorized address", async function () {
    await expect(
      oracleAggregator.connect(outsider).submitReading(regionId, 30, 1000)
    ).to.be.revertedWith("Not an authorized oracle");
  });

  it("does not trigger a payout until required confirmations are reached", async function () {
    await oracleAggregator.connect(oracle1).submitReading(regionId, 30, 1000);

    const policy = await policyManager.getPolicy(1);
    expect(policy.status).to.equal(0); // still Active — only 1 of 2 confirmations
  });

  it("rejects the same oracle confirming the same reading twice", async function () {
    await oracleAggregator.connect(oracle1).submitReading(regionId, 30, 1000);
    await expect(
      oracleAggregator.connect(oracle1).submitReading(regionId, 30, 1000)
    ).to.be.revertedWith("Already confirmed by this oracle");
  });

  it("triggers automatic payout once 2-of-3 oracles confirm a below-threshold reading", async function () {
    const balanceBefore = await ethers.provider.getBalance(farmer.address);

    await oracleAggregator.connect(oracle1).submitReading(regionId, 30, 1000); // below threshold (50)
    const tx = await oracleAggregator.connect(oracle2).submitReading(regionId, 30, 1000);

    await expect(tx).to.emit(policyManager, "PayoutExecuted").withArgs(1, farmer.address, payoutAmount);

    const balanceAfter = await ethers.provider.getBalance(farmer.address);
    expect(balanceAfter - balanceBefore).to.equal(payoutAmount);

    const policy = await policyManager.getPolicy(1);
    expect(policy.status).to.equal(1); // Paid
  });

  it("does NOT trigger a payout if the reading is above the threshold", async function () {
    await oracleAggregator.connect(oracle1).submitReading(regionId, 80, 1000); // above threshold
    await oracleAggregator.connect(oracle2).submitReading(regionId, 80, 1000);

    const policy = await policyManager.getPolicy(1);
    expect(policy.status).to.equal(0); // still Active, no payout
  });

  it("only owner can add or remove oracles", async function () {
    await expect(
      oracleAggregator.connect(farmer).addOracle(outsider.address)
    ).to.be.revertedWith("Not owner");

    await expect(
      oracleAggregator.connect(farmer).removeOracle(oracle1.address)
    ).to.be.revertedWith("Not owner");
  });

  it("prevents a removed oracle from submitting further readings", async function () {
    await oracleAggregator.connect(owner).removeOracle(oracle1.address);
    await expect(
      oracleAggregator.connect(oracle1).submitReading(regionId, 30, 2000)
    ).to.be.revertedWith("Not an authorized oracle");
  });
});
