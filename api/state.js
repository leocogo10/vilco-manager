import { verifySession } from "../lib/auth.js";
import { getDatabase, usesNeonBackend } from "../lib/db.js";

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

function replyError(res, status, message, extra = {}) {
  return res.status(status).json({ error: message, ...extra });
}

async function readSupabaseRow() {
  const response = await fetch(ROW_URL + "?app_key=eq." + APP_KEY + "&select=data,updated_at", {
    headers: headers(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("supabase_read");
  const rows = await response.json();
  return rows[0] || null;
}

async function readCurrent(res, message) {
  try {
    const row = usesNeonBackend()
      ? (await getDatabase()`SELECT data, updated_at, revision FROM public.vilco_app_state WHERE app_key = ${APP_KEY} LIMIT 1`)[0] || null
      : await readSupabaseRow();
    return replyError(res, 409, message, {
      conflict: true,
      updatedAt: row ? row.updated_at : null,
      revision: row && row.revision != null ? String(row.revision) : null
    });
  } catch {
    return replyError(res, 409, message, { conflict: true });
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");

  if (!verifySession(req)) return replyError(res, 401, "Ingresá la contraseña de VILCO para continuar.");
  if (!usesNeonBackend() && !SUPABASE_SERVICE_ROLE_KEY) {
    return replyError(res, 503, "Falta configurar el almacenamiento seguro de VILCO en Vercel.");
  }
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return replyError(res, 405, "Método no permitido.");
  }

  try {
    if (req.method === "GET") {
      const row = usesNeonBackend()
        ? (await getDatabase()`SELECT data, updated_at, revision FROM public.vilco_app_state WHERE app_key = ${APP_KEY} LIMIT 1`)[0] || null
        : await readSupabaseRow();
      return res.status(200).json({
        state: row ? row.data : null,
        updatedAt: row ? row.updated_at : null,
        revision: row && row.revision != null ? String(row.revision) : null
      });
    }

    const state = req.body && req.body.state;
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      return replyError(res, 400, "El estado de VILCO no tiene un formato válido.");
    }
    const bytes = Buffer.byteLength(JSON.stringify(state), "utf8");
    if (bytes > 2_800_000) {
      return replyError(res, 413, "Los datos superan el límite de sincronización. Volvé a subir los archivos para guardarlos en la nube.");
    }

    if (usesNeonBackend()) {
      const sql = getDatabase();
      const expected = req.body && req.body.expectedRevision;
      let rows;
      if (expected == null || expected === "") {
        rows = await sql`INSERT INTO public.vilco_app_state (app_key, data, updated_at, revision)
          VALUES (${APP_KEY}, ${JSON.stringify(state)}::jsonb, now(), 1)
          ON CONFLICT (app_key) DO NOTHING
          RETURNING updated_at, revision`;
      } else {
        if (!/^\d+$/.test(String(expected))) return replyError(res, 400, "La versión sincronizada no es válida.");
        rows = await sql`UPDATE public.vilco_app_state
          SET data = ${JSON.stringify(state)}::jsonb, updated_at = now(), revision = revision + 1
          WHERE app_key = ${APP_KEY} AND revision = ${String(expected)}::bigint
          RETURNING updated_at, revision`;
      }
      if (!rows.length) return await readCurrent(res, "Otro dispositivo guardó cambios antes que este. Guardé una copia local; revisá y actualizá para evitar sobrescribirlos.");
      return res.status(200).json({ ok: true, updatedAt: rows[0].updated_at, revision: String(rows[0].revision) });
    }

    const expectedUpdatedAt = req.body && req.body.expectedUpdatedAt;
    let response;
    if (expectedUpdatedAt == null || expectedUpdatedAt === "") {
      response = await fetch(ROW_URL + "?on_conflict=app_key", {
        method: "POST",
        headers: headers("resolution=ignore-duplicates,return=representation"),
        body: JSON.stringify([{ app_key: APP_KEY, data: state, updated_at: new Date().toISOString() }]),
      });
    } else {
      response = await fetch(ROW_URL + "?app_key=eq." + APP_KEY + "&updated_at=eq." + encodeURIComponent(expectedUpdatedAt) + "&select=updated_at", {
        method: "PATCH",
        headers: headers("return=representation"),
        body: JSON.stringify({ data: state, updated_at: new Date().toISOString() }),
      });
    }
    if (!response.ok) {
      console.error("VILCO cloud state write failed:", response.status);
      return replyError(res, 502, "No se pudieron guardar los cambios en la nube.");
    }
    const rows = await response.json();
    const row = rows[0];
    if (!row) return await readCurrent(res, "Otro dispositivo guardó cambios antes que este. Guardé una copia local; revisá y actualizá para evitar sobrescribirlos.");
    return res.status(200).json({ ok: true, updatedAt: row.updated_at || new Date().toISOString(), revision: null });
  } catch (error) {
    console.error("VILCO cloud state request failed:", error?.message || "unknown error");
    return replyError(res, 502, "No se pudo conectar con el almacenamiento compartido.");
  }
}
