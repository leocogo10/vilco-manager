import { checkPassword, createSessionCookie } from "./_auth.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }
  if (!process.env.VILCO_MANAGER_PASSWORD || !process.env.VILCO_SESSION_SECRET) {
    return res.status(503).json({ error: "Falta configurar VILCO_MANAGER_PASSWORD y VILCO_SESSION_SECRET en Vercel para habilitar el acceso seguro." });
  }
  const password = req.body && typeof req.body.password === "string" ? req.body.password : "";
  if (!checkPassword(password)) return res.status(401).json({ error: "Clave incorrecta." });
  res.setHeader("Set-Cookie", createSessionCookie());
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true });
}
