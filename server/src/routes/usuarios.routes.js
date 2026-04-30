import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

/* =========================
   CREAR USUARIO
========================= */
const crearUsuarioSchema = z.object({
  nombre: z.string().min(2),
  cargo: z.string().min(2),
  fecha_ingreso: z.string().min(8),
  tipo_contrato: z.string().min(2),
  rh: z.string().min(1),
  direccion: z.string().min(3),
  numero_documento: z.string().min(5),
  foto_url: z.string().optional(),
  rol: z.enum(["admin", "colaborador"]),
});

const habilitarPreopSchema = z.object({
  fecha: z.string().min(10),
  maquinaria_id: z.string().uuid(),
  motivo: z.string().optional(),
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = crearUsuarioSchema.parse(req.body);

    const existe = await pool.query(
      `SELECT 1 FROM usuarios WHERE numero_documento = $1`,
      [data.numero_documento]
    );

    if (existe.rowCount > 0) {
      return res.status(409).json({
        message: "Ya existe un usuario con ese número de documento.",
      });
    }

    const rolRes = await pool.query(
      `SELECT id FROM roles WHERE nombre = $1`,
      [data.rol]
    );

    const roleId = rolRes.rows[0]?.id;
    if (!roleId) {
      return res.status(400).json({ message: "Rol no válido." });
    }

    // password = numero_documento
    const password_hash = await bcrypt.hash(data.numero_documento, 10);

    const insert = await pool.query(
      `INSERT INTO usuarios
       (nombre, cargo, fecha_ingreso, tipo_contrato, rh, direccion, numero_documento, foto_url, correo, password_hash, role_id, activo)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, TRUE)
       RETURNING id, nombre, cargo, numero_documento, foto_url`,
      [
        data.nombre,
        data.cargo,
        data.fecha_ingreso,
        data.tipo_contrato,
        data.rh,
        data.direccion,
        data.numero_documento,
        data.foto_url ?? null,
        null,
        password_hash,
        roleId,
      ]
    );

    res.status(201).json({
      message: "Usuario creado correctamente",
      user: insert.rows[0],
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR creando usuario:", err);
    res.status(500).json({ message: "Error creando usuario" });
  }
});

/* =========================
   LISTAR USUARIOS / COLABORADORES
   GET /api/usuarios?rol=colaborador
========================= */
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rol, q } = req.query;

    const params = [];
    const where = [`u.activo = TRUE`];

    if (rol) {
      params.push(rol);
      where.push(`r.nombre = $${params.length}`);
    }

    if (q && String(q).trim()) {
      params.push(`%${String(q).trim()}%`);
      const idx = params.length;

      where.push(`(
        u.nombre ILIKE $${idx}
        OR u.cargo ILIKE $${idx}
        OR u.numero_documento ILIKE $${idx}
      )`);
    }

    const query = `
      SELECT
        u.id,
        u.nombre,
        u.cargo,
        u.fecha_ingreso,
        u.tipo_contrato,
        u.rh,
        u.direccion,
        u.numero_documento,
        u.foto_url,
        u.activo,
        r.nombre AS rol
      FROM usuarios u
      JOIN roles r ON r.id = u.role_id
      WHERE ${where.join(" AND ")}
      ORDER BY u.creado_en DESC
    `;

    const r = await pool.query(query, params);
    res.json(r.rows);
  } catch (err) {
    console.error("ERROR listando usuarios:", err);
    res.status(500).json({ message: "Error listando usuarios" });
  }
});


