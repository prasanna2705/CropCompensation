const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const PolicyManager = await hre.ethers.getContractFactory("PolicyManager");
  const policyManager = await PolicyManager.deploy();
  await policyManager.waitForDeployment();
  console.log("PolicyManager deployed to:", await policyManager.getAddress());

  const requiredConfirmations = 2;
  const OracleAggregator = await hre.ethers.getContractFactory("OracleAggregator");
  const oracleAggregator = await OracleAggregator.deploy(
    await policyManager.getAddress(),
    requiredConfirmations
  );
  await oracleAggregator.waitForDeployment();
  console.log("OracleAggregator deployed to:", await oracleAggregator.getAddress());

  const tx = await policyManager.setOracleAggregator(await oracleAggregator.getAddress());
  await tx.wait();
  console.log("PolicyManager linked to OracleAggregator");

  console.log("\nDeployment summary:");
  console.log(JSON.stringify({
    policyManager: await policyManager.getAddress(),
    oracleAggregator: await oracleAggregator.getAddress(),
    deployer: deployer.address,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
