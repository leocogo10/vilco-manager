import { verifySession } from "./_auth.js";

const MODEL_URL = "https://api.meta.ai/v1/images/edits";
const SUPABASE_HOST = "budnbinxfwgkcfgawlsa.supabase.co";
const MAX_IMAGE_DATA = 3_400_000;

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

function replyError(res, status, message) {
  return res.status(status).json({ error: message });
}

function validImageData(value) {
  return typeof value === "string" &&
    value.length <= MAX_IMAGE_DATA &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function validImageUrl(value) {
  if (typeof value !== "string" || value.length > 2500) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== SUPABASE_HOST) return false;
    if (!/^\/storage\/v1\/object\/(?:sign|public)\/vilco-media\/uploads\/[A-Za-z0-9._%/-]+$/.test(url.pathname)) return false;
    return !url.pathname.includes("/../") && (!url.pathname.includes("/sign/") || url.searchParams.has("token"));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return replyError(res, 405, "Método no permitido.");
  }
  if (!verifySession(req)) return replyError(res, 401, "Tu sesión venció. Volvé a ingresar a VILCO MANAGER.");

  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return replyError(res, 503, "Falta configurar MODEL_API_KEY en Vercel para activar la edición con Meta.");

  try {
    const body = req.body || {};
    const imageData = typeof body.imageData === "string" ? body.imageData : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 4000) : "";

    if (imageData && !validImageData(imageData)) {
      return replyError(res, 400, "La imagen no es válida o pesa demasiado. Probá con una foto más liviana.");
    }
    if (imageUrl && !validImageUrl(imageUrl)) {
      return replyError(res, 400, "No se pudo reconocer la foto seleccionada en la Biblioteca de VILCO.");
    }
    if (!imageData && !imageUrl) return replyError(res, 400, "Adjuntá una foto antes de editar.");
    if (imageData && imageUrl) return replyError(res, 400, "Elegí una sola foto para editar.");
    if (!prompt) return replyError(res, 400, "Describí qué querés cambiar en la foto.");

    const canon = [
      "Editá una foto de VILCO, parrilla, restaurante y espacio para eventos de Laborde, Córdoba, Argentina.",
      "Buscamos fotografía gastronómica realista, cálida y auténtica. Conservá los platos, ingredientes, personas, logos y detalles reales de la foto salvo que el usuario pida cambiarlos.",
      "Si la imagen muestra parrilla, priorizá brasas visibles, grasa natural y humo realista. Evitá saturación excesiva, aspecto plástico, objetos inventados y textos legibles inventados.",
      "Guía de color actual: magenta -18, calidez +32, contraste +14, sombras +22, sin saturar. Respetá la instrucción específica del usuario.",
      "Instrucción del usuario: " + prompt
    ].join(" ");

    const imageRef = imageData || imageUrl;
    const upstream = await fetch(MODEL_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "muse-image-1.0",
        prompt: canon,
        images: [{ image_url: imageRef }],
        n: 1,
        response_format: "b64_json",
        output_format: "webp"
      }),
      signal: AbortSignal.timeout(110_000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("VILCO Meta image edit failed:", upstream.status);
      if (upstream.status === 401 || upstream.status === 403) return replyError(res, 502, "Meta no aceptó la clave de API. Revisá MODEL_API_KEY en Vercel.");
      if (upstream.status === 429) return replyError(res, 429, "Meta alcanzó el límite de ediciones. Esperá un momento y volvé a intentar.");
      if (upstream.status === 400) return replyError(res, 400, "Meta no aceptó la foto o la instrucción. Probá con otra foto o reformulá el cambio.");
      return replyError(res, 502, "Meta no pudo editar la foto en este momento. Volvé a intentar.");
    }
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return replyError(res, 502, "Meta respondió sin una imagen editada.");
    return res.status(200).json({
      imageData: "data:image/webp;base64," + b64,
      outputFormat: data.output_format || "webp"
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") return replyError(res, 504, "Meta está tardando demasiado en editar. Volvé a intentar.");
    console.error("VILCO Meta image edit request failed:", error?.message || "unknown error");
    return replyError(res, 502, "No se pudo conectar con Meta. Revisá la conexión e intentá otra vez.");
  }
}