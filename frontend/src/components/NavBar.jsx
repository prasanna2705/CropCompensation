import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";

export default function NavBar() {
  const { user, logout } = useAuth();
  const { address, connect, connecting } = useWallet();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">🌾 AgriShield</Link>
      </div>
      <div className="navbar-links">
        {user && (
          <>
            {user.role === "farmer" && <Link to="/dashboard">Dashboard</Link>}
            {user.role === "farmer" && <Link to="/templates">Browse Policies</Link>}
            {user.role === "admin" && <Link to="/admin/templates">Manage Templates</Link>}
            {user.role === "admin" && <Link to="/admin/oracles">Manage Oracles</Link>}
            {(user.role === "admin" || user.role === "oracle") && <Link to="/oracle-simulator">Oracle Simulator</Link>}
            {(user.role === "admin" || user.role === "auditor") && <Link to="/auditor">Transparency Feed</Link>}
          </>
        )}
      </div>
      <div className="navbar-actions">
        {address ? (
          <span className="wallet-badge" title={address}>
            🔗 {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        ) : (
          <button onClick={connect} disabled={connecting}>
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
        {user ? (
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Logout ({user.name})
          </button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}
