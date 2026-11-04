import { verifySession } from "./_auth.js";
import { setInstagramConnectionStatus } from "./_instagram.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }
  if (!verifySession(req)) return res.status(401).json({ error: "Ingresá a VILCO para desconectar Instagram." });
  try {
    await setInstagramConnectionStatus("disconnected");
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("VILCO Instagram disconnect failed:", error && error.name || "Error");
    return res.status(502).json({ error: "No se pudo desconectar Instagram." });
  }
}
