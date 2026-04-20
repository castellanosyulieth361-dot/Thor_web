import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./login.css";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [doc, setDoc] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);

    const numero_documento = doc.trim();
    const pass = password.trim();

    if (numero_documento.length < 5) {
      setErr("Escribe un número de documento válido.");
      return;
    }

    if (!pass) {
      setErr("Escribe la contraseña.");
      return;
    }

    try {
      setLoading(true);

      const user = await login(numero_documento, pass);

      if (user.rol === "admin") {
        sessionStorage.removeItem("qr_token_pendiente");
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      // Colaborador: si venía de escanear un QR, volver a esa página
      const qrToken = sessionStorage.getItem("qr_token_pendiente");
      if (qrToken) {
        navigate(`/preoperacional/${qrToken}`, { replace: true });
      } else {
        navigate("/colaborador/dashboard", { replace: true });
      }
    } catch (e2) {
      setErr(e2?.response?.data?.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      {/* Panel izquierdo desktop */}
      <aside className="auth__brand" aria-label="Panel de bienvenida">
        <div className="brand__inner">
          <div className="brand__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="rocket" role="img">
              <path
                d="M14.7 3.1c2.7.7 5.2 3.2 5.9 5.9.2.9-.2 1.8-.9 2.3l-3.2 2.3c-.2 1.6-1 3.9-3.3 6.2-1.5 1.5-3.5 2.6-4.9 3.1-.4.1-.8 0-1-.3l-.6-.6c-.3-.3-.4-.7-.3-1 0 0 .6-1.8 1-3.2-.7.1-1.6.2-2.3.1-.4 0-.8-.4-.9-.9-.2-1.6.5-4.6 3-7.1 2.3-2.3 4.6-3.1 6.2-3.3l2.3-3.2c.5-.7 1.4-1.1 2.3-.9ZM16 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
                fill="currentColor"
              />
              <path
                d="M7.7 13.7 10.3 16.3 9.4 19.2 6.8 16.6 7.7 13.7Z"
                fill="currentColor"
                opacity="0.9"
              />
            </svg>
          </div>

          <div className="brand__title">THOR HORIZON APEX S.A.S.</div>
          <div className="brand__welcome">Bienvenido</div>
          <p className="brand__text">
            Sistema de preoperacionales para control, trazabilidad y seguridad operacional.
          </p>
        </div>

        <div className="brand__wave" aria-hidden="true" />
      </aside>

      {/* Header móvil */}
      <header className="auth__mobileHeader" aria-label="Header móvil">
        <div className="mheader__inner">
          <div className="mheader__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="rocket" role="img">
              <path
                d="M14.7 3.1c2.7.7 5.2 3.2 5.9 5.9.2.9-.2 1.8-.9 2.3l-3.2 2.3c-.2 1.6-1 3.9-3.3 6.2-1.5 1.5-3.5 2.6-4.9 3.1-.4.1-.8 0-1-.3l-.6-.6c-.3-.3-.4-.7-.3-1 0 0 .6-1.8 1-3.2-.7.1-1.6.2-2.3.1-.4 0-.8-.4-.9-.9-.2-1.6.5-4.6 3-7.1 2.3-2.3 4.6-3.1 6.2-3.3l2.3-3.2c.5-.7 1.4-1.1 2.3-.9ZM16 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
                fill="currentColor"
              />
              <path
                d="M7.7 13.7 10.3 16.3 9.4 19.2 6.8 16.6 7.7 13.7Z"
                fill="currentColor"
                opacity="0.9"
              />
            </svg>
          </div>
          <div className="mheader__brand">THOR HORIZON APEX</div>
          <div className="mheader__welcome">Bienvenido</div>
        </div>
        <div className="mheader__wave" aria-hidden="true" />
      </header>

      {/* Formulario */}
      <main className="auth__formWrap">
        <div className="formCard">
          <h1 className="formCard__title">Log in</h1>

          {err && <div className="formError">{err}</div>}

          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              <span className="field__label">Número de documento</span>
              <input
                className="field__input"
                type="text"
                inputMode="numeric"
                placeholder="Ej: 1234567890"
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">Contraseña</span>
              <input
                className="field__input"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <div className="actions">
              <button className="btn btn--primary" type="submit" disabled={loading}>
                {loading ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
