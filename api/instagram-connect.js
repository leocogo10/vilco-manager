import { verifySession } from "./_auth.js";
import { instagramEnvironmentStatus } from "./_instagram.js";
import { buildUnifiedInstagramLoginUrl, createInstagramOAuthState } from "./_instagram-core.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido." });
  }
  if (!verifySession(req)) return res.status(401).json({ error: "Ingresá a VILCO para conectar Instagram." });
  const setup = instagramEnvironmentStatus();
  if (!setup.ready) {
    return res.status(503).json({
      error: "La configuración segura de Instagram todavía está incompleta.",
      setupRequired: true,
      missingConfiguration: setup.missing.filter((item) => item !== "META_TOKEN_ENCRYPTION_KEY" && item !== "VILCO_SESSION_SECRET"),
    });
  }
  try {
    const { state, cookieValue } = createInstagramOAuthState(process.env.VILCO_SESSION_SECRET);
    res.setHeader("Set-Cookie", "vilco_instagram_state=" + encodeURIComponent(cookieValue) + "; Path=/api/meta-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600");
    const url = buildUnifiedInstagramLoginUrl({
      appId: process.env.META_APP_ID,
      configId: process.env.META_CONFIG_ID,
      redirectUri: process.env.META_REDIRECT_URI,
      state,
    });
    return res.status(200).json({ url });
  } catch {
    return res.status(503).json({ error: "No se pudo preparar el acceso seguro de Instagram." });
  }
}
