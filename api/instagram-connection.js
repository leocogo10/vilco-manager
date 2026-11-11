import { verifySession } from "../lib/auth.js";
import { instagramEnvironmentStatus, setInstagramConnectionStatus } from "../lib/instagram.js";
import { buildUnifiedInstagramLoginUrl, createInstagramOAuthState } from "../lib/instagram-core.js";

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");

  if (!verifySession(req)) {
    return jsonError(res, 401, "Ingresá a VILCO para administrar la conexión de Instagram.");
  }

  if (req.method === "GET") {
    if (String(req.query && req.query.action || "") !== "connect") {
      return jsonError(res, 400, "Indicá la acción de conexión.");
    }
    const setup = instagramEnvironmentStatus();
    if (!setup.ready) {
      return res.status(503).json({
        error: "La configuración segura de Instagram todavía está incompleta.",
        setupRequired: true,
        missingConfiguration: setup.missing.filter((item) =>
          item !== "META_TOKEN_ENCRYPTION_KEY" && item !== "VILCO_SESSION_SECRET"
        ),
      });
    }
    try {
      const { state, cookieValue } = createInstagramOAuthState(process.env.VILCO_SESSION_SECRET);
      res.setHeader(
        "Set-Cookie",
        "vilco_instagram_state=" + encodeURIComponent(cookieValue) +
          "; Path=/api/meta-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600"
      );
      const url = buildUnifiedInstagramLoginUrl({
        appId: process.env.META_APP_ID,
        configId: process.env.META_CONFIG_ID,
        redirectUri: process.env.META_REDIRECT_URI,
        state,
      });
      return res.status(200).json({ url });
    } catch {
      return jsonError(res, 503, "No se pudo preparar el acceso seguro de Instagram.");
    }
  }

  if (req.method === "POST") {
    if (String(req.query && req.query.action || "disconnect") !== "disconnect") {
      return jsonError(res, 400, "Acción de Instagram no válida.");
    }
    try {
      await setInstagramConnectionStatus("disconnected");
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("VILCO Instagram disconnect failed:", error && error.name || "Error");
      return jsonError(res, 502, "No se pudo desconectar Instagram.");
    }
  }

  res.setHeader("Allow", "GET, POST");
  return jsonError(res, 405, "Método no permitido.");
}