router.get("/mis-alertas", requireAuth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE preoperacionales_habilitados
       SET activo = FALSE
       WHERE activo = TRUE AND vence_en < NOW()`
    );

    const mensajesRes = await pool.query(
      `
      SELECT
        m.id,
        'mensaje' AS tipo,
        m.mensaje,
        m.creado_en,
        DATE(m.creado_en) = CURRENT_DATE AS es_hoy,
        NULL::uuid AS habilitacion_id,
        NULL::uuid AS maquinaria_id,
        NULL::date AS fecha_objetivo,
        NULL::timestamp AS vence_en,
        NULL::text AS maquinaria_nombre,
        NULL::text AS serial,
        NULL::text AS foto_url
      FROM mensajes m
      WHERE m.receptor_id = $1
        AND (
          -- Si es alerta de falta de preop de HOY, solo mostrarla si aún no hizo preop hoy
          m.mensaje NOT LIKE '%No registraste preoperacional%'
          OR DATE(m.creado_en) <> CURRENT_DATE
          OR NOT EXISTS (
            SELECT 1 FROM preoperacionales p
            WHERE p.usuario_id = $1
              AND DATE(p.fecha) = CURRENT_DATE
          )
        )
      ORDER BY m.creado_en DESC
      `,
      [req.user.id]
    );

    const habilitacionesRes = await pool.query(
      `
      SELECT
        h.id,
        'habilitacion' AS tipo,
        h.mensaje,
        h.creado_en,
        DATE(h.creado_en) = CURRENT_DATE AS es_hoy,
        h.id AS habilitacion_id,
        h.maquinaria_id,
        h.fecha_objetivo,
        h.vence_en,
        m.nombre AS maquinaria_nombre,
        m.serial,
        m.foto_url
      FROM preoperacionales_habilitados h
      JOIN maquinaria m ON m.id = h.maquinaria_id
      WHERE h.usuario_id = $1
        AND h.activo = TRUE
        AND h.vence_en >= NOW()
      ORDER BY h.creado_en DESC
      `,
      [req.user.id]
    );

    const alertas = [
      ...habilitacionesRes.rows,
      ...mensajesRes.rows,
    ].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

    res.json(alertas);
  } catch (err) {
    console.error("ERROR cargando alertas del colaborador:", err);
    res.status(500).json({ message: "Error cargando alertas del colaborador." });
  }
});

router.get("/alertas/no-preoperacional-hoy", requireAuth, requireAdmin, async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT
        u.id,
        u.nombre,
        u.cargo,
        u.numero_documento
      FROM usuarios u
      JOIN roles r ON r.id = u.role_id
      WHERE r.nombre = 'colaborador'
        AND u.activo = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM preoperacionales p
          WHERE p.usuario_id = u.id
            AND DATE(p.fecha) = CURRENT_DATE
        )
      ORDER BY u.nombre ASC
      `
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR cargando alertas de no preoperacional:", err);
    res.status(500).json({ message: "Error cargando alertas de personal sin preoperacional." });
  }
});


/* =========================
   RESUMEN MENSUAL DE PREOPERACIONALES
========================= */
router.get("/:id/preoperacionales/resumen", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // El colaborador solo puede ver su propio resumen
    if (req.user.id !== id && req.user.rol !== "admin") {
      return res.status(403).json({ message: "No autorizado." });
    }

    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "El parámetro month debe tener formato YYYY-MM" });
    }

    const [year, mon] = month.split("-").map(Number);
    const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
    const nextMonthDate =
      mon === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(mon + 1).padStart(2, "0")}-01`;

    const userRes = await pool.query(
      `
      SELECT creado_en
      FROM usuarios
      WHERE id = $1
      `,
      [id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const creadoEn =
      userRes.rows[0].creado_en instanceof Date
        ? new Date(userRes.rows[0].creado_en)
        : new Date(userRes.rows[0].creado_en);

    creadoEn.setHours(0, 0, 0, 0);

    const resumen = {};
    const lastDay = new Date(year, mon, 0).getDate();

    for (let d = 1; d <= lastDay; d++) {
      const currentDate = new Date(year, mon - 1, d);
      currentDate.setHours(0, 0, 0, 0);

      const key = `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      if (currentDate < creadoEn) {
        resumen[key] = { estado: "bloqueado" };
      } else {
        resumen[key] = { estado: "no_realizado" };
      }
    }

    // días con preoperacionales realizados
    const realizados = await pool.query(
      `
      SELECT DATE(fecha) AS fecha
      FROM preoperacionales
      WHERE usuario_id = $1
        AND fecha >= $2::date
        AND fecha < $3::date
      GROUP BY DATE(fecha)
      `,
      [id, startDate, nextMonthDate]
    );

    for (const row of realizados.rows) {
      const fecha =
        row.fecha instanceof Date
          ? row.fecha.toISOString().slice(0, 10)
          : String(row.fecha).slice(0, 10);

      resumen[fecha] = { estado: "realizado" };
    }

    // días marcados como N/A
    const naRows = await pool.query(
      `
      SELECT fecha, motivo
      FROM novedades_preoperacional
      WHERE usuario_id = $1
        AND fecha >= $2::date
        AND fecha < $3::date
        AND estado = 'na'
      `,
      [id, startDate, nextMonthDate]
    );

    for (const row of naRows.rows) {
      const fecha =
        row.fecha instanceof Date
          ? row.fecha.toISOString().slice(0, 10)
          : String(row.fecha).slice(0, 10);

      resumen[fecha] = { estado: "na", motivo: row.motivo };
    }

    res.json({
      resumen,
      minMonth: creadoEn.toISOString().slice(0, 7),
    });


  } catch (err) {
    console.error("ERROR resumen mensual:", err);
    res.status(500).json({ message: "Error cargando resumen mensual" });
  }
});

