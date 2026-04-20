import { useEffect, useMemo, useState, useRef } from "react";
import { api } from "../api/axios";
import { getImageUrl } from "../utils";
import { Field, Info, FotoInput } from "../components/shared";
import "./preoperacional.css";

export default function PreoperacionalColaborador({
  onBack,
  preopHabilitado,
  clearPreopHabilitado,
}) {
  const [grupos, setGrupos] = useState([]);
  const [preguntasOpen, setPreguntasOpen] = useState(false);
  const [grupoId, setGrupoId] = useState("");
  const [search, setSearch] = useState("");
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [err, setErr] = useState(null);

  const [selectedMaquina, setSelectedMaquina] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [ubicacion, setUbicacion] = useState("bodega_98");
  const [ciudad, setCiudad] = useState("");
  const [respuestas, setRespuestas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [guardado, setGuardado] = useState(false);

  const [habilitacionId, setHabilitacionId] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");

  async function loadMaquinaria(searchValue = search) {
    try {
      setLoadingList(true);
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
      setList(
        (maqRes.data || []).filter(
          (m) => m.estado !== "dado_baja" && m.dado_baja !== true
        )
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo cargar la maquinaria.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => loadMaquinaria(search), 300);
    return () => clearTimeout(t);
  }, [grupoId, search]);

  // Cargar maquinaria desde habilitación (alertas) o desde QR
  useEffect(() => {
    async function cargarDesdeHabilitacion() {
      if (!preopHabilitado?.maquinaria_id) return;

      try {
        setMsg(null);
        setGuardado(false);
        setLoadingDetalle(true);

        const r = await api.get(
          `/maquinaria/colaborador/${preopHabilitado.maquinaria_id}`
        );
        const data = r.data;

        setSelectedMaquina(data.maquinaria);
        setDetalle(data);
        setRespuestas(
          (data?.preguntas || []).map((p) => ({
            pregunta_id: p.id,
            enunciado: p.enunciado,
            cumple: null,
            observacion: "",
            foto_url: "",
          }))
        );
        setUbicacion("bodega_98");
        setCiudad("");

        // Si viene de habilitación (no de QR), tomar id y fecha
        if (!preopHabilitado.desde_qr) {
          setHabilitacionId(
            preopHabilitado.habilitacion_id || preopHabilitado.id || ""
          );
          setFechaObjetivo(
            String(preopHabilitado.fecha_objetivo || "").slice(0, 10)
          );
        }
      } catch (e) {
        setMsg({
          type: "err",
          text:
            e?.response?.data?.message ||
            "No se pudo cargar la maquinaria habilitada.",
        });
      } finally {
        setLoadingDetalle(false);
      }
    }

    cargarDesdeHabilitacion();
  }, [preopHabilitado]);

  async function seleccionarMaquina(m) {
    try {
      setSelectedMaquina(m);
      setGuardado(false);
      setDetalle(null);
      setMsg(null);
      setLoadingDetalle(true);

      const r = await api.get(`/maquinaria/colaborador/${m.id}`);
      const data = r.data;

      setDetalle(data);
      setRespuestas(
        (data?.preguntas || []).map((p) => ({
          pregunta_id: p.id,
          enunciado: p.enunciado,
          cumple: null,
          observacion: "",
          foto_url: "",
        }))
      );
      setUbicacion("bodega_98");
      setCiudad("");
    } catch (e) {
      setMsg({
        type: "err",
        text:
          e?.response?.data?.message ||
          "No se pudo cargar el formulario de la máquina.",
      });
    } finally {
      setLoadingDetalle(false);
    }
  }

  // Actualiza la foto de una respuesta (llamado desde FotoInput)
  function uploadPhoto(url, preguntaId) {
    setRespuestas((prev) =>
      prev.map((item) =>
        item.pregunta_id === preguntaId ? { ...item, foto_url: url } : item
      )
    );
  }

  function updateRespuesta(preguntaId, field, value) {
    setRespuestas((prev) =>
      prev.map((item) =>
        item.pregunta_id === preguntaId ? { ...item, [field]: value } : item
      )
    );
  }

  const estadoGeneralTexto = useMemo(() => {
    if (!respuestas.length) return "Pendiente";
    if (respuestas.some((r) => r.cumple === null)) return "Pendiente";
    return respuestas.some((r) => r.cumple === false)
      ? "No cumple con las condiciones mínimas"
      : "Cumple";
  }, [respuestas]);

  async function guardarPreoperacional() {
    setMsg(null);

    if (!selectedMaquina?.id) {
      setMsg({ type: "err", text: "Debes seleccionar una maquinaria." });
      return;
    }

    if (ubicacion === "campo" && !ciudad.trim()) {
      setMsg({
        type: "err",
        text: "Debes escribir la ciudad cuando la ubicación es campo.",
      });
      return;
    }

    if (respuestas.some((r) => r.cumple === null)) {
      setMsg({
        type: "err",
        text: "Debes responder todas las preguntas del formulario.",
      });
      return;
    }

    if (respuestas.some((r) => r.cumple === false && !String(r.foto_url || "").trim())) {
      setMsg({
        type: "err",
        text: "Si una pregunta no cumple, debes adjuntar evidencia fotográfica.",
      });
      return;
    }

    try {
      setSaving(true);

      await api.post("/preoperacionales", {
        maquinaria_id: selectedMaquina.id,
        habilitacion_id: habilitacionId || undefined,
        fecha_objetivo: fechaObjetivo || undefined,
        ubicacion,
        ciudad: ubicacion === "campo" ? ciudad.trim() : "",
        respuestas: respuestas.map((r) => ({
          pregunta_id: r.pregunta_id,
          cumple: r.cumple,
          observacion: r.cumple === false ? (r.observacion || "").trim() : "",
          foto_url: r.cumple === false ? (r.foto_url || "").trim() : "",
        })),
      });

      setGuardado(true);
      setPreguntasOpen(false);
      setMsg({
        type: "ok",
        text: "Preoperacional guardado correctamente ✅. Redirigiendo...",
      });

      try {
        await loadMaquinaria(search);
      } catch {}

      setTimeout(() => {
        setSelectedMaquina(null);
        setDetalle(null);
        setRespuestas([]);
        setUbicacion("bodega_98");
        setCiudad("");
        setHabilitacionId("");
        setFechaObjetivo("");
        clearPreopHabilitado?.();
        onBack?.();
      }, 1200);
    } catch (e) {
      const backendMessage = e?.response?.data?.message || "";

      if (
        backendMessage
          .toLowerCase()
          .includes("ya tiene un preoperacional registrado")
      ) {
        setMsg({ type: "err", text: backendMessage });
        setTimeout(() => {
          clearPreopHabilitado?.();
          onBack?.();
        }, 1200);
        return;
      }

      setMsg({
        type: "err",
        text: backendMessage || "No se pudo guardar el preoperacional.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="mini" onClick={onBack}>
          Volver
        </button>
      </div>

      <h2 className="panel__title">Iniciar Preoperacional</h2>

      {/* ── LISTADO DE MAQUINARIA ── */}
      {!selectedMaquina && (
        <>
          <div
            style={{ display: "flex", gap: "12px", marginTop: 12, flexWrap: "wrap" }}
          >
            <div style={{ flex: 2, minWidth: "240px" }}>
              <Field label="Buscar herramienta o equipo">
                <input
                  className="inp"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o serial..."
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

          {loadingList && (
            <div className="hint" style={{ marginTop: 12 }}>
              Cargando maquinaria...
            </div>
          )}
          {err && <div className="alert err">{err}</div>}
          {msg && (
            <div
              className={msg.type === "ok" ? "alert ok" : "alert err"}
              style={{ marginTop: 10 }}
            >
              {msg.text}
            </div>
          )}

          <div className="cards" style={{ marginTop: 16 }}>
            {list.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`maquinaCard ${getEstadoClase(m)}`}
                onClick={() => {
                  if (!habilitacionId && m.preoperacional_hoy_id) {
                    setMsg({
                      type: "err",
                      text:
                        m.cumple_general === true
                          ? "Esta maquinaria ya tiene un preoperacional registrado hoy ✅."
                          : "Esta maquinaria ya tiene un preoperacional hoy con fallo — gestión pendiente.",
                    });
                    return;
                  }
                  if (
                    !habilitacionId &&
                    (m.estado === "no_disponible" ||
                      m.estado_dia === "no_disponible")
                  ) {
                    setMsg({
                      type: "err",
                      text: "Esta maquinaria no está disponible.",
                    });
                    return;
                  }
                  if (
                    !habilitacionId &&
                    (m.estado === "mantenimiento" ||
                      m.estado_dia === "mantenimiento")
                  ) {
                    setMsg({
                      type: "err",
                      text: "Esta maquinaria está en mantenimiento.",
                    });
                    return;
                  }
                  seleccionarMaquina(m);
                }}
                disabled={
                  !habilitacionId &&
                  (Boolean(m.preoperacional_hoy_id) ||
                    m.estado === "no_disponible" ||
                    m.estado_dia === "no_disponible" ||
                    m.estado === "mantenimiento" ||
                    m.estado_dia === "mantenimiento")
                }
              >
                <div className="maquinaCard__photo maqPhotoWrap">
                  {m.foto_url ? (
                    <img src={getImageUrl(m.foto_url)} alt={m.nombre} />
                  ) : (
                    <div className="thumb__ph">Sin foto</div>
                  )}
                  {m.preoperacional_hoy_id && m.cumple_general === true && (
                    <span className="maqBadge maqBadge--ok">Preop OK ✅</span>
                  )}
                  {m.preoperacional_hoy_id && m.cumple_general === false && (
                    <span className="maqBadge maqBadge--fallo">Falló hoy ❌</span>
                  )}
                  {(m.estado === "mantenimiento" ||
                    m.estado_dia === "mantenimiento") && (
                    <span className="maqBadge maqBadge--blue">Mantenimiento</span>
                  )}
                  {(m.estado === "no_disponible" ||
                    m.estado_dia === "no_disponible") && (
                    <span className="maqBadge maqBadge--gray">No disponible</span>
                  )}
                </div>
                <div className="maquinaCard__name">{m.nombre}</div>
                <div className="maquinaCard__sub">Serial: {m.serial}</div>
                <div className="maquinaCard__sub">Marca: {m.marca || "—"}</div>
                <div className="maquinaCard__sub">Estado: {m.estado}</div>
              </button>
            ))}
          </div>

          {!loadingList && list.length === 0 && (
            <div className="hint" style={{ marginTop: 14 }}>
              No se encontraron herramientas o equipos.
            </div>
          )}
        </>
      )}

      {/* ── FORMULARIO DE LA MAQUINARIA SELECCIONADA ── */}
      {selectedMaquina && (
        <div style={{ marginTop: 16 }}>
          <div
            className="row"
            style={{ justifyContent: "space-between", marginBottom: 12 }}
          >
            <h3 className="box__title">Formulario preoperacional</h3>
            <button
              className="mini"
              onClick={() => {
                setSelectedMaquina(null);
                setDetalle(null);
                setRespuestas([]);
                setHabilitacionId("");
                setFechaObjetivo("");
                setMsg(null);
                clearPreopHabilitado?.();
              }}
            >
              Cambiar maquinaria
            </button>
          </div>

          {loadingDetalle && (
            <div className="hint">Cargando formulario...</div>
          )}

          {!loadingDetalle && detalle && (
            <>
              <div className="grid2">
                <Info
                  label="Fecha"
                  value={
                    fechaObjetivo
                      ? new Date(`${fechaObjetivo}T08:00:00`).toLocaleDateString(
                          "es-CO"
                        )
                      : new Date().toLocaleDateString("es-CO")
                  }
                />
                <Info
                  label="Hora"
                  value={new Date().toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
                <Info
                  label="Maquinaria o Herramienta"
                  value={selectedMaquina.nombre}
                />
                <Info
                  label="Estado general"
                  value={estadoGeneralTexto}
                />
              </div>

              {habilitacionId && (
                <div className="alert ok" style={{ marginTop: 14 }}>
                  Estás respondiendo un preoperacional habilitado para la
                  fecha {fechaObjetivo}.
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <button
                  type="button"
                  className="mini mini--blue"
                  onClick={() => setPreguntasOpen(true)}
                  disabled={guardado}
                >
                  {guardado ? "Formulario guardado ✅" : "Responder formulario"}
                </button>

                {/* Indicador visual de progreso */}
                {respuestas.length > 0 && !guardado && (
                  <div className="hint" style={{ marginTop: 8 }}>
                    {respuestas.filter((r) => r.cumple !== null).length} /{" "}
                    {respuestas.length} preguntas respondidas
                  </div>
                )}
              </div>

              <div className="grid2" style={{ marginTop: 14 }}>
                <Field label="Ubicación">
                  <select
                    className="inp"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    disabled={guardado}
                  >
                    <option value="bodega_98">Bodega 98</option>
                    <option value="campo">Campo</option>
                  </select>
                </Field>

                {ubicacion === "campo" && (
                  <Field label="Ciudad">
                    <input
                      className="inp"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Escribe la ciudad"
                      disabled={guardado}
                    />
                  </Field>
                )}
              </div>

              {msg && (
                <div
                  className={msg.type === "ok" ? "alert ok" : "alert err"}
                  style={{ marginTop: 14 }}
                >
                  {msg.text}
                </div>
              )}

              <div className="row" style={{ marginTop: 16 }}>
                <button
                  className="mini mini--blue"
                  onClick={guardarPreoperacional}
                  disabled={saving || guardado}
                >
                  {guardado
                    ? "Ya guardado ✅"
                    : saving
                    ? "Guardando..."
                    : "Guardar preoperacional"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODAL DE PREGUNTAS ── */}
      {preguntasOpen && (
        <PreguntasPreoperacionalModal
          respuestas={respuestas}
          setRespuestas={setRespuestas}
          onUploadPhoto={uploadPhoto}
          onClose={() => setPreguntasOpen(false)}
          guardado={guardado}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DE PREGUNTAS
// ─────────────────────────────────────────────────────────────────────────────
function PreguntasPreoperacionalModal({
  respuestas,
  setRespuestas,
  onUploadPhoto,
  onClose,
  guardado,
}) {
  function updateRespuesta(preguntaId, field, value) {
    setRespuestas((prev) =>
      prev.map((item) =>
        item.pregunta_id === preguntaId ? { ...item, [field]: value } : item
      )
    );
  }

  const respondidas = respuestas.filter((r) => r.cumple !== null).length;
  const total = respuestas.length;
  const porcentaje = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  return (
    <div className="modal__back">
      <div className="modal modal--xl">
        <div className="modal__head">
          <div>
            <div className="modal__title">Formulario preoperacional</div>
            <div className="modal__sub">
              {respondidas}/{total} preguntas respondidas ({porcentaje}%)
            </div>
          </div>
          <button className="mini" onClick={onClose}>
            {guardado ? "Cerrar" : "Guardar y cerrar"}
          </button>
        </div>

        {/* Barra de progreso */}
        {!guardado && (
          <div
            style={{
              height: 6,
              background: "#e5e7eb",
              borderRadius: 999,
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${porcentaje}%`,
                background:
                  porcentaje === 100 ? "#22c55e" : "#3b82f6",
                borderRadius: 999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        )}

        <div className="list" style={{ marginTop: 12 }}>
          {respuestas.map((r, idx) => (
            <div key={r.pregunta_id} className="qRow">
              <div className="qRow__left" style={{ width: "100%" }}>
                <div className="qRow__title">
                  {idx + 1}. {r.enunciado}
                </div>

                <div className="row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className={`mini ${r.cumple === true ? "mini--blue" : ""}`}
                    onClick={() =>
                      updateRespuesta(r.pregunta_id, "cumple", true)
                    }
                    disabled={guardado}
                  >
                    ✅ Cumple
                  </button>
                  <button
                    type="button"
                    className={`mini ${r.cumple === false ? "mini--danger" : ""}`}
                    onClick={() =>
                      updateRespuesta(r.pregunta_id, "cumple", false)
                    }
                    disabled={guardado}
                  >
                    ❌ No cumple
                  </button>
                </div>

                {r.cumple === null && !guardado && (
                  <div className="hint" style={{ marginTop: 6, color: "#f59e0b" }}>
                    ⚠ Pendiente de respuesta
                  </div>
                )}

                {r.cumple === false && (
                  <div className="grid2" style={{ marginTop: 12 }}>
                    <Field label="Observación (describe la novedad)">
                      <input
                        className="inp"
                        value={r.observacion || ""}
                        onChange={(e) =>
                          updateRespuesta(
                            r.pregunta_id,
                            "observacion",
                            e.target.value
                          )
                        }
                        placeholder="Describe la novedad encontrada"
                        disabled={guardado}
                      />
                    </Field>

                    <Field label="Evidencia fotográfica (obligatoria)">
                      <FotoInput
                        disabled={guardado}
                        onUpload={(url) => onUploadPhoto(url, r.pregunta_id)}
                      />
                      {!r.foto_url && !guardado && (
                        <div
                          className="hint"
                          style={{ marginTop: 4, color: "#ef4444" }}
                        >
                          La foto es obligatoria cuando no cumple
                        </div>
                      )}
                    </Field>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 16 }}>
          <button className="mini mini--blue" onClick={onClose}>
            {guardado ? "Cerrar" : "Guardar respuestas"}
          </button>
        </div>
      </div>
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
