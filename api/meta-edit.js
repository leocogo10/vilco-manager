export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Falta configurar MODEL_API_KEY en Vercel. La conexión está preparada, pero todavía no puede editar imágenes."
    });
  }
  try {
    const body = req.body || {};
    const imageData = typeof body.imageData === "string" ? body.imageData : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 5000) : "";
    if (!imageData.startsWith("data:image/") || !imageData.includes(";base64,")) {
      return res.status(400).json({ error: "Seleccioná una imagen válida antes de editar." });
    }
    if (imageData.length > 4_000_000) {
      return res.status(413).json({ error: "La imagen es demasiado grande. Probá con una foto más liviana." });
    }
    if (!prompt) return res.status(400).json({ error: "Describí qué querés cambiar en la imagen." });

    const brand = "Editá esta imagen para VILCO, parrilla, restaurant y eventos de Laborde, Córdoba, Argentina. Buscamos fotografía gastronómica profesional, realista, cálida y auténtica. Conservá los platos, ingredientes, personas, logos y elementos reales de la foto salvo que el usuario solicite expresamente cambiarlos. No inventes productos ni textos legibles. Evitá filtros excesivos, aspecto plástico y cambios innecesarios. Instrucción del usuario: ";
    const upstream = await fetch("https://api.meta.ai/v1/images/edits", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "muse-image-1.0",
        prompt: brand + prompt,
        images: [{ image_url: imageData }],
        n: 1,
        response_format: "b64_json",
        output_format: "webp",
        reasoning_strength: "low",
        tool_enablement: { enable_web_search: false, enable_shell: false, enable_image_search: false }
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data && data.error && data.error.message ? data.error.message : "Meta Model API no pudo editar la imagen.";
      return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({ error: message });
    }
    const b64 = data && data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) return res.status(502).json({ error: "La API respondió sin una imagen editada." });
    return res.status(200).json({ imageData: "data:image/webp;base64," + b64, outputFormat: data.output_format || "webp" });
  } catch (error) {
    return res.status(500).json({ error: "No se pudo editar la imagen. Intentá de nuevo en unos segundos." });
  }
}
