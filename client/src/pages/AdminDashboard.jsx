import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import { createPortal } from "react-dom";
import { getImageUrl, formatAccion } from "../utils";
import { Field, Info, FotoInput } from "../components/shared";
import ReportesObservacion from "./ReportesObservacion";
import "./admin.css";

export default function AdminDashboard() {
  const [tab, setTab] = useState("creacion"); // creacion | colaboradores | equipos | perfil
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="adm">
      <button
        className={`hamburger ${menuOpen ? "active" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Abrir menú"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {menuOpen && (
        <div className="adm__overlay" onClick={() => setMenuOpen(false)}></div>
      )}

      <aside className={`adm__side ${menuOpen ? "open" : ""}`}>
        <div className="adm__brand">
          <div className="adm__logo">
            <img src="/Logo.png" alt="Logo" />
          </div>
          <div className="adm__brandSub">Administrador</div>
        </div>

        <nav className="adm__nav">
          <button
            className={`adm__navBtn ${tab === "creacion" ? "is-active" : ""}`}
            onClick={() => {
              setTab("creacion");
              setMenuOpen(false);
            }}
          >
            Creación Nueva/Modificación
          </button>

          <button
            className={`adm__navBtn ${tab === "colaboradores" ? "is-active" : ""}`}
            onClick={() => {
              setTab("colaboradores");
              setMenuOpen(false);
            }}
          >
            Colaboradores
          </button>

          <button
            className={`adm__navBtn ${tab === "equipos" ? "is-active" : ""}`}
            onClick={() => {
              setTab("equipos");
              setMenuOpen(false);
            }}
          >
            Herramientas y equipos
          </button>

          <button
            className={`adm__navBtn ${tab === "reportes" ? "is-active" : ""}`}
            onClick={() => {
              setTab("reportes");
              setMenuOpen(false);
            }}
          >
            Reportes de Observación
          </button>

          <button
            className={`adm__navBtn ${tab === "alertas" ? "is-active" : ""}`}
            onClick={() => {
              setTab("alertas");
              setMenuOpen(false);
            }}
          >
            Alertas
          </button>

          <button
            className={`adm__navBtn ${tab === "perfil" ? "is-active" : ""}`}
            onClick={() => {
              setTab("perfil");
              setMenuOpen(false);
            }}
          >
            Perfil
          </button>

          <button
            className="adm__navBtn2"
            onClick={() => {
              const ok = window.confirm("¿Deseas cerrar sesión?");
              if (!ok) return;

              logout();
              navigate("/login", { replace: true });
            }}
          >
            Cerrar sesión
          </button>
        </nav>
      </aside>

      <main className="adm__main">
        {tab === "creacion" && <CreacionNueva />}
        {tab === "colaboradores" && <Colaboradores />}
        {tab === "equipos" && <Equipos />}
        {tab === "reportes" && <ReportesObservacion />}
        {tab === "perfil" && <Perfil />}
        {tab === "alertas" && <Alertas />}
      </main>
    </div>
  );
}
/*--------------------------- Creación ------------------------*/
/* =========================
   TAB 1: CREACIÓN NUEVA
========================= */
function CreacionNueva() {
  const [subtab, setSubtab] = useState("maquinaria");
  const [refreshForms, setRefreshForms] = useState(0);
  const [refreshGroups, setRefreshGroups] = useState(0);

  return (
    <>
      <div className="panelTop">
        <h2 className="panelTop__title">Creación Nueva</h2>

        <div className="panelTop__tabs">
          <button
            className={`chip ${subtab === "maquinaria" ? "chip--on" : ""}`}
            onClick={() => setSubtab("maquinaria")}
          >
            Nueva maquinaria
          </button>

          <button
            className={`chip ${subtab === "usuario" ? "chip--on" : ""}`}
            onClick={() => setSubtab("usuario")}
          >
            Nuevo usuario
          </button>

          <button
            className={`chip ${subtab === "preoperacional" ? "chip--on" : ""}`}
            onClick={() => setSubtab("preoperacional")}
          >
            Crear preoperacional
          </button>

          <button
            className={`chip ${subtab === "editarPreoperacional" ? "chip--on" : ""}`}
            onClick={() => setSubtab("editarPreoperacional")}
          >
            Modificar preoperacional
          </button>

          <button
            className={`chip ${subtab === "grupos" ? "chip--on" : ""}`}
            onClick={() => setSubtab("grupos")}
          >
            Crear grupos
          </button>
        </div>
      </div>

      {/* PANEL DE CONTENIDO */}
      <div className="panel">
        {subtab === "maquinaria" && (
          <CrearMaquinaria
            refreshForms={refreshForms}
            refreshGroups={refreshGroups}
          />
        )}

        {subtab === "usuario" && <CrearUsuario />}

        {subtab === "preoperacional" && (
          <CrearPreoperacional
            onCreated={() => setRefreshForms((v) => v + 1)}
          />
        )}

        {subtab === "editarPreoperacional" && <ModificarPreoperacional />}

        {subtab === "grupos" && (
          <CrearGrupo onCreated={() => setRefreshGroups((v) => v + 1)} />
        )}
      </div>
    </>
  );
}

/* =========================
   SUBTAB: NUEVA MAQUINARIA
========================= */
function CrearMaquinaria({ refreshForms, refreshGroups }) {
  const [grupos, setGrupos] = useState([]);
  const [formularios, setFormularios] = useState([]);
  const [formStatus, setFormStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);

  const [data, setData] = useState({
    nombre: "",
    serial: "",
    marca: "",
    modelo: "",
    grupo_id: "",
    formulario_id: "",
    foto_url: "",
  });

  async function loadData() {
    const [g, f] = await Promise.all([
      api.get("/grupos"),
      api.get("/formularios"),
    ]);

    setGrupos(g.data || []);
    setFormularios(f.data || []);
  }

  useEffect(() => {
    loadData().catch(() => {});
  }, [refreshForms, refreshGroups]);

  // uploadPhoto eliminado — FotoInput lo maneja internamente

  async function onSubmit(e) {
    e.preventDefault();
    setFormStatus(null);
    setQrData(null);

    if (
      !data.nombre ||
      !data.serial ||
      !data.marca ||
      !data.modelo ||
      !data.grupo_id ||
      !data.formulario_id ||
      !data.foto_url
    ) {
      setFormStatus({
        type: "err",
        msg: "Completa todos los campos obligatorios, incluida la foto.",
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        nombre: data.nombre,
        serial: data.serial,
        marca: data.marca,
        modelo: data.modelo,
        grupo_id: Number(data.grupo_id),
        formulario_id: data.formulario_id,
        foto_url: data.foto_url,
      };

      const r = await api.post("/maquinaria", payload);

      setFormStatus({
        type: "ok",
        msg: "Maquinaria creada correctamente ✅",
      });

      setQrData(r.data?.qr || null);

      setData({
        nombre: "",
        serial: "",
        marca: "",
        modelo: "",
        grupo_id: "",
        formulario_id: "",
        foto_url: "",
      });
    } catch (err) {
      setFormStatus({
        type: "err",
        msg: err?.response?.data?.message || "Error creando maquinaria.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="box">
      <h3 className="box__title">Nueva maquinaria</h3>

      <form className="form" onSubmit={onSubmit}>
        <div className="grid2">
          <Field label="Nombre">
            <input
              className="inp"
              value={data.nombre}
              onChange={(e) => setData({ ...data, nombre: e.target.value })}
            />
          </Field>

          <Field label="Serial">
            <input
              className="inp"
              value={data.serial}
              onChange={(e) => setData({ ...data, serial: e.target.value })}
            />
          </Field>

          <Field label="Marca">
            <input
              className="inp"
              value={data.marca}
              onChange={(e) => setData({ ...data, marca: e.target.value })}
            />
          </Field>

          <Field label="Modelo (obligatorio)">
            <input
              className="inp"
              value={data.modelo}
              onChange={(e) => setData({ ...data, modelo: e.target.value })}
            />
          </Field>

          <Field label="Grupo">
            <select
              className="inp"
              value={data.grupo_id}
              onChange={(e) => setData({ ...data, grupo_id: e.target.value })}
            >
              <option value="">Selecciona...</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Preoperacional">
            <select
              className="inp"
              value={data.formulario_id}
              onChange={(e) =>
                setData({ ...data, formulario_id: e.target.value })
              }
            >
              <option value="">Selecciona...</option>
              {formularios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Foto obligatoria">
            <FotoInput
              onUpload={(url) => {
                if (url) setData((prev) => ({ ...prev, foto_url: url }));
              }}
            />
          </Field>
        </div>

        {formStatus && (
          <div className={formStatus.type === "ok" ? "alert ok" : "alert err"}>
            {formStatus.msg}
          </div>
        )}

        <button className="btn" disabled={loading}>
          {loading ? "Creando..." : "Crear maquinaria"}
        </button>
      </form>

      {qrData && (
        <div className="subbox" style={{ marginTop: 16 }}>
          <div className="subbox__title">Código QR generado</div>

          {qrData.dataUrl && (
            <img
              src={qrData.dataUrl}
              alt="QR maquinaria"
              style={{ width: 180, height: 180, marginTop: 10 }}
            />
          )}

          {qrData.url && (
            <div className="hint" style={{ marginTop: 8 }}>
              URL: {qrData.url}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
   SUBTAB: NUEVO USUARIO
========================= */
function CrearUsuario() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const [data, setData] = useState({
    nombre: "",
    cargo: "",
    fecha_ingreso: "",
    tipo_contrato: "",
    rh: "",
    direccion: "",
    numero_documento: "",
    foto_url: "",
    rol: "colaborador",
  });

  // uploadPhoto eliminado — FotoInput lo maneja internamente

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (
      !data.nombre ||
      !data.cargo ||
      !data.fecha_ingreso ||
      !data.tipo_contrato ||
      !data.rh ||
      !data.direccion ||
      !data.numero_documento ||
      !data.rol ||
      !data.foto_url
    ) {
      setMsg({
        type: "err",
        text: "Completa todos los campos obligatorios.",
      });
      return;
    }

    try {
      setLoading(true);

      await api.post("/usuarios", {
        ...data,
        foto_url: data.foto_url || undefined,
      });

      setMsg({ type: "ok", text: "Usuario creado correctamente ✅" });

      setData({
        nombre: "",
        cargo: "",
        fecha_ingreso: "",
        tipo_contrato: "",
        rh: "",
        direccion: "",
        numero_documento: "",
        foto_url: "",
        rol: "colaborador",
      });
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "No se pudo crear usuario.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="box">
      <h3 className="box__title">Nuevo usuario</h3>

      <form className="form" onSubmit={onSubmit}>
        <div className="grid2">
          <Field label="Nombre">
            <input
              className="inp"
              value={data.nombre}
              onChange={(e) => setData({ ...data, nombre: e.target.value })}
            />
          </Field>

          <Field label="Cargo">
            <input
              className="inp"
              value={data.cargo}
              onChange={(e) => setData({ ...data, cargo: e.target.value })}
            />
          </Field>

          <Field label="Fecha de ingreso">
            <input
              className="inp"
              type="date"
              value={data.fecha_ingreso}
              onChange={(e) =>
                setData({ ...data, fecha_ingreso: e.target.value })
              }
            />
          </Field>

          <Field label="Tipo de contrato">
            <input
              className="inp"
              value={data.tipo_contrato}
              onChange={(e) =>
                setData({ ...data, tipo_contrato: e.target.value })
              }
            />
          </Field>

          <Field label="RH">
            <input
              className="inp"
              value={data.rh}
              onChange={(e) => setData({ ...data, rh: e.target.value })}
            />
          </Field>

          <Field label="Dirección">
            <input
              className="inp"
              value={data.direccion}
              onChange={(e) => setData({ ...data, direccion: e.target.value })}
            />
          </Field>

          <Field label="Número de documento">
            <input
              className="inp"
              value={data.numero_documento}
              onChange={(e) =>
                setData({ ...data, numero_documento: e.target.value })
              }
            />
          </Field>

          <Field label="Rol">
            <select
              className="inp"
              value={data.rol}
              onChange={(e) => setData({ ...data, rol: e.target.value })}
            >
              <option value="colaborador">Colaborador</option>
              <option value="admin">Administrador</option>
            </select>
          </Field>

          <Field label="Foto Obligatoria">
            <FotoInput
              onUpload={(url) => {
                if (url) setData((prev) => ({ ...prev, foto_url: url }));
              }}
            />
          </Field>
        </div>

        {msg && (
          <div className={msg.type === "ok" ? "alert ok" : "alert err"}>
            {msg.text}
          </div>
        )}

        <button className="btn" disabled={loading}>
          {loading ? "Creando..." : "Crear usuario"}
        </button>
      </form>
    </div>
  );
}

/* =========================
   SUBTAB: CREAR PREOPERACIONAL
========================= */
function CrearPreoperacional({ onCreated }) {
  const [formId, setFormId] = useState("");
  const [nombreForm, setNombreForm] = useState("");
  const [preguntas, setPreguntas] = useState([]);
  const [msg, setMsg] = useState(null);
  const [savingForm, setSavingForm] = useState(false);

  async function loadFormulario(id) {
    const r = await api.get(`/formularios/${id}`);
    setPreguntas(r.data?.preguntas || []);
  }

  async function crearFormulario() {
    setMsg(null);

    if (nombreForm.trim().length < 2) {
      setMsg({
        type: "err",
        text: "Escribe un nombre válido para el preoperacional.",
      });
      return;
    }

    try {
      setSavingForm(true);

      const r = await api.post("/formularios", {
        nombre: nombreForm.trim(),
      });

      const newId = String(r.data.id);

      setFormId(newId);
      setPreguntas([]);
      setMsg({
        type: "ok",
        text: "Preoperacional creado ✅ Ahora agrega las preguntas.",
      });

      await loadFormulario(newId);
      onCreated?.();
    } catch (e) {
      setMsg({
        type: "err",
        text:
          e?.response?.data?.message || "No se pudo crear el preoperacional.",
      });
    } finally {
      setSavingForm(false);
    }
  }

  function resetearTodo() {
    setFormId("");
    setNombreForm("");
    setPreguntas([]);
    setMsg(null);
  }

  return (
    <div className="box">
      <h3 className="box__title">Crear preoperacional</h3>

      <div className="subbox">
        <div className="subbox__title">1) Nombre del preoperacional</div>

        <div className="grid2">
          <Field label="Nombre del preoperacional">
            <input
              className="inp"
              placeholder="Ej: Preoperacional Pulidora Bosch"
              value={nombreForm}
              onChange={(e) => setNombreForm(e.target.value)}
              disabled={!!formId}
            />
          </Field>
        </div>

        {!formId ? (
          <button
            className="btn"
            onClick={crearFormulario}
            disabled={savingForm}
          >
            {savingForm ? "Creando..." : "Crear preoperacional"}
          </button>
        ) : (
          <div className="row" style={{ marginTop: 10 }}>
            <button className="mini mini--blue" type="button">
              Preoperacional creado
            </button>
            <button className="mini" type="button" onClick={resetearTodo}>
              Crear otro
            </button>
          </div>
        )}
      </div>

      {formId && (
        <div className="subbox" style={{ marginTop: 14 }}>
          <div className="subbox__title">
            2) Agregar preguntas (Cumple / No cumple)
          </div>

          <div className="hint" style={{ marginBottom: 10 }}>
            Preoperacional actual: <b>{nombreForm}</b>
          </div>

          <AddPregunta formId={formId} onAdded={() => loadFormulario(formId)} />

          <div className="list">
            {preguntas.map((p) => (
              <div className="qRow" key={p.id}>
                <div className="qRow__left">
                  <div className="qRow__title">
                    {p.orden}. {p.enunciado}
                  </div>
                  <div className="qRow__sub">
                    Respuesta fija: ✅ Cumple / ❌ No cumple
                  </div>
                </div>

                <div className="qRow__right">
                  <button
                    className={`mini ${p.activa ? "" : "mini--off"}`}
                    onClick={async () => {
                      await api.patch(
                        `/formularios/${formId}/preguntas/${p.id}/activa`,
                        { activa: !p.activa },
                      );
                      await loadFormulario(formId);
                    }}
                  >
                    {p.activa ? "Activa" : "Inactiva"}
                  </button>
                </div>
              </div>
            ))}

            {preguntas.length === 0 && (
              <div className="hint">
                Aún no hay preguntas. Agrega la primera.
              </div>
            )}
          </div>
        </div>
      )}

      {msg && (
        <div className={msg.type === "ok" ? "alert ok" : "alert err"}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
function AddPregunta({ formId, onAdded }) {
  const [enunciado, setEnunciado] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  return (
    <div className="addQ">
      <input
        className="inp"
        placeholder="Escribe la pregunta (ej: ¿El cable está en buen estado?)"
        value={enunciado}
        onChange={(e) => setEnunciado(e.target.value)}
      />

      <button
        className="btn"
        disabled={saving}
        onClick={async () => {
          setMsg(null);

          if (enunciado.trim().length < 2) {
            setMsg({ type: "err", text: "Escribe una pregunta válida." });
            return;
          }

          try {
            setSaving(true);

            await api.post(`/formularios/${formId}/preguntas`, {
              enunciado,
            });

            setEnunciado("");
            await onAdded();

            setMsg({ type: "ok", text: "Pregunta agregada ✅" });
          } catch (e) {
            setMsg({
              type: "err",
              text: e?.response?.data?.message || "No se pudo agregar.",
            });
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Agregando..." : "Agregar pregunta"}
      </button>

      {msg && (
        <div className={msg.type === "ok" ? "hint okText" : "hint errText"}>
          {msg.text}
        </div>
      )}
    </div>
  );
}

/* =========================
   SUBTAB: MODIFICAR PREOPERACIONAL
========================= */
function ModificarPreoperacional() {
  const [formularios, setFormularios] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [preguntas, setPreguntas] = useState([]);
  const [msg, setMsg] = useState(null);

  async function loadAll() {
    const f = await api.get("/formularios");
    setFormularios(f.data || []);
  }

  async function loadFormulario(id) {
    const r = await api.get(`/formularios/${id}`);
    setPreguntas(r.data?.preguntas || []);
  }

  useEffect(() => {
    loadAll().catch(() => {});
  }, []);

  async function eliminarFormulario() {
    if (!selectedFormId) return;

    const confirmar = window.confirm(
      "¿Seguro que deseas eliminar este preoperacional?",
    );
    if (!confirmar) return;

    try {
      await api.delete(`/formularios/${selectedFormId}`);
      setMsg({ type: "ok", text: "Preoperacional eliminado ✅" });
      setSelectedFormId("");
      setPreguntas([]);
      await loadAll();
    } catch (e) {
      setMsg({
        type: "err",
        text:
          e?.response?.data?.message ||
          "No se pudo eliminar el preoperacional.",
      });
    }
  }

  return (
    <div className="box">
      <div className="box__header">
        <h3 className="box__title">Modificar preoperacional</h3>

        {selectedFormId && (
          <button className="mini mini--danger" onClick={eliminarFormulario}>
            Eliminar
          </button>
        )}
      </div>

      <Field label="Selecciona preoperacional">
        <select
          className="inp"
          value={selectedFormId}
          onChange={async (e) => {
            const id = e.target.value;
            setSelectedFormId(id);
            setMsg(null);
            if (id) await loadFormulario(id);
          }}
        >
          <option value="">Selecciona...</option>
          {formularios.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </select>
      </Field>

      {selectedFormId && (
        <>
          <AddPregunta
            formId={selectedFormId}
            onAdded={() => loadFormulario(selectedFormId)}
          />

          <div className="list">
            {preguntas.map((p) => (
              <EditarPreguntaRow
                key={p.id}
                formId={selectedFormId}
                pregunta={p}
                onSaved={() => loadFormulario(selectedFormId)}
              />
            ))}

            {preguntas.length === 0 && (
              <div className="hint">Aún no hay preguntas.</div>
            )}
          </div>
        </>
      )}

      {msg && (
        <div className={msg.type === "ok" ? "alert ok" : "alert err"}>
          {msg.text}
        </div>
      )}
    </div>
  );
}

function EditarPreguntaRow({ formId, pregunta, onSaved }) {
  const [texto, setTexto] = useState(pregunta.enunciado);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  return (
    <div className="qRow">
      <div className="qRow__left" style={{ flex: 1 }}>
        <input
          className="inp"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {msg && (
          <div className={msg.type === "ok" ? "hint okText" : "hint errText"}>
            {msg.text}
          </div>
        )}
      </div>

      <div className="qRow__right">
        <button
          className="mini"
          disabled={saving}
          onClick={async () => {
            setMsg(null);

            if (texto.trim().length < 2) {
              setMsg({
                type: "err",
                text: "La pregunta debe tener al menos 2 caracteres.",
              });
              return;
            }

            try {
              setSaving(true);

              await api.put(`/formularios/${formId}/preguntas/${pregunta.id}`, {
                enunciado: texto.trim(),
                orden: pregunta.orden,
              });

              setMsg({ type: "ok", text: "Pregunta actualizada ✅" });
              await onSaved();
            } catch (e) {
              setMsg({
                type: "err",
                text: e?.response?.data?.message || "No se pudo actualizar.",
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          Guardar
        </button>

        <button
          className={`mini ${pregunta.activa ? "" : "mini--off"}`}
          onClick={async () => {
            try {
              await api.patch(
                `/formularios/${formId}/preguntas/${pregunta.id}/activa`,
                { activa: !pregunta.activa },
              );
              await onSaved();
            } catch (e) {}
          }}
        >
          {pregunta.activa ? "Activa" : "Inactiva"}
        </button>
      </div>
    </div>
  );
}

/* =========================
   SUBTAB: CREAR GRUPOS
========================= */
function CrearGrupo({ onCreated }) {
  const [nombre, setNombre] = useState("");
  const [msg, setMsg] = useState(null);
  const [grupos, setGrupos] = useState([]);

  async function loadGrupos() {
    const r = await api.get("/grupos");
    setGrupos(r.data || []);
  }

  useEffect(() => {
    loadGrupos().catch(() => {});
  }, []);

  async function crearGrupo() {
    setMsg(null);

    if (nombre.trim().length < 2) {
      setMsg({ type: "err", text: "Escribe un nombre válido." });
      return;
    }

    try {
      await api.post("/grupos", { nombre });
      setMsg({ type: "ok", text: "Grupo creado ✅" });
      setNombre("");
      await loadGrupos();
      onCreated?.();
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "No se pudo crear grupo.",
      });
    }
  }

  async function eliminarGrupo(id) {
    const confirmar = window.confirm("¿Seguro que deseas eliminar este grupo?");
    if (!confirmar) return;

    try {
      await api.delete(`/grupos/${id}`);
      setMsg({ type: "ok", text: "Grupo eliminado ✅" });
      await loadGrupos();
      onCreated?.();
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "No se pudo eliminar el grupo.",
      });
    }
  }

  return (
    <div className="box">
      <h3 className="box__title">Crear grupos</h3>

      <div className="addQ">
        <input
          className="inp"
          placeholder="Ej: Pulidoras, Compresores, Taladros..."
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <button className="btn" onClick={crearGrupo}>
          Crear grupo
        </button>
      </div>

      {msg && (
        <div className={msg.type === "ok" ? "alert ok" : "alert err"}>
          {msg.text}
        </div>
      )}

      <div className="list2" style={{ marginTop: 14 }}>
        {grupos.map((g) => (
          <div key={g.id} className="qRow">
            <div className="qRow__left">
              <div className="qRow__title">{g.nombre}</div>
            </div>

            <div className="qRow__right">
              <button
                className="mini mini--danger"
                onClick={() => eliminarGrupo(g.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {grupos.length === 0 && (
          <div className="hint">No hay grupos registrados.</div>
        )}
      </div>
    </div>
  );
}

/*--------------------------- Colaboradores ------------------------*/
/* =========================
   TAB 2: COLABORADORES
========================= */

// getImageUrl movida a utils.js

function Colaboradores() {
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  async function loadColaboradores(searchValue = "") {
    try {
      setLoading(true);
      setErr(null);

      const r = await api.get("/usuarios", {
        params: {
          rol: "colaborador",
          ...(searchValue.trim() ? { q: searchValue.trim() } : {}),
        },
      });

      setColaboradores(r.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo cargar colaboradores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadColaboradores(search);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="panel">
      <h2 className="panel__title">Colaboradores</h2>

      <div className="row" style={{ marginTop: 12 }}>
        <input
          className="inp"
          type="text"
          placeholder="Buscar por nombre, cargo o documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="mini" onClick={() => loadColaboradores(search)}>
          Buscar
        </button>
      </div>

      {loading && <div className="hint">Cargando colaboradores...</div>}
      {err && <div className="alert err">{err}</div>}

      <div className="cards">
        {colaboradores.map((c) => (
          <div key={c.id} className="card">
            <div className="thumb avatarLarge">
              {c.foto_url ? (
                <img src={getImageUrl(c.foto_url)} alt={c.nombre} />
              ) : (
                <div className="thumb__ph">Sin foto</div>
              )}
            </div>

            <div className="card__name">{c.nombre}</div>
            <div className="card__sub">Cargo: {c.cargo || "—"}</div>
            <div className="card__sub">
              Documento: {c.numero_documento || "—"}
            </div>

            <div className="card__actions">
              <button
                className="mini"
                onClick={() => {
                  setSelectedUser(c);
                  setCalendarOpen(true);
                }}
              >
                Ver preoperacionales
              </button>

              <EditarColaboradorBtn
                colaborador={c}
                onUpdated={() => loadColaboradores(search)}
              />

              <EliminarColaboradorBtn
                colaborador={c}
                onDeleted={() => loadColaboradores(search)}
              />
            </div>
          </div>
        ))}
      </div>

      {!loading && colaboradores.length === 0 && (
        <div className="hint">
          {search.trim()
            ? "No se encontraron colaboradores con esa búsqueda."
            : "No hay colaboradores registrados."}
        </div>
      )}

      {calendarOpen && selectedUser && (
        <ColaboradorCalendarioModal
          colaborador={selectedUser}
          onClose={() => {
            setCalendarOpen(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

/* =========================
   Editar Informacion Colaborador
========================= */

function EditarColaboradorBtn({ colaborador, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const [data, setData] = useState({
    nombre: colaborador.nombre || "",
    cargo: colaborador.cargo || "",
    fecha_ingreso: colaborador.fecha_ingreso
      ? new Date(colaborador.fecha_ingreso).toISOString().slice(0, 10)
      : "",
    tipo_contrato: colaborador.tipo_contrato || "",
    rh: colaborador.rh || "",
    direccion: colaborador.direccion || "",
    numero_documento: colaborador.numero_documento || "",
    foto_url: colaborador.foto_url || "",
    rol: colaborador.rol || "colaborador",
  });

  // uploadPhoto eliminado — FotoInput lo maneja internamente

  async function guardarCambios() {
    setMsg(null);

    if (
      !data.nombre ||
      !data.cargo ||
      !data.fecha_ingreso ||
      !data.tipo_contrato ||
      !data.rh ||
      !data.direccion ||
      !data.numero_documento ||
      !data.rol
    ) {
      setMsg({
        type: "err",
        text: "Completa todos los campos obligatorios.",
      });
      return;
    }

    try {
      setLoading(true);

      await api.put(`/usuarios/${colaborador.id}`, {
        ...data,
        foto_url: data.foto_url || null,
      });

      setMsg({ type: "ok", text: "Información actualizada correctamente ✅" });
      onUpdated?.();

      setTimeout(() => {
        setOpen(false);
      }, 700);
    } catch (e) {
      setMsg({
        type: "err",
        text:
          e?.response?.data?.message || "No se pudo actualizar el colaborador.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="mini mini--blue" onClick={() => setOpen(true)}>
        Editar
      </button>

      {open &&
        createPortal(
          <div className="modal__back">
            <div className="modal modal--xl">
              <div className="modal__head">
                <div>
                  <div className="modal__title">Editar colaborador</div>
                  <div className="modal__sub">{colaborador.nombre}</div>
                </div>
                <button className="mini" onClick={() => setOpen(false)}>
                  Cerrar
                </button>
              </div>

              <div className="grid2" style={{ marginTop: 14 }}>
                <Field label="Nombre">
                  <input
                    className="inp"
                    value={data.nombre}
                    onChange={(e) =>
                      setData({ ...data, nombre: e.target.value })
                    }
                  />
                </Field>

                <Field label="Cargo">
                  <input
                    className="inp"
                    value={data.cargo}
                    onChange={(e) =>
                      setData({ ...data, cargo: e.target.value })
                    }
                  />
                </Field>

                <Field label="Fecha de ingreso">
                  <input
                    className="inp"
                    type="date"
                    value={data.fecha_ingreso?.split("T")[0] || ""}
                    onChange={(e) =>
                      setData({ ...data, fecha_ingreso: e.target.value })
                    }
                  />
                </Field>

                <Field label="Tipo de contrato">
                  <input
                    className="inp"
                    value={data.tipo_contrato}
                    onChange={(e) =>
                      setData({ ...data, tipo_contrato: e.target.value })
                    }
                  />
                </Field>

                <Field label="RH">
                  <input
                    className="inp"
                    value={data.rh}
                    onChange={(e) => setData({ ...data, rh: e.target.value })}
                  />
                </Field>

                <Field label="Dirección">
                  <input
                    className="inp"
                    value={data.direccion}
                    onChange={(e) =>
                      setData({ ...data, direccion: e.target.value })
                    }
                  />
                </Field>

                <Field label="Número de documento">
                  <input
                    className="inp"
                    value={data.numero_documento}
                    onChange={(e) =>
                      setData({ ...data, numero_documento: e.target.value })
                    }
                  />
                </Field>

                <Field label="Rol">
                  <select
                    className="inp"
                    value={data.rol}
                    onChange={(e) => setData({ ...data, rol: e.target.value })}
                  >
                    <option value="colaborador">Colaborador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </Field>

                <Field label="Foto (opcional)">
                  <FotoInput
                    initialUrl={data.foto_url ? getImageUrl(data.foto_url) : ""}
                    onUpload={(url) => {
                      if (url) setData((prev) => ({ ...prev, foto_url: url }));
                    }}
                  />
                </Field>
              </div>

              {msg && (
                <div
                  className={msg.type === "ok" ? "alert ok" : "alert err"}
                  style={{ marginTop: 12 }}
                >
                  {msg.text}
                </div>
              )}

              <div className="row" style={{ marginTop: 14 }}>
                <button className="mini" onClick={() => setOpen(false)}>
                  Cancelar
                </button>

                <button
                  className="mini mini--blue"
                  onClick={guardarCambios}
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
/* =========================
   MODAL CALENDARIO MENSUAL
========================= */
function ColaboradorCalendarioModal({ colaborador, onClose }) {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [month, setMonth] = useState(defaultMonth);
  const [minMonth, setMinMonth] = useState(defaultMonth);
  const [resumen, setResumen] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function loadResumen() {
    try {
      setLoading(true);
      setErr(null);

      const r = await api.get(
        `/usuarios/${colaborador.id}/preoperacionales/resumen`,
        {
          params: { month },
        },
      );

      setResumen(r.data?.resumen || {});
      setMinMonth(r.data?.minMonth || defaultMonth);
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo cargar el calendario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResumen();
  }, [month, colaborador.id]);

  useEffect(() => {
    if (minMonth && month < minMonth) {
      setMonth(minMonth);
    }
  }, [minMonth]);

  const { year, monthIndex, daysInMonth, firstDayOffset } = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const firstDate = new Date(y, m - 1, 1);
    const lastDate = new Date(y, m, 0);
    const jsDay = firstDate.getDay();
    const offset = jsDay === 0 ? 6 : jsDay - 1;

    return {
      year: y,
      monthIndex: m - 1,
      daysInMonth: lastDate.getDate(),
      firstDayOffset: offset,
    };
  }, [month]);

  const days = [];
  for (let i = 0; i < firstDayOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 2, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (newMonth < minMonth) return;

    setMonth(newMonth);
  }

  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  return (
    <div className="modal__back">
      <div className="modal modal--xl">
        <div className="modal__head">
          <div>
            <div className="modal__title">
              Preoperacionales de {colaborador.nombre}
            </div>
            <div className="modal__sub">Vista mensual</div>
          </div>
          <button className="mini" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <button
            className="mini"
            onClick={prevMonth}
            disabled={month <= minMonth}
          >
            ◀
          </button>

          <div className="monthLabel">{month}</div>

          <button className="mini" onClick={nextMonth}>
            ▶
          </button>
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

        {loading && <div className="hint">Cargando calendario...</div>}
        {err && <div className="alert err">{err}</div>}

        {!loading && (
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
                if (!day) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="calendarCell calendarCell--empty"
                    />
                  );
                }

                const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const estado = resumen?.[dateKey]?.estado || "no_realizado";
                const motivo = resumen?.[dateKey]?.motivo;

                return (
                  <CalendarDayCell
                    key={dateKey}
                    colaboradorId={colaborador.id}
                    dateKey={dateKey}
                    day={day}
                    estado={estado}
                    motivo={motivo}
                    onRefresh={loadResumen}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================
   DIA DEL CALENDARIO
========================= */
function CalendarDayCell({
  colaboradorId,
  dateKey,
  day,
  estado,
  motivo,
  onRefresh,
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const esFuturo = dateKey > today;

  let cls = "calendarCell--gray";

  if (!esFuturo) {
    cls =
      estado === "realizado"
        ? "calendarCell--green"
        : estado === "na"
          ? "calendarCell--yellow"
          : estado === "no_realizado"
            ? "calendarCell--red"
            : estado === "bloqueado"
              ? "calendarCell--blue"
              : "calendarCell--gray";
  }

  return (
    <>
      <button
        className={`calendarCell ${cls} ${esFuturo ? "calendarCell--locked" : ""}`}
        disabled={esFuturo || estado === "bloqueado"}
        onClick={() => {
          if (esFuturo || estado === "bloqueado") return;

          if (estado === "realizado" || estado === "na") {
            setDetailOpen(true);
          } else {
            setActionOpen(true);
          }
        }}
        title={
          esFuturo
            ? "Este día aún no ha llegado"
            : estado === "bloqueado"
              ? "El colaborador aún no estaba creado en esta fecha"
              : estado === "no_realizado"
                ? "No se realizó preoperacional"
                : estado === "na"
                  ? "Día marcado como N/A"
                  : "Ver detalle del día"
        }
      >
        <span className="calendarCell__num">{day}</span>

        {esFuturo && <span className="calendarLock">🔒</span>}
      </button>

      {detailOpen && (
        <PreoperacionalesDiaModal
          colaboradorId={colaboradorId}
          fecha={dateKey}
          estado={estado}
          motivo={motivo}
          onClose={() => setDetailOpen(false)}
        />
      )}

      {actionOpen && (
        <NoPreopActionModal
          colaboradorId={colaboradorId}
          fecha={dateKey}
          onClose={() => setActionOpen(false)}
          onDone={() => {
            setActionOpen(false);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}

/* =========================
   DETALLE DEL DIA
========================= */
function PreoperacionalesDiaModal({
  colaboradorId,
  fecha,
  estado,
  motivo,
  onClose,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function loadItems() {
    if (estado === "na") {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErr(null);

      const r = await api.get(`/usuarios/${colaboradorId}/preoperacionales`, {
        params: { date: fecha },
      });

      setItems(r.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [colaboradorId, fecha, estado]);

  return (
    <div className="modal__back">
      <div className="modal">
        <div className="modal__head">
          <div>
            <div className="modal__title">
              {estado === "na"
                ? "Día marcado como N/A"
                : "Preoperacionales del día"}
            </div>
            <div className="modal__sub">{fecha}</div>
          </div>
          <button className="mini" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {estado === "na" ? (
          <div className="alert ok" style={{ marginTop: 12 }}>
            <div>
              <b>Día marcado como N/A</b>
            </div>
            <div style={{ marginTop: "6px" }}>
              Motivo: {motivo || "No especificado"}
            </div>
          </div>
        ) : (
          <>
            {loading && <div className="hint">Cargando...</div>}
            {err && <div className="alert err">{err}</div>}

            {!loading && items.length === 0 && (
              <div className="hint">
                No hay preoperacionales registrados ese día.
              </div>
            )}

            <div className="list">
              {items.map((item) => (
                <div key={item.id} className="qRow">
                  <div className="qRow__left">
                    <div className="qRow__title">{item.maquinaria_nombre}</div>
                    <div className="qRow__sub">
                      Hora: {item.hora || "—"} | Estado:{" "}
                      {item.estado_texto || "—"}
                    </div>
                    {item.observacion_general && (
                      <div className="qRow__sub">
                        Obs: {item.observacion_general}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================
   ELIMINAR COLABORADOR
========================= */
function EliminarColaboradorBtn({ colaborador, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [code] = useState(() =>
    Math.floor(100000 + Math.random() * 900000).toString(),
  );
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function eliminar() {
    setMsg(null);

    if (inputCode !== code) {
      setMsg({ type: "err", text: "El código no coincide." });
      return;
    }

    try {
      setLoading(true);

      await api.delete(`/usuarios/${colaborador.id}`, {
        data: { code },
      });

      setOpen(false);
      onDeleted?.();
    } catch (e) {
      setMsg({
        type: "err",
        text:
          e?.response?.data?.message || "No se pudo eliminar al colaborador.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="mini mini--danger" onClick={() => setOpen(true)}>
        Eliminar
      </button>

      {open && (
        <div className="modal__back">
          <div className="modal">
            <div className="modal__head">
              <div>
                <div className="modal__title">Eliminar colaborador</div>
                <div className="modal__sub">{colaborador.nombre}</div>
              </div>
              <button className="mini" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>

            <div className="alert err" style={{ marginTop: 12 }}>
              Esta acción quitará el acceso del colaborador al sistema y
              ocultará su información personal. Los cambios realizados se
              mantendran.
            </div>

            <div className="subbox" style={{ marginTop: 12 }}>
              <div className="subbox__title">Código de confirmación</div>
              <div className="hint">
                Escribe este código para confirmar: <b>{code}</b>
              </div>

              <input
                className="inp"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Escribe el código"
              />

              {msg && (
                <div
                  className={msg.type === "ok" ? "alert ok" : "alert err"}
                  style={{ marginTop: 10 }}
                >
                  {msg.text}
                </div>
              )}

              <div className="row" style={{ marginTop: 12 }}>
                <button className="mini" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button
                  className="mini mini--danger"
                  onClick={eliminar}
                  disabled={loading}
                >
                  {loading ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NoPreopActionModal({ colaboradorId, fecha, onClose, onDone }) {
  const [loadingAlert, setLoadingAlert] = useState(false);
  const [loadingNa, setLoadingNa] = useState(false);
  const [msg, setMsg] = useState(null);
  const [motivo, setMotivo] = useState("");

  async function enviarAlerta() {
    try {
      setMsg(null);
      setLoadingAlert(true);

      await api.post(`/usuarios/${colaboradorId}/alerta-falta-preop`, {
        fecha,
      });

      setMsg({ type: "ok", text: "Alerta enviada correctamente ✅" });
      onDone?.();
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "No se pudo enviar la alerta.",
      });
    } finally {
      setLoadingAlert(false);
    }
  }

  async function marcarNa() {
    try {
      setMsg(null);
      setLoadingNa(true);

      await api.post(`/usuarios/${colaboradorId}/preoperacionales/na`, {
        fecha,
        motivo,
      });

      setMsg({ type: "ok", text: "Día marcado como N/A ✅" });
      onDone?.();
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "No se pudo marcar como N/A.",
      });
    } finally {
      setLoadingNa(false);
    }
  }

  return (
    <div className="modal__back">
      <div className="modal">
        <div className="modal__head">
          <div>
            <div className="modal__title">Día sin preoperacional</div>
            <div className="modal__sub">{fecha}</div>
          </div>
          <button className="mini" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="hint" style={{ marginTop: 12 }}>
          Este día no tiene preoperacionales registrados. Puedes enviar una
          alerta o marcarlo como N/A.
        </div>

        <Field label="Motivo N/A (opcional)">
          <input
            className="inp"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Incapacidad, permiso, ausencia..."
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

        <div className="row" style={{ marginTop: 14 }}>
          <button
            className="mini mini--blue"
            onClick={enviarAlerta}
            disabled={loadingAlert}
          >
            {loadingAlert ? "Enviando..." : "Enviar alerta al trabajador"}
          </button>

          <button className="mini" onClick={marcarNa} disabled={loadingNa}>
            {loadingNa ? "Guardando..." : "N/A"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   TAB 3: HERRAMIENTAS Y EQUIPOS
========================= */

function Equipos() {
  const [grupos, setGrupos] = useState([]);
  const [grupoId, setGrupoId] = useState("");
  const [estado, setEstado] = useState("");
  const [search, setSearch] = useState("");
  const [list, setList] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load(searchValue = search) {
    try {
      setLoading(true);
      setErr(null);

      const g = await api.get("/grupos");
      setGrupos(g.data || []);

      const r = await api.get("/maquinaria", {
        params: {
          ...(grupoId ? { grupo_id: Number(grupoId) } : {}),
          ...(estado ? { estado } : {}),
          ...(searchValue.trim() ? { q: searchValue.trim() } : {}),
        },
      });

      setList(r.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo cargar maquinaria.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [grupoId, estado, search]);

  return (
    <div className="panel">
      <h2 className="panel__title">Herramientas y equipos</h2>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "120px" }}>
          <Field label="Buscar maquinaria" style={{ flex: 1 }}>
            <input
              className="inp"
              type="text"
              placeholder="Buscar por nombre, serial o marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load(search);
              }}
            />
          </Field>
        </div>

        <div style={{ flex: 1, minWidth: "120px" }}>
          <Field label="Filtrar por grupo" style={{ flex: 1 }}>
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

        <div style={{ flex: 1, minWidth: "120px" }}>
          <Field label="Filtrar por estado" style={{ flex: 1 }}>
            <select
              className="inp"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="no_disponible">No disponible</option>
              <option value="dado_baja">Dado de baja</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="mini" onClick={() => load(search)}>
          Buscar
        </button>

        <button
          className="mini"
          onClick={() => {
            setSearch("");
            setGrupoId("");
            setEstado("");
          }}
        >
          Limpiar
        </button>
      </div>

      {loading && <div className="hint">Cargando maquinaria...</div>}
      {err && <div className="alert err">{err}</div>}

      <div className="cards">
        {list.map((m) => (
          <MaquinariaCard key={m.id} m={m} />
        ))}
      </div>

      {!loading && list.length === 0 && (
        <div className="hint">
          {search.trim() || grupoId || estado
            ? "No se encontraron máquinas con ese filtro."
            : "No hay maquinaria para mostrar."}
        </div>
      )}
    </div>
  );
}

function MaquinariaCard({ m }) {
  const navigate = useNavigate();

  const estadoClass =
    m.estado === "dado_baja"
      ? "card--danger"
      : m.estado === "mantenimiento"
        ? "card--maintenance"
        : m.estado === "no_disponible"
          ? "card--grey"
          : "";

  return (
    <div className={`card ${estadoClass}`}>
      <div className="thumb">
        {m.foto_url ? (
          <img src={getImageUrl(m.foto_url)} alt={m.nombre} />
        ) : (
          <div className="thumb__ph">Sin foto</div>
        )}
      </div>

      <div className="card__name">{m.nombre}</div>
      <div className="card__sub">Serial: {m.serial}</div>
      <div className="card__sub">Modelo: {m.modelo || "—"}</div>
      <div className="card__sub">Grupo: {m.grupo}</div>
      <div className="card__sub">Estado: {m.estado}</div>

      <div className="card__actions">
        <button
          className="mini mini--blue"
          onClick={() => navigate(`/admin/maquinaria/${m.id}`)}
        >
          Información
        </button>
      </div>
    </div>
  );
}

/* =========================
   TAB 4: PERFIL
========================= */
function Perfil() {
  const [me, setMe] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const [data, setData] = useState({
    nombre: "",
    cargo: "",
    fecha_ingreso: "",
    tipo_contrato: "",
    rh: "",
    direccion: "",
    numero_documento: "",
    foto_url: "",
    rol: "admin",
  });

  async function loadAll() {
    try {
      setLoading(true);

      const [meRes, adminsRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/usuarios", { params: { rol: "admin" } }),
      ]);

      const user = meRes.data?.user || meRes.data;
      setMe(user);

      setData({
        nombre: user?.nombre || "",
        cargo: user?.cargo || "",
        fecha_ingreso: user?.fecha_ingreso || "",
        tipo_contrato: user?.tipo_contrato || "",
        rh: user?.rh || "",
        direccion: user?.direccion || "",
        numero_documento: user?.numero_documento || "",
        foto_url: user?.foto_url || "",
        rol: "admin",
      });

      setAdmins(adminsRes.data || []);
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "No se pudo cargar el perfil.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // uploadPhoto eliminado — FotoInput lo maneja internamente

  async function guardarCambios() {
    try {
      setMsg(null);

      await api.put(`/usuarios/${me.id}`, {
        ...data,
        foto_url: data.foto_url || null,
      });

      setMsg({ type: "ok", text: "Perfil actualizado correctamente ✅" });
      await loadAll();
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "No se pudo actualizar el perfil.",
      });
    }
  }

  return (
    <div className="panel">
      <h2 className="panel__title">Perfil</h2>

      {loading && <div className="hint">Cargando perfil...</div>}

      {!loading && (
        <>
          <div className="maqHero" style={{ margin: 0 }}>
            <div className="maqHero__photo">
              {data.foto_url ? (
                <img src={getImageUrl(data.foto_url)} alt={data.nombre} />
              ) : (
                <div className="thumb__ph">Sin foto</div>
              )}
            </div>

            <div className="maqHero__info">
              <h2 className="maqHero__title">
                {data.nombre || "Administrador"}
              </h2>

              <div className="grid2">
                <Field label="Nombre">
                  <input
                    className="inp"
                    value={data.nombre}
                    onChange={(e) =>
                      setData({ ...data, nombre: e.target.value })
                    }
                  />
                </Field>

                <Field label="Cargo">
                  <input
                    className="inp"
                    value={data.cargo}
                    onChange={(e) =>
                      setData({ ...data, cargo: e.target.value })
                    }
                  />
                </Field>

                <Field label="Fecha de ingreso">
                  <input
                    className="inp"
                    type="date"
                    value={
                      data.fecha_ingreso
                        ? new Date(data.fecha_ingreso)
                            .toISOString()
                            .slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      setData({ ...data, fecha_ingreso: e.target.value })
                    }
                  />
                </Field>

                <Field label="Tipo de contrato">
                  <input
                    className="inp"
                    value={data.tipo_contrato}
                    onChange={(e) =>
                      setData({ ...data, tipo_contrato: e.target.value })
                    }
                  />
                </Field>

                <Field label="RH">
                  <input
                    className="inp"
                    value={data.rh}
                    onChange={(e) => setData({ ...data, rh: e.target.value })}
                  />
                </Field>

                <Field label="Dirección">
                  <input
                    className="inp"
                    value={data.direccion}
                    onChange={(e) =>
                      setData({ ...data, direccion: e.target.value })
                    }
                  />
                </Field>

                <Field label="Número de documento">
                  <input
                    className="inp"
                    value={data.numero_documento}
                    onChange={(e) =>
                      setData({ ...data, numero_documento: e.target.value })
                    }
                  />
                </Field>

                <Info label="Rol" value="Administrador" />
              </div>
              <Field label="Foto (opcional)">
                <FotoInput
                  initialUrl={data.foto_url ? getImageUrl(data.foto_url) : ""}
                  onUpload={(url) => {
                    if (url) setData((prev) => ({ ...prev, foto_url: url }));
                  }}
                />
              </Field>

              {msg && (
                <div
                  className={msg.type === "ok" ? "alert ok" : "alert err"}
                  style={{ marginTop: 12 }}
                >
                  {msg.text}
                </div>
              )}

              <div className="row" style={{ marginTop: 12 }}>
                <button className="mini mini--blue" onClick={guardarCambios}>
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>

          <div className="maqSection" style={{ margin: "16px 0 0 0" }}>
            <h3 className="box__title">Otros administradores</h3>

            <div className="cards">
              {admins.map((a) => (
                <div key={a.id} className="card">
                  <div className="thumb avatarLarge">
                    {a.foto_url ? (
                      <img src={getImageUrl(a.foto_url)} alt={a.nombre} />
                    ) : (
                      <div className="thumb__ph">Sin foto</div>
                    )}
                  </div>

                  <div className="card__name">{a.nombre}</div>
                  <div className="card__sub">Cargo: {a.cargo || "—"}</div>
                  <div className="card__sub">
                    Documento: {a.numero_documento || "—"}
                  </div>

                  <div className="card__actions">
                    <EliminarColaboradorBtn
                      colaborador={a}
                      onDeleted={() => loadAll()}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================
   TAB 5: ALERTAS
========================= */
function Alertas() {
  const [fallos, setFallos] = useState([]);
  const [sinPreop, setSinPreop] = useState([]);
  const [reportesAbiertos, setReportesAbiertos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null);

  const [sendingId, setSendingId] = useState(null);
  const [msg, setMsg] = useState(null);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [naOpen, setNaOpen] = useState(false);
  const [naUser, setNaUser] = useState(null);

  const [showAllUsuarios, setShowAllUsuarios] = useState(false);
  const [showAllMaquinas, setShowAllMaquinas] = useState(false);
  const [showAllReportes, setShowAllReportes] = useState(false);

  const navigate = useNavigate();

  const [gestionOpen, setGestionOpen] = useState(false);
  const [selectedFallo, setSelectedFallo] = useState(null);
  const [reporteModalId, setReporteModalId] = useState(null);

  async function loadAlertas() {
    try {
      setLoading(true);
      setErr(null);

      const [fallosRes, sinPreopRes, reportesRes] = await Promise.all([
        api.get("/alertas/fallos"),
        api.get("/alertas/sin-preoperacional-hoy"),
        api.get("/alertas/reportes-abiertos"),
      ]);

      setFallos(fallosRes.data || []);
      setSinPreop(sinPreopRes.data || []);
      setReportesAbiertos(reportesRes.data || []);
    } catch (e) {
      setErr(
        e?.response?.data?.message || "No se pudieron cargar las alertas.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlertas();
  }, []);

  async function enviarAlerta(colaboradorId) {
    try {
      setMsg(null);
      setSendingId(colaboradorId);

      await api.post(`/usuarios/${colaboradorId}/alerta-falta-preop`, {
        fecha: new Date().toISOString().slice(0, 10),
      });

      setMsg({ type: "ok", text: "Alerta enviada correctamente ✅" });
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "No se pudo enviar la alerta.",
      });
    } finally {
      setSendingId(null);
    }
  }

  async function enviarAlertasATodos() {
    try {
      setMsg(null);

      for (const c of sinPreop) {
        await api.post(`/usuarios/${c.id}/alerta-falta-preop`, {
          fecha: new Date().toISOString().slice(0, 10),
        });
      }

      setMsg({
        type: "ok",
        text: "Alertas enviadas a todos los pendientes ✅",
      });
    } catch (e) {
      setMsg({
        type: "err",
        text:
          e?.response?.data?.message ||
          "No se pudieron enviar todas las alertas.",
      });
    }
  }

  const usuariosVisibles = showAllUsuarios ? sinPreop : sinPreop.slice(0, 3);
  const maquinasVisibles = showAllMaquinas ? fallos : fallos.slice(0, 3);

  return (
    <div className="panel">
      <h2 className="panel__title">Alertas</h2>

      {loading && <div className="hint">Cargando alertas...</div>}
      {err && <div className="alert err">{err}</div>}

      {msg && (
        <div
          className={msg.type === "ok" ? "alert ok" : "alert err"}
          style={{ marginTop: 12 }}
        >
          {msg.text}
        </div>
      )}

      {!loading && (
        <>
          <div className="maqSection" style={{ margin: "0 0 16px 0" }}>
            <div
              className="row"
              style={{ justifyContent: "space-between", marginBottom: 12 }}
            >
              <h3 className="box__title">
                Colaboradores sin preoperacional hoy
              </h3>

              {sinPreop.length > 0 && (
                <button
                  className="mini mini--blue"
                  onClick={enviarAlertasATodos}
                >
                  Enviar alerta a todos
                </button>
              )}
            </div>

            {sinPreop.length === 0 ? (
              <div className="hint">
                No hay colaboradores pendientes por revisar.
              </div>
            ) : (
              <>
                <div className="previewGrid">
                  {usuariosVisibles.map((c) => (
                    <div key={c.id} className="previewCard previewCard--preop">
                      <div className="previewCard__badge">Pendiente</div>
                      <div className="previewCard__title">{c.nombre}</div>
                      <div className="previewCard__sub">
                        Cargo: {c.cargo || "—"}
                      </div>
                      <div className="previewCard__sub">
                        Documento: {c.numero_documento || "—"}
                      </div>
                      <div className="previewCard__sub">
                        No ha realizado ningún preoperacional hoy.
                      </div>

                      <div className="card__actions" style={{ marginTop: 12 }}>
                        <button
                          className="mini mini--blue"
                          onClick={() => enviarAlerta(c.id)}
                          disabled={sendingId === c.id}
                        >
                          {sendingId === c.id ? "Enviando..." : "Enviar alerta"}
                        </button>

                        <button
                          className="mini"
                          onClick={() => {
                            setNaUser(c);
                            setNaOpen(true);
                          }}
                        >
                          Marcar N/A
                        </button>

                        <button
                          className="mini"
                          onClick={() => {
                            setSelectedUser(c);
                            setCalendarOpen(true);
                          }}
                        >
                          Abrir calendario
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {sinPreop.length > 3 && (
                  <div className="row" style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="mini"
                      onClick={() => setShowAllUsuarios((prev) => !prev)}
                    >
                      {showAllUsuarios ? "Ver menos" : "Ver más"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="maqSection" style={{ margin: "0" }}>
            <h3 className="box__title">
              Alertas por fallos en preoperacionales
            </h3>

            {fallos.length === 0 ? (
              <div className="hint">No hay alertas de fallos registradas.</div>
            ) : (
              <>
                <div className="previewGrid">
                  {maquinasVisibles.map((a) => (
                    <div
                      key={a.id}
                      className="previewCard previewCard--history"
                    >
                      <div className="previewCard__badge">No cumple</div>
                      <div className="previewCard__title">
                        {a.maquinaria_nombre}
                      </div>
                      <div className="previewCard__sub">Serial: {a.serial}</div>
                      <div className="previewCard__sub">
                        Modelo: {a.modelo || "—"}
                      </div>
                      <div className="previewCard__sub">
                        Colaborador: {a.colaborador_nombre}
                      </div>
                      <div className="previewCard__sub">
                        Ítem: {a.item_fallido}
                      </div>

                      <div className="row" style={{ marginTop: 12 }}>
                        <button
                          className="mini mini--blue"
                          onClick={() => setSelected(a)}
                        >
                          Ver detalle
                        </button>
                        <button
                          className="mini"
                          onClick={() => {
                            setSelectedFallo(a);
                            setGestionOpen(true);
                          }}
                        >
                          Gestionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {fallos.length > 3 && (
                  <div className="row" style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="mini"
                      onClick={() => setShowAllMaquinas((prev) => !prev)}
                    >
                      {showAllMaquinas ? "Ver menos" : "Ver más"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── REPORTES DE OBSERVACIÓN SIN CERRAR ── */}
          <div className="maqSection" style={{ margin: "16px 0 0 0" }}>
            <h3 className="box__title" style={{ marginBottom: 12 }}>
              Reportes de observación sin cerrar
              {reportesAbiertos.length > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {reportesAbiertos.length}
                </span>
              )}
            </h3>

            {reportesAbiertos.length === 0 ? (
              <div className="hint">
                No hay reportes pendientes de cierre. ✅
              </div>
            ) : (
              <>
                <div className="previewGrid">
                  {(showAllReportes
                    ? reportesAbiertos
                    : reportesAbiertos.slice(0, 4)
                  ).map((r) => {
                    const colorEstado =
                      r.estado === "abierto" ? "#ef4444" : "#3b82f6";
                    const labelEstado =
                      r.estado === "abierto" ? "Sin gestión" : "En proceso";
                    const urgente =
                      r.dias_abierto >= 3 && r.estado === "abierto";
                    return (
                      <div
                        key={r.id}
                        className="previewCard previewCard--preop"
                        style={{
                          borderLeft: `3px solid ${colorEstado}`,
                          cursor: "pointer",
                        }}
                        onClick={() => setReporteModalId(r.id)}
                      >
                        <div
                          style={{
                            display: "inline-block",
                            background: `${colorEstado}18`,
                            color: colorEstado,
                            borderRadius: 999,
                            padding: "3px 10px",
                            fontSize: 11,
                            fontWeight: 800,
                            marginBottom: 6,
                          }}
                        >
                          {labelEstado}
                          {urgente && " ⚠️"}
                        </div>
                        <div className="previewCard__title">
                          {{
                            incidente: "Incidente",
                            impacto_ambiental: "Impacto Ambiental",
                            error_info_tecnica: "Error de Info. Técnica",
                            incumplimiento_parametros:
                              "Incumplimiento Parámetros (PNC)",
                            acto_seguro: "Acto Seguro",
                            acto_inseguro: "Acto Inseguro",
                            condicion_segura: "Condición Segura",
                          }[r.situacion] || r.situacion}
                        </div>
                        <div className="previewCard__sub">
                          📍 {r.ciudad} — {r.lugar}
                        </div>
                        <div className="previewCard__sub">
                          👤 {r.reportado_por_nombre} ({r.reportado_por_rol})
                        </div>
                        <div className="previewCard__sub">
                          📅 {r.fecha_texto}
                        </div>
                        {r.dias_abierto > 0 && (
                          <div
                            className="previewCard__sub"
                            style={{
                              color: urgente ? "#dc2626" : "#64748b",
                              fontWeight: urgente ? 700 : 400,
                            }}
                          >
                            ⏱ {r.dias_abierto} día(s) sin cerrar
                          </div>
                        )}
                        {r.ultima_gestion && (
                          <div className="previewCard__sub">
                            Última gestión: {r.ultima_gestion}
                          </div>
                        )}
                        <div className="row" style={{ marginTop: 10 }}>
                          <button
                            className="mini mini--blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReporteModalId(r.id);
                            }}
                          >
                            Gestionar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {reportesAbiertos.length > 4 && (
                  <div className="row" style={{ marginTop: 14 }}>
                    <button
                      className="mini"
                      onClick={() => setShowAllReportes((p) => !p)}
                    >
                      {showAllReportes
                        ? "Ver menos"
                        : `Ver más (${reportesAbiertos.length - 4} más)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Modal reporte desde alertas */}
      {reporteModalId && (
        <div className="modal__back">
          <div className="modal modal--xl">
            <div className="modal__head">
              <div className="modal__title">Gestionar Reporte</div>
              <button className="mini" onClick={() => setReporteModalId(null)}>
                Cerrar
              </button>
            </div>
            <ReporteDetalleEnAlerta
              reporteId={reporteModalId}
              onDone={() => {
                setReporteModalId(null);
                loadAlertas();
              }}
            />
          </div>
        </div>
      )}

      {gestionOpen && selectedFallo && (
        <GestionAlertaFalloModal
          alerta={selectedFallo}
          onClose={() => {
            setGestionOpen(false);
            setSelectedFallo(null);
          }}
          onDone={() => {
            setGestionOpen(false);
            setSelectedFallo(null);
            setSelected(null);
            loadAlertas();
          }}
        />
      )}

      {selected && (
        <div className="modal__back">
          <div className="modal modal--xl">
            <div className="modal__head">
              <div>
                <div className="modal__title">Detalle de alerta</div>
                <div className="modal__sub">{selected.fecha_texto}</div>
              </div>
              <button className="mini" onClick={() => setSelected(null)}>
                Cerrar
              </button>
            </div>

            <div className="list">
              <div className="qRow">
                <div className="qRow__left">
                  <div className="qRow__title">
                    {selected.maquinaria_nombre}
                  </div>
                  <div className="qRow__sub">Serial: {selected.serial}</div>
                  <div className="qRow__sub">
                    Modelo: {selected.modelo || "—"}
                  </div>
                  <div className="qRow__sub">
                    Colaborador: {selected.colaborador_nombre}
                  </div>
                  <div className="qRow__sub">
                    Ítem fallido: {selected.item_fallido}
                  </div>

                  {selected.observacion && (
                    <div className="qRow__sub">
                      Observación: {selected.observacion}
                    </div>
                  )}

                  {selected.foto_url && (
                    <img
                      src={getImageUrl(selected.foto_url)}
                      alt="Fallo"
                      className="maqProblemPhoto"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="row" style={{ marginTop: 14 }}>
              <button
                className="mini"
                onClick={() => {
                  setSelected(null);
                  navigate(`/admin/maquinaria/${selected.maquinaria_id}`);
                }}
              >
                Ver maquinaria
              </button>

              <button
                className="mini mini--blue"
                onClick={() => {
                  setSelectedFallo(selected);
                  setGestionOpen(true);
                  setSelected(null);
                }}
              >
                Gestión administrativa
              </button>
            </div>
          </div>
        </div>
      )}
      {calendarOpen && selectedUser && (
        <ColaboradorCalendarioModal
          colaborador={selectedUser}
          onClose={() => {
            setCalendarOpen(false);
            setSelectedUser(null);
          }}
        />
      )}

      {naOpen && naUser && (
        <MarcarNaDesdeAlertaModal
          colaborador={naUser}
          onClose={() => {
            setNaOpen(false);
            setNaUser(null);
          }}
          onDone={() => {
            setNaOpen(false);
            setNaUser(null);
            loadAlertas();
          }}
        />
      )}
    </div>
  );
}

// ─── Detalle + gestión de reporte desde Alertas ──────────────────────────────
const SITUACIONES_LABEL = {
  incidente: "Incidente",
  impacto_ambiental: "Impacto Ambiental",
  error_info_tecnica: "Error de Información Técnica",
  incumplimiento_parametros: "Incumplimiento de Parámetros (PNC)",
  acto_seguro: "Acto Seguro",
  acto_inseguro: "Acto Inseguro",
  condicion_segura: "Condición Segura",
};
const ACCIONES_LABEL = {
  R: "R — Reparación / Reproceso",
  R1: "R1 — Reclasificación",
  LB: "LB — Liberación Bajo Concesión",
  RE: "RE — Rechazo / Descarte",
  C: "C — Cumplió",
};

function ReporteDetalleEnAlerta({ reporteId, onDone }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo_accion: "", descripcion: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api
      .get(`/reportes/${reporteId}`)
      .then((r) => setData(r.data))
      .catch(() =>
        setMsg({ type: "err", text: "No se pudo cargar el reporte." }),
      )
      .finally(() => setLoading(false));
  }, [reporteId]);

  async function guardar(cierra) {
    setMsg(null);
    if (!form.tipo_accion)
      return setMsg({ type: "err", text: "Selecciona el tipo de acción." });
    if (!form.descripcion.trim())
      return setMsg({ type: "err", text: "Escribe la descripción." });
    try {
      setSaving(true);
      await api.post(`/reportes/${reporteId}/gestion`, {
        tipo_accion: form.tipo_accion,
        descripcion: form.descripcion.trim(),
        cierra_reporte: cierra,
      });
      setMsg({
        type: "ok",
        text: cierra ? "Reporte cerrado ✅" : "Gestión guardada ✅",
      });
      setTimeout(() => onDone?.(), 900);
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "Error guardando gestión.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="hint">Cargando reporte...</div>;
  if (!data) return <div className="alert err">No se pudo cargar.</div>;

  const { reporte: r, gestiones = [] } = data;

  return (
    <div>
      <div
        style={{
          background: "#f8fafc",
          borderRadius: 12,
          padding: 16,
          border: "1px solid #e5e7eb",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>
          {SITUACIONES_LABEL[r.situacion] || r.situacion}
          <span
            style={{
              marginLeft: 10,
              fontSize: 12,
              fontWeight: 800,
              borderRadius: 999,
              padding: "2px 8px",
              background:
                r.estado === "abierto"
                  ? "rgba(239,68,68,0.1)"
                  : r.estado === "en_proceso"
                    ? "rgba(59,130,246,0.1)"
                    : "rgba(249,115,22,0.1)",
              color:
                r.estado === "abierto"
                  ? "#dc2626"
                  : r.estado === "en_proceso"
                    ? "#1d4ed8"
                    : "#c2410c",
            }}
          >
            {r.estado === "abierto"
              ? "Sin gestión"
              : r.estado === "en_proceso"
                ? "En proceso"
                : "Cerrado"}
          </span>
        </div>
        <div className="grid2">
          <Info label="Fecha" value={r.fecha_texto || r.fecha} />
          <Info label="Ciudad" value={r.ciudad} />
          <Info label="Lugar" value={r.lugar} />
          <Info
            label="Reportado por"
            value={`${r.reportado_por_nombre} (${r.reportado_por_cargo || r.reportado_por_rol})`}
          />
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: "#374151" }}>
          {r.descripcion}
        </div>
        {r.foto_url && (
          <img
            src={getImageUrl(r.foto_url)}
            alt="Evidencia"
            style={{
              width: 120,
              height: 120,
              objectFit: "cover",
              borderRadius: 8,
              marginTop: 10,
            }}
          />
        )}
      </div>

      {gestiones.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
            Gestiones previas ({gestiones.length})
          </div>
          {gestiones.map((g) => (
            <div
              key={g.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: g.cierra_reporte ? "#c2410c" : "#1d4ed8",
                  }}
                >
                  {ACCIONES_LABEL[g.tipo_accion] || g.tipo_accion}
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {g.fecha_texto} — {g.realizado_por_nombre}
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13 }}>{g.descripcion}</div>
              {g.cierra_reporte && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#f97316",
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  🔒 Esta acción cerró el reporte
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {r.estado !== "cerrado" && !showForm && (
        <button className="mini mini--blue" onClick={() => setShowForm(true)}>
          + Registrar gestión administrativa
        </button>
      )}

      {r.estado !== "cerrado" && showForm && (
        <div
          style={{
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              marginBottom: 12,
              color: "#0c4a6e",
            }}
          >
            Nueva Gestión
          </div>
          <Field label="Tipo de acción">
            <select
              className="inp"
              value={form.tipo_accion}
              onChange={(e) =>
                setForm((p) => ({ ...p, tipo_accion: e.target.value }))
              }
            >
              <option value="">Selecciona...</option>
              {Object.entries(ACCIONES_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Descripción" style={{ marginTop: 10 }}>
            <textarea
              className="inp"
              rows={3}
              value={form.descripcion}
              onChange={(e) =>
                setForm((p) => ({ ...p, descripcion: e.target.value }))
              }
              placeholder="Describe la acción realizada..."
              style={{ resize: "vertical" }}
            />
          </Field>
          {msg && (
            <div
              className={`alert ${msg.type === "ok" ? "ok" : "err"}`}
              style={{ marginTop: 10 }}
            >
              {msg.text}
            </div>
          )}
          <div
            className="row"
            style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}
          >
            <button
              className="mini"
              onClick={() => {
                setShowForm(false);
                setMsg(null);
              }}
            >
              Cancelar
            </button>
            <button
              className="mini"
              style={{
                borderColor: "rgba(59,130,246,.3)",
                background: "rgba(59,130,246,.08)",
                color: "#1d4ed8",
              }}
              onClick={() => guardar(false)}
              disabled={saving}
            >
              {saving ? "Guardando..." : "💾 Guardar proceso"}
            </button>
            <button
              className="mini"
              style={{
                borderColor: "rgba(249,115,22,.3)",
                background: "rgba(249,115,22,.10)",
                color: "#c2410c",
              }}
              onClick={() => guardar(true)}
              disabled={saving}
            >
              {saving ? "Cerrando..." : "🔒 Cerrar reporte"}
            </button>
          </div>
        </div>
      )}

      {r.estado === "cerrado" && (
        <div className="alert ok" style={{ marginTop: 12 }}>
          Este reporte está cerrado. ✅
        </div>
      )}
    </div>
  );
}

function MarcarNaDesdeAlertaModal({ colaborador, onClose, onDone }) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const fechaHoy = new Date().toISOString().slice(0, 10);

  async function marcarNa() {
    try {
      setLoading(true);
      setMsg(null);

      await api.post(`/usuarios/${colaborador.id}/preoperacionales/na`, {
        fecha: fechaHoy,
        motivo,
      });

      setMsg({ type: "ok", text: "Día marcado como N/A ✅" });

      setTimeout(() => {
        onDone?.();
      }, 700);
    } catch (e) {
      setMsg({
        type: "err",
        text: e?.response?.data?.message || "No se pudo marcar como N/A.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal__back">
      <div className="modal">
        <div className="modal__head">
          <div>
            <div className="modal__title">Marcar N/A</div>
            <div className="modal__sub">{colaborador.nombre}</div>
          </div>
          <button className="mini" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="hint" style={{ marginTop: 12 }}>
          Fecha: <b>{fechaHoy}</b>
        </div>

        <Field label="Motivo (opcional)">
          <input
            className="inp"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: incapacidad, permiso, ausencia..."
          />
        </Field>

        {msg && (
          <div
            className={msg.type === "ok" ? "alert ok" : "alert err"}
            style={{ marginTop: 12 }}
          >
            {msg.text}
          </div>
        )}

        <div className="row" style={{ marginTop: 14 }}>
          <button className="mini" onClick={onClose}>
            Cancelar
          </button>

          <button
            className="mini mini--blue"
            onClick={marcarNa}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Confirmar N/A"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GestionAlertaFalloModal({ alerta, onClose, onDone }) {
  const [medidasControl, setMedidasControl] = useState("");
  const [responsable, setResponsable] = useState("");
  const [fotoControl, setFotoControl] = useState("");
  const [accionFinal, setAccionFinal] = useState("mantenimiento");
  const [saving, setSaving] = useState(false);

  const [openBaja, setOpenBaja] = useState(false);
  const [codigo] = useState(() =>
    Math.floor(100000 + Math.random() * 900000).toString(),
  );
  const [inputCodigo, setInputCodigo] = useState("");

  // uploadPhoto eliminado — FotoInput lo maneja internamente

  async function guardarGestion() {
    try {
      if (!medidasControl.trim()) {
        alert("Debes escribir las medidas de control.");
        return;
      }

      if (!responsable.trim()) {
        alert("Debes indicar quién realizó las medidas de control.");
        return;
      }

      if (accionFinal === "dado_baja") {
        setOpenBaja(true);
        return;
      }

      setSaving(true);

      await api.post(`/maquinaria/${alerta.maquinaria_id}/eventos/control`, {
        fecha: alerta.fecha,
        preoperacional_id: alerta.preoperacional_id,
        medidas_control: medidasControl,
        responsable,
        foto_control_url: fotoControl || null,
        accion_final: accionFinal,
      });

      onDone?.();
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo guardar la gestión.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmarBaja() {
    try {
      if (!medidasControl.trim()) {
        alert("Debes escribir las medidas de control.");
        return;
      }

      if (!responsable.trim()) {
        alert("Debes indicar quién realizó las medidas de control.");
        return;
      }

      if (inputCodigo !== codigo) {
        alert("El código no coincide.");
        return;
      }

      setSaving(true);

      await api.post(`/maquinaria/${alerta.maquinaria_id}/eventos/control`, {
        fecha: alerta.fecha,
        preoperacional_id: alerta.preoperacional_id,
        medidas_control: medidasControl,
        responsable,
        foto_control_url: fotoControl || null,
        accion_final: "dado_baja",
      });

      setOpenBaja(false);
      onDone?.();
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo registrar la baja.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="modal__back">
        <div className="modal">
          <div className="modal__head">
            <div>
              <div className="modal__title">Gestión administrativa</div>
              <div className="modal__sub">
                {alerta.maquinaria_nombre} — {alerta.fecha_texto}
              </div>
            </div>
            <button className="mini" onClick={onClose}>
              Cerrar
            </button>
          </div>

          <div className="qRow" style={{ marginBottom: 14 }}>
            <div className="qRow__left">
              <div className="qRow__title">{alerta.item_fallido}</div>
              <div className="qRow__sub">
                Colaborador: {alerta.colaborador_nombre}
              </div>
              {alerta.observacion && (
                <div className="qRow__sub">
                  Observación: {alerta.observacion}
                </div>
              )}
              {alerta.foto_url && (
                <img
                  src={alerta.foto_url}
                  alt="Fallo reportado"
                  className="maqProblemPhoto"
                />
              )}
            </div>
          </div>

          <Field label="Medidas de control">
            <input
              className="inp"
              value={medidasControl}
              onChange={(e) => setMedidasControl(e.target.value)}
              placeholder="Ej: cambio de cable, ajuste, revisión técnica..."
            />
          </Field>

          <Field label="Responsable">
            <input
              className="inp"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Nombre del responsable"
            />
          </Field>

          <Field label="Foto de la gestión">
            <FotoInput
              onUpload={(url) => {
                if (url) setFotoControl(url);
              }}
            />
          </Field>

          <Field label="Acción final">
            <select
              className="inp"
              value={accionFinal}
              onChange={(e) => setAccionFinal(e.target.value)}
            >
              <option value="disponible">Activar / disponible</option>
              <option value="mantenimiento">Mandar a mantenimiento</option>
              <option value="dado_baja">Dar de baja</option>
            </select>
          </Field>

          <div className="row" style={{ marginTop: 14 }}>
            <button
              className="mini mini--blue"
              onClick={guardarGestion}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar gestión"}
            </button>
          </div>
        </div>
      </div>

      {openBaja && (
        <div className="modal__back">
          <div className="modal">
            <div className="modal__head">
              <div>
                <div className="modal__title">Confirmar baja</div>
                <div className="modal__sub">{alerta.maquinaria_nombre}</div>
              </div>
              <button className="mini" onClick={() => setOpenBaja(false)}>
                Cerrar
              </button>
            </div>

            <div className="alert err" style={{ marginBottom: 12 }}>
              Vas a dar de baja la maquinaria desde la alerta de fallo.
            </div>

            <div className="hint">
              Escribe este código para confirmar: <b>{codigo}</b>
            </div>

            <input
              className="inp"
              value={inputCodigo}
              onChange={(e) => setInputCodigo(e.target.value)}
              placeholder="Código de seguridad"
            />

            <div className="row" style={{ marginTop: 12 }}>
              <button className="mini" onClick={() => setOpenBaja(false)}>
                Cancelar
              </button>

              <button
                className="mini mini--danger"
                onClick={confirmarBaja}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Confirmar baja"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
