import { Router } from "express";
import { boolean, z } from "zod";
import crypto from "crypto"
import QRCode from "qrcode";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";


const router = Router();

/* =========================
   SCHEMAS
========================= */
const crearMaquinariaSchema = z.object({
  nombre: z.string().min(2),
  serial: z.string().min(2),
  marca: z.string().min(2),
  modelo: z.string().min(2),
  grupo_id: z.number().int().positive(),
  foto_url: z.string().min(1),
  formulario_id: z.string().uuid(),
});

const editarMaquinariaSchema = z.object({
  nombre: z.string().min(2),
  serial: z.string().min(2),
  marca: z.string().min(2),
  modelo: z.string().min(2),
  grupo_id: z.number().int().positive(),
  foto_url: z.string().min(1),
});

const cambioEstadoSchema = z.object({
  estado: z.enum(["disponible", "mantenimiento", "no_disponible", "dado_baja"]),
  descripcion: z.string().optional(),
});

const bajaSchema = z.object({
  motivo: z.string().min(5),
  foto_url: z.string().min(1),
  codigo_confirmacion: z.string().min(6),
});

const controlSchema = z.object({
  fecha: z.string().min(10),
  preoperacional_id: z.string().uuid().nullable().optional(),
  medidas_control: z.string().min(3),
  responsable: z.string().min(2),
  foto_control_url: z.string().nullable().optional(),
  accion_final: z.enum(["disponible", "mantenimiento", "dado_baja"]),
});


router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = crearMaquinariaSchema.parse(req.body);

    const existe = await pool.query(
      `
      SELECT 1
      FROM maquinaria
      WHERE serial = $1
      LIMIT 1
      `,
      [data.serial]
    );

    if (existe.rowCount > 0) {
      return res.status(409).json({
        message: "Ya existe una maquinaria con ese serial.",
      });
    }

    const qr_token = crypto.randomUUID();

    const r = await pool.query(
      `
      INSERT INTO maquinaria
      (
        nombre,
        serial,
        marca,
        modelo,
        grupo_id,
        foto_url,
        formulario_id,
        estado,
        dado_baja,
        qr_token
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, 'disponible', FALSE, $8)
      RETURNING *
      `,
      [
        data.nombre,
        data.serial,
        data.marca,
        data.modelo,
        data.grupo_id,
        data.foto_url,
        data.formulario_id,
        qr_token,
      ]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR creando maquinaria:", err);
    res.status(500).json({ message: "Error creando maquinaria." });
  }
});
/* =========================
   LISTAR MAQUINARIA
========================= */
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { grupo_id, estado, q } = req.query;

    const params = [];
    const where = [];

    if (grupo_id) {
      params.push(Number(grupo_id));
      where.push(`m.grupo_id = $${params.length}`);
    }

    if (estado) {
      params.push(String(estado));
      where.push(`m.estado = $${params.length}`);
    }

    if (q && String(q).trim()) {
      params.push(`%${String(q).trim()}%`);
      where.push(`(
        m.nombre ILIKE $${params.length}
        OR m.serial ILIKE $${params.length}
        OR m.marca ILIKE $${params.length}
        OR m.modelo ILIKE $${params.length}
      )`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const r = await pool.query(
      `
      SELECT
        m.id,
        m.nombre,
        m.serial,
        m.marca,
        m.modelo,
        m.foto_url,
        m.estado,
        m.dado_baja,
        m.qr_token,
        m.grupo_id,
        g.nombre AS grupo
      FROM maquinaria m
      JOIN grupos_maquinaria g ON g.id = m.grupo_id
      ${whereSql}
      ORDER BY m.creado_en DESC
      `,
      params
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR listando maquinaria:", err);
    res.status(500).json({ message: "Error listando maquinaria." });
  }
});

