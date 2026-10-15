import { verifySession } from "./_auth.js";

const MODEL_URL = "https://api.meta.ai/v1/chat/completions";
const SUPABASE_HOST = "budnbinxfwgkcfgawlsa.supabase.co";
const MAX_IMAGE_DATA = 3_400_000;

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

const VILCO_CANON = [
  "Sos el asistente creativo de VILCO, una parrilla, restaurante y espacio para eventos en Laborde, Córdoba, Argentina.",
  "Respondé en español rioplatense, con criterio concreto y honesto. Ayudá a decidir si una pieza funciona mejor como Feed, Historia, Reel o Carrusel y explicá brevemente por qué.",
  "Prioridad: fotos reales y apetitosas, reservas y consultas por eventos. No afirmes que publicaste, editaste ni guardaste algo si no ocurrió.",
  "Canon visual de VILCO: fotografía gastronómica realista, cálida y auténtica. Conservá los platos, ingredientes, personas, logos y detalles reales de la foto salvo que el usuario pida cambiarlos. Si la imagen muestra parrilla, priorizá brasas visibles, grasa natural y humo realista. Evitá saturación excesiva, aspecto plástico, objetos inventados y textos legibles inventados.",
  "Guía de color actual de VILCO: magenta -18, calidez +32, contraste +14, sombras +22, sin saturar. Respetá las instrucciones específicas del usuario si pide otra cosa.",
  "Cuando recomiendes una edición, describí cambios específicos y preservá la escena real. La edición de imagen se ejecuta con el botón separado de Meta AI."
].join(" ");

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

function answerText(data) {
  const value = data?.choices?.[0]?.message?.content;
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.filter((part) => part?.type === "text").map((part) => part.text || "").join("\n").trim();
  return "";
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
  if (!apiKey) return replyError(res, 503, "Falta configurar MODEL_API_KEY en Vercel para conectar Meta AI.");

  try {
    const body = req.body || {};
    const source = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const messages = [];
    for (const item of source) {
      if (!item || !["user", "assistant"].includes(item.role)) continue;
      const text = typeof item.content === "string" ? item.content.trim().slice(0, 5000) : "";
      if (!text) continue;
      if (item.role === "assistant" && /simul[eé] edición|marcado como ganador/i.test(text)) continue;
      messages.push({ role: item.role, content: text });
    }
    if (!messages.length || !messages.some((item) => item.role === "user")) {
      return replyError(res, 400, "Escribí un mensaje para conversar con Meta AI.");
    }

    const imageData = body.imageData || "";
    const imageUrl = body.imageUrl || "";
    if (imageData && !validImageData(imageData)) return replyError(res, 400, "La imagen no es válida o pesa demasiado. Probá con una foto más liviana.");
    if (imageUrl && !validImageUrl(imageUrl)) return replyError(res, 400, "No se pudo reconocer la foto seleccionada en la biblioteca de VILCO.");

    const lastUserIndex = messages.map((item) => item.role).lastIndexOf("user");
    const lastUser = messages[lastUserIndex];
    if (imageData || imageUrl) {
      lastUser.content = [
        { type: "text", text: lastUser.content },
        { type: "image_url", image_url: { url: imageData || imageUrl, detail: "high" } }
      ];
    }

    const upstream = await fetch(MODEL_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "muse-spark-1.3",
        messages: [{ role: "developer", content: VILCO_CANON }, ...messages]
      }),
      signal: AbortSignal.timeout(80_000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("VILCO Meta chat failed:", upstream.status);
      if (upstream.status === 401 || upstream.status === 403) return replyError(res, 502, "Meta no aceptó la clave de API. Revisá MODEL_API_KEY en Vercel.");
      if (upstream.status === 429) return replyError(res, 429, "Meta alcanzó el límite de solicitudes. Esperá un momento y volvé a intentar.");
      if (upstream.status === 400) return replyError(res, 400, "Meta no aceptó la imagen o el mensaje. Probá con otra foto o reformulá la instrucción.");
      return replyError(res, 502, "Meta no pudo responder en este momento. Volvé a intentar.");
    }
    const answer = answerText(data);
    if (!answer) return replyError(res, 502, "Meta respondió sin texto. Volvé a intentar.");
    return res.status(200).json({ answer, model: "muse-spark-1.3" });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") return replyError(res, 504, "Meta está tardando demasiado. Volvé a intentar.");
    console.error("VILCO Meta chat request failed:", error?.message || "unknown error");
    return replyError(res, 502, "No se pudo conectar con Meta. Revisá la conexión e intentá otra vez.");
  }
}