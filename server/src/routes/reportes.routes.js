import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const crearReporteSchema = z.object({
  ciudad: z.string().min(2),
  lugar: z.string().min(2),
  ot: z.string().optional().nullable(),
  area: z.enum(["calidad", "disenio", "operacion", "otro"]),
  area_otro: z.string().optional().nullable(),
  foto_url: z.string().optional().nullable(),
  situacion: z.enum([
    "incidente",
    "impacto_ambiental",
    "error_info_tecnica",
    "incumplimiento_parametros",
    "acto_seguro",
    "acto_inseguro",
    "condicion_segura",
  ]),
  descripcion: z.string().min(5),
});

const gestionSchema = z.object({
  tipo_accion: z.enum(["R", "R1", "LB", "RE", "C"]),
  descripcion: z.string().min(3),
  cierra_reporte: z.boolean().default(false),
});

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS FIJAS (deben ir ANTES de /:id para que Express no las capture como param)
// ─────────────────────────────────────────────────────────────────────────────

// ─── CREAR REPORTE (admin y colaborador) ─────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  try {
    const data = crearReporteSchema.parse(req.body);

    if (data.area === "otro" && !data.area_otro?.trim()) {
      return res
        .status(400)
        .json({
          message: "Debes especificar el área cuando seleccionas 'Otro'.",
        });
    }

    const r = await pool.query(
      `INSERT INTO reportes_observacion
       (reportado_por, ciudad, lugar, ot, area, area_otro, foto_url, situacion, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        req.user.id,
        data.ciudad,
        data.lugar,
        data.ot ?? null,
        data.area,
        data.area === "otro" ? (data.area_otro ?? null) : null,
        data.foto_url ?? null,
        data.situacion,
        data.descripcion,
      ],
    );

    const reporte = r.rows[0];

    // Notificar a todos los admins sobre el nuevo reporte
    try {
      const admins = await pool.query(
        `SELECT id FROM usuarios WHERE rol = 'admin' AND eliminado = FALSE`,
      );
      const reportadoPor = await pool.query(
        `SELECT nombre FROM usuarios WHERE id = $1`,
        [req.user.id],
      );
      const nombreReportador = reportadoPor.rows[0]?.nombre || "Un colaborador";
      const situacionLabel =
        {
          incidente: "Incidente",
          impacto_ambiental: "Impacto Ambiental",
          error_info_tecnica: "Error de Información Técnica",
          incumplimiento_parametros: "Incumplimiento de Parámetros (PNC)",
          acto_seguro: "Acto Seguro",
          acto_inseguro: "Acto Inseguro",
          condicion_segura: "Condición Segura",
        }[data.situacion] || data.situacion;

      for (const admin of admins.rows) {
        await pool.query(
          `INSERT INTO mensajes (emisor_id, receptor_id, mensaje, reporte_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [
            req.user.id,
            admin.id,
            `📋 Nuevo reporte de observación: "${situacionLabel}" en ${data.lugar}, ${data.ciudad}. Reportado por ${nombreReportador}. Reporte #${reporte.id}.`,
            reporte.id,
          ],
        );
      }
    } catch (notifErr) {
      // No fallar si la notificación falla
      console.error(
        "Error enviando notificación de reporte:",
        notifErr.message,
      );
    }

    res.status(201).json(reporte);
  } catch (err) {
    if (err?.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Datos inválidos", issues: err.issues });
    console.error("ERROR creando reporte:", err);
    res.status(500).json({ message: "Error creando reporte." });
  }
});

