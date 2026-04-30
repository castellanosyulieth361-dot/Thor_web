import { useEffect, useMemo, useState } from "react";
import { api } from "../api/axios";
import { getImageUrl } from "../utils";
import { Field, Info, FotoInput } from "../components/shared";

// ─── Constantes ───────────────────────────────────────────────────────────────

const AREAS = [
  { value: "calidad",    label: "Calidad" },
  { value: "disenio",   label: "Diseño y Desarrollo" },
  { value: "operacion", label: "Operación" },
  { value: "otro",      label: "Otro" },
];

const SITUACIONES = [
  { value: "incidente",                label: "Incidente" },
  { value: "impacto_ambiental",        label: "Impacto Ambiental" },
  { value: "error_info_tecnica",       label: "Error de Información Técnica en el Documento" },
  { value: "incumplimiento_parametros",label: "Incumplimiento de Parámetros Técnicos (PNC)" },
  { value: "acto_seguro",              label: "Acto Seguro" },
  { value: "acto_inseguro",            label: "Acto Inseguro" },
  { value: "condicion_segura",         label: "Condición Segura" },
];

const ACCIONES = [
  { value: "R",  label: "R — Reparación / Reproceso" },
  { value: "R1", label: "R1 — Reclasificación" },
  { value: "LB", label: "LB — Liberación Bajo Concesión" },
  { value: "RE", label: "RE — Rechazo / Descarte" },
  { value: "C",  label: "C — Cumplió" },
];

