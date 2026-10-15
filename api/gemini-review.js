import { verifySession } from "./_auth.js";

const SUPABASE_URL = "https://budnbinxfwgkcfgawlsa.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.1-flash-lite";
const BUCKET = "vilco-media";
const MAX_FILES = 3;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_TREND_TEXT = 3000;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/mpeg", "video/3gpp"]);
export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };

function replyError(res, status, message) {
  return res.status(status).json({ error: message });
}
function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}
function validPath(path) {
  return typeof path === "string" && path.length <= 400 &&
    path.startsWith("uploads/") &&
    !path.split("/").some((part) => !part || part === "." || part === "..") &&
    /^[A-Za-z0-9._/-]+$/.test(path);
}
async function readLimited(response, remainingBytes) {
  const chunks = [];
  let total = 0;
  if (!response.body) throw new Error("storage_read");
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk);
    total += bytes.length;
    if (total > remainingBytes) {
      const error = new Error("limit");
      error.code = "LIMIT";
      throw error;
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, total);
}
async function loadAsset(asset, remainingBytes) {
  if (!validPath(asset.storagePath)) {
    const error = new Error("path");
    error.code = "PATH";
    throw error;
  }
  const mimeType = String(asset.mimeType || "").toLowerCase();
  if (!IMAGE_TYPES.has(mimeType) && !VIDEO_TYPES.has(mimeType)) {
    const error = new Error("format");
    error.code = "FORMAT";
    throw error;
  }
  const objectPath = asset.storagePath.slice("uploads/".length);
  const url = SUPABASE_URL + "/storage/v1/object/authenticated/" + BUCKET + "/" + encodePath("uploads/" + objectPath);
  const response = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY },
    cache: "no-store",
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) {
    console.error("VILCO selected media fetch failed:", response.status);
    const error = new Error("storage_fetch");
    error.code = "STORAGE";
    throw error;
  }
  const reportedLength = Number(response.headers.get("content-length") || 0);
  if (reportedLength && reportedLength > remainingBytes) {
    const error = new Error("limit");
    error.code = "LIMIT";
    throw error;
  }
  const bytes = await readLimited(response, remainingBytes);
  return {
    mimeType,
    displayName: String(asset.name || "material").slice(0, 120),
    inlineData: bytes.toString("base64"),
    size: bytes.length
  };
}

const SYSTEM_PROMPT = [
  "Sos la asesora editorial y de marketing de VILCO, un restaurante tipo bodegón/parrilla de Laborde, Córdoba, Argentina.",
  "Analizá únicamente las fotos y videos que el dueño eligió y adjuntó en esta solicitud. No afirmes que aplicaste una edición, publicaste algo ni abriste enlaces.",
  "El enlace de tendencia y sus notas son datos aportados por el dueño. No tenés búsqueda web activa en esta versión: no inventes que visitaste el enlace, métricas, popularidad, actualidad ni resultados de competidores. Si faltan evidencias, decilo.",
  "Observá con precisión qué aparece en cada archivo; distinguí observación de propuesta. No inventes platos, ingredientes, precios, promociones, personas ni detalles que no se vean.",
  "Juzgá con criterio: recomendá Reel, Carrusel, Feed, Historia o No usar ahora, y explicá el motivo considerando identidad de bodegón, calidez, autenticidad y claridad comercial. No llames viral o ganador a un contenido sin métricas comprobables.",
  "Si combinás archivos, nombrá cada uno y proponé un orden/storyboard concreto. Indicá una edición sugerida realizable en un editor externo (recorte, luz, color, texto, duración); no afirmes que modificaste los píxeles.",
  "Respondé en español rioplatense, con voseo, en estos apartados: VEREDICTO; QUÉ VEO; POR QUÉ ENCAJA O NO; COMBINACIÓN Y ORDEN; EDICIÓN SUGERIDA; GANCHO Y COPY; QUÉ FALTA COMPROBAR."
].join("\n");

