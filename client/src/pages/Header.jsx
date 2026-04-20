import { useState } from "react";
import { FiFileText, FiTool, FiBell, FiUser, FiLogOut, FiHome } from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";
import "./Header.css";

export default function Header({ onNavigate, onLogout, currentTab, isMobile, cantAlertas = 0 }) {
  const [open, setOpen] = useState(false);

  const handleNavigate = (tab) => {
    onNavigate?.(tab);
    setOpen(false);
  };

  return (
    <header className="main-header">
      {/* Cerrar dropdown al hacer click fuera */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
          }}
          onClick={() => setOpen(false)}
        />
      )}

      <div className="logo-container">
        <div className="logo-icon">
          <img src="/Logo.png" alt="Logo Thor" />
        </div>
      </div>

      <div className="menu-container">
        {/* Botón hamburguesa con punto rojo si hay alertas */}
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
