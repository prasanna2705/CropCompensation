const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("PolicyManager", function () {
  let policyManager, owner, farmer, other, fakeAggregator;
  const premium = ethers.parseEther("0.01");
  const payoutAmount = ethers.parseEther("0.1");
  const threshold = 50; // mm

  beforeEach(async function () {
    [owner, farmer, other, fakeAggregator] = await ethers.getSigners();

    const PolicyManager = await ethers.getContractFactory("PolicyManager");
    policyManager = await PolicyManager.deploy();
    await policyManager.waitForDeployment();

    // Fund reserve so payouts are possible in tests that need it
    await policyManager.connect(owner).fundReserve({ value: ethers.parseEther("1") });
  });

  it("only owner can create a template", async function () {
    const now = await time.latest();
    await expect(
      policyManager.connect(farmer).createTemplate(threshold, premium, payoutAmount, now, now + 3600, 1)
    ).to.be.revertedWith("Not owner");

    await expect(
      policyManager.connect(owner).createTemplate(threshold, premium, payoutAmount, now, now + 3600, 1)
    ).to.emit(policyManager, "TemplateCreated");
  });

  it("rejects purchase with incorrect premium", async function () {
    const now = await time.latest();
    await policyManager.connect(owner).createTemplate(threshold, premium, payoutAmount, now, now + 3600, 1);

    await expect(
      policyManager.connect(farmer).purchasePolicy(1, { value: ethers.parseEther("0.005") })
    ).to.be.revertedWith("Incorrect premium amount");
  });

  it("rejects purchase after season has ended", async function () {
    const now = await time.latest();
    await policyManager.connect(owner).createTemplate(threshold, premium, payoutAmount, now, now + 10, 1);

    await time.increase(20); // move past seasonEnd

    await expect(
      policyManager.connect(farmer).purchasePolicy(1, { value: premium })
    ).to.be.revertedWith("Season already ended");
  });

  it("allows a valid purchase and records the policy", async function () {
    const now = await time.latest();
    await policyManager.connect(owner).createTemplate(threshold, premium, payoutAmount, now, now + 3600, 1);

    await expect(policyManager.connect(farmer).purchasePolicy(1, { value: premium }))
      .to.emit(policyManager, "PolicyPurchased")
      .withArgs(1, farmer.address, 1);

    const policy = await policyManager.getPolicy(1);
    expect(policy.farmer).to.equal(farmer.address);
    expect(policy.status).to.equal(0); // Active
  });

  it("rejects executePayout from any address other than the linked OracleAggregator", async function () {
    const now = await time.latest();
    await policyManager.connect(owner).createTemplate(threshold, premium, payoutAmount, now, now + 3600, 1);
    await policyManager.connect(farmer).purchasePolicy(1, { value: premium });

    await expect(
      policyManager.connect(other).executePayout(1)
    ).to.be.revertedWith("Not authorized oracle contract");
  });

  it("executes payout correctly when called by the authorized aggregator address", async function () {
    const now = await time.latest();
    await policyManager.connect(owner).createTemplate(threshold, premium, payoutAmount, now, now + 3600, 1);
    await policyManager.connect(farmer).purchasePolicy(1, { value: premium });

    // Simulate the OracleAggregator by setting a regular signer as the aggregator address
    await policyManager.connect(owner).setOracleAggregator(fakeAggregator.address);

    const balanceBefore = await ethers.provider.getBalance(farmer.address);

    await expect(policyManager.connect(fakeAggregator).executePayout(1))
      .to.emit(policyManager, "PayoutExecuted")
      .withArgs(1, farmer.address, payoutAmount);

    const balanceAfter = await ethers.provider.getBalance(farmer.address);
    expect(balanceAfter - balanceBefore).to.equal(payoutAmount);

    const policy = await policyManager.getPolicy(1);
    expect(policy.status).to.equal(1); // Paid
  });

  it("reverts payout if reserve balance is insufficient", async function () {
    const now = await time.latest();
    const hugePayout = ethers.parseEther("1000");
    await policyManager.connect(owner).createTemplate(threshold, premium, hugePayout, now, now + 3600, 1);
    await policyManager.connect(farmer).purchasePolicy(1, { value: premium });
    await policyManager.connect(owner).setOracleAggregator(fakeAggregator.address);

    await expect(
      policyManager.connect(fakeAggregator).executePayout(1)
    ).to.be.revertedWith("Insufficient reserve");
  });

  it("does not allow the same policy to be paid twice", async function () {
    const now = await time.latest();
    await policyManager.connect(owner).createTemplate(threshold, premium, payoutAmount, now, now + 3600, 1);
    await policyManager.connect(farmer).purchasePolicy(1, { value: premium });
    await policyManager.connect(owner).setOracleAggregator(fakeAggregator.address);

    await policyManager.connect(fakeAggregator).executePayout(1);

    await expect(
      policyManager.connect(fakeAggregator).executePayout(1)
    ).to.be.revertedWith("Policy not active");
  });
});
