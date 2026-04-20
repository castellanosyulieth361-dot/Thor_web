// utils.js — utilidades compartidas entre todos los componentes

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Convierte una ruta relativa de imagen en URL absoluta.
 * Usa VITE_API_URL en producción y localhost:5000 en desarrollo.
 */
export function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path}`;
}

export function formatAccion(accion) {
  if (accion === "dado_baja") return "Dado de baja";
  if (accion === "mantenimiento") return "Mantenimiento";
  if (accion === "no_disponible") return "No disponible";
  if (accion === "disponible") return "Disponible";
  if (accion === "fallo") return "Fallo reportado";
  return accion || "Sin acción";
}
