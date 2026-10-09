import { verifySession } from "./_auth.js";

const SUPABASE_URL = "https://budnbinxfwgkcfgawlsa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ROW_URL = SUPABASE_URL + "/rest/v1/vilco_app_state";
const APP_KEY = "workspace";

export const config = { api: { bodyParser: { sizeLimit: "3mb" } } };

function headers(prefer) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function replyError(res, status, message) {
  return res.status(status).json({ error: message });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");

  if (!verifySession(req)) return replyError(res, 401, "Ingresá la contraseña de VILCO para continuar.");
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return replyError(res, 503, "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el entorno seguro de Vercel.");
  }
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return replyError(res, 405, "Método no permitido.");
  }

  try {
    if (req.method === "GET") {
      const response = await fetch(ROW_URL + "?app_key=eq." + APP_KEY + "&select=data,updated_at", {
        headers: headers(),
        cache: "no-store",
      });
      if (!response.ok) {
        console.error("VILCO cloud state read failed:", response.status);
        return replyError(res, 502, "No se pudo leer el espacio compartido.");
      }
      const rows = await response.json();
      const row = rows[0];
      return res.status(200).json({ state: row ? row.data : null, updatedAt: row ? row.updated_at : null });
    }

    const state = req.body && req.body.state;
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      return replyError(res, 400, "El estado de VILCO no tiene un formato válido.");
    }
    const bytes = Buffer.byteLength(JSON.stringify(state), "utf8");
    if (bytes > 2_800_000) {
      return replyError(res, 413, "Los datos superan el límite de sincronización. Volvé a subir los archivos para guardarlos en la nube.");
    }

    const response = await fetch(ROW_URL + "?on_conflict=app_key", {
      method: "POST",
      headers: headers("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify([{ app_key: APP_KEY, data: state, updated_at: new Date().toISOString() }]),
    });
    if (!response.ok) {
      console.error("VILCO cloud state write failed:", response.status);
      return replyError(res, 502, "No se pudieron guardar los cambios en la nube.");
    }
    const rows = await response.json();
    const row = rows[0];
    return res.status(200).json({ ok: true, updatedAt: row ? row.updated_at : new Date().toISOString() });
  } catch (error) {
    console.error("VILCO cloud state request failed:", error?.message || "unknown error");
    return replyError(res, 502, "No se pudo conectar con el almacenamiento compartido.");
  }
}