router.get("/colaborador/disponibles", requireAuth, async (req, res) => {
  try {
    const { grupo_id, estado, q } = req.query;

    const params = [];
    const where = [`m.dado_baja = FALSE`, `m.estado <> 'dado_baja'`];

    if (grupo_id) {
      params.push(Number(grupo_id));
      where.push(`m.grupo_id = $${params.length}`);
    }

    if (estado) {
      params.push(String(estado));
      where.push(`m.estado = $${params.length}`);
    }

    if (q && String(q).trim()) {
      params.push(`%${String(q).trim()}%`);
      const idx = params.length;

      where.push(`(
        m.nombre ILIKE $${idx}
        OR m.serial ILIKE $${idx}
        OR m.marca ILIKE $${idx}
        OR m.modelo ILIKE $${idx}
      )`);
    }

    const r = await pool.query(
      `
      SELECT
        m.id,
        m.nombre,
        m.serial,
        m.marca,
        m.modelo,
        m.foto_url,
        m.estado,
        m.dado_baja,
        m.grupo_id,
        g.nombre AS grupo,

        p_hoy.id AS preoperacional_hoy_id,
        p_hoy.cumple_general,

        CASE
          WHEN p_hoy.id IS NOT NULL AND p_hoy.cumple_general = TRUE THEN 'ok'
          WHEN p_hoy.id IS NOT NULL AND p_hoy.cumple_general = FALSE THEN 'fallo'
          WHEN med.estado = 'mantenimiento' THEN 'mantenimiento'
          WHEN m.estado = 'mantenimiento' THEN 'mantenimiento'
          WHEN m.estado = 'no_disponible' THEN 'no_disponible'
          ELSE NULL
        END AS estado_dia

      FROM maquinaria m
      JOIN grupos_maquinaria g ON g.id = m.grupo_id

      LEFT JOIN maquinaria_estado_dia med
        ON med.maquinaria_id = m.id
        AND med.fecha = CURRENT_DATE

      LEFT JOIN preoperacionales p_hoy
        ON p_hoy.maquinaria_id = m.id
        AND DATE(p_hoy.fecha) = CURRENT_DATE

      WHERE ${where.join(" AND ")}
      ORDER BY m.nombre ASC
      `,
      params
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR listando maquinaria para colaborador:", err);
    res.status(500).json({ message: "Error cargando maquinaria." });
  }
});

router.get("/colaborador/qr/:token", requireAuth, async (req, res) => {
  try {
    const { token } = req.params;

    const maqRes = await pool.query(
      `SELECT m.*, g.nombre AS grupo
       FROM maquinaria m
       JOIN grupos_maquinaria g ON g.id = m.grupo_id
       WHERE m.qr_token = $1`,
      [token]
    );

    const maq = maqRes.rows[0];
    if (!maq) return res.status(404).json({ message: "Maquinaria no encontrada." });

    const preopHoy = await pool.query(
      `SELECT id FROM preoperacionales
       WHERE maquinaria_id = $1
         AND DATE(fecha) = CURRENT_DATE
       LIMIT 1`,
      [maq.id]
    );

    res.json({
      maquinaria: maq,
      preoperacional_hoy: preopHoy.rowCount > 0,
    });
  } catch (err) {
    console.error("ERROR qr maquinaria:", err);
    res.status(500).json({ message: "Error buscando maquinaria." });
  }
});

router.get("/colaborador/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const maqRes = await pool.query(
      `
        SELECT m.*, g.nombre AS grupo
        FROM maquinaria m
        JOIN grupos_maquinaria g ON g.id = m.grupo_id
        WHERE m.id = $1
          AND m.dado_baja = FALSE
          AND m.estado = 'disponible'
  `,
      [id]
    );

    const maq = maqRes.rows[0];
    if (!maq) {
      return res.status(404).json({ message: "Maquinaria no disponible." });
    }

    const formRes = await pool.query(
      `SELECT id, nombre FROM formularios WHERE id = $1`,
      [maq.formulario_id]
    );

    const preguntasRes = await pool.query(
      `
      SELECT id, enunciado, orden, activa
      FROM formulario_preguntas
      WHERE formulario_id = $1
        AND activa = TRUE
      ORDER BY orden ASC
      `,
      [maq.formulario_id]
    );

    res.json({
      maquinaria: maq,
      formulario: formRes.rows[0] || null,
      preguntas: preguntasRes.rows || [],
    });
  } catch (err) {
    console.error("ERROR detalle maquinaria colaborador:", err);
    res.status(500).json({ message: "Error cargando maquinaria." });
  }
});

router.get("/colaborador/:id/detalle", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const maqRes = await pool.query(
      `
      SELECT
        m.id,
        m.nombre,
        m.serial,
        m.marca,
        m.modelo,
        m.foto_url,
        m.estado,
        m.dado_baja,
        m.grupo_id,
        g.nombre AS grupo
      FROM maquinaria m
      JOIN grupos_maquinaria g ON g.id = m.grupo_id
      WHERE m.id = $1
        AND m.dado_baja = FALSE
      `,
      [id]
    );

    const maq = maqRes.rows[0];
    if (!maq) {
      return res.status(404).json({ message: "Maquinaria no encontrada." });
    }

    res.json({
      maquinaria: maq,
    });
  } catch (err) {
    console.error("ERROR detalle maquinaria colaborador:", err);
    res.status(500).json({ message: "Error cargando detalle de maquinaria." });
  }
});

router.get("/colaborador/:id/historial", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const historialBase = await pool.query(
      `
      SELECT
        h.id,
        h.accion,
        h.descripcion,
        h.creado_en,
        TO_CHAR(h.creado_en, 'YYYY-MM-DD HH24:MI') AS creado_en_texto,
        NULL::text AS foto_url,
        NULL::text AS motivo,
        NULL::text AS responsable,
        'historial' AS origen
      FROM maquinaria_historial h
      WHERE h.maquinaria_id = $1
      `,
      [id]
    );

    const eventos = await pool.query(
      `
      SELECT
        e.id,
        COALESCE(e.accion_final, e.tipo) AS accion,
        e.descripcion,
        e.creado_en,
        TO_CHAR(e.creado_en, 'YYYY-MM-DD HH24:MI') AS creado_en_texto,
        e.foto_url,
        e.descripcion AS motivo,
        e.responsable,
        'evento' AS origen
      FROM maquinaria_eventos e
      WHERE e.maquinaria_id = $1
      `,
      [id]
    );

    const bajas = await pool.query(
      `
      SELECT
        b.id,
        'dado_baja' AS accion,
        b.motivo AS descripcion,
        b.creado_en,
        TO_CHAR(b.creado_en, 'YYYY-MM-DD HH24:MI') AS creado_en_texto,
        b.foto_url,
        b.motivo,
        NULL::text AS responsable,
        'baja' AS origen
      FROM maquinaria_baja b
      WHERE b.maquinaria_id = $1
      `,
      [id]
    );

    const combinado = [
      ...historialBase.rows,
      ...eventos.rows,
      ...bajas.rows,
    ].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

    res.json(combinado);
  } catch (err) {
    console.error("ERROR historial maquinaria colaborador:", err);
    res.status(500).json({ message: "Error cargando historial." });
  }
});

