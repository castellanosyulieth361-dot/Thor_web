import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { api } from "../api/axios";
import { getImageUrl } from "../utils";

/**
 * Esta página es el destino del QR impreso en la maquinaria.
 * URL: /preoperacional/:token
 *
 * Flujo:
 * 1. Si el usuario NO está autenticado → lo manda al login guardando el token en sessionStorage
 * 2. Si el usuario está autenticado como colaborador → muestra la maquinaria y arranca el preop
 * 3. Si está autenticado como admin → lo redirige al dashboard de admin
 */
export default function QrPreoperacional() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthed, user } = useContext(AuthContext);

  const [fase, setFase] = useState("cargando"); // cargando | listo | error | ya_hecho
  const [maquina, setMaquina] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    // Guardar el token para recuperarlo después del login
    if (token) sessionStorage.setItem("qr_token_pendiente", token);

    if (!isAuthed) {
      navigate("/login", { replace: true });
      return;
    }

    if (user?.rol === "admin") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    // Colaborador autenticado — cargar la maquinaria
    cargarMaquinaria();
  }, [isAuthed, user, token]);

  async function cargarMaquinaria() {
    try {
      setFase("cargando");
      const r = await api.get(`/maquinaria/colaborador/qr/${token}`);
      setMaquina(r.data.maquinaria);

      if (r.data.preoperacional_hoy) {
        setFase("ya_hecho");
      } else {
        setFase("listo");
      }
    } catch (e) {
      setErrMsg(
        e?.response?.data?.message ||
        "No se encontró la maquinaria o el código QR no es válido."
      );
      setFase("error");
    }
  }

  function iniciarPreop() {
    // Navegar al dashboard del colaborador con la maquinaria preseleccionada
    sessionStorage.removeItem("qr_token_pendiente");
    navigate("/colaborador/dashboard", {
      state: { desde_qr: true, maquinaria_id: maquina.id },
      replace: true,
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      background: "#f8fafc",
    }}>
      {/* Logo */}
      <img
        src="/Logo.png"
        alt="Thor Horizon Apex"
        style={{ height: 60, marginBottom: 32, objectFit: "contain" }}
      />

      {fase === "cargando" && (
        <div style={{ textAlign: "center", color: "#64748b", fontSize: 16 }}>
          Cargando maquinaria...
        </div>
      )}

      {fase === "error" && (
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: "#0f172a" }}>
            QR no válido
          </div>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
            {errMsg}
          </div>
          <button
            onClick={() => navigate("/colaborador/dashboard", { replace: true })}
            style={{
              background: "#1e3a8a",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px 24px",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Ir al inicio
          </button>
        </div>
      )}

      {(fase === "listo" || fase === "ya_hecho") && maquina && (
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        }}>
          {/* Foto de la maquinaria */}
          <div style={{
            width: "100%",
            height: 180,
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 16,
            background: "#e5e7eb",
          }}>
            {maquina.foto_url ? (
              <img
                src={getImageUrl(maquina.foto_url)}
                alt={maquina.nombre}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{
                height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center",
                color: "#9ca3af", fontSize: 14,
              }}>
                Sin foto
              </div>
            )}
          </div>

          <div style={{ fontWeight: 800, fontSize: 20, color: "#0f172a", marginBottom: 4 }}>
            {maquina.nombre}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
            Serial: {maquina.serial}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
            Grupo: {maquina.grupo || "—"}
          </div>

          {/* Estado de la maquinaria */}
          {maquina.dado_baja || maquina.estado === "dado_baja" ? (
            <div style={{
              background: "rgba(239,68,68,0.1)", color: "#991b1b",
              borderRadius: 12, padding: "12px 16px", fontSize: 14,
              fontWeight: 600, marginBottom: 16,
            }}>
              🛑 Esta maquinaria fue dada de baja.
            </div>
          ) : maquina.estado === "mantenimiento" ? (
            <div style={{
              background: "rgba(96,165,250,0.15)", color: "#1e40af",
              borderRadius: 12, padding: "12px 16px", fontSize: 14,
              fontWeight: 600, marginBottom: 16,
            }}>
              🔧 Esta maquinaria está en mantenimiento.
            </div>
          ) : maquina.estado === "no_disponible" ? (
            <div style={{
              background: "rgba(250,204,21,0.15)", color: "#854d0e",
              borderRadius: 12, padding: "12px 16px", fontSize: 14,
              fontWeight: 600, marginBottom: 16,
            }}>
              ⚠️ Esta maquinaria no está disponible.
            </div>
          ) : fase === "ya_hecho" ? (
            <div style={{
              background: "rgba(34,197,94,0.1)", color: "#166534",
              borderRadius: 12, padding: "12px 16px", fontSize: 14,
              fontWeight: 600, marginBottom: 16,
            }}>
              ✅ El preoperacional de hoy ya fue registrado para esta maquinaria.
            </div>
          ) : (
            <button
              onClick={iniciarPreop}
              style={{
                background: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "16px 24px",
                fontWeight: 800,
                fontSize: 16,
                cursor: "pointer",
                width: "100%",
                marginBottom: 12,
                boxShadow: "0 6px 20px rgba(30,58,138,0.3)",
              }}
            >
              Iniciar preoperacional →
            </button>
          )}

          <button
            onClick={() => navigate("/colaborador/dashboard", { replace: true })}
            style={{
              background: "transparent",
              color: "#64748b",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "12px 24px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Ir al inicio
          </button>
        </div>
      )}
    </div>
  );
}
