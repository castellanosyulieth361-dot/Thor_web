import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const registerAdminSchema = z.object({
  nombre: z.string().min(2),
  cargo: z.string().min(2),
  fecha_ingreso: z.string().min(8),
  tipo_contrato: z.string().min(2),
  rh: z.string().min(1),
  direccion: z.string().min(3),
  numero_documento: z.string().min(5),
  foto_url: z.string().optional(),
  correo: z.string().email().optional(),
});

router.post("/register-admin", async (req, res) => {
  try {
    const data = registerAdminSchema.parse(req.body);

    const rolRes = await pool.query("SELECT id FROM roles WHERE nombre = $1", ["admin"]);
    const roleId = rolRes.rows[0]?.id;
    if (!roleId) return res.status(500).json({ message: "Rol admin no existe" });

    const existe = await pool.query(
      "SELECT 1 FROM usuarios WHERE numero_documento=$1",
      [data.numero_documento]
    );
    if (existe.rowCount > 0) {
      return res.status(409).json({ message: "Ya existe un usuario con ese documento" });
    }

    const password_hash = await bcrypt.hash(data.numero_documento, 10);

    const insert = await pool.query(
      `INSERT INTO usuarios
        (nombre, cargo, fecha_ingreso, tipo_contrato, rh, direccion, numero_documento, foto_url, correo, password_hash, role_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, nombre, numero_documento`,
      [
        data.nombre, data.cargo, data.fecha_ingreso, data.tipo_contrato,
        data.rh, data.direccion, data.numero_documento,
        data.foto_url ?? null, data.correo ?? null, password_hash, roleId,
      ]
    );

    return res.status(201).json({ user: insert.rows[0] });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ message: "Datos inválidos", issues: err.issues });
    }
    console.error("ERROR register-admin:", err);
    return res.status(500).json({ message: "Error registrando admin" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { numero_documento, password } = req.body;

    if (!numero_documento || !password) {
      return res.status(400).json({ message: "Faltan credenciales." });
    }

    const userRes = await pool.query(
      `SELECT u.id, u.nombre, u.cargo, u.numero_documento, u.foto_url, 
              u.password_hash, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.role_id
       WHERE u.numero_documento = $1 AND u.activo = TRUE`,
      [numero_documento]
    );

    const user = userRes.rows[0];
    if (!user) {
      return res.status(401).json({ message: "Credenciales incorrectas." });
    }

    let ok = false;

    if (user.rol === "admin") {
      // ✅ Password del admin viene del .env — nunca hardcodeado
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.error("ERROR: ADMIN_PASSWORD no está definido en .env");
        return res.status(500).json({ message: "Error de configuración del servidor." });
      }
      ok = password === adminPassword;
    } else {
      ok = await bcrypt.compare(password, user.password_hash);
    }

    if (!ok) {
      return res.status(401).json({ message: "Credenciales incorrectas." });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol, numero_documento: user.numero_documento },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }   // 12h para cubrir turnos largos
    );

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        cargo: user.cargo,        // ✅ AGREGADO
        numero_documento: user.numero_documento,
        foto_url: user.foto_url,  // ✅ AGREGADO
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error("ERROR login:", err);
    res.status(500).json({ message: "Error iniciando sesión." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT u.id, u.nombre, u.cargo, u.fecha_ingreso, u.tipo_contrato,
              u.rh, u.direccion, u.numero_documento, u.foto_url, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.json({ user: r.rows[0] });
  } catch (err) {
    console.error("ERROR /auth/me:", err);
    res.status(500).json({ message: "Error cargando usuario actual." });
  }
});

export default router;
