import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("agrishield_user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  async function login(email, password) {
    const { user, token } = await api.login({ email, password });
    localStorage.setItem("agrishield_token", token);
    localStorage.setItem("agrishield_user", JSON.stringify(user));
    setUser(user);
    return user;
  }

  async function register(payload) {
    const { user, token } = await api.register(payload);
    localStorage.setItem("agrishield_token", token);
    localStorage.setItem("agrishield_user", JSON.stringify(user));
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem("agrishield_token");
    localStorage.removeItem("agrishield_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