function buildUserPrompt(assets, trend) {
  const items = assets.map((asset, i) =>
    (i + 1) + ". Archivo: " + String(asset.name || "material").slice(0, 120) +
    " (" + String(asset.mimeType || "formato") + ")"
  ).join("\n");
  return [
    "TENDENCIA A EVALUAR (información suministrada por el dueño; no verificada automáticamente):",
    "Plataforma: " + (trend.platform || "No indicada"),
    "Nombre o formato observado: " + (trend.title || "No indicado"),
    "Enlace de referencia: " + (trend.url || "No indicado"),
    "Notas y señales observadas: " + (trend.notes || "No aportadas"),
    "",
    "MATERIALES SELECCIONADOS:",
    items,
    "",
    "Decidí si esta tendencia merece adaptarse a VILCO y si los materiales seleccionados sirven juntos. Si el dueño no ingresó evidencia de tendencia, analizá las piezas creativamente y separá eso de cualquier afirmación de popularidad."
  ].join("\n");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return replyError(res, 405, "Método no permitido.");
  }
  if (!verifySession(req)) return replyError(res, 401, "Ingresá la contraseña de VILCO para analizar material.");
  if (!SERVICE_KEY) return replyError(res, 503, "El almacenamiento seguro de VILCO no está configurado.");
  if (!GEMINI_API_KEY) return replyError(res, 503, "Falta GEMINI_API_KEY en las variables de entorno de Vercel Production. El análisis todavía no está activado.");

  const body = req.body || {};
  const assets = Array.isArray(body.assets) ? body.assets : [];
  if (!assets.length || assets.length > MAX_FILES) {
    return replyError(res, 400, "Elegí entre 1 y 3 fotos o videos para analizar.");
  }
  const trend = body.trend && typeof body.trend === "object" ? body.trend : {};
  const trendUrl = String(trend.url || "").trim().slice(0, 1000);
  if (trendUrl) {
    try {
      const parsed = new URL(trendUrl);
      if (parsed.protocol !== "https:") throw new Error("bad_protocol");
    } catch {
      return replyError(res, 400, "El enlace de tendencia debe ser una URL HTTPS válida.");
    }
  }
  const cleanTrend = {
    platform: String(trend.platform || "").trim().slice(0, 60),
    title: String(trend.title || "").trim().slice(0, 180),
    url: trendUrl,
    notes: String(trend.notes || "").trim().slice(0, MAX_TREND_TEXT)
  };

  try {
    const parts = [{ text: buildUserPrompt(assets, cleanTrend) }];
    let totalBytes = 0;
    let videos = 0;
    for (const asset of assets) {
      const loaded = await loadAsset(asset || {}, MAX_TOTAL_BYTES - totalBytes);
      totalBytes += loaded.size;
      if (loaded.mimeType.startsWith("video/")) videos++;
      if (videos > 1) {
        return replyError(res, 400, "Para cuidar la cuota gratuita, analizá un video por vez; podés sumarle hasta dos imágenes.");
      }
      parts.push({ text: "Material: " + loaded.displayName });
      parts.push({ inlineData: { mimeType: loaded.mimeType, data: loaded.inlineData } });
    }
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent", {
      method: "POST",
      headers: { "x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 1200 }
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(150000)
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("VILCO Gemini request failed:", upstream.status);
      if (upstream.status === 429) return replyError(res, 429, "Gemini alcanzó el límite de cuota gratuita. No se habilitó facturación; esperá a que se renueve el cupo.");
      if (upstream.status === 401 || upstream.status === 403) return replyError(res, 502, "Google no aceptó GEMINI_API_KEY. Revisá que sea una clave de Gemini API de AI Studio.");
      if (upstream.status === 400) return replyError(res, 422, "Gemini no aceptó el formato o tamaño de la selección. Probá con menos archivos o un video más liviano.");
      return replyError(res, 502, "Gemini no pudo completar este análisis. Probá de nuevo más tarde.");
    }
    const answer = (result.candidates || [])
      .flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!answer) return replyError(res, 502, "Gemini respondió sin un análisis utilizable. Probá con otra selección.");
    return res.status(200).json({ analysis: answer, model: MODEL, filesAnalyzed: assets.length });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      return replyError(res, 504, "El análisis tardó demasiado. Probá con un video más corto o liviano.");
    }
    if (error?.code === "LIMIT") return replyError(res, 413, "Elegí menos archivos o archivos más livianos. El máximo es 20 MB por análisis.");
    if (error?.code === "PATH") return replyError(res, 400, "Uno de los archivos no es válido o no está guardado en VILCO.");
    if (error?.code === "FORMAT") return replyError(res, 415, "Formato no compatible. Usá JPG, PNG, WebP, HEIC, MP4, MOV o WebM.");
    if (error?.code === "STORAGE") return replyError(res, 502, "No se pudo abrir uno de los archivos seleccionados desde el almacenamiento.");
    console.error("VILCO Gemini analysis failed:", error?.message || "unknown error");
    return replyError(res, 502, "No se pudo analizar el material.");
  }
}
