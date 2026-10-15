import { randomUUID } from "node:crypto";
import { verifySession } from "./_auth.js";

const SUPABASE_URL = "https://budnbinxfwgkcfgawlsa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE_URL = SUPABASE_URL + "/rest/v1/calendar_items";
const FORMATS = new Set(["Reel", "Historia", "Feed", "Carrusel", "Foto", "Video", "Otro"]);
const CHANNELS = new Set(["Instagram", "Facebook", "Instagram + Facebook"]);
const STATUSES = new Set(["Idea", "En edición", "Aprobado", "Programado", "Publicado", "Archivado"]);
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function normalizeRow(row) {
  let details = {};
  try {
    const parsed = JSON.parse(row.content || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) details = parsed;
  } catch {
    details = { title: row.content || "Publicación" };
  }
  return { ...details, id: row.id, day: row.day, createdAt: row.created_at };
}

function normalizeInput(body) {
  const value = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const day = String(value.day || "").trim();
  const parsedDay = /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(day + "T00:00:00.000Z") : NaN;
  if (!Number.isFinite(parsedDay) || new Date(parsedDay).toISOString().slice(0, 10) !== day) {
    throw new Error("Elegí una fecha válida para la publicación.");
  }

  const title = String(value.title || "").trim();
  const time = String(value.time || "").trim();
  const format = String(value.format || "").trim();
  const channel = String(value.channel || "").trim();
  const status = String(value.status || "Idea").trim();
  if (!title || title.length > 160) throw new Error("El título es obligatorio y admite hasta 160 caracteres.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Elegí un horario válido.");
  if (!FORMATS.has(format)) throw new Error("Elegí un formato de contenido válido.");
  if (!CHANNELS.has(channel)) throw new Error("Elegí Instagram, Facebook o ambos canales.");
  if (!STATUSES.has(status)) throw new Error("Elegí un estado válido para la publicación.");

  const record = {
    title,
    format,
    channel,
    time,
    status,
    caption: String(value.caption || "").trim().slice(0, 5000),
    cta: String(value.cta || "").trim().slice(0, 300),
    notes: String(value.notes || "").trim().slice(0, 2000),
    mediaId: String(value.mediaId || "").trim().slice(0, 120),
  };
  return { day, content: JSON.stringify(record) };
}

async function readRows(url, options = {}) {
  const response = await fetch(url, { ...options, headers: headers(options.prefer), cache: "no-store" });
  if (!response.ok) {
    console.error("VILCO calendar request failed:", response.status);
    throw new Error("No se pudo guardar o leer el calendario.");
  }
  return response.status === 204 ? [] : response.json();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (!verifySession(req)) return replyError(res, 401, "Tu sesión de VILCO venció. Ingresá de nuevo para abrir el calendario.");
  if (!SUPABASE_SERVICE_ROLE_KEY) return replyError(res, 503, "El almacenamiento compartido de VILCO no está configurado.");

  if (req.method === "GET") {
    try {
      const rows = await readRows(TABLE_URL + "?select=id,day,content,created_at&order=day.asc,created_at.asc&limit=1000");
      return res.status(200).json({ items: rows.map(normalizeRow) });
    } catch {
      return replyError(res, 502, "No se pudo cargar el calendario compartido. Probá actualizar la página.");
    }
  }

  if (req.method === "DELETE") {
    const id = String(req.body && req.body.id || "");
    if (!ID_PATTERN.test(id)) return replyError(res, 400, "La publicación seleccionada no es válida.");
    try {
      const rows = await readRows(TABLE_URL + "?id=eq." + encodeURIComponent(id) + "&select=id", {
        method: "DELETE",
        prefer: "return=representation",
      });
      if (!rows.length) return replyError(res, 404, "La publicación ya no existe en el calendario.");
      return res.status(200).json({ ok: true });
    } catch {
      return replyError(res, 502, "No se pudo eliminar la publicación. Tus otros datos siguen intactos.");
    }
  }

  if (req.method !== "POST" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return replyError(res, 405, "Método no permitido.");
  }

  let payload;
  try { payload = normalizeInput(req.body); }
  catch (error) { return replyError(res, 400, error.message); }

  const id = String(req.body && req.body.id || "");
  if (req.method === "PATCH" && !ID_PATTERN.test(id)) return replyError(res, 400, "La publicación seleccionada no es válida.");
  if (req.method === "POST" && id) return replyError(res, 400, "Para editar una publicación, recargá el calendario y volvé a intentarlo.");

  try {
    const isUpdate = req.method === "PATCH";
    const url = isUpdate ? TABLE_URL + "?id=eq." + encodeURIComponent(id) + "&select=id,day,content,created_at" : TABLE_URL + "?select=id,day,content,created_at";
    const rows = await readRows(url, {
      method: isUpdate ? "PATCH" : "POST",
      prefer: "return=representation",
      body: JSON.stringify(isUpdate ? payload : { ...payload, id: randomUUID() }),
    });
    if (!rows.length) return replyError(res, 404, "No se encontró la publicación para guardar.");
    return res.status(isUpdate ? 200 : 201).json({ item: normalizeRow(rows[0]) });
  } catch {
    return replyError(res, 502, "No se pudo guardar en la nube. Tus cambios anteriores siguen guardados.");
  }
}

