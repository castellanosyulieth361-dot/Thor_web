import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

/* =========================
   1) Crear formulario / preoperacional
========================= */
const crearFormularioSchema = z.object({
  nombre: z.string().min(2),
  // serial: z.string().min(2),
  // marca: z.string().min(2),
  // modelo: z.string().min(2),
  // foto_url: z.string().min(1),
  // grupo_id: z.number().int().positive(),
  // formulario_id: z.string().uuid()
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre } = crearFormularioSchema.parse(req.body);

    const r = await pool.query(
      `INSERT INTO formularios (nombre)
       VALUES ($1)
       RETURNING *`,
      [nombre.trim()]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR creando formulario:", err);
    res.status(500).json({ message: "Error creando formulario" });
  }
});

/* =========================
   2) Listar formularios
========================= */
router.get("/", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, nombre, creado_en
       FROM formularios
       ORDER BY creado_en DESC`
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR listando formularios:", err);
    res.status(500).json({ message: "Error listando formularios" });
  }
});

/* =========================
   3) Obtener formulario con preguntas
========================= */
router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const formRes = await pool.query(
      `SELECT id, nombre, creado_en
       FROM formularios
       WHERE id = $1`,
      [id]
    );

    const form = formRes.rows[0];
    if (!form) {
      return res.status(404).json({ message: "Formulario no existe" });
    }

    const pregRes = await pool.query(
      `SELECT id, enunciado, orden, activa
       FROM formulario_preguntas
       WHERE formulario_id = $1
       ORDER BY orden ASC`,
      [id]
    );

    res.json({
      formulario: form,
      preguntas: pregRes.rows,
    });
  } catch (err) {
    console.error("ERROR obteniendo formulario:", err);
    res.status(500).json({ message: "Error obteniendo formulario" });
  }
});

/* =========================
   4) Agregar pregunta
========================= */
const crearPreguntaSchema = z.object({
  enunciado: z.string().min(2),
  orden: z.number().int().positive().optional(),
});

router.post("/:id/preguntas", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { enunciado, orden } = crearPreguntaSchema.parse(req.body);

    let finalOrden = orden;

    if (!finalOrden) {
      const maxRes = await pool.query(
        `SELECT COALESCE(MAX(orden), 0) AS max
         FROM formulario_preguntas
         WHERE formulario_id = $1`,
        [id]
      );
      finalOrden = Number(maxRes.rows[0].max) + 1;
    }

    const r = await pool.query(
      `INSERT INTO formulario_preguntas (formulario_id, enunciado, orden)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, enunciado.trim(), finalOrden]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR creando pregunta:", err);
    res.status(500).json({ message: "Error creando pregunta" });
  }
});

/* =========================
   5) Editar pregunta
========================= */
const editarPreguntaSchema = z.object({
  enunciado: z.string().min(2).optional(),
  orden: z.number().int().positive().optional(),
});

router.put("/:formId/preguntas/:pregId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { formId, pregId } = req.params;
    const { enunciado, orden } = editarPreguntaSchema.parse(req.body);

    const r = await pool.query(
      `UPDATE formulario_preguntas
       SET enunciado = COALESCE($1, enunciado),
           orden = COALESCE($2, orden)
       WHERE id = $3 AND formulario_id = $4
       RETURNING *`,
      [enunciado?.trim() ?? null, orden ?? null, pregId, formId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Pregunta no existe" });
    }

    res.json(r.rows[0]);
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({
        message: "Datos inválidos",
        issues: err.issues,
      });
    }

    console.error("ERROR editando pregunta:", err);
    res.status(500).json({ message: "Error editando pregunta" });
  }
});

/* =========================
   6) Activar / desactivar pregunta
========================= */
router.patch("/:formId/preguntas/:pregId/activa", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { formId, pregId } = req.params;
    const { activa } = req.body;

    const r = await pool.query(
      `UPDATE formulario_preguntas
       SET activa = $1
       WHERE id = $2 AND formulario_id = $3
       RETURNING *`,
      [Boolean(activa), pregId, formId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Pregunta no existe" });
    }

    res.json(r.rows[0]);
  } catch (err) {
    console.error("ERROR activando/inactivando pregunta:", err);
    res.status(500).json({ message: "Error actualizando estado de la pregunta" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const uso = await pool.query(
      `SELECT 1 FROM maquinaria WHERE formulario_id = $1 LIMIT 1`,
      [id]
    );

    if (uso.rowCount > 0) {
      return res.status(400).json({
        message: "No se puede eliminar porque este preoperacional está asignado a una maquinaria.",
      });
    }

    const r = await pool.query(
      `DELETE FROM formularios WHERE id = $1 RETURNING *`,
      [id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Preoperacional no existe." });
    }

    res.json({ ok: true, message: "Preoperacional eliminado correctamente." });
  } catch (err) {
    console.error("ERROR eliminando formulario:", err);
    res.status(500).json({ message: "Error eliminando preoperacional" });
  }
});

export default router;