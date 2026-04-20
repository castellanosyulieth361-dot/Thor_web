import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();


// Crear grupo
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {

    const { nombre } = req.body;

    const result = await pool.query(
      "INSERT INTO grupos_maquinaria (nombre) VALUES ($1) RETURNING *",
      [nombre]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creando grupo" });
  }
});

// Listar grupos
router.get("/", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT
        id,
        nombre
      FROM grupos_maquinaria
      ORDER BY nombre ASC
      `
    );

    res.json(r.rows);
  } catch (err) {
    console.error("ERROR listando grupos:", err);
    res.status(500).json({ message: "Error listando grupos." });
  }
});

//Eliminar Grupo
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const uso = await pool.query(
      `SELECT 1 FROM maquinaria WHERE grupo_id = $1 LIMIT 1`,
      [id]
    );

    if (uso.rowCount > 0) {
      return res.status(400).json({
        message: "No se puede eliminar el grupo porque tiene maquinaria asociada.",
      });
    }

    const r = await pool.query(
      `DELETE FROM grupos_maquinaria WHERE id = $1 RETURNING *`,
      [id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Grupo no existe." });
    }

    res.json({ ok: true, message: "Grupo eliminado correctamente." });
  } catch (err) {
    console.error("ERROR eliminando grupo:", err);
    res.status(500).json({ message: "Error eliminando grupo" });
  }
});

export default router;