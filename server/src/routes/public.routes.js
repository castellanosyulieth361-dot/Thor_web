import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// Obtener maquinaria + formulario + preguntas por QR token
router.get("/maquinaria/qr/:qrToken", async (req, res) => {
  try {
    const { qrToken } = req.params;

    const maqRes = await pool.query(
      `SELECT m.id, m.nombre, m.serial, m.marca, m.modelo, m.foto_url, m.estado, m.dado_baja,
              m.qr_token, m.formulario_id, g.nombre AS grupo
       FROM maquinaria m
       JOIN grupos_maquinaria g ON g.id = m.grupo_id
       WHERE m.qr_token = $1`,
      [qrToken]
    );

    const maq = maqRes.rows[0];
    if (!maq) return res.status(404).json({ message: "QR no válido" });

    const formRes = await pool.query(
      `SELECT id, nombre FROM formularios WHERE id = $1`,
      [maq.formulario_id]
    );

    const preguntasRes = await pool.query(
      `SELECT id, enunciado, orden
       FROM formulario_preguntas
       WHERE formulario_id = $1 AND activa = true
       ORDER BY orden ASC`,
      [maq.formulario_id]
    );

    res.json({
      maquinaria: maq,
      formulario: formRes.rows[0],
      preguntas: preguntasRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error consultando QR" });
  }
});

export default router;