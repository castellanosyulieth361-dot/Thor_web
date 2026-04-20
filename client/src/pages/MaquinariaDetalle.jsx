import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/axios";
import { getImageUrl, formatAccion } from "../utils";
import { Field, Info, PreviewList, FotoInput } from "../components/shared";
import "./maquinaria-detalle.css";

export default function MaquinariaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [calendario, setCalendario] = useState({});
  const [historial, setHistorial] = useState([]);
  const [preops, setPreops] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editData, setEditData] = useState({
    nombre: "", serial: "", marca: "", modelo: "", grupo_id: "", foto_url: "",
  });

  const [estado, setEstado] = useState("");
  const [savingEstado, setSavingEstado] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [bajaOpen, setBajaOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEstadoDia, setSelectedEstadoDia] = useState([]);

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [minMonth, setMinMonth] = useState(defaultMonth);
  const [month, setMonth] = useState(defaultMonth);
  const [createdDate, setCreatedDate] = useState("");

  async function loadAll() {
    try {
      setLoading(true);
      setErr(null);

      const [detalleRes, calendarioRes, historialRes, preopsRes, gruposRes] =
        await Promise.all([
          api.get(`/maquinaria/${id}`),
          api.get(`/maquinaria/${id}/calendario`, { params: { month } }),
          api.get(`/maquinaria/${id}/historial`),
          api.get(`/maquinaria/${id}/preoperacionales`),
          api.get("/grupos"),
        ]);

      const detalle = detalleRes.data;
      setData(detalle);
      setCalendario(calendarioRes.data?.calendario || {});
      setMinMonth(calendarioRes.data?.minMonth || "");
      setCreatedDate(calendarioRes.data?.createdDate || "");
      setHistorial(historialRes.data || []);
      setPreops(preopsRes.data || []);
      setGrupos(gruposRes.data || []);
      setEstado(detalle?.maquinaria?.estado || "");
      setEditData({
        nombre: detalle?.maquinaria?.nombre || "",
        serial: detalle?.maquinaria?.serial || "",
        marca: detalle?.maquinaria?.marca || "",
        modelo: detalle?.maquinaria?.modelo || "",
        grupo_id: String(detalle?.maquinaria?.grupo_id || ""),
        foto_url: detalle?.maquinaria?.foto_url || "",
      });
    } catch (e) {
      setErr(e?.response?.data?.message || "No se pudo cargar la maquinaria.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [id, month]);

  useEffect(() => {
    if (minMonth && month < minMonth) setMonth(minMonth);
  }, [minMonth]);

  async function guardarInfo() {
    if (!editData.nombre || !editData.serial || !editData.marca ||
        !editData.modelo || !editData.grupo_id || !editData.foto_url) {
      alert("Completa todos los campos obligatorios, incluida la foto.");
      return;
    }
    try {
      setSavingInfo(true);
      await api.put(`/maquinaria/${id}`, {
        nombre: editData.nombre, serial: editData.serial,
        marca: editData.marca, modelo: editData.modelo,
        grupo_id: Number(editData.grupo_id), foto_url: editData.foto_url,
      });
      await loadAll();
      alert("Información actualizada correctamente.");
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo actualizar la maquinaria.");
    } finally {
      setSavingInfo(false);
    }
  }

  async function guardarEstado() {
    if (!descripcion.trim()) {
      alert("Debes escribir una observación para cambiar el estado.");
      return;
    }
    try {
      setSavingEstado(true);
      await api.patch(`/maquinaria/${id}/estado`, { estado, descripcion });
      setDescripcion("");
      await loadAll();
      alert("Estado actualizado correctamente.");
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo actualizar el estado.");
    } finally {
      setSavingEstado(false);
    }
  }

  const maq = data?.maquinaria;
  const qr = data?.qr;
  const maxMonth = maq?.fecha_baja ? String(maq.fecha_baja).slice(0, 7) : null;
  const bloqueadaPorBaja = maq?.estado === "dado_baja" || maq?.dado_baja === true;

  const { year, monthIndex, daysInMonth, firstDayOffset } = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const firstDate = new Date(y, m - 1, 1);
    const lastDate = new Date(y, m, 0);
    const jsDay = firstDate.getDay();
    return {
      year: y, monthIndex: m - 1,
      daysInMonth: lastDate.getDate(),
      firstDayOffset: jsDay === 0 ? 6 : jsDay - 1,
    };
  }, [month]);

  const days = [];
  for (let i = 0; i < firstDayOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 2, 1);
    const nm = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (nm < minMonth) return;
    setMonth(nm);
  }

  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m, 1);
    const nm = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (maxMonth && nm > maxMonth) return;
    setMonth(nm);
  }

  function formatMonthLabel(value) {
    const [y, m] = value.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("es-CO", {
      month: "long", year: "numeric",
    });
  }

  function openDayModal(dateKey, estadosDia) {
    if (bloqueadaPorBaja) return;
    setSelectedDate(dateKey);
    setSelectedEstadoDia(estadosDia);
    setDayOpen(true);
  }

  return (
    <>
      <div className="maqPage">
        <div className="maqPage__top">
          <button className="mini" onClick={() => navigate(-1)}>Volver</button>
        </div>

        {loading && <div className="hint">Cargando maquinaria...</div>}
        {err && <div className="alert err">{err}</div>}

        {maq && (
          <>
            {bloqueadaPorBaja && (
              <div className="alert err" style={{ marginBottom: 12 }}>
                Esta maquinaria fue dada de baja. El calendario y el historial
                quedan en modo solo lectura.
              </div>
            )}

            <div className="maqHero">
              <div className="maqHero__photo">
                {editData.foto_url ? (
                  <img src={getImageUrl(editData.foto_url)} alt={editData.nombre} />
                ) : (
                  <div className="thumb__ph">Sin foto</div>
                )}
              </div>

              <div className="maqHero__info">
                <h2 className="maqHero__title">{maq.nombre}</h2>

                <div className="grid2">
                  <Field label="Nombre">
                    <input className="inp" value={editData.nombre} disabled={bloqueadaPorBaja}
                      onChange={(e) => setEditData({ ...editData, nombre: e.target.value })} />
                  </Field>
                  <Field label="Serial">
                    <input className="inp" value={editData.serial} disabled={bloqueadaPorBaja}
                      onChange={(e) => setEditData({ ...editData, serial: e.target.value })} />
                  </Field>
                  <Field label="Marca">
                    <input className="inp" value={editData.marca} disabled={bloqueadaPorBaja}
                      onChange={(e) => setEditData({ ...editData, marca: e.target.value })} />
                  </Field>
                  <Field label="Modelo">
                    <input className="inp" value={editData.modelo} disabled={bloqueadaPorBaja}
                      onChange={(e) => setEditData({ ...editData, modelo: e.target.value })} />
                  </Field>
                  <Field label="Grupo">
                    <select className="inp" value={editData.grupo_id} disabled={bloqueadaPorBaja}
                      onChange={(e) => setEditData({ ...editData, grupo_id: e.target.value })}>
                      <option value="">Selecciona...</option>
                      {grupos.map((g) => (
                        <option key={g.id} value={g.id}>{g.nombre}</option>
                      ))}
                    </select>
                  </Field>
                  <Info label="Estado actual" value={maq.estado} />
                  <Info label="Dado de baja" value={String(maq.dado_baja)} />
                </div>

                <Field label="Cambiar foto" style={{ marginTop: 12 }}>
                  <FotoInput
                    disabled={bloqueadaPorBaja}
                    initialUrl={editData.foto_url ? getImageUrl(editData.foto_url) : ""}
                    onUpload={(url) => {
                      if (url) setEditData((prev) => ({ ...prev, foto_url: url }));
                    }}
                  />
                </Field>

                <div className="row" style={{ marginTop: 12 }}>
                  <button className="mini mini--blue" onClick={guardarInfo}
                    disabled={savingInfo || bloqueadaPorBaja}>
                    {savingInfo ? "Guardando..." : "Guardar información"}
                  </button>
                </div>
              </div>

              <div className="maqHero__qr">
                <div className="subbox__title">QR de la maquinaria</div>
                {qr?.dataUrl ? (
                  <img src={qr.dataUrl} alt="QR maquinaria" className="maqQR" />
                ) : (
                  <div className="hint">No disponible</div>
                )}
              </div>
            </div>

            {/* ── ESTADO Y ACCIONES ── */}
            <div className="maqSection">
              <h3 className="box__title">Estado y acciones</h3>
              <div className="estadoRow">
                <Field label="Estado">
                  <select className="inp" value={estado} disabled={bloqueadaPorBaja}
                    onChange={(e) => setEstado(e.target.value)}>
                    <option value="disponible">Disponible</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="no_disponible">No disponible</option>
                  </select>
                </Field>
                <Field label="Observación">
                  <input className="inp" value={descripcion} disabled={bloqueadaPorBaja}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: Se envía a mantenimiento por falla eléctrica" />
                  {!descripcion.trim() && (
                    <div className="hint errText">
                      Debes escribir una observación para actualizar el estado.
                    </div>
                  )}
                </Field>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="mini mini--blue" onClick={guardarEstado}
                  disabled={savingEstado || bloqueadaPorBaja}>
                  {savingEstado ? "Guardando..." : "Guardar cambios"}
                </button>
                <button className="mini mini--danger" onClick={() => setBajaOpen(true)}
                  disabled={bloqueadaPorBaja}>
                  Dar de baja
                </button>
              </div>
            </div>

            {/* ── CALENDARIO ── */}
            <div className="maqSection">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3 className="box__title">Calendario de la maquinaria</h3>
                <div className="row">
                  <button className="mini" onClick={prevMonth} disabled={month <= minMonth}>◀</button>
                  <div className="monthLabel">{formatMonthLabel(month)}</div>
                  <button className="mini" onClick={nextMonth}
                    disabled={Boolean(maxMonth && month >= maxMonth)}>▶</button>
                </div>
              </div>

              <div className="legend">
                <span className="legend__item"><span className="dot dot--green"></span> Correcto</span>
                <span className="legend__item"><span className="dot dot--orange"></span> Falló</span>
                <span className="legend__item"><span className="dot dot--yellow"></span> N/A</span>
                <span className="legend__item"><span className="dot dot--blue"></span> Mantenimiento</span>
                <span className="legend__item"><span className="dot dot--gray"></span> Sin registro</span>
              </div>

              <div className="calendarHead">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="calendarHead__cell">{d}</div>
                ))}
              </div>

              <div className="calendarGrid">
                {days.map((day, idx) => {
                  if (!day) return (
                    <div key={`empty-${idx}`} className="calendarCell calendarCell--empty" />
                  );

                  const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const antesDeCreacion = createdDate && dateKey < createdDate;
                  const estadosDia = antesDeCreacion
                    ? ["bloqueado"]
                    : calendario?.[dateKey]?.estados || ["sin_registro"];

                  return (
                    <CalendarDayCell
                      key={dateKey}
                      day={day}
                      dateKey={dateKey}
                      estadosDia={estadosDia}
                      fechaBaja={maq?.fecha_baja || null}
                      bloqueado={antesDeCreacion}
                      onClick={() => openDayModal(dateKey, estadosDia)}
                    />
                  );
                })}
              </div>
            </div>

            {/* ── PREOPERACIONALES ── */}
            <div className="maqSection">
              <h3 className="box__title">Todos los preoperacionales de esta máquina</h3>
              <PreviewList
                items={preops}
                emptyText="No hay preoperacionales registrados para esta máquina."
                renderItem={(item) => (
                  <div key={item.id} className="previewCard previewCard--preop">
                    <div className="previewCard__badge">{item.estado_texto || "Preoperacional"}</div>
                    <div className="previewCard__title">{item.fecha_texto || item.fecha || "Sin fecha"}</div>
                    <div className="previewCard__sub">Colaborador: {item.usuario_nombre || "—"}</div>
                    {item.observacion_general && (
                      <div className="previewCard__sub">Obs: {item.observacion_general}</div>
                    )}
                  </div>
                )}
              />
            </div>

            {/* ── HISTORIAL ── */}
            <div className="maqSection maqSection--history">
              <h3 className="box__title">Historial de estados</h3>
              <PreviewList
                items={historial}
                emptyText="No hay historial registrado."
                renderItem={(h) => <HistoryMiniCard key={h.id} item={h} />}
              />
            </div>
          </>
        )}
      </div>

      {bajaOpen && (
        <DarBajaModal
          maquinariaId={id}
          onClose={() => setBajaOpen(false)}
          onDone={() => { setBajaOpen(false); loadAll(); }}
        />
      )}

      {dayOpen && (
        <MaquinariaDiaModal
          maquinariaId={id}
          fecha={selectedDate}
          estadosDia={selectedEstadoDia}
          onClose={() => setDayOpen(false)}
          onDone={() => { setDayOpen(false); loadAll(); }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY MINI CARD
// ─────────────────────────────────────────────────────────────────────────────
function HistoryMiniCard({ item }) {
  const [open, setOpen] = useState(false);
  const titulo = formatAccion(item.accion);
  const descripcion = item.descripcion || item.motivo || "Sin descripción";

  return (
    <>
      <button type="button" className="historyMiniCard" onClick={() => setOpen(true)}>
        <div className="historyMiniCard__top">
          <div className="historyMiniCard__badge">{titulo}</div>
        </div>
        <div className="historyMiniCard__title">{titulo}</div>
        <div className="historyMiniCard__sub historyMiniCard__sub--truncate">{descripcion}</div>
        <div className="historyMiniCard__date">{item.creado_en_texto || item.creado_en}</div>
      </button>

      {open && (
        <div className="modal__back">
          <div className="modal modal--xl">
            <div className="modal__head">
              <div>
                <div className="modal__title">{titulo}</div>
                <div className="modal__sub">{item.creado_en_texto || item.creado_en}</div>
              </div>
              <button className="mini" onClick={() => setOpen(false)}>Cerrar</button>
            </div>
            <div className="detailCard">
              <div className="detailCard__badge">{titulo}</div>
              <div className="detailCard__text">{descripcion}</div>
              {item.responsable && (
                <div className="detailCard__meta"><b>Responsable:</b> {item.responsable}</div>
              )}
              {item.foto_url && (
                <img src={getImageUrl(item.foto_url)} alt={item.accion}
                  className="detailCard__image" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR DAY CELL
// ─────────────────────────────────────────────────────────────────────────────
function CalendarDayCell({ day, dateKey, estadosDia, onClick, fechaBaja, bloqueado }) {
  let estadosUnicos = [...new Set(estadosDia)];
  if (estadosUnicos.includes("dado_baja")) estadosUnicos = ["dado_baja"];

  const colors = estadosUnicos.map(mapEstadoToColorClass);
  const todayStr = new Date().toISOString().slice(0, 10);
  const esFuturo = dateKey > todayStr;
  const fechaBajaStr = fechaBaja ? String(fechaBaja).slice(0, 10) : null;
  const esDiaBaja = Boolean(fechaBajaStr && dateKey >= fechaBajaStr);

  let style = {};
  if (colors.length === 2) {
    style = {
      background: `linear-gradient(90deg,
        ${mapColor(colors[0])} 0%, ${mapColor(colors[0])} 50%,
        ${mapColor(colors[1])} 50%, ${mapColor(colors[1])} 100%)`,
    };
  } else if (colors.length >= 3) {
    style = {
      background: `linear-gradient(90deg,
        ${mapColor(colors[0])} 0%, ${mapColor(colors[0])} 33.33%,
        ${mapColor(colors[1])} 33.33%, ${mapColor(colors[1])} 66.66%,
        ${mapColor(colors[2])} 66.66%, ${mapColor(colors[2])} 100%)`,
    };
  }

  const locked = (esFuturo || bloqueado) && !esDiaBaja;
  const className = colors.length === 1
    ? `calendarCell ${colors[0]} ${locked ? "calendarCell--locked" : ""}`
    : `calendarCell calendarCell--split ${locked ? "calendarCell--locked" : ""}`;

  return (
    <button
      type="button"
      className={className}
      style={style}
      title={
        esDiaBaja ? "Maquinaria dada de baja"
          : bloqueado ? "La maquinaria aún no existía en esta fecha"
          : esFuturo ? "Este día aún no ha llegado"
          : `${dateKey}: ${estadosUnicos.join(" + ")}`
      }
      onClick={() => { if (esFuturo || esDiaBaja || bloqueado) return; onClick?.(); }}
      disabled={esFuturo || esDiaBaja || bloqueado}
    >
      <span className="calendarCell__num">{day}</span>
      {!esDiaBaja && esFuturo && <span className="calendarLock">🔒</span>}
      {!esDiaBaja && bloqueado && <span className="calendarLock">❌</span>}
      {esDiaBaja && <span className="calendarBajaIcon">🛑</span>}
    </button>
  );
}

function mapEstadoToColorClass(estado) {
  switch (estado) {
    case "ok": return "calendarCell--green";
    case "fallo": return "calendarCell--orange";
    case "na": return "calendarCell--yellow";
    case "mantenimiento": return "calendarCell--blue";
    case "no_disponible": return "calendarCell--yellow";
    case "dado_baja": return "calendarCell--red";
    case "bloqueado": return "calendarCell--beige";
    default: return "calendarCell--gray";
  }
}

function mapColor(cls) {
  if (cls === "calendarCell--green") return "rgba(34,197,94,.24)";
  if (cls === "calendarCell--red") return "rgba(239,68,68,.22)";
  if (cls === "calendarCell--orange") return "rgba(249,115,22,.24)";
  if (cls === "calendarCell--yellow") return "rgba(250,204,21,.28)";
  if (cls === "calendarCell--blue") return "rgba(96,165,250,.25)";
  return "rgba(156,163,175,.24)";
}

// ─────────────────────────────────────────────────────────────────────────────
// DAR DE BAJA MODAL — usa FotoInput
// ─────────────────────────────────────────────────────────────────────────────
function DarBajaModal({ maquinariaId, onClose, onDone }) {
  const [motivo, setMotivo] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [codigo] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [inputCodigo, setInputCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function confirmarBaja() {
    setMsg(null);
    if (!motivo.trim()) { setMsg({ type: "err", text: "Debes escribir el motivo de la baja." }); return; }
    if (!fotoUrl) { setMsg({ type: "err", text: "Debes adjuntar la foto de soporte." }); return; }
    if (inputCodigo !== codigo) { setMsg({ type: "err", text: "El código de seguridad no coincide." }); return; }

    try {
      setLoading(true);
      await api.post(`/maquinaria/${maquinariaId}/baja`, {
        motivo, foto_url: fotoUrl, codigo_confirmacion: codigo,
      });
      onDone?.();
    } catch (e) {
      setMsg({ type: "err", text: e?.response?.data?.message || "No se pudo dar de baja." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal__back">
      <div className="modal">
        <div className="modal__head">
          <div>
            <div className="modal__title">Dar de baja maquinaria</div>
            <div className="modal__sub">Acción definitiva</div>
          </div>
          <button className="mini" onClick={onClose}>Cerrar</button>
        </div>

        <Field label="Motivo de baja">
          <input className="inp" value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: daño irreversible, obsolescencia, pérdida total..." />
        </Field>

        <Field label="Foto soporte">
          <FotoInput onUpload={(url) => { if (url) setFotoUrl(url); }} />
        </Field>

        <div className="hint">
          Escribe este código para confirmar la baja definitiva: <b>{codigo}</b>
        </div>
        <input className="inp" value={inputCodigo}
          onChange={(e) => setInputCodigo(e.target.value)}
          placeholder="Código de seguridad" />

        {msg && (
          <div className={msg.type === "ok" ? "alert ok" : "alert err"} style={{ marginTop: 10 }}>
            {msg.text}
          </div>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button className="mini" onClick={onClose}>Cancelar</button>
          <button className="mini mini--danger" onClick={confirmarBaja} disabled={loading}>
            {loading ? "Guardando..." : "Confirmar baja"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAQUINARIA DIA MODAL — usa FotoInput
// ─────────────────────────────────────────────────────────────────────────────
function MaquinariaDiaModal({ maquinariaId, fecha, estadosDia, onClose, onDone }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [medidasControl, setMedidasControl] = useState("");
  const [responsable, setResponsable] = useState("");
  const [fotoControl, setFotoControl] = useState("");
  const [accionFinal, setAccionFinal] = useState("mantenimiento");
  const [savingControl, setSavingControl] = useState(false);
  const [openBajaDesdeFallo, setOpenBajaDesdeFallo] = useState(false);
  const [codigoBaja] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [inputCodigoBaja, setInputCodigoBaja] = useState("");
  const [openGreyActions, setOpenGreyActions] = useState(false);

  const estadoPrincipal = Array.isArray(estadosDia) ? estadosDia[0] : estadosDia;
  const todayStr = new Date().toISOString().slice(0, 10);
  const esHoy = fecha === todayStr;
  const yaTieneControl = Boolean(detalle?.control);
  const hayFalloBase = Boolean(detalle?.fallo_base);
  const hayPreopHoy = Boolean(detalle?.preoperacional);
  const mostrarFormGestion = estadosDia.includes("fallo") && hayFalloBase && !yaTieneControl && esHoy;

  useEffect(() => {
    async function loadDetalle() {
      try {
        setLoading(true);
        setErr(null);
        const r = await api.get(`/maquinaria/${maquinariaId}/preoperacionales/dia`, {
          params: { date: fecha },
        });
        setDetalle(r.data || null);
      } catch (e) {
        setErr(e?.response?.data?.message || "No se pudo cargar el detalle del día.");
      } finally {
        setLoading(false);
      }
    }
    loadDetalle();
  }, [maquinariaId, fecha]);

  async function guardarControl() {
    if (!medidasControl.trim()) { alert("Debes escribir las medidas de control."); return; }
    if (!responsable.trim()) { alert("Debes indicar quién realizó las medidas de control."); return; }
    if (accionFinal === "dado_baja") { setOpenBajaDesdeFallo(true); return; }
    try {
      setSavingControl(true);
      await api.post(`/maquinaria/${maquinariaId}/eventos/control`, {
        fecha,
        preoperacional_id: detalle?.fallo_base?.preoperacional_id || detalle?.preoperacional?.id || null,
        medidas_control: medidasControl, responsable,
        foto_control_url: fotoControl || null, accion_final: accionFinal,
      });
      onDone?.();
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo guardar el control.");
    } finally {
      setSavingControl(false);
    }
  }

  async function confirmarBajaDesdeFallo() {
    if (!medidasControl.trim()) { alert("Debes escribir las medidas de control."); return; }
    if (!responsable.trim()) { alert("Debes indicar quién realizó las medidas de control."); return; }
    if (inputCodigoBaja !== codigoBaja) { alert("El código de seguridad no coincide."); return; }
    try {
      setSavingControl(true);
      await api.post(`/maquinaria/${maquinariaId}/eventos/control`, {
        fecha,
        preoperacional_id: detalle?.fallo_base?.preoperacional_id || detalle?.preoperacional?.id || null,
        medidas_control: medidasControl, responsable,
        foto_control_url: fotoControl || null, accion_final: "dado_baja",
      });
      setOpenBajaDesdeFallo(false);
      onDone?.();
    } catch (e) {
      alert(e?.response?.data?.message || "No se pudo guardar la baja.");
    } finally {
      setSavingControl(false);
    }
  }

  return (
    <>
      <div className="modal__back">
        <div className="modal modal--xl">
          <div className="modal__head">
            <div>
              <div className="modal__title">Detalle del día</div>
              <div className="modal__sub">{fecha}</div>
              {Array.isArray(estadosDia) && estadosDia.length > 0 && (
                <div className="row" style={{ marginTop: 10, marginBottom: 10, gap: 8 }}>
                  {estadosDia.map((est, idx) => (
                    <span key={idx} className={`estadoTag ${mapEstadoToColorClass(est)}`}>{est}</span>
                  ))}
                </div>
              )}
            </div>
            <button className="mini" onClick={onClose}>Cerrar</button>
          </div>

          {loading && <div className="hint">Cargando...</div>}
          {err && <div className="alert err">{err}</div>}

          {!loading && !err && (
            <>
              {/* Preop del día */}
              {hayPreopHoy && (
                <div className="maqSection">
                  <h3 className="box__title">
                    Preoperacional del día
                    {detalle.preoperacional && (
                      <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 13 }}>
                        — {detalle.preoperacional.usuario_nombre}
                      </span>
                    )}
                  </h3>
                  <div className="list">
                    <div className="qRow">
                      <div className="qRow__left">
                        <div className="qRow__sub">Fecha: {detalle.preoperacional?.fecha_texto || fecha}</div>
                        <div className="qRow__sub">Formulario: {detalle.formulario?.nombre || "—"}</div>
                      </div>
                    </div>
                    {(detalle.respuestas || []).map((r) => (
                      <div key={r.id} className="qRow">
                        <div className="qRow__left">
                          <div className="qRow__title">{r.enunciado}</div>
                          <div className="qRow__sub">Resultado: {r.cumple ? "✅ Cumple" : "❌ No cumple"}</div>
                          {r.observacion && <div className="qRow__sub">Observación: {r.observacion}</div>}
                          {r.foto_url && <img src={getImageUrl(r.foto_url)} alt={r.enunciado} className="maqProblemPhoto" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallo arrastrado */}
              {!hayPreopHoy && hayFalloBase && estadosDia.includes("fallo") && (
                <div className="maqSection">
                  <h3 className="box__title">Falla arrastrada</h3>
                  <div className="list">
                    <div className="qRow">
                      <div className="qRow__left">
                        <div className="qRow__sub">Falla detectada el: {detalle.fallo_base?.fecha_texto || "—"}</div>
                        <div className="qRow__sub">Colaborador: {detalle.fallo_base?.usuario_nombre || "—"}</div>
                      </div>
                    </div>
                    {(detalle.respuestas_fallo_base || []).filter((r) => r.cumple === false).map((r) => (
                      <div key={r.id} className="qRow">
                        <div className="qRow__left">
                          <div className="qRow__title">{r.enunciado}</div>
                          <div className="qRow__sub">Resultado: ❌ No cumple</div>
                          {r.observacion && <div className="qRow__sub">Observación: {r.observacion}</div>}
                          {r.foto_url && <img src={getImageUrl(r.foto_url)} alt={r.enunciado} className="maqProblemPhoto" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* N/A */}
              {estadosDia.includes("na") && detalle?.novedad && (
                <div className="alert ok">
                  <b>Día marcado como N/A</b>
                  <div style={{ marginTop: 6 }}>Motivo: {detalle.novedad.motivo || "No especificado"}</div>
                </div>
              )}

              {/* Mantenimiento */}
              {estadosDia.includes("mantenimiento") && detalle?.mantenimiento && (
                <div className="alert ok">
                  <b>La maquinaria estuvo en mantenimiento este día.</b>
                  <div style={{ marginTop: 6 }}>{detalle.mantenimiento.descripcion || "Sin detalle registrado"}</div>
                </div>
              )}

              {/* Gestión ya registrada */}
              {yaTieneControl && (
                <div className="maqSection" style={{ marginTop: 16 }}>
                  <h3 className="box__title">Gestión administrativa registrada</h3>
                  <div className="qRow">
                    <div className="qRow__left">
                      <div className="qRow__sub"><b>Medidas de control:</b> {detalle.control.descripcion || "—"}</div>
                      <div className="qRow__sub"><b>Responsable:</b> {detalle.control.responsable || "—"}</div>
                      <div className="qRow__sub"><b>Acción final:</b> {detalle.control.accion_final || "—"}</div>
                      {detalle.control.foto_url && (
                        <img src={getImageUrl(detalle.control.foto_url)} alt="Gestión" className="maqProblemPhoto" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de gestión — solo si hay fallo sin resolver HOY */}
              {mostrarFormGestion && (
                <div className="maqSection" style={{ marginTop: 16 }}>
                  <h3 className="box__title">Gestión administrativa de la novedad</h3>

                  <Field label="Medidas de control">
                    <input className="inp" value={medidasControl}
                      onChange={(e) => setMedidasControl(e.target.value)}
                      placeholder="Ej: cambio de cable, ajuste, revisión técnica..." />
                  </Field>

                  <Field label="Quién realizó las medidas de control">
                    <input className="inp" value={responsable}
                      onChange={(e) => setResponsable(e.target.value)}
                      placeholder="Nombre del responsable" />
                  </Field>

                  <Field label="Registro fotográfico de las medidas">
                    <FotoInput onUpload={(url) => { if (url) setFotoControl(url); }} />
                  </Field>

                  <Field label="Acción final">
                    <select className="inp" value={accionFinal}
                      onChange={(e) => setAccionFinal(e.target.value)}>
                      <option value="disponible">Activar / disponible</option>
                      <option value="mantenimiento">Mandar a mantenimiento</option>
                      <option value="dado_baja">Dar de baja</option>
                    </select>
                  </Field>

                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="mini mini--blue" onClick={guardarControl} disabled={savingControl}>
                      {savingControl ? "Guardando..." : "Guardar gestión"}
                    </button>
                  </div>
                </div>
              )}

              {/* Sin registro */}
              {(estadoPrincipal === "sin_registro" ||
                (!hayPreopHoy && yaTieneControl) ||
                (!hayPreopHoy && !hayFalloBase && !yaTieneControl &&
                  !detalle?.novedad && !detalle?.mantenimiento && estadoPrincipal !== "fallo")
              ) && (
                <>
                  {estadoPrincipal === "sin_registro" && (
                    <div className="alert err">No hubo registro de preoperacional ese día.</div>
                  )}
                  {!hayPreopHoy && yaTieneControl && (
                    <div className="alert ok">
                      Este día tuvo fallo con gestión administrativa registrada, pero sin preoperacional directo.
                    </div>
                  )}
                  <div className="row" style={{ marginTop: 12 }}>
                    <button className="mini mini--blue" onClick={() => setOpenGreyActions(true)}>
                      Gestionar día gris
                    </button>
                  </div>
                </>
              )}

              {!hayPreopHoy && !hayFalloBase && !yaTieneControl &&
               !detalle?.novedad && !detalle?.mantenimiento &&
               estadoPrincipal !== "sin_registro" && estadoPrincipal !== "fallo" && (
                <div className="hint">No hay información registrada para este día.</div>
              )}

              {/* Modal baja desde fallo */}
              {openBajaDesdeFallo && (
                <div className="modal__back">
                  <div className="modal">
                    <div className="modal__head">
                      <div>
                        <div className="modal__title">Confirmar baja desde la novedad</div>
                        <div className="modal__sub">{fecha}</div>
                      </div>
                      <button className="mini" onClick={() => setOpenBajaDesdeFallo(false)}>Cerrar</button>
                    </div>
                    <div className="alert err" style={{ marginBottom: 12 }}>
                      Vas a dar de baja la maquinaria desde la gestión administrativa de la novedad.
                    </div>
                    <div className="hint">Escribe este código para confirmar: <b>{codigoBaja}</b></div>
                    <input className="inp" value={inputCodigoBaja}
                      onChange={(e) => setInputCodigoBaja(e.target.value)}
                      placeholder="Código de seguridad" />
                    <div className="row" style={{ marginTop: 12 }}>
                      <button className="mini" onClick={() => setOpenBajaDesdeFallo(false)}>Cancelar</button>
                      <button className="mini mini--danger" onClick={confirmarBajaDesdeFallo} disabled={savingControl}>
                        {savingControl ? "Guardando..." : "Confirmar baja"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {openGreyActions && (
        <MaquinariaGreyDayModal
          maquinariaId={maquinariaId}
          fecha={fecha}
          onClose={() => setOpenGreyActions(false)}
          onDone={() => { setOpenGreyActions(false); onDone?.(); }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GREY DAY MODAL
// ─────────────────────────────────────────────────────────────────────────────
function MaquinariaGreyDayModal({ maquinariaId, fecha, onClose, onDone }) {
  const [colaboradores, setColaboradores] = useState([]);
  const [search, setSearch] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [motivoNa, setMotivoNa] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const texto = search.trim();
    if (!texto) { setColaboradores([]); setUsuarioId(""); return; }
    const timer = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const r = await api.get("/usuarios", { params: { rol: "colaborador", q: texto } });
        setColaboradores(r.data || []);
      } catch {
        setColaboradores([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function marcarNa() {
    try {
      setLoading(true);
      setMsg(null);
      await api.post(`/maquinaria/${maquinariaId}/estado-dia`, {
        fecha, estado: "na", observacion: motivoNa || null,
      });
      setMsg({ type: "ok", text: "Día marcado como N/A ✅" });
      setTimeout(() => onDone?.(), 700);
    } catch (e) {
      setMsg({ type: "err", text: e?.response?.data?.message || "No se pudo marcar como N/A." });
    } finally {
      setLoading(false);
    }
  }

  async function habilitarPreop() {
    if (!usuarioId) { setMsg({ type: "err", text: "Debes seleccionar un colaborador." }); return; }
    try {
      setLoading(true);
      setMsg(null);
      await api.post(`/usuarios/${usuarioId}/preoperacionales/habilitar`, {
        fecha, maquinaria_id: maquinariaId, motivo: "Habilitación desde calendario de maquinaria",
      });
      await api.post(`/maquinaria/${maquinariaId}/estado-dia`, {
        fecha, estado: "sin_registro", observacion: "Preoperacional habilitado por una hora",
      });
      setMsg({ type: "ok", text: "Preoperacional habilitado por 1 hora ✅" });
      setTimeout(() => onDone?.(), 700);
    } catch (e) {
      setMsg({ type: "err", text: e?.response?.data?.message || "No se pudo habilitar el preoperacional." });
    } finally {
      setLoading(false);
    }
  }

  const colaboradorSeleccionado = colaboradores.find((c) => c.id === usuarioId) || null;

  return (
    <div className="modal__back">
      <div className="modal">
        <div className="modal__head">
          <div>
            <div className="modal__title">Gestionar día gris</div>
            <div className="modal__sub">{fecha}</div>
          </div>
          <button className="mini" onClick={onClose}>Cerrar</button>
        </div>

        <Field label="Motivo N/A (opcional)">
          <input className="inp" value={motivoNa}
            onChange={(e) => setMotivoNa(e.target.value)}
            placeholder="Ej: maquinaria no utilizada, ausencia, cierre..." />
        </Field>

        <div className="row" style={{ marginTop: 12 }}>
          <button className="mini" onClick={marcarNa} disabled={loading}>Marcar N/A</button>
        </div>

        <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />

        <Field label="Buscar colaborador">
          <input className="inp" value={search}
            onChange={(e) => { setSearch(e.target.value); setUsuarioId(""); }}
            placeholder="Buscar por nombre, cargo o documento" />
        </Field>

        {loadingSearch && <div className="hint">Buscando colaboradores...</div>}

        {!loadingSearch && search.trim() && colaboradores.length === 0 && (
          <div className="alert err" style={{ marginTop: 10 }}>
            No se encontraron colaboradores con esa búsqueda.
          </div>
        )}

        {search.trim() && !loadingSearch && colaboradores.length > 0 && (
          <div className="userSearchList">
            {colaboradores.map((c) => (
              <button key={c.id} type="button"
                className={`userSearchItem ${usuarioId === c.id ? "is-selected" : ""}`}
                onClick={() => setUsuarioId(c.id)}>
                <div className="userSearchItem__name">{c.nombre}</div>
                <div className="userSearchItem__sub">{c.cargo} — {c.numero_documento}</div>
              </button>
            ))}
          </div>
        )}

        {colaboradorSeleccionado && (
          <div className="alert ok" style={{ marginTop: 12 }}>
            Seleccionado: <b>{colaboradorSeleccionado.nombre}</b> — {colaboradorSeleccionado.numero_documento}
          </div>
        )}

        {msg && (
          <div className={msg.type === "ok" ? "alert ok" : "alert err"} style={{ marginTop: 10 }}>
            {msg.text}
          </div>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button className="mini mini--blue" onClick={habilitarPreop} disabled={loading}>
            Habilitar preoperacional por 1 hora
          </button>
        </div>
      </div>
    </div>
  );
}