/* =========================
   DETALLE DE PREOPERACIONALES DE UN DÍA
========================= */
router.get("/:id/preoperacionales", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "El parámetro date debe tener formato YYYY-MM-DD" });
    }

    const nextDateObj = new Date(date);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDate = nextDateObj.toISOString().slice(0, 10);

    const r = await pool.query(
      `
      SELECT
        p.id,
        p.fecha,
        TO_CHAR(p.fecha, 'HH24:MI') AS hora,
        p.cumple_general,
        p.observacion_general,
        m.nombre AS maquinaria_nombre,
        CASE
          WHEN p.cumple_general = TRUE THEN 'Cumple'
          ELSE 'No cumple'
        END AS estado_texto
      FROM preoperacionales p
      JOIN maquinaria m ON m.id = p.maquinaria_id
      WHERE p.usuario_id = $1
        AND p.fecha >= $2::date
        AND p.fecha < $3::date
      ORDER BY p.fecha ASC
      `,
      [id, date, nextDate]
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR detalle diario:", err);
    res.status(500).json({ message: "Error cargando detalle del día" });
  }
});

/* =========================
   ALERTA AUTOMÁTICA POR FALTA DE PREOPERACIONAL
   POST /api/usuarios/:id/alerta-falta-preop
========================= */
const alertaSchema = z.object({
  fecha: z.string().min(10),
});

router.post("/:id/alerta-falta-preop", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha } = alertaSchema.parse(req.body);


    const yaExiste = await pool.query(
      `
      SELECT 1
      FROM mensajes
      WHERE receptor_id = $1
        AND mensaje = $2
        AND DATE(creado_en) = CURRENT_DATE
      LIMIT 1
      `,
      [id, `No registraste preoperacional el día ${fecha}. Por favor revisa y reporta la novedad.`]
    );

    if (yaExiste.rowCount > 0) {
      return res.json({ ok: true, message: "La alerta ya fue enviada hoy." });
    }

    await pool.query(
      `
      INSERT INTO mensajes (emisor_id, receptor_id, mensaje)
      VALUES ($1, $2, $3)
      `,
      [
        req.user.id,
        id,
        `No registraste preoperacional el día ${fecha}. Por favor revisa y reporta la novedad.`,
      ]
    );

    res.json({ ok: true, message: "Alerta enviada correctamente." });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR enviando alerta:", err);
    res.status(500).json({ message: "Error enviando alerta" });
  }
});


router.post("/:id/preoperacionales/habilitar", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params; // usuario_id
    const data = habilitarPreopSchema.parse(req.body);

    const usuarioRes = await pool.query(
      `
      SELECT u.id, r.nombre AS rol
      FROM usuarios u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
        AND u.activo = TRUE
      LIMIT 1
      `,
      [id]
    );

    if (usuarioRes.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (usuarioRes.rows[0].rol !== "colaborador") {
      return res.status(400).json({ message: "Solo se puede habilitar a colaboradores." });
    }

    const maqRes = await pool.query(
      `
      SELECT id, nombre
      FROM maquinaria
      WHERE id = $1
        AND dado_baja = FALSE
      LIMIT 1
      `,
      [data.maquinaria_id]
    );

    if (maqRes.rowCount === 0) {
      return res.status(404).json({ message: "Maquinaria no encontrada." });
    }

    const yaExistePreop = await pool.query(
      `
      SELECT 1
      FROM preoperacionales
      WHERE usuario_id = $1
        AND maquinaria_id = $2
        AND DATE(fecha) = $3::date
      LIMIT 1
      `,
      [id, data.maquinaria_id, data.fecha]
    );

    if (yaExistePreop.rowCount > 0) {
      return res.status(400).json({
        message: "Ese preoperacional ya fue respondido para esa fecha.",
      });
    }

    await pool.query(
      `
      UPDATE preoperacionales_habilitados
      SET activo = FALSE
      WHERE usuario_id = $1
        AND maquinaria_id = $2
        AND fecha_objetivo = $3::date
        AND activo = TRUE
      `,
      [id, data.maquinaria_id, data.fecha]
    );

    const venceEn = new Date(Date.now() + 30 * 60 * 1000);

    const mensaje = `Se habilitó el preoperacional de la maquinaria ${maqRes.rows[0].nombre} para la fecha ${data.fecha} por 30 minutos.`;

    const insertRes = await pool.query(
      `
      INSERT INTO preoperacionales_habilitados
      (
        usuario_id,
        maquinaria_id,
        fecha_objetivo,
        habilitado_por,
        mensaje,
        activo,
        vence_en
      )
      VALUES ($1, $2, $3::date, $4, $5, TRUE, $6)
      RETURNING *
      `,
      [id, data.maquinaria_id, data.fecha, req.user.id, mensaje, venceEn]
    );

    res.json({
      ok: true,
      message: "Preoperacional habilitado por 30 minutos.",
      habilitacion: insertRes.rows[0],
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR habilitando preoperacional:", err);
    res.status(500).json({ message: "Error habilitando preoperacional." });
  }
});

/* =========================
   ENDPOINT PARA MARCAR N/A
========================= */

const naSchema = z.object({
  fecha: z.string().min(10),
  motivo: z.string().optional(),
});

router.post("/:id/preoperacionales/na", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, motivo } = naSchema.parse(req.body);

    const existeRealizado = await pool.query(
      `
      SELECT 1
      FROM preoperacionales
      WHERE usuario_id = $1
        AND DATE(fecha) = $2::date
      LIMIT 1
      `,
      [id, fecha]
    );

    if (existeRealizado.rowCount > 0) {
      return res.status(400).json({
        message: "Ese día ya tiene preoperacionales realizados. No se puede marcar como N/A.",
      });
    }

    await pool.query(
      `
      INSERT INTO novedades_preoperacional (usuario_id, fecha, estado, motivo, creado_por)
      VALUES ($1, $2, 'na', $3, $4)
      ON CONFLICT (usuario_id, fecha)
      DO UPDATE SET
        estado = 'na',
        motivo = EXCLUDED.motivo,
        creado_por = EXCLUDED.creado_por,
        creado_en = NOW()
      `,
      [id, fecha, motivo ?? null, req.user.id]
    );

    res.json({ ok: true, message: "Día marcado como N/A correctamente." });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR marcando N/A:", err);
    res.status(500).json({ message: "Error marcando día como N/A" });
  }
});


