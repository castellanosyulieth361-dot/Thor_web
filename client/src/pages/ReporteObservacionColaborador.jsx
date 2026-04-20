import { useState } from "react";
import { api } from "../api/axios";
import { Field, FotoInput } from "../components/shared";

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

export default function ReporteObservacionColaborador({ onBack }) {
  const [subtab, setSubtab] = useState("diligenciar");

  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="mini" onClick={onBack}>Volver</button>
      </div>

      <h2 className="panel__title">Reportes de Observación</h2>

      <div className="row" style={{ marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <button
          className={`mini ${subtab === "diligenciar" ? "mini--blue" : ""}`}
          onClick={() => setSubtab("diligenciar")}
        >
          Diligenciar Reporte
        </button>
        <button
          className={`mini ${subtab === "instructivo" ? "mini--blue" : ""}`}
          onClick={() => setSubtab("instructivo")}
        >
          Instructivo
        </button>
      </div>

      {subtab === "diligenciar" && <FormularioReporte />}
      {subtab === "instructivo" && <InstructivoColaborador />}
    </div>
  );
}

function FormularioReporte() {
  const [form, setForm] = useState({
    ciudad: "", lugar: "", ot: "",
    area: "", area_otro: "",
    foto_url: "",
    situacion: "",
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [guardado, setGuardado] = useState(false);

  const hoy = new Date().toLocaleDateString("es-CO", {
    day: "2-digit", month: "long", year: "numeric",
  });

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function guardar() {
    setMsg(null);
    if (!form.ciudad.trim())  return setMsg({ type: "err", text: "Escribe la ciudad." });
    if (!form.lugar.trim())   return setMsg({ type: "err", text: "Escribe el lugar." });
    if (!form.area)           return setMsg({ type: "err", text: "Selecciona el área." });
    if (form.area === "otro" && !form.area_otro.trim())
      return setMsg({ type: "err", text: "Especifica cuál área." });
    if (!form.situacion)      return setMsg({ type: "err", text: "Selecciona la situación observada." });
    if (!form.descripcion.trim())
      return setMsg({ type: "err", text: "Escribe la descripción de la situación." });

    try {
      setSaving(true);
      await api.post("/reportes", {
        ciudad: form.ciudad.trim(),
        lugar: form.lugar.trim(),
        ot: form.ot.trim() || null,
        area: form.area,
        area_otro: form.area_otro.trim() || null,
        foto_url: form.foto_url || null,
        situacion: form.situacion,
        descripcion: form.descripcion.trim(),
      });

      setGuardado(true);
      setMsg({ type: "ok", text: "Reporte enviado correctamente ✅ Gracias por reportar." });
      setForm({ ciudad:"", lugar:"", ot:"", area:"", area_otro:"",
                foto_url:"", situacion:"", descripcion:"" });
    } catch (e) {
      setMsg({ type: "err", text: e?.response?.data?.message || "No se pudo enviar el reporte." });
    } finally {
      setSaving(false);
    }
  }

  if (guardado) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8, color: "#166534" }}>
          Reporte enviado correctamente
        </div>
        <div style={{ color: "#64748b", marginBottom: 24 }}>
          Gracias por reportar la situación observada.
        </div>
        <button className="mini mini--blue" onClick={() => { setGuardado(false); setMsg(null); }}>
          Diligenciar otro reporte
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid2">
        <Field label="Ciudad">
          <input className="inp" value={form.ciudad}
            onChange={e => set("ciudad", e.target.value)}
            placeholder="Ej: Bogotá" />
        </Field>

        <Field label="Lugar donde se observó la situación">
          <input className="inp" value={form.lugar}
            onChange={e => set("lugar", e.target.value)}
            placeholder="Ej: Bodega principal, planta 2..." />
        </Field>

        <Field label="Fecha (automática)">
          <div className="inp" style={{ background: "#f8fafc", color: "#64748b" }}>{hoy}</div>
        </Field>

        <Field label="OT — Orden de Trabajo (opcional)">
          <input className="inp" value={form.ot}
            onChange={e => set("ot", e.target.value)}
            placeholder="Ej: OT-2025-001" />
        </Field>

        <Field label="Área">
          <select className="inp" value={form.area}
            onChange={e => set("area", e.target.value)}>
            <option value="">Selecciona...</option>
            {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </Field>

        {form.area === "otro" && (
          <Field label="¿Cuál área?">
            <input className="inp" value={form.area_otro}
              onChange={e => set("area_otro", e.target.value)}
              placeholder="Especifica el área" />
          </Field>
        )}
      </div>

      <Field label="Registro fotográfico (opcional)" style={{ marginTop: 16 }}>
        <FotoInput onUpload={url => { if (url) set("foto_url", url); }} />
      </Field>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 12 }}>
          Situación Observada
        </h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {SITUACIONES.map(s => (
            <button key={s.value} type="button"
              onClick={() => set("situacion", s.value)}
              style={{
                padding: "9px 14px", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${form.situacion === s.value ? "#1e3a8a" : "#e5e7eb"}`,
                background: form.situacion === s.value ? "rgba(30,58,138,0.08)" : "#fff",
                color: form.situacion === s.value ? "#1e3a8a" : "#374151",
                fontWeight: 700, fontSize: 13, transition: "all 0.15s",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Descripción de la situación" style={{ marginTop: 16 }}>
        <textarea className="inp" value={form.descripcion}
          onChange={e => set("descripcion", e.target.value)}
          placeholder="Describe detalladamente lo que observaste..."
          rows={4} style={{ resize: "vertical", minHeight: 100 }} />
      </Field>

      {msg && (
        <div className={`alert ${msg.type === "ok" ? "ok" : "err"}`} style={{ marginTop: 14 }}>
          {msg.text}
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="mini mini--blue" onClick={guardar} disabled={saving}>
          {saving ? "Enviando..." : "Enviar Reporte"}
        </button>
      </div>
    </>
  );
}

function InstructivoColaborador() {
  return (
    <div style={{
      padding: 20, background: "#f8fafc",
      borderRadius: 12, border: "1px solid #e5e7eb",
      color: "#374151", lineHeight: 1.8, fontSize: 14,
    }}>
      <p style={{ color: "#64748b", fontStyle: "italic" }}>
        Aquí irá el instructivo oficial que nos compartas.
        Puedes escribirlo y lo agregamos en la siguiente sesión.
      </p>
    </div>
  );
}
