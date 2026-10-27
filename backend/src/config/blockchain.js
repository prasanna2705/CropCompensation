const { ethers } = require("ethers");
const PolicyManagerABI = require("./abis/PolicyManager.json");
const OracleAggregatorABI = require("./abis/OracleAggregator.json");

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");

function getReadOnlyPolicyManager() {
  return new ethers.Contract(process.env.POLICY_MANAGER_ADDRESS, PolicyManagerABI, provider);
}

function getReadOnlyOracleAggregator() {
  return new ethers.Contract(process.env.ORACLE_AGGREGATOR_ADDRESS, OracleAggregatorABI, provider);
}

/**
 * Returns an OracleAggregator instance connected to a signer, used by the backend
 * to relay signed weather readings on behalf of the (simulated) oracle service.
 * In production this key would belong to an independent oracle node, not the backend itself.
 */
function getOracleRelaySigner() {
  if (!process.env.ORACLE_RELAY_PRIVATE_KEY) {
    throw new Error("ORACLE_RELAY_PRIVATE_KEY not configured");
  }
  const wallet = new ethers.Wallet(process.env.ORACLE_RELAY_PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.ORACLE_AGGREGATOR_ADDRESS, OracleAggregatorABI, wallet);
}

module.exports = {
  provider,
  getReadOnlyPolicyManager,
  getReadOnlyOracleAggregator,
  getOracleRelaySigner,
  PolicyManagerABI,
  OracleAggregatorABI,
};
