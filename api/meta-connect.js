import crypto from "node:crypto";
import { metaConfigurationReady, META_GRAPH_VERSION } from "./_meta.js";
import { verifySession } from "./_auth.js";

function cookieSignature(value) {
  return crypto.createHmac("sha256", process.env.VILCO_SESSION_SECRET).update(value).digest("hex");
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido." });
  }
  if (!verifySession(req)) return res.status(401).json({ error: "Tu sesión de VILCO venció. Ingresá de nuevo y volvé a conectar Meta." });
  if (!process.env.VILCO_SESSION_SECRET || !metaConfigurationReady()) {
    return res.status(503).json({ error: "Falta completar la configuración segura de Meta en el entorno Preview de Vercel." });
  }

  const state = crypto.randomBytes(32).toString("base64url");
  const signedState = state + "." + cookieSignature(state);
  res.setHeader("Set-Cookie", "vilco_meta_state=" + encodeURIComponent(signedState) + "; Path=/api/meta-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600");

  const authorize = new URL(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`);
  authorize.searchParams.set("client_id", process.env.META_APP_ID);
  authorize.searchParams.set("redirect_uri", process.env.META_REDIRECT_URI);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("scope", [
    "pages_show_list",
    "pages_read_engagement",
    "read_insights",
    "instagram_basic",
    "instagram_manage_insights",
  ].join(","));
  return res.status(200).json({ url: authorize.toString() });
}