// ─── LISTAR REPORTES con filtros ──────────────────────────────────────────────
// Soporta ?estado=abierto o ?estado=abierto,en_proceso (múltiples separados por coma)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { desde, hasta, area, situacion, usuario_id, estado } = req.query;

    const params = [];
    const where = [];

    if (desde) {
      params.push(desde);
      where.push(`ro.fecha >= $${params.length}::date`);
    }
    if (hasta) {
      params.push(hasta);
      where.push(`ro.fecha <= $${params.length}::date`);
    }
    if (area) {
      params.push(area);
      where.push(`ro.area = $${params.length}`);
    }
    if (situacion) {
      params.push(situacion);
      where.push(`ro.situacion = $${params.length}`);
    }
    if (usuario_id) {
      params.push(usuario_id);
      where.push(`ro.reportado_por = $${params.length}`);
    }

    if (estado) {
      // Soportar múltiples: "abierto,en_proceso"
      const estados = estado
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (estados.length === 1) {
        params.push(estados[0]);
        where.push(`ro.estado = $${params.length}`);
      } else if (estados.length > 1) {
        const placeholders = estados
          .map((_, i) => `$${params.length + i + 1}`)
          .join(", ");
        estados.forEach((e) => params.push(e));
        where.push(`ro.estado IN (${placeholders})`);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const r = await pool.query(
      `SELECT
         ro.*,
         u.nombre           AS reportado_por_nombre,
         u.numero_documento AS reportado_por_documento,
         u.cargo            AS reportado_por_cargo,
         TO_CHAR(ro.fecha,      'YYYY-MM-DD')    AS fecha_texto,
         TO_CHAR(ro.creado_en,  'YYYY-MM-DD HH24:MI') AS creado_en_texto
       FROM reportes_observacion ro
       JOIN usuarios u ON u.id = ro.reportado_por
       ${whereSql}
       ORDER BY ro.fecha DESC, ro.creado_en DESC`,
      params,
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR listando reportes:", err);
    res.status(500).json({ message: "Error listando reportes." });
  }
});

// ─── CALENDARIO MENSUAL ───────────────────────────────────────────────────────
router.get("/calendario", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "Envía month=YYYY-MM" });
    }

    const [y, m] = month.split("-").map(Number);
    const inicio = `${y}-${String(m).padStart(2, "0")}-01`;
    const fin = new Date(y, m, 0).toISOString().slice(0, 10);

    const r = await pool.query(
      `SELECT
         TO_CHAR(ro.fecha, 'YYYY-MM-DD') AS fecha,
         ro.estado,
         COUNT(*) AS cantidad
       FROM reportes_observacion ro
       WHERE ro.fecha BETWEEN $1::date AND $2::date
       GROUP BY ro.fecha, ro.estado
       ORDER BY ro.fecha ASC`,
      [inicio, fin],
    );

    // Prioridad por día: abierto > en_proceso > cerrado
    const prioridad = { abierto: 3, en_proceso: 2, cerrado: 1 };
    const mapa = {};

    for (const row of r.rows) {
      const key = row.fecha; // ya viene como YYYY-MM-DD
      const cant = Number(row.cantidad);

      if (!mapa[key] || prioridad[row.estado] > prioridad[mapa[key].estado]) {
        mapa[key] = { estado: row.estado, cantidad: cant };
      } else {
        mapa[key].cantidad += cant;
      }
    }

    res.json({ calendario: mapa });
  } catch (err) {
    console.error("ERROR calendario reportes:", err);
    res.status(500).json({ message: "Error cargando calendario." });
  }
});

