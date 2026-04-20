import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import ColaboradorDashboard from "./pages/ColaboradorDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import MaquinariaDetalle from "./pages/MaquinariaDetalle.jsx";
import QrPreoperacional from "./pages/QrPreoperacional.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Destino del QR impreso — captura el token y arranca el preop */}
        <Route path="/preoperacional/:token" element={<QrPreoperacional />} />

        <Route
          path="/colaborador/dashboard"
          element={
            <RequireAuth onlyRole="colaborador">
              <ColaboradorDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth onlyRole="admin">
              <AdminDashboard />
            </RequireAuth>
          }
        />

        {/* ✅ Protegida con RequireAuth */}
        <Route
          path="/admin/maquinaria/:id"
          element={
            <RequireAuth onlyRole="admin">
              <MaquinariaDetalle />
            </RequireAuth>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
