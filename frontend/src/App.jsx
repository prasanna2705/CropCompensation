import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TemplatesPage from "./pages/TemplatesPage";
import PolicyDetailPage from "./pages/PolicyDetailPage";
import AdminTemplatesPage from "./pages/AdminTemplatesPage";
import AdminOraclePage from "./pages/AdminOraclePage";
import OracleSimulatorPage from "./pages/OracleSimulatorPage";
import AuditorPage from "./pages/AuditorPage";
import PrototypePage from "./pages/PrototypePage";
import "./App.css";

export default function App() {
  const location = useLocation();
  const isPrototype = location.pathname === "/prototype";
  return (
    <div className="app-shell">
      {!isPrototype && <NavBar />}
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/prototype" replace />} />
          <Route path="/prototype" element={<PrototypePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/dashboard" element={
            <ProtectedRoute roles={["farmer"]}><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/templates" element={
            <ProtectedRoute roles={["farmer"]}><TemplatesPage /></ProtectedRoute>
          } />
          <Route path="/policies/:id" element={
            <ProtectedRoute><PolicyDetailPage /></ProtectedRoute>
          } />

          <Route path="/admin/templates" element={
            <ProtectedRoute roles={["admin"]}><AdminTemplatesPage /></ProtectedRoute>
          } />
          <Route path="/admin/oracles" element={
            <ProtectedRoute roles={["admin"]}><AdminOraclePage /></ProtectedRoute>
          } />

          <Route path="/oracle-simulator" element={
            <ProtectedRoute roles={["admin", "oracle"]}><OracleSimulatorPage /></ProtectedRoute>
          } />
          <Route path="/auditor" element={
            <ProtectedRoute roles={["admin", "auditor"]}><AuditorPage /></ProtectedRoute>
          } />

          <Route path="*" element={<p>Page not found</p>} />
        </Routes>
      </main>
    </div>
  );
}
