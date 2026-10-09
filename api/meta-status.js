import { verifySession } from "./_auth.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido." });
  }
  if (!verifySession(req)) return res.status(401).json({ error: "Iniciá sesión en VILCO MANAGER." });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    configured: Boolean(process.env.MODEL_API_KEY),
    provider: "Meta Model API",
    chatModel: "muse-spark-1.3",
    imageModel: "muse-image-1.0"
  });
}
