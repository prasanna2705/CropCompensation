import { API_BASE_URL } from "../config/contracts";

function getToken() {
  return localStorage.getItem("agrishield_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),

  listTemplates: () => request("/templates"),
  recordTemplate: (payload) => request("/templates", { method: "POST", body: payload }),
  verifyTemplateOnChain: (onChainId) => request(`/templates/on-chain/${onChainId}`),

  myPolicies: () => request("/policies/mine"),
  recordPolicyPurchase: (payload) => request("/policies", { method: "POST", body: payload }),
  getPolicyDetail: (id) => request(`/policies/${id}`),

  recordReading: (payload) => request("/oracle/readings", { method: "POST", body: payload }),
  listReadings: (regionId) => request(`/oracle/readings/${regionId}`),

  listTransactions: () => request("/audit/transactions"),
  getPayout: (policyId) => request(`/audit/payouts/${policyId}`),
};
