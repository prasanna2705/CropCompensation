import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { redirectByRole } from "./LoginPage";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "farmer" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await register(form);
      redirectByRole(user.role, navigate);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h2>Create an AgriShield Account</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required />
        </label>
        <label>
          Role (demo only — a real deployment would assign admin/oracle roles manually)
          <select value={form.role} onChange={(e) => update("role", e.target.value)}>
            <option value="farmer">Farmer</option>
            <option value="admin">Insurer/Admin</option>
            <option value="oracle">Oracle Node</option>
            <option value="auditor">Auditor</option>
          </select>
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? "Creating account..." : "Register"}</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}
