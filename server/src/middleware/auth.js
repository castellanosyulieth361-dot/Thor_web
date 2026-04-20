import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Falta token (Authorization: Bearer ...)" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, rol, numero_documento }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.rol !== "admin") {
    return res.status(403).json({ message: "Acceso solo para admin" });
  }
  next();
}
      