const MESES_NOMBRES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                       "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function labelArea(v)      { return AREAS.find(a=>a.value===v)?.label || v; }
function labelSituacion(v) { return SITUACIONES.find(s=>s.value===v)?.label || v; }
function labelAccion(v)    { return ACCIONES.find(a=>a.value===v)?.label || v; }

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ReportesObservacion() {
  const [subtab, setSubtab] = useState("diligenciar");

  const tabs = [
    { key: "diligenciar", label: "Diligenciar Reporte" },
    { key: "mensuales",   label: "Reportes Mensuales" },
    { key: "historial",   label: "Historial por Año" },
    { key: "instructivo", label: "Instructivo" },
  ];

  return (
    <>
      <div className="panelTop">
        <h2 className="panelTop__title">Reportes de Observación</h2>
        <div className="panelTop__tabs">
          {tabs.map(t => (
            <button key={t.key}
              className={`chip ${subtab === t.key ? "chip--on" : ""}`}
              onClick={() => setSubtab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        {subtab === "diligenciar" && <DiligenciarReporte />}
        {subtab === "mensuales"   && <ReportesMensuales />}
        {subtab === "historial"   && <HistorialAnual />}
        {subtab === "instructivo" && <Instructivo />}
      </div>
    </>
  );
}

// ─── 1. DILIGENCIAR ───────────────────────────────────────────────────────────

function DiligenciarReporte() {
  const [form, setForm] = useState({
    ciudad:"", lugar:"", ot:"", area:"", area_otro:"",
    foto_url:"", situacion:"", descripcion:"",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);
  const [ok, setOk]         = useState(false);

  const hoy = new Date().toLocaleDateString("es-CO", {
    day:"2-digit", month:"long", year:"numeric",
  });

  function set(f, v) { setForm(p=>({...p,[f]:v})); }

  async function guardar() {
    setMsg(null);
    if (!form.ciudad.trim())     return setMsg({type:"err", text:"Escribe la ciudad."});
    if (!form.lugar.trim())      return setMsg({type:"err", text:"Escribe el lugar."});
    if (!form.area)              return setMsg({type:"err", text:"Selecciona el área."});
    if (form.area==="otro" && !form.area_otro.trim())
      return setMsg({type:"err", text:"Especifica cuál área."});
    if (!form.situacion)         return setMsg({type:"err", text:"Selecciona la situación observada."});
    if (!form.descripcion.trim())return setMsg({type:"err", text:"Escribe la descripción."});

    try {
      setSaving(true);
      await api.post("/reportes", {
        ciudad:form.ciudad.trim(), lugar:form.lugar.trim(),
        ot:form.ot.trim()||null, area:form.area,
        area_otro:form.area_otro.trim()||null,
        foto_url:form.foto_url||null,
        situacion:form.situacion, descripcion:form.descripcion.trim(),
      });
      setOk(true);
      setForm({ ciudad:"",lugar:"",ot:"",area:"",area_otro:"",
                foto_url:"",situacion:"",descripcion:"" });
    } catch(e) {
      setMsg({type:"err", text:e?.response?.data?.message||"No se pudo crear el reporte."});
    } finally { setSaving(false); }
  }

  if (ok) return (
    <div style={{textAlign:"center", padding:"32px 16px"}}>
      <div style={{fontSize:48, marginBottom:16}}>✅</div>
      <div style={{fontWeight:800, fontSize:20, marginBottom:8, color:"#166534"}}>
        Reporte creado correctamente
      </div>
      <div style={{color:"#64748b", marginBottom:24}}>El reporte ha sido registrado.</div>
      <button className="mini mini--blue" onClick={()=>{setOk(false);setMsg(null);}}>
        Crear otro reporte
      </button>
    </div>
  );

  return (
    <div className="box">
      <h3 className="box__title">Nuevo Reporte de Observación</h3>

      <div className="grid2" style={{marginTop:16}}>
        <Field label="Ciudad">
          <input className="inp" value={form.ciudad}
            onChange={e=>set("ciudad",e.target.value)} placeholder="Ej: Bogotá"/>
        </Field>
        <Field label="Lugar donde se observó la situación">
          <input className="inp" value={form.lugar}
            onChange={e=>set("lugar",e.target.value)} placeholder="Ej: Bodega principal"/>
        </Field>
        <Field label="Fecha (automática)">
          <div className="inp" style={{background:"#f8fafc",color:"#64748b"}}>{hoy}</div>
        </Field>
        <Field label="OT — Orden de Trabajo (opcional)">
          <input className="inp" value={form.ot}
            onChange={e=>set("ot",e.target.value)} placeholder="Ej: OT-2025-001"/>
        </Field>
        <Field label="Área">
          <select className="inp" value={form.area} onChange={e=>set("area",e.target.value)}>
            <option value="">Selecciona...</option>
            {AREAS.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </Field>
        {form.area==="otro" && (
          <Field label="¿Cuál área?">
            <input className="inp" value={form.area_otro}
              onChange={e=>set("area_otro",e.target.value)} placeholder="Especifica el área"/>
          </Field>
        )}
      </div>

      <Field label="Registro fotográfico (opcional)" style={{marginTop:16}}>
        <FotoInput onUpload={url=>{ if(url) set("foto_url",url); }}/>
      </Field>

      <div style={{marginTop:20}}>
        <h4 style={{fontWeight:800,fontSize:15,color:"#0f172a",marginBottom:12}}>
          Situación Observada
        </h4>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {SITUACIONES.map(s=>(
            <button key={s.value} type="button" onClick={()=>set("situacion",s.value)}
              style={{                  
                padding:"9px 16px", borderRadius:10, cursor:"pointer",
                border:`2px solid ${form.situacion===s.value?"#1e3a8a":"#e5e7eb"}`,
                background:form.situacion===s.value?"rgba(30,58,138,0.08)":"#fff",
                color:form.situacion===s.value?"#1e3a8a":"#374151",
                fontWeight:700, fontSize:13, transition:"all 0.15s",
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Descripción de la situación" style={{marginTop:16}}>
        <textarea className="inp" value={form.descripcion}
          onChange={e=>set("descripcion",e.target.value)}
          placeholder="Describe detalladamente lo que observaste..."
          rows={4} style={{resize:"vertical",minHeight:100}}/>
      </Field>

      {msg && (
        <div className={`alert ${msg.type==="ok"?"ok":"err"}`} style={{marginTop:14}}>
          {msg.text}
        </div>
      )}

      <div className="row" style={{marginTop:16}}>
        <button className="mini mini--blue" onClick={guardar} disabled={saving}>
          {saving?"Guardando...":"Guardar Reporte"}
        </button>
      </div>
    </div>
  );
}

// ─── 2. REPORTES MENSUALES ────────────────────────────────────────────────────

function ReportesMensuales() {
  const hoy     = new Date();
  const defMonth= `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}`;

  const [month,       setMonth]       = useState(defMonth);
  const [calendario,  setCalendario]  = useState({});
  const [loadingCal,  setLoadingCal]  = useState(false);

  const [filtros, setFiltros] = useState({ desde:"", hasta:"", area:"", situacion:"" });
  const [reportesSinCerrar, setReportesSinCerrar] = useState([]);
  const [loadingLista,      setLoadingLista]      = useState(false);

  const [modalReporte, setModalReporte] = useState(null); // {fecha?, reporteId?}

  const [y, m] = month.split("-").map(Number);

  // ── Cargar calendario ──
  async function loadCalendario() {
    try {
      setLoadingCal(true);
      const r = await api.get("/reportes/calendario", { params:{ month } });
      setCalendario(r.data?.calendario || {});
    } catch(e) { console.error(e); }
    finally { setLoadingCal(false); }
  }

  // ── Cargar lista sin cerrar ──
  async function loadSinCerrar() {
    try {
      setLoadingLista(true);
      const params = { estado:"abierto,en_proceso" };
      if (filtros.desde)    params.desde    = filtros.desde;
      if (filtros.hasta)    params.hasta    = filtros.hasta;
      if (filtros.area)     params.area     = filtros.area;
      if (filtros.situacion)params.situacion= filtros.situacion;
      const r = await api.get("/reportes", { params });
      setReportesSinCerrar(r.data || []);
    } catch(e) { console.error(e); }
    finally { setLoadingLista(false); }
  }

  useEffect(()=>{ loadCalendario(); }, [month]);
 useEffect(()=>{ loadSinCerrar(); }, [filtros.desde, filtros.hasta, filtros.area, filtros.situacion]);

  // ── Construcción del calendario ──
  const { firstDayOffset, daysInMonth } = useMemo(()=>{
    const first = new Date(y,m-1,1);
    const last  = new Date(y,m,0);
    const jsDay = first.getDay();
    return { firstDayOffset: jsDay===0?6:jsDay-1, daysInMonth:last.getDate() };
  }, [month]);

  const days=[];
  for(let i=0;i<firstDayOffset;i++) days.push(null);
  for(let d=1;d<=daysInMonth;d++)   days.push(d);

  const todayStr = hoy.toISOString().slice(0,10);

  function colorDia(info) {
    if(!info) return "calendarCell--gray";
    if(info.estado==="abierto")    return "calendarCell--red";
    if(info.estado==="en_proceso") return "calendarCell--blue";
    if(info.estado==="cerrado")    return "calendarCell--orange";
    return "calendarCell--gray";
  }

  function formatMonthLabel() {
    return new Date(y,m-1,1).toLocaleDateString("es-CO",{month:"long",year:"numeric"});
  }

  function prevMonth() {
    const d=new Date(y,m-2,1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }
  function nextMonth() {
    const d=new Date(y,m,1);
    const nm=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if(nm<=defMonth) setMonth(nm);
  }

  return (
    <div className="box">
      {/* Navegación de mes */}
      <div className="row" style={{justifyContent:"space-between",marginBottom:16}}>
        <h3 className="box__title">Calendario de Reportes</h3>
        <div className="row">
          <button className="mini" onClick={prevMonth}>◀</button>
          <span className="monthLabel">{formatMonthLabel()}</span>
          <button className="mini" onClick={nextMonth} disabled={month>=defMonth}>▶</button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="legend">
        <span className="legend__item">
          <span style={{background:"#ef4444",borderRadius:"50%",width:10,height:10,display:"inline-block",marginRight:4}}/>
          Sin gestión
        </span>
        <span className="legend__item">
          <span style={{background:"#3b82f6",borderRadius:"50%",width:10,height:10,display:"inline-block",marginRight:4}}/>
          En proceso
        </span>
        <span className="legend__item">
          <span style={{background:"#f97316",borderRadius:"50%",width:10,height:10,display:"inline-block",marginRight:4}}/>
          Cerrado
        </span>
        <span className="legend__item">
          <span style={{background:"#9ca3af",borderRadius:"50%",width:10,height:10,display:"inline-block",marginRight:4}}/>
          Sin reportes
        </span>
      </div>

      {/* Calendario */}
      {loadingCal ? <div className="hint">Cargando calendario...</div> : (
        <>
          <div className="calendarHead">
            {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=>(
              <div key={d} className="calendarHead__cell">{d}</div>
            ))}
          </div>
          <div className="calendarGrid">
            {days.map((day,idx)=>{
              if(!day) return <div key={`e-${idx}`} className="calendarCell calendarCell--empty"/>;
              const dateKey=`${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const info=calendario[dateKey];
              const esFuturo=dateKey>todayStr;
              const cls=esFuturo?"calendarCell--gray calendarCell--locked":colorDia(info);

              return (
                <button key={dateKey} type="button"
                  className={`calendarCell ${cls}`}
                  disabled={esFuturo||!info}
                  title={info?`${info.cantidad} reporte(s) — ${info.estado}`:"Sin reportes"}
                  onClick={()=>{
                    if(!esFuturo && info) setModalReporte({ fecha:dateKey });
                  }}
                >
                  <span className="calendarCell__num">{day}</span>
                  {info && <span style={{fontSize:9,display:"block",lineHeight:1}}>{info.cantidad}</span>}
                  {esFuturo && <span className="calendarLock">🔒</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Filtros + lista sin cerrar */}
      <div style={{marginTop:28}}>
        <h3 className="box__title" style={{marginBottom:12}}>Reportes sin cerrar</h3>

        <div className="grid2" style={{marginBottom:14}}>
          <Field label="Desde">
            <input className="inp" type="date" value={filtros.desde}
              onChange={e=>setFiltros(p=>({...p,desde:e.target.value}))}/>
          </Field>
          <Field label="Hasta">
            <input className="inp" type="date" value={filtros.hasta}
              onChange={e=>setFiltros(p=>({...p,hasta:e.target.value}))}/>
          </Field>
          <Field label="Área">
            <select className="inp" value={filtros.area}
              onChange={e=>setFiltros(p=>({...p,area:e.target.value}))}>
              <option value="">Todas</option>
              {AREAS.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </Field>
          <Field label="Situación">
            <select className="inp" value={filtros.situacion}
              onChange={e=>setFiltros(p=>({...p,situacion:e.target.value}))}>
              <option value="">Todas</option>
              {SITUACIONES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>

        {loadingLista && <div className="hint">Cargando reportes...</div>}
        {!loadingLista && reportesSinCerrar.length===0 && (
          <div className="hint">No hay reportes sin cerrar. ✅</div>
        )}
        <div className="previewGrid">
          {reportesSinCerrar.map(r=>(
            <ReporteCard key={r.id} reporte={r}
              onClick={()=>setModalReporte({reporteId:r.id})}/>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalReporte && (
        <ModalReporte
          fecha={modalReporte.fecha}
          reporteId={modalReporte.reporteId}
          onClose={()=>setModalReporte(null)}
          onDone={()=>{ setModalReporte(null); loadCalendario(); loadSinCerrar(); }}
        />
      )}
    </div>
  );
}

// ─── Tarjeta de reporte ───────────────────────────────────────────────────────

function ReporteCard({ reporte:r, onClick }) {
  const color = r.estado==="abierto"?"#ef4444":r.estado==="en_proceso"?"#3b82f6":"#f97316";
  const label = r.estado==="abierto"?"Sin gestión":r.estado==="en_proceso"?"En proceso":"Cerrado";

  return (
    <div className="previewCard" style={{cursor:"pointer"}} onClick={onClick}>
      <div style={{
        display:"inline-block", background:`${color}18`, color,
        borderRadius:999, padding:"4px 10px", fontSize:11, fontWeight:800, marginBottom:8,
      }}>{label}</div>
      <div className="previewCard__title">{labelSituacion(r.situacion)}</div>
      <div className="previewCard__sub">📅 {r.fecha_texto||r.fecha}</div>
      <div className="previewCard__sub">📍 {r.ciudad} — {r.lugar}</div>
      <div className="previewCard__sub">👤 {r.reportado_por_nombre}</div>
      <div className="previewCard__sub">🏷 {labelArea(r.area)}{r.area_otro?`: ${r.area_otro}`:""}</div>
    </div>
  );
}

// ─── Modal: reportes del día o un reporte específico ─────────────────────────

function ModalReporte({ fecha, reporteId, onClose, onDone }) {
  const [reportes, setReportes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null); // { reporte, gestiones }

  useEffect(()=>{
    async function load() {
      try {
        setLoading(true);
        if (reporteId) {
          // Viene de tarjeta — cargar directamente
          const r = await api.get(`/reportes/${reporteId}`);
          setSelected(r.data);
          setReportes([r.data.reporte]);
        } else if (fecha) {
          // Viene de clic en calendario — cargar todos los del día
          const r = await api.get("/reportes", { params:{ desde:fecha, hasta:fecha } });
          const lista = r.data || [];
          setReportes(lista);
          // Si solo hay uno, abrirlo directamente
          if (lista.length === 1) {
            const det = await api.get(`/reportes/${lista[0].id}`);
            setSelected(det.data);
          }
        }
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [fecha, reporteId]);

  async function abrirDetalle(reporte) {
    try {
      const r = await api.get(`/reportes/${reporte.id}`);
      setSelected(r.data);
    } catch(e) { console.error(e); }
  }

  return (
    <div className="modal__back">
      <div className="modal modal--xl">
        <div className="modal__head">
          <div>
            <div className="modal__title">
              {selected
                ? "Detalle de Reporte"
                : fecha
                  ? `Reportes del ${fecha}`
                  : "Reporte"}
            </div>
            {!selected && fecha && (
              <div className="modal__sub">{reportes.length} reporte(s) este día</div>
            )}
          </div>
          <button className="mini" onClick={onClose}>Cerrar</button>
        </div>

        {loading && <div className="hint">Cargando...</div>}

        {!loading && !selected && (
          <>
            {reportes.length===0 && <div className="hint">No hay reportes ese día.</div>}
            <div className="previewGrid" style={{marginTop:12}}>
              {reportes.map(r=>(
                <ReporteCard key={r.id} reporte={r} onClick={()=>abrirDetalle(r)}/>
              ))}
            </div>
          </>
        )}

        {selected && (
          <DetalleReporte
            data={selected}
            onBack={reportes.length>1 ? ()=>setSelected(null) : null}
            onDone={onDone}
          />
        )}
      </div>
    </div>
  );
}

// ─── Detalle + gestión ────────────────────────────────────────────────────────

function DetalleReporte({ data, onBack, onDone }) {
  const { reporte:r, gestiones=[] } = data;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo_accion:"", descripcion:"" });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState(null);

  const puedeGestionar = r.estado !== "cerrado";

  async function guardar(cierra) {
    setMsg(null);
    if (!form.tipo_accion)         return setMsg({type:"err",text:"Selecciona el tipo de acción."});
    if (!form.descripcion.trim())  return setMsg({type:"err",text:"Escribe la descripción."});
    try {
      setSaving(true);
      await api.post(`/reportes/${r.id}/gestion`, {
        tipo_accion: form.tipo_accion,
        descripcion: form.descripcion.trim(),
        cierra_reporte: cierra,
      });
      setMsg({type:"ok", text:cierra?"Reporte cerrado ✅":"Proceso guardado ✅"});
      setTimeout(()=>onDone?.(), 900);
    } catch(e) {
      setMsg({type:"err",text:e?.response?.data?.message||"Error guardando gestión."});
    } finally { setSaving(false); }
  }

  return (
    <div>
      {onBack && (
        <button className="mini" style={{marginBottom:12}} onClick={onBack}>← Volver</button>
      )}

      {/* Datos del reporte */}
      <div style={{
        background:"#f8fafc",borderRadius:12,padding:16,
        border:"1px solid #e5e7eb",marginBottom:16,
      }}>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
          {r.foto_url && (
            <img src={getImageUrl(r.foto_url)} alt="Evidencia"
              style={{width:120,height:120,objectFit:"cover",borderRadius:8,flexShrink:0}}/>
          )}
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontWeight:800,fontSize:16,marginBottom:10}}>
              {labelSituacion(r.situacion)}
            </div>
            <div className="grid2">
              <Info label="Fecha"        value={r.fecha_texto||r.fecha}/>
              <Info label="Ciudad"       value={r.ciudad}/>
              <Info label="Lugar"        value={r.lugar}/>
              <Info label="Área"         value={`${labelArea(r.area)}${r.area_otro?`: ${r.area_otro}`:""}`}/>
              {r.ot && <Info label="OT"  value={r.ot}/>}
              <Info label="Reportado por"
                value={`${r.reportado_por_nombre} — ${r.reportado_por_documento} — ${r.reportado_por_cargo}`}/>
            </div>
          </div>
        </div>
        <div style={{marginTop:12}}>
          <div style={{fontWeight:700,fontSize:13,color:"#475569",marginBottom:4}}>Descripción:</div>
          <div style={{fontSize:14,lineHeight:1.6,color:"#0f172a"}}>{r.descripcion}</div>
        </div>
      </div>

      {/* Gestiones previas */}
      {gestiones.length>0 && (
        <div style={{marginBottom:16}}>
          <h4 style={{fontWeight:800,fontSize:14,marginBottom:10}}>
            Gestiones administrativas ({gestiones.length})
          </h4>
          {gestiones.map(g=>(
            <div key={g.id} style={{
              background:"#fff",border:"1px solid #e5e7eb",
              borderRadius:10,padding:"12px 14px",marginBottom:8,
            }}>
              <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <span style={{
                  background:g.cierra_reporte?"rgba(249,115,22,0.12)":"rgba(59,130,246,0.10)",
                  color:g.cierra_reporte?"#c2410c":"#1d4ed8",
                  padding:"4px 10px",borderRadius:999,fontSize:12,fontWeight:800,
                }}>
                  {labelAccion(g.tipo_accion)}
                </span>
                <span style={{fontSize:12,color:"#64748b"}}>
                  {g.fecha_texto} — {g.realizado_por_nombre}
                </span>
              </div>
              <div style={{marginTop:8,fontSize:13,color:"#374151"}}>{g.descripcion}</div>
              {g.cierra_reporte && (
                <div style={{marginTop:6,fontSize:12,color:"#f97316",fontWeight:700}}>
                  🔒 Esta acción cerró el reporte
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulario de nueva gestión */}
      {puedeGestionar && !showForm && (
        <button className="mini mini--blue" onClick={()=>setShowForm(true)}>
          + Registrar gestión administrativa
        </button>
      )}

      {puedeGestionar && showForm && (
        <div style={{
          background:"#f0f9ff",border:"1px solid #bae6fd",
          borderRadius:12,padding:16,marginTop:8,
        }}>
          <h4 style={{fontWeight:800,fontSize:14,marginBottom:12,color:"#0c4a6e"}}>
            Nueva Gestión Administrativa
          </h4>

          <Field label="Tipo de acción">
            <select className="inp" value={form.tipo_accion}
              onChange={e=>setForm(p=>({...p,tipo_accion:e.target.value}))}>
              <option value="">Selecciona...</option>
              {ACCIONES.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </Field>

          <Field label="Descripción de la acción" style={{marginTop:12}}>
            <textarea className="inp" rows={3} value={form.descripcion}
              onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))}
              placeholder="Describe la acción realizada..."
              style={{resize:"vertical"}}/>
          </Field>

          <Field label="Fecha de gestión (automática)" style={{marginTop:12}}>
            <div className="inp" style={{background:"#f8fafc",color:"#64748b"}}>
              {new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"})}
            </div>
          </Field>

          {msg && (
            <div className={`alert ${msg.type==="ok"?"ok":"err"}`} style={{marginTop:10}}>
              {msg.text}
            </div>
          )}

          <div className="row" style={{marginTop:14,gap:8,flexWrap:"wrap"}}>
            <button className="mini" onClick={()=>{setShowForm(false);setMsg(null);}}>
              Cancelar
            </button>
            <button className="mini"
              style={{borderColor:"rgba(59,130,246,.3)",background:"rgba(59,130,246,.08)",color:"#1d4ed8"}}
              onClick={()=>guardar(false)} disabled={saving}>
              {saving?"Guardando...":"💾 Guardar proceso"}
            </button>
            <button className="mini"
              style={{borderColor:"rgba(249,115,22,.3)",background:"rgba(249,115,22,.10)",color:"#c2410c"}}
              onClick={()=>guardar(true)} disabled={saving}>
              {saving?"Cerrando...":"🔒 Cerrar reporte"}
            </button>
          </div>
        </div>
      )}

      {r.estado==="cerrado" && (
        <div className="alert ok" style={{marginTop:12}}>
          Este reporte está cerrado. ✅
        </div>
      )}
    </div>
  );
}

// ─── 3. HISTORIAL ANUAL ───────────────────────────────────────────────────────

function HistorialAnual() {
  const [años,        setAños]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [anioAbierto, setAnioAbierto] = useState(null);
  const [mesesPorAnio,setMesesPorAnio]= useState({}); // { anio: [{mes, total}] }
  const [mesAbierto,  setMesAbierto]  = useState(null); // "anio-mes"
  const [datosMes,    setDatosMes]    = useState({}); // { "anio-mes": {reportes, calendario} }
  const [loadingMes,  setLoadingMes]  = useState(null); // "anio-mes" o null

  const [filtros, setFiltros] = useState({ area:"", situacion:"" });
  const [selectedId, setSelectedId] = useState(null);

  // Cargar años disponibles — usa /historial/anios (sin tilde)
  useEffect(()=>{
    api.get("/reportes/historial/anios")
      .then(r=>setAños(r.data||[]))
      .catch(e=>console.error("Error cargando años:",e))
      .finally(()=>setLoading(false));
  }, []);

  async function toggleAnio(anio) {
    if (anioAbierto===anio) { setAnioAbierto(null); return; }
    setAnioAbierto(anio);
    if (!mesesPorAnio[anio]) {
      try {
        const r = await api.get(`/reportes/historial/${anio}`);
        setMesesPorAnio(p=>({...p,[anio]:r.data||[]}));
      } catch(e) { console.error(e); }
    }
  }

  async function toggleMes(anio, mes) {
    const key = `${anio}-${mes}`;
    if (mesAbierto===key) { setMesAbierto(null); return; }
    setMesAbierto(key);

   if (!datosMes[key] || datosMes[key]._stale) {
      setLoadingMes(key);
      try {
        const params = {};
        if (filtros.area)      params.area      = filtros.area;
        if (filtros.situacion) params.situacion = filtros.situacion;

        const [rRes, calRes] = await Promise.all([
          api.get(`/reportes/historial/${anio}/${mes}`, { params }),
          api.get("/reportes/calendario", {
            params: { month:`${anio}-${String(mes).padStart(2,"0")}` }
          }),
        ]);
        setDatosMes(p=>({...p,[key]:{
          reportes: rRes.data||[],
          calendario: calRes.data?.calendario||{},
        }}));
      } catch(e) { console.error(e); }
      finally { setLoadingMes(null); }
    }
  }

  // Cuando cambian los filtros, limpiar datos de meses para recargar
  useEffect(()=>{
    setDatosMes(p =>
      Object.fromEntries(
        Object.entries(p).map(([k, v]) => [k, { ...v, _stale: true }])
      )
    );
  }, [filtros.area, filtros.situacion]);

  // Si hay un mes abierto y sus datos quedaron stale (por cambio de filtro), recargarlo
  useEffect(()=>{
    if (!mesAbierto) return;
    const datos = datosMes[mesAbierto];
    if (!datos?._stale) return;

    const [anio, mes] = mesAbierto.split("-").map(Number);
    setLoadingMes(mesAbierto);

    const params = {};
    if (filtros.area)      params.area      = filtros.area;
    if (filtros.situacion) params.situacion = filtros.situacion;

    Promise.all([
      api.get(`/reportes/historial/${anio}/${mes}`, { params }),
      api.get("/reportes/calendario", {
        params: { month: `${anio}-${String(mes).padStart(2,"0")}` }
      }),
    ])
      .then(([rRes, calRes]) => {
        setDatosMes(p => ({
          ...p,
          [mesAbierto]: {
            reportes:   rRes.data || [],
            calendario: calRes.data?.calendario || {},
          },
        }));
      })
      .catch(e => console.error("Error recargando mes:", e))
      .finally(() => setLoadingMes(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datosMes, mesAbierto]);

  if (loading) return <div className="hint">Cargando historial...</div>;
  if (años.length===0) return <div className="hint">No hay reportes cerrados todavía.</div>;

  return (
    <div className="box">
      <h3 className="box__title">Historial por Año</h3>

      {/* Filtros */}
      <div className="grid2" style={{marginBottom:16,marginTop:12}}>
        <Field label="Área">
          <select className="inp" value={filtros.area}
            onChange={e=>setFiltros(p=>({...p,area:e.target.value}))}>
            <option value="">Todas</option>
            {AREAS.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="Situación">
          <select className="inp" value={filtros.situacion}
            onChange={e=>setFiltros(p=>({...p,situacion:e.target.value}))}>
            <option value="">Todas</option>
            {SITUACIONES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
      </div>

      {/* Carpetas de años */}
      {años.map(({anio,total})=>(
        <div key={anio} style={{marginBottom:10}}>
          <button type="button" onClick={()=>toggleAnio(anio)} style={{
            width:"100%",textAlign:"left",padding:"14px 18px",
            background:anioAbierto===anio?"rgba(30,58,138,0.07)":"#f8fafc",
            border:"1px solid #e5e7eb",borderRadius:12,
            fontWeight:800,fontSize:16,cursor:"pointer",
            display:"flex",justifyContent:"space-between",alignItems:"center",
          }}>
            <span>📁 {anio}</span>
            <span style={{fontSize:13,color:"#64748b",fontWeight:400}}>
              {total} cerrado(s) {anioAbierto===anio?"▲":"▼"}
            </span>
          </button>

          {anioAbierto===anio && (
            <div style={{paddingLeft:16,marginTop:8}}>
              {(mesesPorAnio[anio]||[]).map(({mes,total:t})=>{
                const key=`${anio}-${mes}`;
                const datos=datosMes[key];
                return (
                  <div key={mes} style={{marginBottom:8}}>
                    <button type="button" onClick={()=>toggleMes(anio,mes)} style={{
                      width:"100%",textAlign:"left",padding:"11px 16px",
                      background:mesAbierto===key?"rgba(249,115,22,0.07)":"#fff",
                      border:"1px solid #e5e7eb",borderRadius:10,
                      fontWeight:700,fontSize:14,cursor:"pointer",
                      display:"flex",justifyContent:"space-between",
                    }}>
                      <span>📂 {MESES_NOMBRES[mes-1]}</span>
                      <span style={{fontSize:12,color:"#64748b",fontWeight:400}}>
                        {t} cerrado(s) {mesAbierto===key?"▲":"▼"}
                      </span>
                    </button>

                    {mesAbierto===key && (
                      <div style={{paddingLeft:16,marginTop:10}}>
                        {loadingMes===key && <div className="hint">Cargando...</div>}

                        {!loadingMes && datos && (
                          <>
                            {/* Mini calendario */}
                            <MiniCalendario
                              anio={anio} mes={mes}
                              calendario={datos.calendario}
                              onDia={dateKey=>{
                                const r=datos.reportes.find(
                                  r=>String(r.fecha).slice(0,10)===dateKey
                                );
                                if(r) setSelectedId(r.id);
                              }}
                            />

                            {/* Lista */}
                            <div className="previewGrid" style={{marginTop:14}}>
                              {datos.reportes.map(r=>(
                                <ReporteCard key={r.id} reporte={r}
                                  onClick={()=>setSelectedId(r.id)}/>
                              ))}
                            </div>
                            {datos.reportes.length===0 && (
                              <div className="hint">Sin reportes con esos filtros.</div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {(mesesPorAnio[anio]||[]).length===0 && (
                <div className="hint" style={{paddingLeft:8}}>Sin meses con reportes cerrados.</div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Modal detalle */}
      {selectedId && (
        <div className="modal__back">
          <div className="modal modal--xl">
            <div className="modal__head">
              <div className="modal__title">Detalle de Reporte</div>
              <button className="mini" onClick={()=>setSelectedId(null)}>Cerrar</button>
            </div>
            <DetalleReporteById id={selectedId} onDone={()=>setSelectedId(null)}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mini calendario (historial) ─────────────────────────────────────────────

function MiniCalendario({ anio, mes, calendario, onDia }) {
  const first  = new Date(anio,mes-1,1);
  const last   = new Date(anio,mes,0);
  const jsDay  = first.getDay();
  const offset = jsDay===0?6:jsDay-1;

  const days=[];
  for(let i=0;i<offset;i++) days.push(null);
  for(let d=1;d<=last.getDate();d++) days.push(d);

  function colorDia(info) {
    if(!info) return "calendarCell--gray";
    if(info.estado==="abierto")    return "calendarCell--red";
    if(info.estado==="en_proceso") return "calendarCell--blue";
    return "calendarCell--orange";
  }

  return (
    <div style={{marginBottom:12}}>
      <div className="calendarHead">
        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=>(
          <div key={d} className="calendarHead__cell">{d}</div>
        ))}
      </div>
      <div className="calendarGrid">
        {days.map((day,idx)=>{
          if(!day) return <div key={`e-${idx}`} className="calendarCell calendarCell--empty"/>;
          const dateKey=`${anio}-${String(mes).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const info=calendario[dateKey];
          return (
            <button key={dateKey} type="button"
              className={`calendarCell ${colorDia(info)}`}
              disabled={!info}
              title={info?`${info.cantidad} reporte(s)`:"Sin reportes"}
              onClick={()=>info&&onDia?.(dateKey)}>
              <span className="calendarCell__num">{day}</span>
              {info&&<span style={{fontSize:9,display:"block",lineHeight:1}}>{info.cantidad}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detalle por ID ───────────────────────────────────────────────────────────

function DetalleReporteById({ id, onDone }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    api.get(`/reportes/${id}`)
      .then(r=>setData(r.data))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [id]);

  if (loading) return <div className="hint">Cargando...</div>;
  if (!data)   return <div className="alert err">No se pudo cargar el reporte.</div>;
  return <DetalleReporte data={data} onDone={onDone}/>;
}

// ─── 4. INSTRUCTIVO ───────────────────────────────────────────────────────────

function Instructivo() {
  return (
    <div className="box">
      <h3 className="box__title">Instructivo para Diligenciar Reportes de Observación</h3>
      <div style={{
        marginTop: 16, padding: 20, background: "#f8fafc",
        borderRadius: 12, border: "1px solid #e5e7eb",
        color: "#374151", lineHeight: 1.8, fontSize: 14,
      }}>

        <h4 style={{ fontWeight: 800, marginTop: 16 }}>Situacion Observada</h4>
        <ul>
          <li><b>Incidente:</b> Señale esta situación si se ha presentado un evento relacionado con el trabajo en el cual ocurrio o pudo ocurrir un error o falla en el producto.</li>
          <li><b>Acto Seguro:</b> Indique esta situación si el trabajador realizó un acto de manera segura o apropiada, evitando asi la ocurrencia de un impacto ambiental negativo o la generación de un incumplimiento contractual. </li>
          <li><b>Acto Inseguro:</b> Indique esta situación si el trabajador realizó un acto de manera insegura o inapropiada, que facilita así la ocurrencia de un impacto ambiental negativo o la generación de un incumplimiento contractual.</li>
          <li><b>Condicion Segura:</b> Señale esta situación si el lugar de trabajo no presenta riesgos controlados, evitando impactos ambientales o el incumplimiento de parametros técnicos.</li>
          <li><b>Condición Insegura:</b> Señale esta situación si el lugar de trabajo presenta riesgos no controlados y que podrían generar impacto ambiental o incumplimiento en parámetros técnicos. </li>

          <li><b>Impacto Ambiental:</b> Señale si la situación generó alguna alteración, modificación o cambio eb el ambiente o en alguno de sus componentes, positivo o negativo
            De cierta magnitud y complejidad. Ejemplo derrame e hidrocarburos, derrame o escape de sustancias quimicas, escape de un gas comprimido, residuos dispuestos de forma inadecuada, daños en tuberias, perdidas de agua por daño en sistema hidráulico.
          </li>
          <li><b>Error de Información técnica en documento:</b> Indique esta opción si se encuentra algún error en la información plasmada en los documentos entregados para la fabricación del producto. </li>
          <li><b>Incumplimiento de parametros Tecnicos(PNC):</b> Indique esta opción si se presentan incumplimiento durante el proceso de fabricación. </li>
          <li>También pueden ser para reporte de producto no conforme (PNC). En caso de seleccionar esta casilla, asegure que se marcan las disposiciones del PNC en el plan de acción del reporte de observación. Cualquiera que sea el tratamiento por favor tenga en cuenta el procedimiento PRO-QAQC-099 CONTROL DE PRODUCTO NO CONFORME. </li></ul>

        <h4 style={{ fontWeight: 800, marginTop: 16 }}>Tipos de situación</h4>
        <ul>
          {SITUACIONES.map(s => <li key={s.value}><b>{s.label}</b></li>)}
        </ul>

        <h4 style={{ fontWeight: 800, marginTop: 16 }}>Tipos de acción administrativa</h4>
        <ul>
          {ACCIONES.map(a => <li key={a.value}><b>{a.label}</b></li>)}
        </ul>

        <h4 style={{ fontWeight: 800, marginTop: 16 }}>Descripción de la Situación.</h4>
        Describa detalladamente la situación observada, Especifique los beneficios o consecuencias que se pueden presentar o que se presentaron debido a la situación observada y finalmente, indique la causa raíz por la cual se presento la situación.

        <h4 style={{ fontWeight: 800, marginTop: 16 }}>Acciones Realizadas o Sugeridas.</h4>
        Defina que acciones realizó o se deben realizar para corregir o ratificar la situacion observada.
        <br />
        <b>NOTA:</b>Este formato es una herramienta vital para registrar sus observaciones y para resumir las acciones correctivas a implementar en el plan de accion y contribuir con el mejoramiento continuo de THOR HORIZON APEX S.A.S.
      </div>
    </div>
  );
}