import PolicyManagerABI from "./PolicyManager.json";
import OracleAggregatorABI from "./OracleAggregator.json";

// Fill these in after running the deploy script in /contracts (scripts/deploy.js).
// For local development, point VITE_RPC_URL at your Hardhat node (default http://127.0.0.1:8545).
export const POLICY_MANAGER_ADDRESS = import.meta.env.VITE_POLICY_MANAGER_ADDRESS || "";
export const ORACLE_AGGREGATOR_ADDRESS = import.meta.env.VITE_ORACLE_AGGREGATOR_ADDRESS || "";
export const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export { PolicyManagerABI, OracleAggregatorABI };
