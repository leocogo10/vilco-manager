import { deleteMetaConnection } from "./_meta.js";
import { verifySession } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }
  if (!verifySession(req)) return res.status(401).json({ error: "Tu sesión de VILCO venció. Ingresá de nuevo para desconectar Meta." });
  try {
    await deleteMetaConnection();
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("VILCO Meta disconnect failed:", error?.name || "Error");
    return res.status(502).json({ error: "No se pudo desconectar Meta." });
  }
}

