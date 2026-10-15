(() => {
  if (window.__VILCO_META_STUDIO_READY__) return;
  window.__VILCO_META_STUDIO_READY__ = true;

  const style = document.createElement("style");
  style.textContent = [
    ".vmai-layer[hidden]{display:none!important}",
    ".vmai-layer{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:18px;color:#f5f5f0;font-family:Inter,Arial,sans-serif}",
    ".vmai-dialog{width:min(1120px,100%);height:min(850px,92vh);background:#0b0b0b;border:1px solid #5e4829;border-radius:18px;box-shadow:0 24px 90px rgba(0,0,0,.72);display:flex;flex-direction:column;overflow:hidden}",
    ".vmai-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 18px;background:#111;border-bottom:1px solid #252525}",
    ".vmai-brand{display:flex;align-items:center;gap:12px}.vmai-mark{width:38px;height:38px;border-radius:11px;background:#c9a86e;color:#111;display:grid;place-items:center;font:700 17px Georgia,serif}",
    ".vmai-title{font:22px Georgia,serif;color:#f4e5c5}.vmai-subtitle{font-size:11px;color:#888;margin-top:3px}",
    ".vmai-close{width:36px;height:36px;border:1px solid #303030;border-radius:50%;color:#aaa;background:#181818;font-size:18px;cursor:pointer}",
    ".vmai-status{padding:9px 18px;background:#0e0e0e;border-bottom:1px solid #202020;color:#aaa;font-size:11px}.vmai-status[data-state=ready]{color:#83c49a}.vmai-status[data-state=missing]{color:#e1bf79}.vmai-status[data-state=error]{color:#eea69b}",
    ".vmai-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(330px,.82fr);min-height:0;flex:1}",
    ".vmai-left{display:flex;flex-direction:column;min-height:0;padding:16px;border-right:1px solid #242424;gap:12px}",
    ".vmai-preview{flex:1;min-height:190px;background:#050505;border:1px dashed #393939;border-radius:13px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}",
    ".vmai-preview img{width:100%;height:100%;max-height:100%;object-fit:contain}.vmai-empty{max-width:360px;padding:24px;text-align:center;color:#888;font-size:12px;line-height:1.65}.vmai-empty strong{display:block;color:#e7c889;font:22px Georgia,serif;margin-bottom:7px}",
    ".vmai-file-name{font-size:10px;color:#8e8e8e;overflow-wrap:anywhere}.vmai-canon{padding:12px 13px;border-radius:11px;background:#15120e;border:1px solid #594323;color:#cfbd9e;font-size:11px;line-height:1.65}.vmai-canon b{color:#dfbd79}",
    ".vmai-actions{display:flex;gap:8px;flex-wrap:wrap}.vmai-btn{border:1px solid #383838;background:#1b1b1b;color:#ddd;border-radius:9px;padding:10px 13px;font-size:11px;font-weight:700;cursor:pointer}.vmai-btn:hover{border-color:#c9a86e}.vmai-btn.gold{background:#c9a86e;border-color:#c9a86e;color:#12100c}.vmai-btn:disabled{opacity:.5;cursor:wait}.vmai-hide{display:none!important}",
    ".vmai-right{display:flex;flex-direction:column;min-height:0;background:#101010}.vmai-chat-title{padding:14px 15px;border-bottom:1px solid #252525;font-size:12px;font-weight:700;color:#eee}.vmai-chat-title span{display:block;color:#777;font-size:10px;font-weight:400;margin-top:4px}",
    ".vmai-messages{padding:14px;flex:1;min-height:120px;overflow:auto;display:flex;flex-direction:column;gap:10px}.vmai-message{max-width:92%;white-space:pre-wrap;overflow-wrap:anywhere;padding:10px 12px;border-radius:12px;font-size:12px;line-height:1.6}.vmai-message.user{align-self:flex-end;background:#302416;border:1px solid #604a2b;color:#f2e3cb}.vmai-message.assistant{align-self:flex-start;background:#191919;border:1px solid #303030;color:#e8e8e8}.vmai-message.error{border-color:#784c41;color:#f0b5a8}.vmai-message img{display:block;max-width:100%;max-height:300px;object-fit:contain;margin-top:8px;border-radius:8px}.vmai-download{display:inline-block;color:#e7c889;margin-top:8px;font-size:11px}",
    ".vmai-compose{padding:12px;border-top:1px solid #252525}.vmai-prompt{width:100%;height:88px;resize:vertical;background:#090909;border:1px solid #363636;border-radius:10px;padding:11px;color:#eee;font:12px/1.6 Inter,Arial,sans-serif;outline:none}.vmai-prompt:focus{border-color:#c9a86e}.vmai-compose-row{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-top:9px}.vmai-note{font-size:10px;color:#757575;line-height:1.5;margin-top:8px}",
    "@media(max-width:760px){.vmai-layer{padding:0;align-items:stretch}.vmai-dialog{width:100%;height:100dvh;max-height:100dvh;border-radius:0;border-left:0;border-right:0}.vmai-title{font-size:18px}.vmai-layout{grid-template-columns:1fr;grid-template-rows:minmax(220px,38vh) minmax(0,1fr)}.vmai-left{padding:10px;border-right:0;border-bottom:1px solid #252525}.vmai-preview{min-height:110px}.vmai-canon{padding:8px 10px;font-size:10px}.vmai-actions .vmai-btn{padding:8px 10px}.vmai-message{max-width:96%}.vmai-prompt{height:70px}}"
  ].join("");
  document.head.appendChild(style);

  const layer = document.createElement("div");
  layer.className = "vmai-layer";
  layer.id = "vilco-meta-ai-studio";
  layer.hidden = true;
  layer.innerHTML = '<section class="vmai-dialog" role="dialog" aria-modal="true" aria-labelledby="vmai-title"><header class="vmai-head"><div class="vmai-brand"><div class="vmai-mark">V</div><div><div class="vmai-title" id="vmai-title">Meta AI · Editor de VILCO</div><div class="vmai-subtitle">Chat real, análisis y edición de fotos con Muse Image</div></div></div><button class="vmai-close" id="vmai-close" type="button" aria-label="Cerrar">×</button></header><div class="vmai-status" id="vmai-status" data-state="loading">Comprobando conexión con Meta…</div><div class="vmai-layout"><section class="vmai-left"><div class="vmai-preview" id="vmai-preview"><div class="vmai-empty"><strong>Tu foto de trabajo</strong>Tocá una foto de la Biblioteca, adjuntá un archivo o pegá una imagen con Ctrl+V.</div></div><div class="vmai-file-name" id="vmai-file-name">No hay foto adjunta.</div><div class="vmai-canon"><b>Canon VILCO activo:</b> foto gastronómica cálida y real; conservar platos, ingredientes, personas y logos. Brasa visible y humo natural cuando corresponda. Sin saturar ni dar aspecto plástico. Guía actual: magenta −18 · calidez +32 · contraste +14 · sombras +22.</div><div class="vmai-actions"><button class="vmai-btn" id="vmai-choose" type="button">Adjuntar foto</button><button class="vmai-btn" id="vmai-paste" type="button">Pegar imagen · Ctrl+V</button><button class="vmai-btn gold" id="vmai-edit" type="button">Editar foto con Meta</button><button class="vmai-btn" id="vmai-save" type="button" hidden>Guardar en Biblioteca</button><a class="vmai-btn vmai-hide" id="vmai-download" download="vilco-editada.webp">Descargar</a></div><input id="vmai-file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" class="vmai-hide"><div class="vmai-note" id="vmai-work-note">La foto original de la Biblioteca no se modifica. Revisá el resultado antes de guardarlo.</div></section><section class="vmai-right"><div class="vmai-chat-title">Conversación con Meta AI<span>Preguntá por la foto o pedí sugerencias de Feed, Historia, Reel o Carrusel.</span></div><div class="vmai-messages" id="vmai-messages"><div class="vmai-message assistant">Hola. Puedo analizar la foto con el canon actual de VILCO, sugerir el mejor formato y preparar una edición real. La foto solo se envía a Meta al analizar o editar.</div></div><div class="vmai-compose"><textarea class="vmai-prompt" id="vmai-prompt" placeholder="Ej.: analizá esta foto y decime si funciona mejor como Feed o Carrusel…"></textarea><div class="vmai-compose-row"><button class="vmai-btn gold" id="vmai-send" type="button">Consultar a Meta AI</button><button class="vmai-btn" id="vmai-new" type="button">Nueva conversación</button></div><div class="vmai-note">Cada edición usa Meta Model API. No se publica en Facebook ni Instagram.</div></div></section></div></section>';
  document.body.appendChild(layer);

  const ctx = { imageUrl: "", imageData: "", editedData: "", name: "", messages: [], busy: false };
  const statusEl = layer.querySelector("#vmai-status");
  const previewEl = layer.querySelector("#vmai-preview");
  const fileNameEl = layer.querySelector("#vmai-file-name");
  const promptEl = layer.querySelector("#vmai-prompt");
  const messagesEl = layer.querySelector("#vmai-messages");
  const fileEl = layer.querySelector("#vmai-file");
  const editBtn = layer.querySelector("#vmai-edit");
  const sendBtn = layer.querySelector("#vmai-send");
  const saveBtn = layer.querySelector("#vmai-save");
  const downloadBtn = layer.querySelector("#vmai-download");
  const workNote = layer.querySelector("#vmai-work-note");

  function setStatus(text, state) {
    statusEl.textContent = text;
    statusEl.dataset.state = state || "loading";
  }

  function setBusy(value) {
    ctx.busy = value;
    editBtn.disabled = value;
    sendBtn.disabled = value;
    layer.querySelector("#vmai-choose").disabled = value;
    editBtn.textContent = value && ctx.action === "edit" ? "Meta está editando…" : "Editar foto con Meta";
    sendBtn.textContent = value && ctx.action === "chat" ? "Meta está respondiendo…" : "Consultar a Meta AI";
  }

  function addMessage(role, text, imageData, isError) {
    const bubble = document.createElement("div");
    bubble.className = "vmai-message " + (isError ? "error" : role);
    if (text) bubble.appendChild(document.createTextNode(text));
    if (imageData) {
      const image = document.createElement("img");
      image.src = imageData;
      image.alt = "Resultado generado por Meta para revisar";
      bubble.appendChild(image);
      const link = document.createElement("a");
      link.className = "vmai-download";
      link.href = imageData;
      link.download = "vilco-imagen-editada.webp";
      link.textContent = "Descargar esta versión";
      bubble.appendChild(link);
    }
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showPhoto(src, name) {
    ctx.imageUrl = src || "";
    ctx.imageData = "";
    ctx.editedData = "";
    ctx.name = name || "Foto de VILCO";
    previewEl.replaceChildren();
    if (src) {
      const image = document.createElement("img");
      image.src = src;
      image.alt = ctx.name;
      previewEl.appendChild(image);
      fileNameEl.textContent = ctx.name + " · lista para trabajar";
    } else {
      const empty = document.createElement("div");
      empty.className = "vmai-empty";
      empty.innerHTML = "<strong>Tu foto de trabajo</strong>Tocá una foto de la Biblioteca, adjuntá un archivo o pegá una imagen con Ctrl+V.";
      previewEl.appendChild(empty);
      fileNameEl.textContent = "No hay foto adjunta.";
    }
    saveBtn.hidden = true;
    downloadBtn.classList.add("vmai-hide");
  }

  function closeEditor() {
    layer.hidden = true;
    document.body.style.overflow = "";
  }

  function openEditor(src, name) {
    if (layer.hidden) {
      ctx.messages = [];
      messagesEl.innerHTML = '<div class="vmai-message assistant">Hola. Puedo analizar la foto con el canon actual de VILCO, sugerir el mejor formato y preparar una edición real. La foto solo se envía a Meta al analizar o editar.</div>';
    }
    showPhoto(src, name);
    layer.hidden = false;
    document.body.style.overflow = "hidden";
    loadStatus();
    promptEl.focus();
  }

  function selectedCardImage() {
    let card = document.querySelector(".group.ring-1");
    if (!card) card = document.querySelector(".group");
    return card ? card.querySelector("img") : null;
  }

  function openSelectedCard() {
    const image = selectedCardImage();
    openEditor(image ? image.currentSrc || image.src : "", image ? image.alt : "Foto de VILCO");
  }

  async function loadStatus() {
    try {
      const response = await fetch("/api/meta-status", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setStatus("Tu sesión de VILCO venció. Iniciá sesión otra vez.", "error");
      } else if (!response.ok) {
        setStatus("No se pudo comprobar la conexión de Meta.", "error");
      } else if (data.configured) {
        setStatus("Conectado · Meta Model API · chat Muse Spark + edición Muse Image", "ready");
      } else {
        setStatus("Falta MODEL_API_KEY en Vercel para activar el chat y la edición.", "missing");
      }
    } catch {
      setStatus("No se pudo comprobar la conexión de Meta.", "error");
    }
  }

  function imageDataFromFile(file) {
    return createImageBitmap(file).then((bitmap) => {
      let scale = Math.min(1, 1500 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      let data = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        data = canvas.toDataURL("image/jpeg", attempt === 0 ? 0.84 : 0.76);
        if (data.length <= 3_400_000) break;
        scale *= 0.78;
      }
      if (bitmap.close) bitmap.close();
      if (data.length > 3_400_000) throw new Error("La foto sigue siendo demasiado grande. Elegí otra imagen más liviana.");
      return data;
    });
  }

  async function useFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      workNote.textContent = "Elegí una foto en formato JPG, PNG o WebP.";
      return;
    }
    workNote.textContent = "Preparando la foto…";
    try {
      ctx.imageData = await imageDataFromFile(file);
      ctx.imageUrl = "";
      ctx.editedData = "";
      ctx.name = file.name || "Foto adjunta";
      previewEl.replaceChildren();
      const image = document.createElement("img");
      image.src = ctx.imageData;
      image.alt = ctx.name;
      previewEl.appendChild(image);
      fileNameEl.textContent = ctx.name + " · lista para trabajar";
      saveBtn.hidden = true;
      downloadBtn.classList.add("vmai-hide");
      workNote.textContent = "Foto cargada. Meta solo la recibirá cuando consultes o pidas la edición.";
    } catch (error) {
      workNote.textContent = error.message || "No se pudo preparar esa foto.";
    }
  }

  layer.querySelector("#vmai-choose").addEventListener("click", () => fileEl.click());
  fileEl.addEventListener("change", () => useFile(fileEl.files && fileEl.files[0]));
  layer.querySelector("#vmai-close").addEventListener("click", closeEditor);
  layer.addEventListener("click", (event) => { if (event.target === layer) closeEditor(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !layer.hidden) closeEditor();
    if (event.key === "Enter" && !event.shiftKey && !layer.hidden && event.target === promptEl) {
      event.preventDefault();
      sendChat();
    }
  });
  layer.querySelector("#vmai-paste").addEventListener("click", () => {
    promptEl.focus();
    workNote.textContent = "Copiá la foto, hacé clic en el cuadro de mensaje y pegala con Ctrl+V.";
  });
  document.addEventListener("paste", (event) => {
    if (layer.hidden || !event.clipboardData) return;
    const item = Array.from(event.clipboardData.items).find((part) => part.kind === "file" && part.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) {
        event.preventDefault();
        useFile(file);
      }
    }
  });
  previewEl.addEventListener("dragover", (event) => { event.preventDefault(); });
  previewEl.addEventListener("drop", (event) => {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files || []).find((item) => item.type.startsWith("image/"));
    if (file) useFile(file);
  });

  async function sendChat() {
    if (ctx.busy) return;
    const text = promptEl.value.trim() || (ctx.imageData || ctx.imageUrl ? "Analizá esta foto de VILCO. Decime si conviene usarla como Feed, Historia, Reel o Carrusel, qué editarías según el canon y qué texto sugerís." : "");
    if (!text) {
      promptEl.focus();
      return;
    }
    ctx.messages.push({ role: "user", content: text });
    addMessage("user", text);
    promptEl.value = "";
    ctx.action = "chat";
    setBusy(true);
    try {
      const response = await fetch("/api/meta-chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: ctx.messages.slice(-12),
          imageData: ctx.imageData || "",
          imageUrl: ctx.imageUrl || ""
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Meta no pudo responder.");
      ctx.messages.push({ role: "assistant", content: data.answer });
      addMessage("assistant", data.answer);
      workNote.textContent = "Respuesta recibida de Meta. La foto original sigue intacta.";
    } catch (error) {
      addMessage("assistant", error.message || "No se pudo conectar con Meta.", "", true);
    } finally {
      ctx.action = "";
      setBusy(false);
    }
  }

  async function editPhoto() {
    if (ctx.busy) return;
    if (!ctx.imageData && !ctx.imageUrl) {
      workNote.textContent = "Primero adjuntá una foto o abrí el editor desde una imagen de tu Biblioteca.";
      return;
    }
    const prompt = promptEl.value.trim();
    if (!prompt) {
      workNote.textContent = "Escribí qué querés cambiar antes de pedir la edición.";
      promptEl.focus();
      return;
    }
    addMessage("user", "Editar foto: " + prompt);
    ctx.action = "edit";
    setBusy(true);
    workNote.textContent = "Meta está creando una copia editada. La foto original no se toca.";
    try {
      const response = await fetch("/api/meta-edit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: ctx.imageData || "",
          imageUrl: ctx.imageUrl || "",
          prompt
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Meta no pudo editar la foto.");
      ctx.imageData = data.imageData;
      ctx.imageUrl = "";
      ctx.editedData = data.imageData;
      ctx.name = "vilco-meta-editado.webp";
      previewEl.replaceChildren();
      const image = document.createElement("img");
      image.src = data.imageData;
      image.alt = "Foto editada por Meta para VILCO";
      previewEl.appendChild(image);
      fileNameEl.textContent = "Edición de Meta · revisala antes de guardar";
      saveBtn.hidden = false;
      downloadBtn.href = data.imageData;
      downloadBtn.classList.remove("vmai-hide");
      addMessage("assistant", "Meta generó una copia editada. Revisá el resultado. Si te gusta, guardala en la Biblioteca o pedime otra corrección.", data.imageData);
      promptEl.value = "";
      workNote.textContent = "La original permanece sin cambios. Guardá esta copia en Biblioteca cuando la apruebes.";
    } catch (error) {
      addMessage("assistant", error.message || "No se pudo editar la foto.", "", true);
      workNote.textContent = "No se generó una copia. Revisá la conexión o ajustá la instrucción.";
    } finally {
      ctx.action = "";
      setBusy(false);
    }
  }

  async function saveToLibrary() {
    if (!ctx.editedData || ctx.busy) return;
    const uploader = Array.from(document.querySelectorAll('input[type="file"]')).find((input) => input !== fileEl && /image/.test(input.accept) && /video/.test(input.accept));
    if (!uploader) {
      workNote.textContent = "No encontré la Biblioteca para guardar. Descargá esta versión y subila desde VILCO.";
      return;
    }
    try {
      const response = await fetch(ctx.editedData);
      const blob = await response.blob();
      const filename = (ctx.name || "vilco-foto").replace(/\.[^.]+$/, "") + "-meta.webp";
      const file = new File([blob], filename, { type: blob.type || "image/webp" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      uploader.files = transfer.files;
      uploader.dispatchEvent(new Event("change", { bubbles: true }));
      setTimeout(() => { try { uploader.value = ""; } catch {} }, 1200);
      workNote.textContent = "La copia editada se está guardando en la Biblioteca de VILCO.";
    } catch {
      workNote.textContent = "No se pudo enviar la copia a la Biblioteca. Descargala y subila desde VILCO.";
    }
  }

  layer.querySelector("#vmai-send").addEventListener("click", sendChat);
  editBtn.addEventListener("click", editPhoto);
  saveBtn.addEventListener("click", saveToLibrary);
  layer.querySelector("#vmai-new").addEventListener("click", () => {
    ctx.messages = [];
    messagesEl.innerHTML = '<div class="vmai-message assistant">Nueva conversación. La foto sigue adjunta; podés volver a analizarla o pedir otra edición.</div>';
  });

  function openFromButton(button) {
    const card = button.closest(".group");
    const image = card && card.querySelector("img");
    openEditor(image ? image.currentSrc || image.src : "", image ? image.alt : "Foto de VILCO");
  }

  function launchFromCurrentSelection() {
    const image = selectedCardImage();
    openEditor(image ? image.currentSrc || image.src : "", image ? image.alt : "Foto de VILCO");
  }

  function muteSimulation() {
    document.querySelectorAll('button[title="Editar con IA"]').forEach((button) => {
      button.title = "Editar foto con Meta AI";
      button.setAttribute("aria-label", "Editar foto con Meta AI");
    });
    document.querySelectorAll("button").forEach((button) => {
      const label = button.textContent.trim();
      if (label === "Aplicar edición + guardar v4") {
        button.textContent = "Editar foto con Meta AI";
        button.setAttribute("data-vmai-launch", "edit");
        button.setAttribute("aria-label", "Editar foto con Meta AI");
      }
      if (label === "↑" && button.parentElement && button.parentElement.querySelector('input[placeholder^="Ej: hacelo más corto"]')) {
        button.setAttribute("data-vmai-launch", "chat");
        button.setAttribute("aria-label", "Enviar a Meta AI");
      }
    });
    const headings = Array.from(document.querySelectorAll("div,span")).filter((node) => node.childElementCount === 0);
    headings.forEach((node) => {
      if (node.textContent.trim() === "CHAT IA • PEDIME ALGO • v4") node.textContent = "CHAT META AI • VILCO";
      if (node.textContent.trim() === "IA Vilco v4 — Editor") node.textContent = "Meta AI · Editor VILCO";
    });
    const legacyChats = Array.from(document.querySelectorAll("div")).filter((node) => node.textContent.includes("CHAT META AI • VILCO") && node.querySelector('input[placeholder^="Ej: hacelo más corto"]'));
    legacyChats.forEach((node) => { node.style.borderColor = "#594323"; });
  }

  document.addEventListener("click", (event) => {
    const target = event.target && event.target.closest ? event.target.closest("button") : null;
    if (!target) return;
    if (target.matches('button[title="Editar con IA"],button[title="Editar foto con Meta AI"]')) {
      openFromButton(target);
      return;
    }
    if (target.dataset.vmaiLaunch === "edit") {
      event.preventDefault();
      event.stopImmediatePropagation();
      launchFromCurrentSelection();
      return;
    }
    if (target.dataset.vmaiLaunch === "chat") {
      const input = target.parentElement.querySelector('input[placeholder^="Ej: hacelo más corto"]');
      const text = input ? input.value : "";
      event.preventDefault();
      event.stopImmediatePropagation();
      launchFromCurrentSelection();
      promptEl.value = text;
      if (text) sendChat();
      return;
    }
    if (target.textContent.trim() === "IA" && target.className.includes("lg:hidden")) {
      launchFromCurrentSelection();
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    const input = event.target;
    if (input && input.matches && input.matches('input[placeholder^="Ej: hacelo más corto"]') && event.key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      const text = input.value;
      launchFromCurrentSelection();
      promptEl.value = text;
      if (text) sendChat();
    }
  }, true);

  const observer = new MutationObserver(muteSimulation);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  muteSimulation();
})();