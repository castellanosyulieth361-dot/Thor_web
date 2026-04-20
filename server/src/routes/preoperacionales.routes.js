import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const schema = z.object({
  maquinaria_id: z.string().uuid(),
  habilitacion_id: z.string().uuid().optional(),
  fecha_objetivo: z.string().optional(),
  ubicacion: z.enum(["bodega_98", "campo"]),
  ciudad: z.string().optional().default(""),
  respuestas: z.array(
    z.object({
      pregunta_id: z.string().uuid(),
      cumple: z.boolean(),
      observacion: z.string().optional().default(""),
      foto_url: z.string().optional().default(""),
    })
  ).min(1),
});

router.post("/", requireAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    const data = schema.parse(req.body);

    for (const r of data.respuestas) {
      if (r.cumple === false) {
        const obs = (r.observacion ?? "").trim();
        const foto = (r.foto_url ?? "").trim();

        if (!obs && !foto) {
          return res.status(400).json({
            message: "Si una pregunta es 'No cumple', debes enviar observación o foto.",
          });
        }
      }
    }

    // Validar estado actual de la maquinaria
    const maqRes = await client.query(
      `
      SELECT id, estado, dado_baja
      FROM maquinaria
      WHERE id = $1
      `,
      [data.maquinaria_id]
    );

    const maq = maqRes.rows[0];

    if (!maq) {
      return res.status(404).json({ message: "Maquinaria no encontrada." });
    }

    if (maq.dado_baja || maq.estado === "dado_baja") {
      return res.status(400).json({ message: "La maquinaria fue dada de baja." });
    }

    if (maq.estado === "mantenimiento") {
      return res.status(400).json({ message: "La maquinaria está en mantenimiento." });
    }

    if (maq.estado === "no_disponible") {
      return res.status(400).json({ message: "La maquinaria no está disponible." });
    }

    let fechaSql = null;
    let fechaSolo = null;
    let habilitacion = null;

    const ahora = new Date();
    const horaActual = [
      String(ahora.getHours()).padStart(2, "0"),
      String(ahora.getMinutes()).padStart(2, "0"),
      String(ahora.getSeconds()).padStart(2, "0"),
    ].join(":");

    if (data.habilitacion_id) {
      const habRes = await client.query(
        `
    SELECT *
    FROM preoperacionales_habilitados
    WHERE id = $1
      AND usuario_id = $2
      AND maquinaria_id = $3
      AND activo = TRUE
      AND vence_en >= NOW()
    LIMIT 1
    `,
        [data.habilitacion_id, req.user.id, data.maquinaria_id]
      );

      habilitacion = habRes.rows[0];

      if (!habilitacion) {
        return res.status(400).json({
          message: "La habilitación ya venció o no existe.",
        });
      }

      fechaSolo =
        habilitacion.fecha_objetivo instanceof Date
          ? habilitacion.fecha_objetivo.toISOString().slice(0, 10)
          : String(habilitacion.fecha_objetivo).slice(0, 10);

      // conserva el día habilitado, pero con la hora real en que respondió
      fechaSql = `${fechaSolo} ${horaActual}`;
    } else {
      fechaSolo = [
        ahora.getFullYear(),
        String(ahora.getMonth() + 1).padStart(2, "0"),
        String(ahora.getDate()).padStart(2, "0"),
      ].join("-");

      fechaSql = ahora;
    }

    // Validar un solo preoperacional por día para esa maquinaria
    const existeFecha = await client.query(
      `
      SELECT 1
      FROM preoperacionales
      WHERE maquinaria_id = $1
        AND DATE(fecha) = $2::date
      LIMIT 1
      `,
      [data.maquinaria_id, fechaSolo]
    );

    if (existeFecha.rowCount > 0) {
      return res.status(400).json({
        message: `Esta maquinaria ya tiene un preoperacional registrado para la fecha ${fechaSolo}.`,
      });
    }

    const cumple_general = data.respuestas.every((r) => r.cumple === true);

    await client.query("BEGIN");

    const preRes = await client.query(
      `
      INSERT INTO preoperacionales
        (maquinaria_id, usuario_id, fecha, cumple_general, observacion_general, ubicacion, ciudad)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, fecha, cumple_general
      `,
      [
        data.maquinaria_id,
        req.user.id,
        fechaSql,
        cumple_general,
        null,
        data.ubicacion,
        data.ciudad ?? null,
      ]
    );

    const preId = preRes.rows[0].id;

    for (const r of data.respuestas) {
      await client.query(
        `
        INSERT INTO preoperacional_respuestas
          (preoperacional_id, pregunta_id, cumple, observacion, foto_url)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          preId,
          r.pregunta_id,
          r.cumple,
          r.observacion ?? null,
          r.foto_url ?? null,
        ]
      );
    }

    // Si fue habilitación, consumirla
    if (habilitacion) {
      await client.query(
        `
        UPDATE preoperacionales_habilitados
        SET activo = FALSE
        WHERE id = $1
        `,
        [data.habilitacion_id]
      );
    }

    if (!cumple_general) {
      await client.query(
        `UPDATE maquinaria SET estado = 'no_disponible' WHERE id = $1`,
        [data.maquinaria_id]
      );

      await client.query(
        `INSERT INTO maquinaria_historial (maquinaria_id, usuario_id, accion, descripcion)
     VALUES ($1, $2, $3, $4)`,
        [data.maquinaria_id, req.user.id, "no_disponible",
        `La maquinaria fue deshabilitada automáticamente por fallo en preoperacional del día ${fechaSolo}.`]
      );

      await client.query(
        `INSERT INTO maquinaria_estado_dia
       (maquinaria_id, fecha, estado, observacion, actualizado_por)
     VALUES ($1, $2::date, 'no_disponible', $3, $4)
     ON CONFLICT (maquinaria_id, fecha) DO UPDATE SET
       estado = EXCLUDED.estado,
       observacion = EXCLUDED.observacion,
       actualizado_por = EXCLUDED.actualizado_por,
       actualizado_en = NOW()`,
        [data.maquinaria_id, fechaSolo,
        `Cambio automático por fallo en preoperacional del día ${fechaSolo}.`, req.user.id]
      );
    } else {
      // Preoperacional correcto: registrar el día como "ok" para que el calendario lo muestre
      await client.query(
        `INSERT INTO maquinaria_estado_dia
       (maquinaria_id, fecha, estado, observacion, actualizado_por)
     VALUES ($1, $2::date, 'ok', $3, $4)
     ON CONFLICT (maquinaria_id, fecha) DO UPDATE SET
       estado = EXCLUDED.estado,
       observacion = EXCLUDED.observacion,
       actualizado_por = EXCLUDED.actualizado_por,
       actualizado_en = NOW()`,
        [data.maquinaria_id, fechaSolo,
        `Preoperacional correcto del día ${fechaSolo}.`, req.user.id]
      );
    }



    await client.query("COMMIT");


    res.status(201).json({
      preoperacional: preRes.rows[0],
      debilitada: !cumple_general,
      fecha_registrada: fechaSolo,
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch { }

    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR guardando preoperacional:", err);
    res.status(500).json({ message: "Error guardando preoperacional" });
  } finally {
    client.release();
  }
});

export default router;