router.get("/colaborador/:id/preoperacionales", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const r = await pool.query(
      `
      SELECT
        p.id,
        p.fecha,
        TO_CHAR(p.fecha, 'YYYY-MM-DD HH24:MI') AS fecha_texto,
        p.observacion_general,
        p.cumple_general,
        u.nombre AS usuario_nombre,
        CASE
          WHEN p.cumple_general = TRUE THEN 'Cumple'
          ELSE 'No cumple'
        END AS estado_texto
      FROM preoperacionales p
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.maquinaria_id = $1
      ORDER BY p.fecha DESC
      `,
      [id]
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR preoperacionales maquinaria colaborador:", err);
    res.status(500).json({ message: "Error cargando preoperacionales." });
  }
});


/* =========================
   DETALLE MAQUINARIA
========================= */
router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const maqRes = await pool.query(
      `
      SELECT m.*, g.nombre AS grupo
      FROM maquinaria m
      JOIN grupos_maquinaria g ON g.id = m.grupo_id
      WHERE m.id = $1
      `,
      [id]
    );

    const maq = maqRes.rows[0];
    if (!maq) {
      return res.status(404).json({ message: "Maquinaria no existe." });
    }

    const formRes = await pool.query(
      `SELECT id, nombre FROM formularios WHERE id = $1`,
      [maq.formulario_id]
    );

    const preguntasRes = await pool.query(
      `
      SELECT id, enunciado, orden, activa
      FROM formulario_preguntas
      WHERE formulario_id = $1
      ORDER BY orden ASC
      `,
      [maq.formulario_id]
    );

    const qrUrl = `${process.env.BASE_URL}/preoperacional/${maq.qr_token}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl);

    res.json({
      maquinaria: maq,
      formulario: formRes.rows[0] || null,
      preguntas: preguntasRes.rows || [],
      qr: { url: qrUrl, dataUrl: qrDataUrl },
    });
  } catch (err) {
    console.error("ERROR detalle maquinaria:", err);
    res.status(500).json({ message: "Error cargando maquinaria." });
  }
});

/* =========================
   EDITAR MAQUINARIA
========================= */
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = editarMaquinariaSchema.parse(req.body);

    const maqRes = await pool.query(
      `SELECT estado FROM maquinaria WHERE id = $1`,
      [id]
    );

    const maq = maqRes.rows[0];
    if (!maq) {
      return res.status(404).json({ message: "Maquinaria no existe." });
    }

    if (maq.estado === "dado_baja") {
      return res.status(400).json({
        message: "La maquinaria dada de baja no se puede modificar.",
      });
    }

    const duplicado = await pool.query(
      `
      SELECT 1
      FROM maquinaria
      WHERE serial = $1
        AND id <> $2
      LIMIT 1
      `,
      [data.serial, id]
    );

    if (duplicado.rowCount > 0) {
      return res.status(409).json({
        message: "Ya existe otra maquinaria con ese serial.",
      });
    }

    const r = await pool.query(
      `
      UPDATE maquinaria
      SET nombre = $1,
          serial = $2,
          marca = $3,
          modelo = $4,
          grupo_id = $5,
          foto_url = $6
      WHERE id = $7
      RETURNING *
      `,
      [
        data.nombre,
        data.serial,
        data.marca,
        data.modelo,
        data.grupo_id,
        data.foto_url,
        id,
      ]
    );

    res.json(r.rows[0]);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", issues: err.issues });
    }
    console.error("ERROR editando maquinaria:", err);
    res.status(500).json({ message: "Error actualizando maquinaria." });
  }
});

/* =========================
   DAR DE BAJA
========================= */
router.post("/:id/baja", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, foto_url, codigo_confirmacion } = bajaSchema.parse(req.body);

    const maqRes = await pool.query(
      `SELECT id FROM maquinaria WHERE id = $1`,
      [id]
    );

    if (maqRes.rowCount === 0) {
      return res.status(404).json({ message: "Maquinaria no existe." });
    }

    await pool.query(
      `
      UPDATE maquinaria
      SET estado = 'dado_baja',
          dado_baja = TRUE,
          fecha_baja = CURRENT_DATE
      WHERE id = $1
      `,
      [id]
    );

    await pool.query(
      `
  INSERT INTO maquinaria_estado_dia
  (maquinaria_id, fecha, estado, observacion, actualizado_por)
  VALUES ($1, CURRENT_DATE, 'dado_baja', $2, $3)
  ON CONFLICT (maquinaria_id, fecha)
  DO UPDATE SET
    estado = 'dado_baja',
    observacion = EXCLUDED.observacion,
    actualizado_por = EXCLUDED.actualizado_por,
    actualizado_en = NOW()
  `,
      [id, motivo, req.user.id]
    );

    await pool.query(
      `
      INSERT INTO maquinaria_baja
      (maquinaria_id, motivo, foto_url, codigo_confirmacion, creado_por)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (maquinaria_id)
      DO UPDATE SET
        motivo = EXCLUDED.motivo,
        foto_url = EXCLUDED.foto_url,
        codigo_confirmacion = EXCLUDED.codigo_confirmacion,
        creado_por = EXCLUDED.creado_por,
        creado_en = NOW()
      `,
      [id, motivo, foto_url, codigo_confirmacion, req.user.id]
    );

    await pool.query(
      `
      INSERT INTO maquinaria_historial
      (maquinaria_id, usuario_id, accion, descripcion)
      VALUES ($1, $2, 'dado_baja', $3)
      `,
      [id, req.user.id, `Maquinaria dada de baja. Motivo: ${motivo}`]
    );

    res.json({ ok: true, message: "Maquinaria dada de baja correctamente." });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos Invalidos",
        issues: err.issues
      });
    }

    console.error("ERROR dando de baja maquinaria:", err);
    res.status(500).json({ message: "Error dando de baja maquinaria." });
  }
});

/* =========================
   HISTORIAL
========================= */
router.get("/:id/historial", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const historialBase = await pool.query(
      `
      SELECT
        h.id,
        h.accion,
        h.descripcion,
        h.creado_en,
        TO_CHAR(h.creado_en, 'YYYY-MM-DD HH24:MI') AS creado_en_texto,
        NULL::text AS foto_url,
        NULL::text AS motivo,
        NULL::text AS responsable,
        'historial' AS origen
      FROM maquinaria_historial h
      WHERE h.maquinaria_id = $1
      `,
      [id]
    );

    const eventos = await pool.query(
      `
      SELECT
        e.id,
        COALESCE(e.accion_final, e.tipo) AS accion,
        e.descripcion,
        e.creado_en,
        TO_CHAR(e.creado_en, 'YYYY-MM-DD HH24:MI') AS creado_en_texto,
        e.foto_url,
        e.descripcion AS motivo,
        e.responsable,
        'evento' AS origen
      FROM maquinaria_eventos e
      WHERE e.maquinaria_id = $1
      `,
      [id]
    );

    const bajas = await pool.query(
      `
      SELECT
        b.id,
        'dado_baja' AS accion,
        b.motivo AS descripcion,
        b.creado_en,
        TO_CHAR(b.creado_en, 'YYYY-MM-DD HH24:MI') AS creado_en_texto,
        b.foto_url,
        b.motivo,
        NULL::text AS responsable,
        'baja' AS origen
      FROM maquinaria_baja b
      WHERE b.maquinaria_id = $1
      `,
      [id]
    );

    const combinado = [
      ...historialBase.rows,
      ...eventos.rows,
      ...bajas.rows,
    ].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

    res.json(combinado);
  } catch (err) {
    console.error("ERROR historial maquinaria:", err);
    res.status(500).json({ message: "Error cargando historial." });
  }
});

/* =========================
   TODOS LOS PREOPERACIONALES
========================= */
router.get("/:id/preoperacionales", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const r = await pool.query(
      `
      SELECT
        p.id,
        p.fecha,
        TO_CHAR(p.fecha, 'YYYY-MM-DD HH24:MI') AS fecha_texto,
        p.observacion_general,
        p.cumple_general,
        u.nombre AS usuario_nombre,
        CASE
          WHEN p.cumple_general = TRUE THEN 'Cumple'
          ELSE 'No cumple'
        END AS estado_texto
      FROM preoperacionales p
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.maquinaria_id = $1
      ORDER BY p.fecha DESC
      `,
      [id]
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR listando preoperacionales maquinaria:", err);
    res.status(500).json({ message: "Error cargando preoperacionales." });
  }
});

/* =========================
   DETALLE POR DIA
========================= */
router.get("/:id/preoperacionales/dia", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Fecha inválida." });
    }

    // 1. Preoperacional exacto del día consultado
    const preRes = await pool.query(
      `
      SELECT
        p.id,
        p.fecha,
        TO_CHAR(p.fecha, 'YYYY-MM-DD HH24:MI') AS fecha_texto,
        u.nombre AS usuario_nombre,
        f.id AS formulario_id,
        f.nombre AS formulario_nombre
      FROM preoperacionales p
      JOIN usuarios u ON u.id = p.usuario_id
      JOIN maquinaria m ON m.id = p.maquinaria_id
      JOIN formularios f ON f.id = m.formulario_id
      WHERE p.maquinaria_id = $1
        AND DATE(p.fecha) = $2::date
      LIMIT 1
      `,
      [id, date]
    );

    const pre = preRes.rows[0] || null;

    // 2. Respuestas del preoperacional exacto del día, si existe
    const respuestasRes = pre
      ? await pool.query(
        `
          SELECT
            r.id,
            q.id AS pregunta_id,
            q.enunciado,
            r.cumple,
            r.observacion,
            r.foto_url
          FROM preoperacional_respuestas r
          JOIN formulario_preguntas q ON q.id = r.pregunta_id
          WHERE r.preoperacional_id = $1
          ORDER BY q.orden ASC
          `,
        [pre.id]
      )
      : { rows: [] };

    // 3. N/A del día
    const novedadRes = await pool.query(
      `
      SELECT observacion AS motivo
      FROM maquinaria_estado_dia
      WHERE maquinaria_id = $1
        AND fecha = $2::date
        AND estado = 'na'
      LIMIT 1
      `,
      [id, date]
    );

    // 4. Mantenimiento del día
    const mantenimientoRes = await pool.query(
      `
      SELECT descripcion
      FROM maquinaria_eventos
      WHERE maquinaria_id = $1
        AND fecha = $2::date
        AND tipo = 'mantenimiento'
      ORDER BY creado_en DESC
      LIMIT 1
      `,
      [id, date]
    );

    // 5. Control exacto del día
    const controlRes = await pool.query(
      `
      SELECT descripcion, responsable, foto_url, accion_final
      FROM maquinaria_eventos
      WHERE maquinaria_id = $1
        AND fecha = $2::date
        AND tipo = 'control'
      ORDER BY creado_en DESC
      LIMIT 1
      `,
      [id, date]
    );

    const control = controlRes.rows[0] || null;

    // 6. Buscar el último fallo sin resolver anterior o igual a la fecha consultada
    const falloBaseRes = await pool.query(
      `
      SELECT
        p.id AS preoperacional_id,
        DATE(p.fecha) AS fecha_fallo,
        TO_CHAR(p.fecha, 'YYYY-MM-DD HH24:MI') AS fecha_texto,
        u.nombre AS usuario_nombre,
        f.id AS formulario_id,
        f.nombre AS formulario_nombre
      FROM preoperacionales p
      JOIN usuarios u ON u.id = p.usuario_id
      JOIN maquinaria m ON m.id = p.maquinaria_id
      JOIN formularios f ON f.id = m.formulario_id
      WHERE p.maquinaria_id = $1
        AND p.cumple_general = FALSE
        AND DATE(p.fecha) <= $2::date
        AND NOT EXISTS (
          SELECT 1
          FROM maquinaria_eventos e
          WHERE e.maquinaria_id = p.maquinaria_id
            AND e.tipo = 'control'
            AND e.fecha > DATE(p.fecha)
            AND e.fecha <= $2::date
        )
      ORDER BY DATE(p.fecha) DESC
      LIMIT 1
      `,
      [id, date]
    );

    const falloBase = falloBaseRes.rows[0] || null;

    // 7. Respuestas del fallo base
    const respuestasFalloBaseRes = falloBase
      ? await pool.query(
        `
          SELECT
            r.id,
            q.id AS pregunta_id,
            q.enunciado,
            r.cumple,
            r.observacion,
            r.foto_url
          FROM preoperacional_respuestas r
          JOIN formulario_preguntas q ON q.id = r.pregunta_id
          WHERE r.preoperacional_id = $1
          ORDER BY q.orden ASC
          `,
        [falloBase.preoperacional_id]
      )
      : { rows: [] };

    res.json({
      preoperacional: pre
        ? {
          id: pre.id,
          fecha_texto: pre.fecha_texto,
          usuario_nombre: pre.usuario_nombre,
        }
        : null,
      formulario: pre
        ? {
          id: pre.formulario_id,
          nombre: pre.formulario_nombre,
        }
        : null,
      respuestas: respuestasRes.rows || [],
      novedad: novedadRes.rows[0] || null,
      mantenimiento: mantenimientoRes.rows[0] || null,
      control,
      fallo_base: falloBase
        ? {
          preoperacional_id: falloBase.preoperacional_id,
          fecha_fallo: falloBase.fecha_fallo,
          fecha_texto: falloBase.fecha_texto,
          usuario_nombre: falloBase.usuario_nombre,
          formulario_id: falloBase.formulario_id,
          formulario_nombre: falloBase.formulario_nombre,
        }
        : null,
      respuestas_fallo_base: respuestasFalloBaseRes.rows || [],
    });
  } catch (err) {
    console.error("ERROR detalle por día maquinaria:", err);
    res.status(500).json({ message: "Error cargando detalle del día." });
  }
});

/* =========================
   GUARDAR GESTION ADMINISTRATIVA
========================= */
router.post("/:id/eventos/control", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = controlSchema.parse(req.body);

    await pool.query(
      `
  INSERT INTO maquinaria_eventos
  (
    maquinaria_id,
    preoperacional_id,
    fecha,
    tipo,
    descripcion,
    responsable,
    foto_url,
    accion_final,
    creado_por
  )
  VALUES ($1, $2, $3::date, 'control', $4, $5, $6, $7::varchar, $8)
  `,
      [
        id,
        data.preoperacional_id ?? null,
        data.fecha,
        data.medidas_control,
        data.responsable,
        data.foto_control_url ?? null,
        data.accion_final,
        req.user.id,
      ]
    );
    await pool.query(
      `
      UPDATE maquinaria
      SET estado = $1::varchar,
          dado_baja = CASE WHEN $1::varchar = 'dado_baja' THEN TRUE ELSE dado_baja END
      WHERE id = $2
     `,
      [data.accion_final, id]
    );

    await pool.query(
      `
    INSERT INTO maquinaria_estado_dia
    (maquinaria_id, fecha, estado, observacion, actualizado_por)
    VALUES ($1, $2::date, $3::varchar, $4, $5)
    ON CONFLICT (maquinaria_id, fecha)
    DO UPDATE SET
      estado = EXCLUDED.estado,
      observacion = EXCLUDED.observacion,
      actualizado_por = EXCLUDED.actualizado_por,
      actualizado_en = NOW()
  `,
      [id, data.fecha, data.accion_final, data.medidas_control, req.user.id]
    );

    await pool.query(
      `
      INSERT INTO maquinaria_historial (maquinaria_id, usuario_id, accion, descripcion)
      VALUES ($1, $2, $3::varchar, $4)
      `,
      [id, req.user.id, data.accion_final, data.medidas_control]
    );

    // si da baja desde gestión roja, registrar soporte mínimo
    if (data.accion_final === "dado_baja") {
      await pool.query(
        `
        UPDATE maquinaria
        SET dado_baja = TRUE
        WHERE id = $1
        `,
        [id]
      );
    }

    res.json({ ok: true, message: "Gestión guardada correctamente." });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", issues: err.issues });
    }
    console.error("ERROR guardando gestión maquinaria:", err);
    res.status(500).json({ message: "Error guardando gestión." });
  }
});


const estadoDiaSchema = z.object({
  fecha: z.string().min(10),
  estado: z.enum(["ok", "fallo", "na", "mantenimiento", "no_disponible", "sin_registro", "dado_baja"]),
  observacion: z.string().nullable().optional(),
});

router.patch("/:id/estado", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, descripcion } = cambioEstadoSchema.parse(req.body);

    const maqRes = await pool.query(
      `SELECT id, estado FROM maquinaria WHERE id = $1`,
      [id]
    );

    const maq = maqRes.rows[0];
    if (!maq) {
      return res.status(404).json({ message: "Maquinaria no existe." });
    }

    if (maq.estado === "dado_baja") {
      return res.status(400).json({
        message: "Una maquinaria dada de baja no se puede modificar.",
      });
    }

    const dadoBaja = estado === "dado_baja";
    const hoy = new Date().toISOString().slice(0, 10);

    const r = await pool.query(
      `
      UPDATE maquinaria
      SET estado = $1,
          dado_baja = $2
      WHERE id = $3
      RETURNING *
      `,
      [estado, dadoBaja, id]
    );

    await pool.query(
      `
      INSERT INTO maquinaria_historial
      (maquinaria_id, usuario_id, accion, descripcion)
      VALUES ($1, $2, $3, $4)
      `,
      [id, req.user.id, estado, descripcion || null]
    );

    await pool.query(
      `
      INSERT INTO maquinaria_estado_dia
      (maquinaria_id, fecha, estado, observacion, actualizado_por)
      VALUES ($1, $2::date, $3, $4, $5)
      ON CONFLICT (maquinaria_id, fecha)
      DO UPDATE SET
        estado = EXCLUDED.estado,
        observacion = EXCLUDED.observacion,
        actualizado_por = EXCLUDED.actualizado_por,
        actualizado_en = NOW()
      `,
      [id, hoy, estado, descripcion || null, req.user.id]
    );

    res.json(r.rows[0]);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR actualizando estado maquinaria:", err);
    res.status(500).json({ message: "Error actualizando estado." });
  }
});


router.post("/:id/estado-dia", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = estadoDiaSchema.parse(req.body);

    const maqRes = await pool.query(
      `SELECT estado FROM maquinaria WHERE id = $1`,
      [id]
    );

    const maq = maqRes.rows[0];
    if (!maq) {
      return res.status(404).json({ message: "Maquinaria no existe." });
    }

    if (maq.estado === "dado_baja") {
      return res.status(400).json({
        message: "La maquinaria dada de baja no se puede modificar.",
      });
    }

    await pool.query(
      `
      INSERT INTO maquinaria_estado_dia
      (maquinaria_id, fecha, estado, observacion, actualizado_por)
      VALUES ($1, $2::date, $3, $4, $5)
      ON CONFLICT (maquinaria_id, fecha)
      DO UPDATE SET
        estado = EXCLUDED.estado,
        observacion = EXCLUDED.observacion,
        actualizado_por = EXCLUDED.actualizado_por,
        actualizado_en = NOW()
      `,
      [id, data.fecha, data.estado, data.observacion ?? null, req.user.id]
    );

    res.json({ ok: true, message: "Estado del dia actualizado el dia de hoy" });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }


    console.error("ERROR actualizando estado del día:", err);
    res.status(500).json({ message: "Error actualizando estado del día." });
  }
});

router.get("/:id/calendario", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        message: "Debes enviar month=YYYY-MM",
      });
    }

    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    // =============================================
    // 1. Datos básicos de la maquinaria
    // =============================================
    const maquinariaRes = await pool.query(
      `
      SELECT dado_baja, fecha_baja, creado_en
      FROM maquinaria
      WHERE id = $1
      `,
      [id]
    );

    if (maquinariaRes.rowCount === 0) {
      return res.status(404).json({ message: "Maquinaria no encontrada" });
    }

    const maq = maquinariaRes.rows[0];

    const creadoEn =
      maq.creado_en instanceof Date
        ? new Date(maq.creado_en)
        : new Date(maq.creado_en);
    creadoEn.setHours(0, 0, 0, 0);

    if (endDate < creadoEn) {
      return res.json({
        calendario: {},
        minMonth: creadoEn.toISOString().slice(0, 7),
        createdDate: creadoEn.toISOString().slice(0, 10),
      });
    }

    let bajaFecha = null;
    if (maq.dado_baja && maq.fecha_baja) {
      bajaFecha =
        maq.fecha_baja instanceof Date
          ? new Date(maq.fecha_baja)
          : new Date(maq.fecha_baja);
      bajaFecha.setHours(0, 0, 0, 0);
    }

    const start = startDate < creadoEn ? new Date(creadoEn) : new Date(startDate);
    const startKey = start.toISOString().slice(0, 10);

    // =============================================
    // 2. Consultas de historial
    // =============================================
    const estadosRes = await pool.query(
      `
      SELECT fecha, estado, actualizado_en
      FROM maquinaria_estado_dia
      WHERE maquinaria_id = $1
      ORDER BY fecha ASC, actualizado_en ASC
      `,
      [id]
    );

    const preopRes = await pool.query(
      `
      SELECT DATE(p.fecha) AS fecha, p.cumple_general
      FROM preoperacionales p
      WHERE p.maquinaria_id = $1
      `,
      [id]
    );

    const controlRes = await pool.query(
      `
      SELECT fecha, accion_final
      FROM maquinaria_eventos
      WHERE maquinaria_id = $1
        AND tipo = 'control'
      ORDER BY fecha ASC, creado_en ASC
      `,
      [id]
    );

    // =============================================
    // 3. Estado previo + fallo previo sin resolver
    // =============================================
    const estadoPrevioRes = await pool.query(
      `
      SELECT estado
      FROM maquinaria_estado_dia
      WHERE maquinaria_id = $1
        AND fecha < $2::date
      ORDER BY fecha DESC
      LIMIT 1
      `,
      [id, startKey]
    );

    const falloPrevioRes = await pool.query(
      `
      SELECT DATE(p.fecha) AS fecha_fallo
      FROM preoperacionales p
      WHERE p.maquinaria_id = $1
        AND p.cumple_general = FALSE
        AND DATE(p.fecha) < $2::date
        AND NOT EXISTS (
          SELECT 1
          FROM maquinaria_eventos e
          WHERE e.maquinaria_id = p.maquinaria_id
            AND e.tipo = 'control'
            AND e.fecha >= DATE(p.fecha)
            AND e.fecha < $2::date
        )
      ORDER BY DATE(p.fecha) DESC
      LIMIT 1
      `,
      [id, startKey]
    );

    // =============================================
    // 4. Construcción de mapas
    // =============================================
    const estadosMap = {};
    const preopMap = {};
    const controlMap = {};

    estadosRes.rows.forEach((r) => {
      const key = r.fecha instanceof Date
        ? r.fecha.toISOString().slice(0, 10)
        : String(r.fecha).slice(0, 10);
      if (!estadosMap[key]) estadosMap[key] = [];
      estadosMap[key].push(r.estado);
    });

    preopRes.rows.forEach((r) => {
      const key = r.fecha instanceof Date
        ? r.fecha.toISOString().slice(0, 10)
        : String(r.fecha).slice(0, 10);
      preopMap[key] = r.cumple_general ? "ok" : "fallo";
    });

    controlRes.rows.forEach((r) => {
      const key = r.fecha instanceof Date
        ? r.fecha.toISOString().slice(0, 10)
        : String(r.fecha).slice(0, 10);
      controlMap[key] = r.accion_final;
    });

    // =============================================
    // 5. Generar calendario
    // =============================================
    const result = {};
    const fechasOrdenadas = [];

    for (let d = new Date(start); d <= endDate; d.setDate(d.getDate() + 1)) {
      fechasOrdenadas.push(d.toISOString().slice(0, 10));
    }

    let falloActivoDesde = falloPrevioRes.rows[0]?.fecha_fallo
      ? (falloPrevioRes.rows[0].fecha_fallo instanceof Date
        ? falloPrevioRes.rows[0].fecha_fallo.toISOString().slice(0, 10)
        : String(falloPrevioRes.rows[0].fecha_fallo).slice(0, 10))
      : null;

    let estadoPersistente = estadoPrevioRes.rows[0]?.estado ?? null;
    let falloSinResolver = !!falloActivoDesde;

    for (const dateKey of fechasOrdenadas) {
      const current = new Date(dateKey);
      current.setHours(0, 0, 0, 0);

      if (bajaFecha && current >= bajaFecha) {
        result[dateKey] = { estados: ["dado_baja"] };
        falloActivoDesde = null;
        estadoPersistente = "dado_baja";
        continue;
      }

      const ultimoEstadoManual = estadosMap[dateKey]?.length
        ? estadosMap[dateKey][estadosMap[dateKey].length - 1]
        : null;

      let estadosDia = [];

      // 1. Preoperacional OK
      if (preopMap[dateKey] === "ok") {
        estadosDia = ["ok"];
        falloActivoDesde = null;
        falloSinResolver = false;
        estadoPersistente = "disponible";
      }

      // 2. Fallo (preoperacional rojo)
      if (preopMap[dateKey] === "fallo") {
        estadosDia = ["fallo"];
        falloActivoDesde = dateKey;
        falloSinResolver = true;
      }

      // 3. Control el mismo día del fallo
      if (controlMap[dateKey] && preopMap[dateKey] === "fallo") {
        estadosDia = ["fallo", controlMap[dateKey]];
        falloActivoDesde = null;
        falloSinResolver = false;
        estadoPersistente = controlMap[dateKey];
      }

      // 4. Control que resuelve arrastre (día sin preop)
      if (controlMap[dateKey] && preopMap[dateKey] !== "fallo") {
        estadosDia = [controlMap[dateKey]];
        falloActivoDesde = null;
        falloSinResolver = false;
        estadoPersistente = controlMap[dateKey];
      }

      // 5. Arrastre de fallo activo
      if (!estadosDia.length && falloActivoDesde && dateKey > falloActivoDesde) {
        estadosDia = ["fallo"];
      }

      // 5b. Arrastre de no_disponible / mantenimiento (solo si no hay fallo pendiente)
      if (!estadosDia.length && estadoPersistente && !falloSinResolver) {
        if (estadoPersistente === "no_disponible" || estadoPersistente === "mantenimiento") {
          estadosDia = [estadoPersistente];
        }
      }


      // 6. Estado manual del administrador 

      // Bloque 6 completo corregido
      if (ultimoEstadoManual) {
        const hayFalloEseDia = preopMap[dateKey] === "fallo";
        const hayPreopOkEseDia = preopMap[dateKey] === "ok";
        const hayControlEseDia = Boolean(controlMap[dateKey]);
        const esNoDispAutomatico =
          ultimoEstadoManual === "no_disponible" && hayFalloEseDia && !hayControlEseDia;

        if (hayPreopOkEseDia) {
          // El bloque 1 ya asignó ok — no pisar con el estado manual
        } else if (falloActivoDesde && dateKey > falloActivoDesde && !hayControlEseDia) {
          // Fallo arrastrado vigente — no dejar que un estado manual lo tape
        } else if (esNoDispAutomatico) {
          falloActivoDesde = dateKey;
          falloSinResolver = true;
        } else if (hayFalloEseDia && hayControlEseDia) {
          estadosDia = ["fallo", controlMap[dateKey]];
          falloActivoDesde = null;
          falloSinResolver = false;
          estadoPersistente = controlMap[dateKey];
        } else {
          estadosDia = [ultimoEstadoManual];
          if (["disponible", "mantenimiento", "dado_baja", "na", "ok"].includes(ultimoEstadoManual)) {
            falloActivoDesde = null;
            falloSinResolver = false;
          }
          estadoPersistente = ultimoEstadoManual;
        }
      }

      // 7. Sin registro
      if (!estadosDia.length) {
        estadosDia = ["sin_registro"];
      }

      const estadosUnicos = [...new Set(estadosDia)].slice(0, 2);

      result[dateKey] = { estados: estadosUnicos };

      // ← Información clave para el frontend
      if (estadosUnicos.includes("fallo") && falloActivoDesde) {
        result[dateKey].fallo_origen = falloActivoDesde;
      }

      // Actualizar estado persistente
      const estadoFinal = estadosUnicos[estadosUnicos.length - 1];
      if (["no_disponible", "mantenimiento", "disponible", "dado_baja"].includes(estadoFinal)) {
        estadoPersistente = estadoFinal;
      } else if (estadoFinal === "ok") {
        estadoPersistente = "disponible";
      }
    }

    res.json({
      calendario: result,
      minMonth: creadoEn.toISOString().slice(0, 7),
      createdDate: creadoEn.toISOString().slice(0, 10),
    });
  } catch (err) {
    console.error("ERROR calendario maquinaria:", err);
    res.status(500).json({ message: "Error cargando calendario." });
  }
});

export default router;