// ✅ NUEVO schema - COPIA ESTO EXACTO
const editarUsuarioColabSchema = z.object({
  direccion: z.string().optional(),
  foto_url: z.string().nullable().optional(),
}).passthrough();

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id && req.user.rol !== "admin") {
      return res.status(403).json({ message: "No autorizado" });
    }

    const data = editarUsuarioColabSchema.parse(req.body);

    const updates = [];
    const params = [];
    let i = 1;

    if (data.direccion !== undefined) {
      updates.push(`direccion = $${i}`);
      params.push(data.direccion);
      i++;
    }
    if (data.foto_url !== undefined) {
      updates.push(`foto_url = $${i}`);
      params.push(data.foto_url);
      i++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "Sin datos para actualizar" });
    }

    params.push(id);
    const query = `UPDATE usuarios SET ${updates.join(", ")} WHERE id = $${i} RETURNING id, direccion`;

    console.log("🔧 SQL:", query);
    console.log("🔧 PARAMS:", params);

    const result = await pool.query(query, params);
    res.json({ message: "OK", user: result.rows[0] });
  } catch (err) {
    console.error("❌ ERROR PUT:", err);
    if (err.name === "ZodError") {
      console.log("🔍 ZOD:", err.issues);
      return res.status(400).json({ error: "Zod", issues: err.issues });
    }
    res.status(500).json({ error: err.message });
  }
});


/* =========================
   ELIMINAR COLABORADOR (ELIMINACIÓN LÓGICA)
   DELETE /api/usuarios/:id
========================= */
const deleteSchema = z.object({
  code: z.string().min(6),
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    deleteSchema.parse(req.body);

    const existe = await pool.query(
      `
      SELECT id, nombre, cargo, numero_documento, activo
      FROM usuarios
      WHERE id = $1
      `,
      [id]
    );

    if (existe.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const usuario = existe.rows[0];

    if (usuario.activo === false) {
      return res.status(400).json({
        message: "Este usuario ya fue desactivado.",
      });
    }

    if (req.user.id === id) {
      return res.status(400).json({
        message: "No puedes desactivar tu propio usuario desde esta opción.",
      });
    }

    // contraseña imposible para bloquear acceso
    const randomPassword = await bcrypt.hash(`eliminado_${Date.now()}`, 10);

    const r = await pool.query(
      `
      UPDATE usuarios
      SET
        activo = FALSE,
        eliminado_en = NOW(),
        nombre = '[Usuario desactivado]',
        cargo = COALESCE(cargo, 'Sin cargo'),
        direccion = COALESCE(direccion, 'Sin dirección'),
        foto_url = NULL,
        correo = NULL,
        password_hash = $1
      WHERE id = $2
      RETURNING id, nombre, activo
      `,
      [randomPassword, id]
    );

    res.json({
      ok: true,
      message: "Usuario desactivado correctamente. Se conservó su historial y se bloqueó el acceso a la plataforma.",
      user: r.rows[0],
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR eliminando usuario:", err);
    res.status(500).json({ message: "Error desactivando usuario." });
  }
});



export default router;