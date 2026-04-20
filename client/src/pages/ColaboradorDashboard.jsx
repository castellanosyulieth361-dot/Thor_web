import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "./colaborador.css";
import Header from "./Header";
import PreoperacionalColaborador from "./PreoperacionalColaborador";
import { api } from "../api/axios";
import { getImageUrl, formatAccion } from "../utils";
import { Field, Info, PreviewList, FotoInput } from "../components/shared";

import { FiFileText, FiTool, FiBell, FiUser } from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";
import { TbReport } from "react-icons/tb";

import ReporteObservacionColaborador from "./ReporteObservacionColaborador";

export default function ColaboradorDashboard() {
  const { user, logout, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [tab, setTab] = useState("inicio");
  const [tabReload, setTabReload] = useState(0);
  const [preopHabilitado, setPreopHabilitado] = useState(null);
  const location = useLocation();

  // Si viene de QrPreoperacional con navigate state, cargar esa maquinaria
  useEffect(() => {
    if (location.state?.desde_qr && location.state?.maquinaria_id) {
      setPreopHabilitado({
        desde_qr: true,
        maquinaria_id: location.state.maquinaria_id,
      });
      setTab("preoperacional");
      // Limpiar el state para evitar que se repita al recargar
      window.history.replaceState({}, "", location.pathname);
    }
  }, []);
  const [cantAlertas, setCantAlertas] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  function handleTabChange(nextTab) {
    if (nextTab === tab) {
      setTabReload((prev) => prev + 1);
      return;
    }
    setTab(nextTab);
  }

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Polling de alertas activas para el punto rojo
  useEffect(() => {
    async function checkAlertas() {
      try {
        const r = await api.get("/usuarios/mis-alertas");
        const hoy = new Date().toISOString().slice(0, 10);
        const activas = (r.data || []).filter(
          (a) => a.es_hoy || String(a.fecha || "").slice(0, 10) === hoy
        );
        setCantAlertas(activas.length);
      } catch {
        // silenciar error de polling
      }
    }

    checkAlertas();
    const t = setInterval(checkAlertas, 15000);
    return () => clearInterval(t);
  }, []);

  const modules = [
    {
      key: "preoperacional",
      title: "Iniciar Preoperacional",
      desc: "Registrar inspección diaria",
      icon: <FiFileText />,
    },
    {
      key: "herramientas",
      title: "Herramientas y Equipos",
      desc: "Consulta de equipos asignados",
      icon: <FiTool />,
    },
    {
      key: "reportes",
      title: "Reportes de Observación",
      desc: "Reporta actos que beneficien o traigan consecuencias para la empresa",
      icon: <TbReport />,
    },
    {
      key: "alertas",
      title: "Alertas",
      desc: "Notificaciones y avisos",
      icon: <FiBell />,
      badge: cantAlertas,
    },
    {
      key: "perfil",
      title: "Perfil",
      desc: "Información personal",
      icon: <FiUser />,
    },
    ...(isMobile
      ? [
        {
          key: "qr",
          title: "Escanear QR",
          desc: "Acceso rápido en campo",
          icon: <BsQrCode />,
        },
      ]
      : []),
  ];

  return (
    <>
      <Header
        onNavigate={handleTabChange}
        onLogout={handleLogout}
        currentTab={tab}
        isMobile={isMobile}
        cantAlertas={cantAlertas}
      />

      <div className="dashboard-container">
        <div className="dashboard-panel">
          {tab === "inicio" && (
            <div className="welcome-section">
              Bienvenido a THOR HORIZON APEX S.A.S.{" "}
              <strong>{user?.nombre}</strong>
            </div>
          )}

          {tab === "inicio" && (
            <h2 className="dashboard-title">Panel Principal</h2>
          )}

          {tab === "inicio" && (
            <div className="dashboard-grid">
              {modules.map((module) => (
                <div
                  key={module.key}
                  className="dashboard-card"
                  onClick={() => setTab(module.key)}
                >
                  <div className="card-content">
                    <div className="card-icon" style={{ position: "relative" }}>
                      {module.icon}
                      {module.badge > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            background: "#ef4444",
                            borderRadius: "50%",
                            width: 12,
                            height: 12,
                            display: "block",
                            border: "2px solid #fff",
                          }}
                        />
                      )}
                    </div>
                    <div className="card-text">
                      <h3>{module.title}</h3>
                      <p>{module.desc}</p>
                    </div>
                  </div>
                  <span className="card-accent"></span>
                </div>
              ))}
            </div>
          )}

          {tab === "preoperacional" && (
            <PreoperacionalColaborador
              onNavigate={setTab}
              onBack={() => {
                setPreopHabilitado(null);
                setTab("inicio");
              }}
              preopHabilitado={preopHabilitado}
              clearPreopHabilitado={() => setPreopHabilitado(null)}
            />
          )}

          {tab === "herramientas" && (
            <HerramientasColaborador
              key={`herramientas-${tabReload}`}
              onBack={() => setTab("inicio")}
            />
          )}


          {tab === "reportes" && (
            <ReporteObservacionColaborador
              key={`reportes-${tabReload}`}
              onBack={() => setTab("inicio")}
            />
          )}

          {tab === "alertas" && (
            <AlertasColaborador
              key={`alertas-${tabReload}`}
              onBack={() => setTab("inicio")}
              onResponderHabilitado={(data) => {
                setPreopHabilitado(data);
                setTab("preoperacional");
              }}
            />
          )}

          {tab === "perfil" && (
            <PerfilColaborador
              key={`perfil-${tabReload}`}
              user={user}
              onUserUpdated={(updatedUser) => setUser(updatedUser)}
              onBack={() => setTab("inicio")}
            />
          )}

          {tab === "qr" && isMobile && (
            <QrColaborador
              key={`qr-${tabReload}`}
              onBack={(nextTab, maquinaDesdeQr) => {
                if (nextTab === "preoperacional" && maquinaDesdeQr) {
                  setPreopHabilitado({
                    desde_qr: true,
                    maquinaria_id: maquinaDesdeQr.id,
                  });
                  setTab("preoperacional");
                } else {
                  setTab("inicio");
                }
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERRAMIENTAS Y EQUIPOS
// ─────────────────────────────────────────────────────────────────────────────
function HerramientasColaborador({ onBack }) {
  const [grupos, setGrupos] = useState([]);
  const [grupoId, setGrupoId] = useState("");
  const [search, setSearch] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selectedMaquina, setSelectedMaquina] = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  async function loadMaquinaria(searchValue = search) {
    try {
      setLoading(true);
      setErr(null);

      const [gruposRes, maqRes] = await Promise.all([
        api.get("/grupos"),
        api.get("/maquinaria/colaborador/disponibles", {
          params: {
            ...(grupoId ? { grupo_id: Number(grupoId) } : {}),
            ...(searchValue.trim() ? { q: searchValue.trim() } : {}),
          },
        }),
      ]);

      setGrupos(gruposRes.data || []);
      setList(maqRes.data || []);
    } catch (e) {
      setErr(
        e?.response?.data?.message || "No se pudo cargar la maquinaria."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => loadMaquinaria(search), 300);
    return () => clearTimeout(t);
  }, [grupoId, search]);

  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="mini" onClick={onBack}>
          Volver
        </button>
      </div>

      <h2 className="panel__title">Herramientas y Equipos</h2>

      <div style={{ display: "flex", gap: "12px", marginTop: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: "240px" }}>
          <Field label="Buscar herramienta o equipo">
            <input
              className="inp"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, serial o marca..."
            />
          </Field>
        </div>
        <div style={{ flex: 1, minWidth: "220px" }}>
          <Field label="Grupo">
            <select
              className="inp"
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
            >
              <option value="">Todos los grupos</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {loading && <div className="hint" style={{ marginTop: 12 }}>Cargando...</div>}
      {err && <div className="alert err" style={{ marginTop: 12 }}>{err}</div>}

      {!loading && !err && (
        <>
          <div className="cards" style={{ marginTop: 16 }}>
            {list.map((m) => (
              <div key={m.id} className={`maquinaCard ${getEstadoClase(m)}`}>
                <div className="maquinaCard__photo maqPhotoWrap">
                  {m.foto_url ? (
                    <img src={getImageUrl(m.foto_url)} alt={m.nombre} />
                  ) : (
                    <div className="thumb__ph">Sin foto</div>
                  )}
                  {m.preoperacional_hoy_id && m.cumple_general === true && (
                    <span className="maqBadge maqBadge--ok">Cumplió ✅</span>
                  )}
                  {m.preoperacional_hoy_id && m.cumple_general === false && (
                    <span className="maqBadge maqBadge--fallo">No cumplió ❌</span>
                  )}
                  {(m.estado === "mantenimiento" || m.estado_dia === "mantenimiento") && (
                    <span className="maqBadge maqBadge--blue">Mantenimiento</span>
                  )}
                  {(m.estado === "no_disponible" || m.estado_dia === "no_disponible") && (
                    <span className="maqBadge maqBadge--gray">No disponible</span>
                  )}
                </div>
                <div className="maquinaCard__name">{m.nombre}</div>
                <div className="maquinaCard__sub">Serial: {m.serial}</div>
                <div className="maquinaCard__sub">Marca: {m.marca || "—"}</div>
                <div className="maquinaCard__sub">Modelo: {m.modelo || "—"}</div>
                <div className="maquinaCard__sub">Grupo: {m.grupo || "—"}</div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button
                    className="mini mini--blue"
                    onClick={() => {
                      setSelectedMaquina(m);
                      setDetalleOpen(true);
                    }}
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
          {list.length === 0 && (
            <div className="hint" style={{ marginTop: 14 }}>
              No se encontraron herramientas o equipos.
            </div>
          )}
        </>
      )}

      {detalleOpen && selectedMaquina && (
        <DetalleMaquinariaColaboradorModal
          maquina={selectedMaquina}
          onClose={() => {
            setDetalleOpen(false);
            setSelectedMaquina(null);
          }}
        />
      )}
    </div>
  );
}

function DetalleMaquinariaColaboradorModal({ maquina, onClose }) {
  const [detalle, setDetalle] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [preops, setPreops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [dRes, hRes, pRes] = await Promise.all([
          api.get(`/maquinaria/colaborador/${maquina.id}/detalle`),
          api.get(`/maquinaria/colaborador/${maquina.id}/historial`),
          api.get(`/maquinaria/colaborador/${maquina.id}/preoperacionales`),
        ]);
        setDetalle(dRes.data || null);
        setHistorial(hRes.data || []);
        setPreops(pRes.data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || "No se pudo cargar el detalle.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [maquina.id]);

  const maq = detalle?.maquinaria;

  return (
    <div className="modal__back">
      <div className="modal modal--xl">
        <div className="modal__head">
          <div>
            <div className="modal__title">Detalle de herramienta / equipo</div>
            <div className="modal__sub">{maquina.nombre}</div>
          </div>
          <button className="mini" onClick={onClose}>Cerrar</button>
        </div>

        {loading && <div className="hint">Cargando detalle...</div>}
        {err && <div className="alert err">{err}</div>}

        {!loading && !err && maq && (
          <>
            <div className="maqHero">
              <div className="maqHero__photo">
                {maq.foto_url ? (
                  <img src={getImageUrl(maq.foto_url)} alt={maq.nombre} />
                ) : (
                  <div className="thumb__ph">Sin foto</div>
                )}
              </div>
              <div className="maqHero__info">
                <h2 className="maqHero__title">{maq.nombre}</h2>
                <div className="grid2">
                  <Info label="Serial" value={maq.serial || "—"} />
                  <Info label="Marca" value={maq.marca || "—"} />
                  <Info label="Modelo" value={maq.modelo || "—"} />
                  <Info label="Grupo" value={maq.grupo || "—"} />
                  <Info label="Estado actual" value={maq.estado || "—"} />
                  <Info label="Dado de baja" value={maq.dado_baja ? "Sí" : "No"} />
                </div>
              </div>
            </div>

            <div className="maqSection" style={{ marginTop: 18 }}>
              <h3 className="box__title">Historial</h3>
              <PreviewList
                items={historial}
                emptyText="No hay historial registrado."
                renderItem={(h) => (
                  <div key={h.id} className="previewCard previewCard--history">
                    <div className="previewCard__badge">{formatAccion(h.accion)}</div>
                    <div className="previewCard__title">{formatAccion(h.accion)}</div>
                    <div className="previewCard__sub">{h.descripcion || "Sin descripción"}</div>
                    <div className="previewCard__sub">{h.creado_en_texto || h.creado_en}</div>
                  </div>
                )}
              />
            </div>

            <div className="maqSection" style={{ marginTop: 18 }}>
              <h3 className="box__title">Últimos preoperacionales</h3>
              <PreviewList
                items={preops}
                emptyText="No hay preoperacionales registrados."
                renderItem={(p) => (
                  <div key={p.id} className="previewCard previewCard--preop">
                    <div className="previewCard__badge">{p.estado_texto || "Preoperacional"}</div>
                    <div className="previewCard__title">{p.fecha_texto || p.fecha}</div>
                    <div className="previewCard__sub">Colaborador: {p.usuario_nombre || "—"}</div>
                    {p.observacion_general && (
                      <div className="previewCard__sub">Obs: {p.observacion_general}</div>
                    )}
                  </div>
                )}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTAS
// ─────────────────────────────────────────────────────────────────────────────
function AlertasColaborador({ onBack, onResponderHabilitado }) {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [mostrarAntiguas, setMostrarAntiguas] = useState(false);

  async function loadAlertas() {
    try {
      setLoading(true);
      setErr(null);
      const r = await api.get("/usuarios/mis-alertas");
      setAlertas(r.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudieron cargar las alertas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlertas();
    const timer = setInterval(loadAlertas, 15000);
    return () => clearInterval(timer);
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);
  const alertasHoy = alertas.filter(
    (a) => a.es_hoy || String(a.fecha || "").slice(0, 10) === hoy
  );
  const alertasAntiguas = alertas.filter(
    (a) => !a.es_hoy && String(a.fecha || "").slice(0, 10) < hoy
  );

  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="mini" onClick={onBack}>Volver</button>
      </div>

      <h2 className="panel__title">Alertas</h2>

      {loading && <div className="hint">Cargando alertas...</div>}
      {err && <div className="alert err">{err}</div>}

      {!loading && !err && (
        <>
          <h3 className="box__title" style={{ marginBottom: 12 }}>Alertas de hoy</h3>

          {alertasHoy.length === 0 ? (
            <div className="hint">No tienes alertas activas hoy. ✅</div>
          ) : (
            <div className="previewGrid">
              {alertasHoy.map((a) => (
                <AlertaCard
                  key={`${a.tipo}-${a.id}`}
                  alerta={a}
                  onResponder={onResponderHabilitado}
                />
              ))}
            </div>
          )}

          {alertasAntiguas.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <button
                className="mini"
                onClick={() => setMostrarAntiguas((p) => !p)}
              >
                {mostrarAntiguas
                  ? "Ocultar alertas antiguas"
                  : `Ver alertas antiguas (${alertasAntiguas.length})`}
              </button>

              {mostrarAntiguas && (
                <div className="previewGrid" style={{ marginTop: 12 }}>
                  {alertasAntiguas.map((a) => (
                    <AlertaCard
                      key={`${a.tipo}-${a.id}`}
                      alerta={a}
                      onResponder={onResponderHabilitado}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertaCard({ alerta: a, onResponder }) {
  return (
    <div
      className={`previewCard ${a.tipo === "habilitacion" ? "previewCard--history" : "previewCard--preop"
        }`}
    >
      <div className="previewCard__badge">
        {a.tipo === "habilitacion" ? "Preoperacional habilitado" : "Alerta"}
      </div>
      <div className="previewCard__title">
        {a.tipo === "habilitacion"
          ? a.maquinaria_nombre || "Maquinaria"
          : "Notificación del administrador"}
      </div>
      {a.tipo === "habilitacion" && (
        <>
          <div className="previewCard__sub">Serial: {a.serial || "—"}</div>
          <div className="previewCard__sub">
            Fecha a responder: {String(a.fecha_objetivo || "").slice(0, 10)}
          </div>
          <div className="previewCard__sub">
            Disponible hasta:{" "}
            {a.vence_en ? new Date(a.vence_en).toLocaleString("es-CO") : "—"}
          </div>
          {a.foto_url && (
            <div
              className="maquinaCard__photo maqPhotoWrap"
              style={{ marginTop: 10 }}
            >
              <img src={getImageUrl(a.foto_url)} alt={a.maquinaria_nombre} />
            </div>
          )}
        </>
      )}
      <div className="previewCard__sub" style={{ marginTop: 8 }}>
        {a.mensaje}
      </div>
      {a.tipo === "habilitacion" && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="mini mini--blue" onClick={() => onResponder?.(a)}>
            Responder
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFIL
// ─────────────────────────────────────────────────────────────────────────────
function PerfilColaborador({ user, onUserUpdated, onBack }) {
  const [editando, setEditando] = useState(false);
  const [direccion, setDireccion] = useState(user?.direccion || "");
  const [fotoUrl, setFotoUrl] = useState(user?.foto_url || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Calendario de preops
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [minMonth, setMinMonth] = useState(null);
  const [resumen, setResumen] = useState({});
  const [loadingCal, setLoadingCal] = useState(false);

  useEffect(() => {
    async function loadResumen() {
      if (!user?.id) return;
      try {
        setLoadingCal(true);
        const r = await api.get(
          `/usuarios/${user.id}/preoperacionales/resumen`,
          { params: { month } }
        );
        setResumen(r.data?.resumen || {});
        if (r.data?.minMonth && !minMonth) setMinMonth(r.data.minMonth);
      } catch {
        // silenciar
      } finally {
        setLoadingCal(false);
      }
    }
    loadResumen();
  }, [month, user?.id]);

  async function guardar() {
    try {
      setSaving(true);
      setMsg(null);

      await api.put(`/usuarios/${user.id}`, {
        nombre: user.nombre,
        cargo: user.cargo,
        fecha_ingreso: user.fecha_ingreso,
        tipo_contrato: user.tipo_contrato,
        rh: user.rh,
        direccion,
        numero_documento: user.numero_documento,
        foto_url: fotoUrl || user.foto_url,
        rol: user.rol || "colaborador",
      });

      // Actualizar el contexto con los nuevos datos
      onUserUpdated?.({ ...user, direccion, foto_url: fotoUrl || user.foto_url });

      setMsg({ type: "ok", text: "Perfil actualizado correctamente ✅" });
      setEditando(false);
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "No se pudo actualizar.",
      });
    } finally {
      setSaving(false);
    }
  }

  // Lógica del calendario
  const [y, m] = month.split("-").map(Number);
  const firstDate = new Date(y, m - 1, 1);
  const lastDate = new Date(y, m, 0);
  const jsDay = firstDate.getDay();
  const offset = jsDay === 0 ? 6 : jsDay - 1;
  const daysInMonth = lastDate.getDate();
  const todayStr = today.toISOString().slice(0, 10);

  const days = [];
  for (let i = 0; i < offset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function prevMonth() {
    const date = new Date(y, m - 2, 1);
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (minMonth && next < minMonth) return;
    setMonth(next);
  }

  function nextMonth() {
    const date = new Date(y, m, 1);
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (next <= defaultMonth) setMonth(next);
  }

  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="mini" onClick={onBack}>
          Volver
        </button>
      </div>

      <h2 className="panel__title">Mi Perfil</h2>

      {/* Foto y datos */}
      <div className="maqHero" style={{ margin: 0 }}>
        <div className="maqHero__photo">
          {fotoUrl ? (
            <img src={getImageUrl(fotoUrl)} alt={user?.nombre} />
          ) : (
            <div className="thumb__ph">Sin foto</div>
          )}
        </div>

        <div className="maqHero__info">
          <div className="grid2">
            <Info label="Nombre" value={user?.nombre || "—"} />
            <Info label="Documento" value={user?.numero_documento || "—"} />
            <Info label="Cargo" value={user?.cargo || "—"} />
            <Info label="Rol" value={user?.rol || "colaborador"} />
          </div>

          {editando ? (
            <>
              <Field label="Dirección" style={{ marginTop: 12 }}>
                <input
                  className="inp"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Tu dirección"
                />
              </Field>

              <Field label="Foto de perfil" style={{ marginTop: 12 }}>
                <FotoInput
                  initialUrl={fotoUrl ? getImageUrl(fotoUrl) : ""}
                  onUpload={(url) => {
                    if (url) setFotoUrl(url);
                  }}
                />
              </Field>

              {msg && (
                <div
                  className={msg.type === "ok" ? "alert ok" : "alert err"}
                  style={{ marginTop: 10 }}
                >
                  {msg.text}
                </div>
              )}

              <div className="row" style={{ marginTop: 12 }}>
                <button
                  className="mini"
                  onClick={() => {
                    setEditando(false);
                    setMsg(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="mini mini--blue"
                  onClick={guardar}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </>
          ) : (
            <>
              <Info label="Dirección" value={direccion || "—"} />
              {msg && (
                <div
                  className={msg.type === "ok" ? "alert ok" : "alert err"}
                  style={{ marginTop: 10 }}
                >
                  {msg.text}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button
                  className="mini mini--blue"
                  onClick={() => setEditando(true)}
                >
                  Editar perfil
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mini calendario de preops */}
      <div className="maqSection" style={{ marginTop: 20 }}>
        <div
          className="row"
          style={{ justifyContent: "space-between", marginBottom: 10 }}
        >
          <h3 className="box__title">Mis preoperacionales</h3>
          <div className="row">
            <button
              className="mini"
              onClick={prevMonth}
              disabled={minMonth ? month <= minMonth : false}
            >
              ◀
            </button>
            <span className="monthLabel">
              {new Date(y, m - 1, 1).toLocaleDateString("es-CO", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              className="mini"
              onClick={nextMonth}
              disabled={month >= defaultMonth}
            >
              ▶
            </button>
          </div>
        </div>

        <div className="legend">
          <span className="legend__item">
            <span className="dot dot--green"></span> Realizado
          </span>
          <span className="legend__item">
            <span className="dot dot--yellow"></span> N/A
          </span>
          <span className="legend__item">
            <span className="dot dot--red"></span> No realizado
          </span>
        </div>

        {loadingCal ? (
          <div className="hint">Cargando...</div>
        ) : (
          <>
            <div className="calendarHead">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="calendarHead__cell">
                  {d}
                </div>
              ))}
            </div>
            <div className="calendarGrid">
              {days.map((day, idx) => {
                if (!day)
                  return (
                    <div
                      key={`e-${idx}`}
                      className="calendarCell calendarCell--empty"
                    />
                  );

                const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(
                  day
                ).padStart(2, "0")}`;
                const esFuturo = dateKey > todayStr;
                const estado =
                  resumen?.[dateKey]?.estado ||
                  (esFuturo ? "futuro" : "no_realizado");

                const cls = esFuturo
                  ? "calendarCell--gray calendarCell--locked"
                  : estado === "realizado"
                    ? "calendarCell--green"
                    : estado === "na"
                      ? "calendarCell--yellow"
                      : estado === "bloqueado"
                        ? "calendarCell--beige"
                        : "calendarCell--red";

                return (
                  <div
                    key={dateKey}
                    className={`calendarCell ${cls}`}
                    title={
                      esFuturo
                        ? "Día futuro"
                        : estado === "realizado"
                          ? "Preoperacional realizado"
                          : estado === "na"
                            ? `N/A: ${resumen?.[dateKey]?.motivo || "Sin motivo"}`
                            : estado === "bloqueado"
                              ? "Antes de tu ingreso"
                              : "Sin preoperacional"
                    }
                  >
                    <span className="calendarCell__num">{day}</span>
                    {esFuturo && <span className="calendarLock">🔒</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCÁNER QR
// ─────────────────────────────────────────────────────────────────────────────
function QrColaborador({ onBack }) {
  const [fase, setFase] = useState("escaneando");
  const [maquina, setMaquina] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [camaraErr, setCamaraErr] = useState(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const procesandoRef = useRef(false);

  useEffect(() => {
    if (fase !== "escaneando") return;

    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;

    codeReader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, err) => {
          if (!result || procesandoRef.current) return;
          procesandoRef.current = true;

          const texto = result.getText();
          const partes = texto.trim().split("/");
          const token = partes[partes.length - 1];

          if (!token) {
            setErrMsg("QR inválido — no se pudo leer el código.");
            setFase("error");
            procesandoRef.current = false;
            return;
          }

          setFase("cargando");

          try {
            const r = await api.get(`/maquinaria/colaborador/qr/${token}`);
            setMaquina(r.data.maquinaria);
            setDetalle(r.data);
            setFase("resultado");
          } catch (e) {
            setErrMsg(
              e?.response?.data?.message ||
              "No se encontró la maquinaria o no está disponible."
            );
            setFase("error");
          } finally {
            procesandoRef.current = false;
          }
        }
      )
      .catch((e) => {
        setCamaraErr(e);
      });

    return () => {
      try {
        codeReader.reset();
      } catch { }
    };
  }, [fase]);

  function reiniciar() {
    procesandoRef.current = false;
    setMaquina(null);
    setDetalle(null);
    setErrMsg("");
    setCamaraErr(null);
    try {
      readerRef.current?.reset();
    } catch { }
    setFase("escaneando");
  }

  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="mini" onClick={() => onBack()}>
          Volver
        </button>
      </div>

      <h2 className="panel__title">Escanear QR</h2>

      {/* ── ESCANEANDO ── */}
      {fase === "escaneando" && (
        <div style={{ marginTop: 12 }}>
          <div className="hint" style={{ marginBottom: 12 }}>
            Apunta la cámara al código QR de la maquinaria.
          </div>

          {camaraErr ? (
            <div className="alert err">
              No se pudo acceder a la cámara. Verifica los permisos del
              navegador.
              <br />
              <button
                className="mini"
                style={{ marginTop: 10 }}
                onClick={() => {
                  setCamaraErr(null);
                  setFase("escaneando");
                }}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                maxWidth: 360,
                margin: "0 auto",
                borderRadius: 12,
                overflow: "hidden",
                border: "2px solid #e5e7eb",
                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              }}
            >
              <video
                ref={videoRef}
                style={{ width: "100%", display: "block" }}
                autoPlay
                muted
                playsInline
              />
            </div>
          )}

          <div className="hint" style={{ marginTop: 14, textAlign: "center" }}>
            El escáner se activa automáticamente.
          </div>
        </div>
      )}

      {/* ── CARGANDO ── */}
      {fase === "cargando" && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <div className="hint">Buscando maquinaria...</div>
        </div>
      )}

      {/* ── ERROR ── */}
      {fase === "error" && (
        <div style={{ marginTop: 16 }}>
          <div className="alert err">{errMsg}</div>
          <button
            className="mini"
            style={{ marginTop: 12 }}
            onClick={reiniciar}
          >
            Escanear de nuevo
          </button>
        </div>
      )}

      {/* ── RESULTADO ── */}
      {fase === "resultado" && maquina && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              background: "#f9fafb",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              padding: "16px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "#e5e7eb",
                }}
              >
                {maquina.foto_url ? (
                  <img
                    src={getImageUrl(maquina.foto_url)}
                    alt={maquina.nombre}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div className="thumb__ph" style={{ height: "100%" }}>
                    Sin foto
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  {maquina.nombre}
                </div>
                <div className="previewCard__sub">
                  Serial: {maquina.serial}
                </div>
                <div className="previewCard__sub">
                  Grupo: {maquina.grupo || "—"}
                </div>
                <div className="previewCard__sub">
                  Estado:{" "}
                  <span
                    style={{
                      color:
                        maquina.estado === "disponible"
                          ? "#16a34a"
                          : "#dc2626",
                      fontWeight: 600,
                    }}
                  >
                    {maquina.estado}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {maquina.dado_baja || maquina.estado === "dado_baja" ? (
            <div className="alert err">Esta maquinaria fue dada de baja.</div>
          ) : maquina.estado === "mantenimiento" ? (
            <div className="alert err">
              Esta maquinaria está en mantenimiento.
            </div>
          ) : maquina.estado === "no_disponible" ? (
            <div className="alert err">
              Esta maquinaria no está disponible.
            </div>
          ) : detalle?.preoperacional_hoy ? (
            <div className="alert ok">
              ✅ Esta maquinaria ya tiene preoperacional registrado hoy.
            </div>
          ) : (
            <button
              className="mini mini--blue"
              style={{ width: "100%", padding: "12px 0", fontSize: 15 }}
              onClick={() => onBack("preoperacional", maquina)}
            >
              Iniciar preoperacional →
            </button>
          )}

          <button
            className="mini"
            style={{ marginTop: 12, width: "100%" }}
            onClick={reiniciar}
          >
            Escanear otra maquinaria
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getEstadoClase(m) {
  if (m.preoperacional_hoy_id && m.cumple_general === true) return "card--ok";
  if (m.preoperacional_hoy_id && m.cumple_general === false)
    return "card--fallo";
  if (m.estado === "mantenimiento" || m.estado_dia === "mantenimiento")
    return "card--mantenimiento";
  if (m.estado === "no_disponible" || m.estado_dia === "no_disponible")
    return "card--no";
  return "";
}
