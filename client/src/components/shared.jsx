// components/shared.jsx — componentes reutilizables en toda la app
import { useState, useRef } from "react";
import { api } from "../api/axios";

// ─── Field ───────────────────────────────────────────────────────────────────
export function Field({ label, children, style }) {
  return (
    <div className="field" style={style}>
      <div className="field__label">{label}</div>
      {children}
    </div>
  );
}

// ─── Info ────────────────────────────────────────────────────────────────────
export function Info({ label, value }) {
  return (
    <div className="info">
      <div className="info__label">{label}</div>
      <div className="info__value">{value}</div>
    </div>
  );
}

// ─── PreviewList ─────────────────────────────────────────────────────────────
export function PreviewList({ items, renderItem, emptyText = "Sin datos" }) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) {
    return <div className="hint">{emptyText}</div>;
  }

  const visibleItems = expanded ? items : items.slice(0, 3);

  return (
    <>
      <div className="previewGrid">
        {visibleItems.map((item) => renderItem(item))}
      </div>
      {items.length > 3 && (
        <div className="row" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="mini previewMoreBtn"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Ver menos" : `Ver más (${items.length - 3} más)`}
          </button>
        </div>
      )}
    </>
  );
}

// ─── FotoInput ───────────────────────────────────────────────────────────────
/**
 * Input de foto con:
 * - Cámara trasera en móvil (capture="environment")
 * - Explorador de archivos en desktop
 * - Preview inmediato
 * - Botón para repetir foto
 * - initialUrl para mostrar foto existente
 */
export function FotoInput({ onUpload, initialUrl = "", disabled = false }) {
  const [preview, setPreview] = useState(initialUrl || null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  async function handleFile(file) {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("photo", file);
      const r = await api.post("/uploads/photo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUpload(r.data.url);
    } catch {
      alert("No se pudo subir la foto.");
      setPreview(initialUrl || null);
    } finally {
      setUploading(false);
    }
  }

  function repetir() {
    setPreview(null);
    onUpload("");
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  }

  return (
    <div>
      <input
        ref={inputRef}
        className="inp"
        type="file"
        accept="image/*"
        {...(isMobile ? { capture: "environment" } : {})}
        disabled={disabled || uploading}
        style={{ display: preview ? "none" : "block" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {uploading && <div className="hint">Subiendo foto...</div>}

      {preview && !uploading && (
        <div style={{ marginTop: 8 }}>
          {/* <img
            src={preview}
            alt="Vista previa"
            style={{
              width: "100%",
              maxWidth: 280,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              display: "block",
              marginBottom: 8,
            }}
          /> */}
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="mini"
              onClick={repetir}
              disabled={disabled}
            >
              🔄 Repetir foto
            </button>
            <span className="hint" style={{ margin: 0, alignSelf: "center" }}>
              ✅ Foto lista
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
