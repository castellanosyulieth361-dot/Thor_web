import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import pg from "pg";

import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import maquinariaRoutes from "./routes/maquinaria.routes.js";
import formulariosRoutes from "./routes/formularios.routes.js";
import gruposRoutes from "./routes/grupos.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import preoperacionalesRoutes from "./routes/preoperacionales.routes.js";
import publicRoutes from "./routes/public.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import alertasRoutes from "./routes/alertas.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

if (process.env.NODE_ENV === "production") {
  console.log = () => {}; // Silencia console.log en prod
}

// const pool = new pg.Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }
// });

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Permitir requests sin origen (Postman, apps móviles nativas, curl)
//       if (!origin) return callback(null, true);
//       if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
//       callback(new Error(`Origen no permitido: ${origin}`));
//     },
//     credentials: true,
//   })
// );

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// ── BODY PARSERS ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máx 10 intentos por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos de inicio de sesión. Espera 15 minutos.",
  },
});

// ── STATIC ────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ ok: true }));

// ── RUTAS ─────────────────────────────────────────────────────────────────────
app.use("/api/auth/login", loginLimiter); // rate limit solo al login
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/maquinaria", maquinariaRoutes);
app.use("/api/formularios", formulariosRoutes);
app.use("/api/grupos", gruposRoutes);
app.use("/api/preoperacionales", preoperacionalesRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/alertas", alertasRoutes);
app.use("/api/reportes", reportesRoutes);

// ── ERROR HANDLER GLOBAL ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // CORS error
  if (err.message?.startsWith("Origen no permitido")) {
    return res.status(403).json({ message: err.message });
  }
  console.error("ERROR no manejado:", err);
  res.status(500).json({ message: "Error interno del servidor." });
});

// ── ARRANQUE ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

import { pool } from "./db.js";

async function runMigrations() {
  try {
    // Agregar columna reporte_id a mensajes si no existe (para alertas de reportes)
    await pool.query(`
      ALTER TABLE mensajes
      ADD COLUMN IF NOT EXISTS reporte_id INTEGER REFERENCES reportes_observacion(id) ON DELETE CASCADE
    `);
    console.log("Migraciones OK");
  } catch (err) {
    console.error("Error en migraciones:", err.message);
  }
}

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`API en puerto ${PORT}`);
  await runMigrations();
});
