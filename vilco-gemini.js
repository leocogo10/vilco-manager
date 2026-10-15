(function () {
  "use strict";
  var selected = new Map();
  var dock = null, overlay = null, busy = false;
  var MAX_SELECTED = 3;

  function styleUI() {
    if (document.getElementById("vilco-gemini-style")) return;
    var style = document.createElement("style");
    style.id = "vilco-gemini-style";
    style.textContent = [
      "#vilco-gemini-dock{position:fixed;z-index:9997;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);display:none;align-items:center;gap:10px;padding:10px 14px;border:1px solid rgba(201,168,110,.45);border-radius:999px;background:#111;color:#f5f5f0;box-shadow:0 12px 40px #0009;font:600 13px Arial,sans-serif}",
      "#vilco-gemini-dock button{border:0;border-radius:999px;background:#c9a86e;color:#111;padding:9px 14px;font-weight:700;cursor:pointer}",
      "#vilco-gemini-dock button[data-vg-clear]{border:1px solid #444;background:#1a1a1a;color:#ddd}",
      "#vilco-gemini-overlay{position:fixed;inset:0;z-index:9998;display:none;align-items:center;justify-content:center;padding:16px;background:#000b}",
      "#vilco-gemini-panel{width:min(680px,100%);max-height:min(88vh,900px);overflow:auto;border:1px solid #38342d;border-radius:18px;background:#111;color:#f5f5f0;padding:20px;box-shadow:0 20px 80px #000b;font:14px/1.5 Arial,sans-serif}",
      "#vilco-gemini-panel h2{margin:0 0 4px;font:600 23px Georgia,serif;color:#dfc18d}",
      "#vilco-gemini-panel p{color:#bbb;margin:8px 0 14px}",
      "#vilco-gemini-panel label{display:block;margin:13px 0 5px;color:#ddd;font-weight:600}",
      "#vilco-gemini-panel input,#vilco-gemini-panel textarea,#vilco-gemini-panel select{box-sizing:border-box;width:100%;padding:10px 12px;border:1px solid #383838;border-radius:9px;background:#191919;color:#f5f5f0;font:14px Arial,sans-serif}",
      "#vilco-gemini-panel textarea{min-height:105px;resize:vertical}",
      "#vilco-gemini-panel .vg-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}",
      "#vilco-gemini-panel .vg-btn{display:inline-block;text-decoration:none;border:1px solid #444;border-radius:999px;background:#1a1a1a;color:#eee;padding:10px 14px;cursor:pointer;font-weight:600}",
      "#vilco-gemini-panel .vg-primary{border-color:#c9a86e;background:#c9a86e;color:#111}",
      "#vilco-gemini-panel .vg-close{float:right;border:0;background:transparent;color:#ddd;font-size:24px;cursor:pointer}",
      "#vilco-gemini-panel .vg-note{font-size:12px;color:#b8a98e;border-left:2px solid #c9a86e;padding-left:10px}",
      "#vilco-gemini-panel .vg-files{white-space:pre-line;color:#ddd;font-size:13px;padding:10px;border:1px solid #2b2b2b;border-radius:9px;background:#171717}",
      "#vilco-gemini-panel .vg-result{white-space:pre-wrap;overflow-wrap:anywhere;max-height:45vh;overflow:auto;padding:12px;border:1px solid #38342d;border-radius:10px;background:#0b0b0b;color:#f2eee6}",
      "#vilco-gemini-panel .vg-status{min-height:20px;color:#dfc18d;font-size:13px}",
      "#vilco-gemini-panel a{color:#dfc18d}",
      "@media(max-width:600px){#vilco-gemini-panel{padding:16px;border-radius:14px}#vilco-gemini-dock{width:calc(100% - 24px);justify-content:center;gap:6px;font-size:12px}#vilco-gemini-dock button{padding:8px 10px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureUI() {
    if (dock && overlay) return;
    styleUI();
    dock = document.createElement("div");
    dock.id = "vilco-gemini-dock";
    dock.innerHTML = '<span data-vg-count></span><button type="button" data-vg-open>Preparar análisis</button><button type="button" data-vg-clear aria-label="Vaciar selección">Vaciar</button>';
    document.body.appendChild(dock);

    overlay = document.createElement("div");
    overlay.id = "vilco-gemini-overlay";
    overlay.innerHTML = '<section id="vilco-gemini-panel" role="dialog" aria-modal="true" aria-labelledby="vg-heading"><button class="vg-close" type="button" data-vg-close aria-label="Cerrar">×</button><h2 id="vg-heading">Análisis editorial de VILCO</h2><p>Elegí archivos en la biblioteca y Gemini propondrá si convienen para Reel, carrusel, Feed o Historia, explicando el porqué.</p><div class="vg-files" data-vg-files></div><label for="vg-platform">Fuente de la tendencia</label><select id="vg-platform" data-vg-platform><option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Google Trends</option><option>Otra</option></select><label for="vg-title-input">Nombre o formato que viste</label><input id="vg-title-input" data-vg-title placeholder="Ej.: audio, hashtag, tipo de toma o idea observada"><label for="vg-url">Enlace de referencia (opcional)</label><input id="vg-url" data-vg-url type="url" placeholder="https://..."><label for="vg-notes">Datos que observaste en la fuente</label><textarea id="vg-notes" data-vg-notes maxlength="3000" placeholder="Pegá lo que ves: fecha, vistas/uso, hashtag, audio, formato y por qué te llamó la atención."></textarea><p class="vg-note">VILCO no abre ni verifica el enlace automáticamente. Abrí un buscador de tendencias, copiá el enlace y pegá aquí las señales visibles. Al analizar, se envían a Google Gemini solo los archivos que elegiste, sus nombres y estos datos. Máximo 3 archivos y 20 MB por análisis; un video por vez. Sin facturación: si se agota la cuota gratuita, se pausa.</p><div class="vg-status" data-vg-status role="status"></div><div class="vg-actions"><button class="vg-btn vg-primary" type="button" data-vg-analyze>Analizar con Gemini</button><a class="vg-btn" href="https://ads.tiktok.com/creative/creativeCenter/trends?period=30" target="_blank" rel="noopener noreferrer">Explorar tendencias de TikTok</a><a class="vg-btn" href="https://trends.google.com/trends/" target="_blank" rel="noopener noreferrer">Explorar Google Trends</a></div><div data-vg-output style="display:none;margin-top:16px"><h3 style="color:#dfc18d">Recomendación</h3><div class="vg-result" data-vg-result></div></div><p style="font-size:11px;color:#777;margin-top:14px">El análisis propone estrategia y pasos de edición. No altera los píxeles ni publica contenido.</p></section>';
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || (event.target.closest && event.target.closest("[data-vg-close]"))) closeModal();
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeModal(); });
    dock.querySelector("[data-vg-open]").addEventListener("click", openModal);
    dock.querySelector("[data-vg-clear]").addEventListener("click", clearSelection);
    overlay.querySelector("[data-vg-analyze]").addEventListener("click", analyze);
  }

  function setStatus(text, isError) {
    var node = overlay.querySelector("[data-vg-status]");
    node.textContent = text || "";
    node.style.color = isError ? "#ff958d" : "#dfc18d";
  }
  function updateDock() {
    ensureUI();
    dock.style.display = selected.size ? "flex" : "none";
    dock.querySelector("[data-vg-count]").textContent =
      selected.size + (selected.size === 1 ? " archivo elegido" : " archivos elegidos");
  }
  function openModal() {
    ensureUI();
    overlay.style.display = "flex";
    overlay.querySelector("[data-vg-files]").textContent =
      Array.from(selected.values()).map(function (item) { return "• " + item.name; }).join("\n");
    overlay.querySelector("[data-vg-output]").style.display = "none";
    setStatus("", false);
  }
  function closeModal() { if (overlay) overlay.style.display = "none"; }
  function clearSelection() {
    selected.forEach(function (item) {
      if (item.button && item.button.isConnected) {
        item.button.textContent = "✦";
        item.button.title = "Seleccionar para análisis con Gemini";
        item.button.style.color = "";
      }
    });
    selected.clear();
    updateDock();
    closeModal();
  }

  window.addEventListener("vilco:media-selection", function (event) {
    ensureUI();
    var item = event.detail || {};
    if (!item.storagePath || !item.storagePath.startsWith("uploads/")) {
      window.alert("Este archivo todavía no está guardado en la nube de VILCO. Esperá a que termine la sincronización y volvé a seleccionarlo.");
      return;
    }
    var id = String(item.id || item.storagePath);
    if (selected.has(id)) {
      var previous = selected.get(id);
      if (previous.button && previous.button.isConnected) {
        previous.button.textContent = "✦";
        previous.button.title = "Seleccionar para análisis con Gemini";
        previous.button.style.color = "";
      }
      selected.delete(id);
    } else {
      if (selected.size >= MAX_SELECTED) {
        window.alert("Elegí hasta 3 archivos por análisis. Podés iniciar otro análisis después.");
        return;
      }
      var name = String(item.name || "material").slice(0, 120);
      var ext = (name.split(".").pop() || "").toLowerCase();
      var mime = ({jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",heic:"image/heic",heif:"image/heif",mp4:"video/mp4",mov:"video/mov",webm:"video/webm",mpeg:"video/mpeg",mpg:"video/mpeg",3gp:"video/3gpp"})[ext];
      if (!mime) {
        window.alert("Formato no compatible. Usá JPG, PNG, WebP, HEIC, MP4, MOV o WebM.");
        return;
      }
      if (mime.startsWith("video/") && Array.from(selected.values()).some(function (asset) { return asset.mimeType.startsWith("video/"); })) {
        window.alert("Elegí un video por análisis. Podés agregarle hasta dos imágenes.");
        return;
      }
      selected.set(id, { id:id, name:name, storagePath:item.storagePath, mimeType:mime, button:item.button });
      if (item.button) {
        item.button.textContent = "✓";
        item.button.title = "Quitar de la selección";
        item.button.style.color = "#c9a86e";
      }
    }
    updateDock();
  });

  async function analyze() {
    if (busy) return;
    if (!selected.size) { setStatus("Elegí primero al menos un archivo.", true); return; }
    var button = overlay.querySelector("[data-vg-analyze]");
    var platform = overlay.querySelector("[data-vg-platform]").value;
    var title = overlay.querySelector("[data-vg-title-input]").value.trim();
    var url = overlay.querySelector("[data-vg-url]").value.trim();
    var notes = overlay.querySelector("[data-vg-notes]").value.trim();
    busy = true;
    button.disabled = true;
    button.textContent = "Analizando…";
    overlay.querySelector("[data-vg-output]").style.display = "none";
    setStatus("Enviando solo tu selección a Gemini…", false);
    try {
      var response = await fetch("/api/gemini-review", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: Array.from(selected.values()).map(function (item) {
            return { name:item.name, storagePath:item.storagePath, mimeType:item.mimeType };
          }),
          trend: { platform:platform, title:title, url:url, notes:notes }
        })
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || "No se pudo completar el análisis.");
      overlay.querySelector("[data-vg-result]").textContent = data.analysis || "Gemini no devolvió recomendaciones.";
      overlay.querySelector("[data-vg-output]").style.display = "block";
      setStatus("Análisis terminado. La selección sigue disponible.", false);
    } catch (error) {
      setStatus(error && error.message ? error.message : "No se pudo conectar con Gemini.", true);
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = "Analizar con Gemini";
    }
  }

  function start() { ensureUI(); updateDock(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
