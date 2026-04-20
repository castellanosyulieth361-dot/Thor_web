import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

/* =========================
   ALERTAS DE FALLOS
========================= */
router.get("/fallos", requireAuth, requireAdmin, async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT
        pr.id,
        p.id AS preoperacional_id,
        DATE(p.fecha) AS fecha,
        TO_CHAR(p.fecha, 'YYYY-MM-DD HH24:MI') AS fecha_texto,
        m.id AS maquinaria_id,
        m.nombre AS maquinaria_nombre,
        m.serial,
        m.modelo,
        u.nombre AS colaborador_nombre,
        fp.enunciado AS item_fallido,
        pr.observacion,
        pr.foto_url
      FROM preoperacional_respuestas pr
      JOIN preoperacionales p ON p.id = pr.preoperacional_id
      JOIN maquinaria m ON m.id = p.maquinaria_id
      JOIN usuarios u ON u.id = p.usuario_id
      JOIN formulario_preguntas fp ON fp.id = pr.pregunta_id
      WHERE pr.cumple = FALSE
        -- La maquinaria no debe estar dada de baja
        AND m.dado_baja = FALSE
        -- No debe existir ningún control posterior o igual a la fecha del fallo
        AND NOT EXISTS (
          SELECT 1
          FROM maquinaria_eventos e
          WHERE e.maquinaria_id = p.maquinaria_id
            AND e.tipo = 'control'
            AND e.fecha >= DATE(p.fecha)
        )
      ORDER BY p.fecha DESC
      `
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR cargando alertas de fallos:", err);
    res.status(500).json({ message: "Error cargando alertas." });
  }
});

/* =========================
   ALERTAS SIN PREOPERACIONAL
========================= */
router.get("/sin-preoperacional-hoy", requireAuth, requireAdmin, async (req, res) => {
  try {
    const ahora = new Date();
    const hora = ahora.getHours();

    if (hora < 7) {
      return res.json([]);
    }

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

        -- ❌ NO tiene preoperacional hoy
        AND NOT EXISTS (
          SELECT 1
          FROM preoperacionales p
          WHERE p.usuario_id = u.id
            AND DATE(p.fecha) = CURRENT_DATE
        )

        -- ❌ NO está marcado como N/A hoy
        AND NOT EXISTS (
          SELECT 1
          FROM novedades_preoperacional n
          WHERE n.usuario_id = u.id
            AND DATE(n.fecha) = CURRENT_DATE
            AND n.estado = 'na'
        )

      ORDER BY u.nombre ASC
      `
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR cargando alertas:", err);
    res.status(500).json({ message: "Error cargando alertas." });
  }
});

export default router;