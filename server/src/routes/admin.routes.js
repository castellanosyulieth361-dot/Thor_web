import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// prueba básica con token
router.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// prueba solo admin
router.get("/only-admin", requireAuth, requireAdmin, (req, res) => {
  res.json({ ok: true, message: "Eres admin ✅" });
});

export default router;