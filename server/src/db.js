import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// Soporta DATABASE_URL (Railway/prod) o variables individuales (dev local)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    }
  : {
      host:     process.env.DB_HOST     || "localhost",
      port:     Number(process.env.DB_PORT) || 5432,
      user:     process.env.DB_USER     || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME     || "thor_db",
    };

export const pool = new pg.Pool(poolConfig);
