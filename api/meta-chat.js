import { verifySession } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }
  if (!verifySession(req)) return res.status(401).json({ error: "Tu sesión venció. Volvé a ingresar a VILCO MANAGER." });
    const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Falta configurar MODEL_API_KEY en Vercel. La conexión está preparada, pero todavía no puede llamar a Meta Model API."
    });
  }
  try {
    const body = req.body || {};
    const incoming = Array.isArray(body.messages) ? body.messages.slice(-14) : [];
    const safeMessages = incoming
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .map((m) => {
        let content = m.content;
        if (typeof content === "string") content = content.slice(0, 8000);
        else if (Array.isArray(content)) {
          content = content.slice(0, 5).map((part) => {
            if (part && part.type === "text") return { type: "text", text: String(part.text || "").slice(0, 8000) };
            if (part && part.type === "image_url" && part.image_url && typeof part.image_url.url === "string" && part.image_url.url.startsWith("data:image/")) {
              return { type: "image_url", image_url: { url: part.image_url.url } };
            }
            return null;
          }).filter(Boolean);
        } else return null;
        return { role: m.role, content };
      }).filter((m) => m && m.content);
    if (!safeMessages.length) return res.status(400).json({ error: "Escribí un mensaje para comenzar." });

    const brand = "Sos el asistente creativo y de marketing de VILCO, parrilla, restaurant y eventos de Laborde, Córdoba, Argentina. Marca cálida, auténtica, gastronómica y cuidada. Servicios: parrilla, pastas, pescados, elaborados, salón para hasta 100 personas, catering y barra. Objetivos: contenido atractivo, reservas y consultas de eventos. Al editar fotos, conservar los platos, personas, identidad y elementos reales salvo que el usuario pida cambiarlos; evitar aspecto artificial, filtros excesivos, texto inventado y promesas no verificadas. Respondé en español rioplatense, con pasos concretos y breves. Si te piden una edición visual, explicá que pueden usar el botón Editar imagen con la foto seleccionada.";
    const upstream = await fetch("https://api.meta.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "muse-spark-1.3",
        messages: [{ role: "system", content: brand }, ...safeMessages],
        max_tokens: 800,
        temperature: 0.6
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data && data.error && data.error.message ? data.error.message : "Meta Model API rechazó la solicitud.";
      return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({ error: message });
    }
    const answer = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content : "";
    return res.status(200).json({ answer: typeof answer === "string" ? answer : JSON.stringify(answer) });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo conectar con Meta Model API. Revisá la conexión e intentá de nuevo." });
  }
}