// ─── HISTORIAL — AÑOS disponibles (solo cerrados) ────────────────────────────
// IMPORTANTE: esta ruta va ANTES de /:id
router.get("/historial/anios", requireAuth, requireAdmin, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
         EXTRACT(YEAR FROM fecha)::int AS anio,
         COUNT(*) AS total
       FROM reportes_observacion
       WHERE estado = 'cerrado'
       GROUP BY anio
       ORDER BY anio DESC`,
    );
    res.json(r.rows);
  } catch (err) {
    console.error("ERROR historial años:", err);
    res.status(500).json({ message: "Error cargando años." });
  }
});

// ─── HISTORIAL — MESES de un año ─────────────────────────────────────────────
// IMPORTANTE: va ANTES de /:id
router.get("/historial/:anio", requireAuth, requireAdmin, async (req, res) => {
  try {
    const anio = Number(req.params.anio);
    if (isNaN(anio)) return res.status(400).json({ message: "Año inválido." });

    const r = await pool.query(
      `SELECT
         EXTRACT(MONTH FROM fecha)::int AS mes,
         COUNT(*) AS total
       FROM reportes_observacion
       WHERE estado = 'cerrado'
         AND EXTRACT(YEAR FROM fecha) = $1
       GROUP BY mes
       ORDER BY mes ASC`,
      [anio],
    );
    res.json(r.rows);
  } catch (err) {
    console.error("ERROR historial meses:", err);
    res.status(500).json({ message: "Error cargando meses." });
  }
});

// ─── HISTORIAL — REPORTES de un mes/año ──────────────────────────────────────
router.get(
  "/historial/:anio/:mes",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const anio = Number(req.params.anio);
      const mes = Number(req.params.mes);
      if (isNaN(anio) || isNaN(mes))
        return res.status(400).json({ message: "Año o mes inválidos." });

      const { area, situacion, usuario_id } = req.query;
      const params = [anio, mes];
      const extra = [];

      if (area) {
        params.push(area);
        extra.push(`ro.area = $${params.length}`);
      }
      if (situacion) {
        params.push(situacion);
        extra.push(`ro.situacion = $${params.length}`);
      }
      if (usuario_id) {
        params.push(usuario_id);
        extra.push(`ro.reportado_por = $${params.length}`);
      }

      const extraSql = extra.length ? `AND ${extra.join(" AND ")}` : "";

      const r = await pool.query(
        `SELECT
         ro.*,
         u.nombre           AS reportado_por_nombre,
         u.numero_documento AS reportado_por_documento,
         u.cargo            AS reportado_por_cargo,
         TO_CHAR(ro.fecha,     'YYYY-MM-DD')    AS fecha_texto,
         TO_CHAR(ro.creado_en, 'YYYY-MM-DD HH24:MI') AS creado_en_texto
       FROM reportes_observacion ro
       JOIN usuarios u ON u.id = ro.reportado_por
       WHERE ro.estado = 'cerrado'
         AND EXTRACT(YEAR  FROM ro.fecha) = $1
         AND EXTRACT(MONTH FROM ro.fecha) = $2
         ${extraSql}
       ORDER BY ro.fecha DESC`,
        params,
      );

      res.json(r.rows);
    } catch (err) {
      console.error("ERROR historial mes:", err);
      res.status(500).json({ message: "Error cargando reportes del mes." });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS CON PARÁMETRO DINÁMICO — van AL FINAL
// ─────────────────────────────────────────────────────────────────────────────

// ─── REPORTE INDIVIDUAL ───────────────────────────────────────────────────────
router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const rRes = await pool.query(
      `SELECT
         ro.*,
         u.nombre           AS reportado_por_nombre,
         u.numero_documento AS reportado_por_documento,
         u.cargo            AS reportado_por_cargo,
         TO_CHAR(ro.fecha,     'YYYY-MM-DD')    AS fecha_texto,
         TO_CHAR(ro.creado_en, 'YYYY-MM-DD HH24:MI') AS creado_en_texto
       FROM reportes_observacion ro
       JOIN usuarios u ON u.id = ro.reportado_por
       WHERE ro.id = $1`,
      [id],
    );

    if (rRes.rowCount === 0)
      return res.status(404).json({ message: "Reporte no encontrado." });

    const gestiones = await pool.query(
      `SELECT
         g.*,
         u.nombre AS realizado_por_nombre,
         TO_CHAR(g.fecha_gestion, 'YYYY-MM-DD')    AS fecha_texto,
         TO_CHAR(g.creado_en,     'YYYY-MM-DD HH24:MI') AS creado_en_texto
       FROM reportes_observacion_gestion g
       JOIN usuarios u ON u.id = g.realizado_por
       WHERE g.reporte_id = $1
       ORDER BY g.creado_en ASC`,
      [id],
    );

    res.json({ reporte: rRes.rows[0], gestiones: gestiones.rows });
  } catch (err) {
    console.error("ERROR detalle reporte:", err);
    res.status(500).json({ message: "Error cargando reporte." });
  }
});

// ─── REGISTRAR GESTIÓN ADMINISTRATIVA ────────────────────────────────────────
router.post("/:id/gestion", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = gestionSchema.parse(req.body);

    const reporteRes = await pool.query(
      `SELECT estado FROM reportes_observacion WHERE id = $1`,
      [id],
    );
    if (reporteRes.rowCount === 0)
      return res.status(404).json({ message: "Reporte no encontrado." });
    if (reporteRes.rows[0].estado === "cerrado") {
      return res.status(400).json({ message: "El reporte ya está cerrado." });
    }

    const nuevoEstado = data.cierra_reporte ? "cerrado" : "en_proceso";

    const gRes = await pool.query(
      `INSERT INTO reportes_observacion_gestion
       (reporte_id, realizado_por, tipo_accion, descripcion, cierra_reporte)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id,
        req.user.id,
        data.tipo_accion,
        data.descripcion,
        data.cierra_reporte,
      ],
    );

    await pool.query(
      `UPDATE reportes_observacion SET estado = $1 WHERE id = $2`,
      [nuevoEstado, id],
    );

    res.status(201).json({ gestion: gRes.rows[0], nuevo_estado: nuevoEstado });
  } catch (err) {
    if (err?.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Datos inválidos", issues: err.issues });
    console.error("ERROR gestión reporte:", err);
    res.status(500).json({ message: "Error guardando gestión." });
  }
});

export default router;
