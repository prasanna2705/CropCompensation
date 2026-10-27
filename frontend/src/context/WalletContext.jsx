import { createContext, useContext, useState, useCallback } from "react";
import { BrowserProvider, Contract } from "ethers";
import {
  POLICY_MANAGER_ADDRESS, ORACLE_AGGREGATOR_ADDRESS,
  PolicyManagerABI, OracleAggregatorABI,
} from "../config/contracts";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("No injected wallet found. Install MetaMask to continue.");
      return;
    }
    try {
      setConnecting(true);
      setError(null);
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      setProvider(browserProvider);
      setAddress(accounts[0]);
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
  }, []);

  async function getSignerContracts() {
    if (!provider) throw new Error("Wallet not connected");
    const signer = await provider.getSigner();
    return {
      policyManager: new Contract(POLICY_MANAGER_ADDRESS, PolicyManagerABI, signer),
      oracleAggregator: new Contract(ORACLE_AGGREGATOR_ADDRESS, OracleAggregatorABI, signer),
      signer,
    };
  }

  return (
    <WalletContext.Provider value={{ address, provider, connecting, error, connect, disconnect, getSignerContracts }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
