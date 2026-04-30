import { useState } from "react";
import { FiFileText, FiTool, FiBell, FiUser, FiLogOut, FiHome } from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";
import { TbReport } from "react-icons/tb";
import "./Header.css";

export default function Header({ onNavigate, onLogout, currentTab, isMobile, cantAlertas = 0 }) {
  const [open, setOpen] = useState(false);

  const handleNavigate = (tab) => {
    onNavigate?.(tab);
    setOpen(false);
  };

  // ✅ CORREGIDO: Overlay que cierra correctamente
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setOpen(false);
    }
  };

  return (
    <header className="main-header">
      {/* ✅ Overlay corregido */}
      {open && (
        <div
          className="menu-overlay"
          onClick={handleOverlayClick}
        />
      )}

      <div className="logo-container">
        <div className="logo-icon">
          <img src="/Logo.png" alt="Logo Thor" />
        </div>
      </div>

      <div className="menu-container">
        {/* ✅ Hamburguesa */}
        <div
          className={`hamburger2 ${open ? "active" : ""}`}
          onClick={() => setOpen(!open)}
          style={{ position: "relative" }}
        >
          <span></span>
          <span></span>
          <span></span>
          {cantAlertas > 0 && (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                width: 10,
                height: 10,
                background: "#ef4444",
                borderRadius: "50%",
                border: "2px solid #fff",
                display: "block",
              }}
            />
          )}
        </div>

        {/* ✅ Dropdown con className correcta */}
        <div className={`dropdown ${open ? "show" : ""}`}>
          <MenuItem
            icon={<FiHome />}
            label="Inicio"
            active={currentTab === "inicio"}
            onClick={() => handleNavigate("inicio")}
          />
          <MenuItem
            icon={<FiFileText />}
            label="Iniciar Preoperacional"
            active={currentTab === "preoperacional"}
            onClick={() => handleNavigate("preoperacional")}
          />
          <MenuItem
            icon={<FiTool />}
            label="Herramientas y Equipos"
            active={currentTab === "herramientas"}
            onClick={() => handleNavigate("herramientas")}
          />
          <MenuItem
            icon={<TbReport />}
            label="Reportes de Observación"
            active={currentTab === "reportes"}
            onClick={() => handleNavigate("reportes")}
          />
          <MenuItem
            icon={<FiBell />}
            label="Alertas"
            active={currentTab === "alertas"}
            badge={cantAlertas}
            onClick={() => handleNavigate("alertas")}
          />
          {isMobile && (
            <MenuItem
              icon={<BsQrCode />}
              label="Escanear QR"
              active={currentTab === "qr"}
              onClick={() => handleNavigate("qr")}
            />
          )}
          <MenuItem
            icon={<FiUser />}
            label="Perfil"
            active={currentTab === "perfil"}
            onClick={() => handleNavigate("perfil")}
          />

          <hr />

          <div className="menu-item logout" onClick={onLogout}>
            <FiLogOut className="menu-icon" />
            <span>Cerrar sesión</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ✅ MenuItem SIN CAMBIOS
function MenuItem({ icon, label, active, badge = 0, onClick }) {
  return (
    <div
      className={`menu-item ${active ? "menu-item--active" : ""}`}
      onClick={onClick}
      style={{ position: "relative" }}
    >
      <span className="menu-icon" style={{ position: "relative" }}>
        {icon}
        {badge > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 8,
              height: 8,
              background: "#ef4444",
              borderRadius: "50%",
              border: "1.5px solid #fff",
              display: "block",
            }}
          />
        )}
      </span>
      <span>{label}</span>
      {active && (
        <span
          style={{
            marginLeft: "auto",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#1e3a8a",
            display: "block",
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}