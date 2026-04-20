/**
 * PARCHE: días grises vencidos → color amarillo
 *
 * En MaquinariaDetalle.jsx, reemplazar la función CalendarDayCell completa
 * por esta versión que incluye la lógica de días grises vencidos.
 *
 * Regla: si el día es sin_registro (gris), el mes ya terminó Y
 *        han pasado más de 5 días desde el fin de ese mes → se pinta amarillo.
 *
 * Ejemplo: el mes de enero termina el 31/01.
 *          El 05/02 a las 23:59 vencen los 5 días de gracia.
 *          Desde el 06/02 en adelante, todos los grises de enero quedan amarillos.
 */

function CalendarDayCell({ day, dateKey, estadosDia, onClick, fechaBaja, bloqueado }) {
  let estadosUnicos = [...new Set(estadosDia)];
  if (estadosUnicos.includes("dado_baja")) estadosUnicos = ["dado_baja"];

  const todayStr = new Date().toISOString().slice(0, 10);
  const esFuturo = dateKey > todayStr;
  const fechaBajaStr = fechaBaja ? String(fechaBaja).slice(0, 10) : null;
  const esDiaBaja = Boolean(fechaBajaStr && dateKey >= fechaBajaStr);

  // ── Lógica de día gris vencido ────────────────────────────────────────────
  const esSinRegistro = estadosUnicos.length === 1 && estadosUnicos[0] === "sin_registro";

  function esDiaGrisVencido() {
    if (!esSinRegistro || esFuturo || esDiaBaja || bloqueado) return false;

    // Extraer año y mes del día
    const [dYear, dMonth] = dateKey.split("-").map(Number);

    // Último día de ese mes
    const ultimoDiaMes = new Date(dYear, dMonth, 0); // día 0 del mes siguiente = último del actual
    ultimoDiaMes.setHours(23, 59, 59, 999);

    // Fecha límite = último día del mes + 5 días
    const fechaLimite = new Date(ultimoDiaMes);
    fechaLimite.setDate(fechaLimite.getDate() + 5);

    const hoy = new Date();

    // El mes ya terminó Y ya pasaron los 5 días de gracia
    return hoy > fechaLimite;
  }

  const grisVencido = esDiaGrisVencido();

  // Si está vencido, cambiamos sin_registro → vencido (amarillo)
  const estadosParaColor = grisVencido
    ? estadosUnicos.map(e => e === "sin_registro" ? "vencido" : e)
    : estadosUnicos;

  const colors = estadosParaColor.map(mapEstadoToColorClass);

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
        esDiaBaja  ? "Maquinaria dada de baja"
        : bloqueado ? "La maquinaria aún no existía en esta fecha"
        : esFuturo  ? "Este día aún no ha llegado"
        : grisVencido ? `${dateKey}: Sin registro — período de gestión vencido`
        : `${dateKey}: ${estadosUnicos.join(" + ")}`
      }
      onClick={() => { if (esFuturo || esDiaBaja || bloqueado) return; onClick?.(); }}
      disabled={esFuturo || esDiaBaja || bloqueado}
    >
      <span className="calendarCell__num">{day}</span>
      {!esDiaBaja && esFuturo  && <span className="calendarLock">🔒</span>}
      {!esDiaBaja && bloqueado && <span className="calendarLock">❌</span>}
      {esDiaBaja               && <span className="calendarBajaIcon">🛑</span>}
    </button>
  );
}

// Agregar "vencido" al mapEstadoToColorClass existente:
function mapEstadoToColorClass(estado) {
  switch (estado) {
    case "ok":        return "calendarCell--green";
    case "fallo":     return "calendarCell--orange";
    case "na":        return "calendarCell--yellow";
    case "mantenimiento": return "calendarCell--blue";
    case "no_disponible": return "calendarCell--yellow";
    case "dado_baja": return "calendarCell--red";
    case "bloqueado": return "calendarCell--beige";
    case "vencido":   return "calendarCell--yellow";   // ← días grises vencidos
    default:          return "calendarCell--gray";
  }
}
