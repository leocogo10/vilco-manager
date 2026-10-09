(() => {
  const start = () => {
    const app = document.getElementById("vilco-pro-app");
    const sidebar = app && app.querySelector(".vp-sidebar");
    const main = app && app.querySelector(".vp-main");
    const original = main && main.querySelector(".vp-main-inner");
    if (!app || !sidebar || !main || !original || document.getElementById("vp-meta-studio")) return;

    const style = document.createElement("style");
    style.textContent = `
      #vp-meta-nav{display:flex;align-items:center;gap:10px;width:100%;padding:12px 13px;margin:0 0 14px;background:#201a11;border:1px solid #a47c37;border-radius:9px;color:#e9c37b;text-align:left;font:700 12px Inter,Arial,sans-serif;cursor:pointer}
      #vp-meta-nav:hover{background:#302416}
      #vp-meta-nav .vp-meta-nav-mark{display:grid;place-items:center;width:28px;height:28px;border-radius:7px;background:#c99b4b;color:#14110b;font-weight:900}
      #vp-meta-studio{display:none;min-height:calc(100vh - 30px);padding:0 0 24px;color:var(--vp-text,#eee)}
      .vpms-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}
      .vpms-kicker{color:#c9a86e;letter-spacing:.18em;text-transform:uppercase;font-size:9px;font-weight:800}
      .vpms-title{font:32px Georgia,serif;margin:7px 0}
      .vpms-sub{color:#858585;font-size:12px;line-height:1.6;max-width:760px}
      .vpms-status{display:inline-flex;align-items:center;gap:7px;margin-top:10px;padding:7px 10px;border:1px solid #353535;border-radius:99px;color:#aaa;font-size:10px}
      .vpms-dot{width:7px;height:7px;border-radius:50%;background:#b88d42}
      .vpms-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:15px;align-items:start}
      .vpms-panel{background:#121212;border:1px solid #292929;border-radius:13px;overflow:hidden}
      .vpms-chat-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #292929}
      .vpms-chat-head strong{font-size:12px}.vpms-chat-head span{color:#777;font-size:10px}
      .vpms-messages{height:min(58vh,620px);min-height:360px;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
      .vpms-empty{margin:auto;max-width:420px;text-align:center;color:#858585;line-height:1.7;font-size:12px}
      .vpms-empty strong{display:block;font:23px Georgia,serif;color:#e4c58c;margin-bottom:8px}
      .vpms-msg{max-width:88%;padding:11px 13px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.65}
      .vpms-msg.user{align-self:flex-end;background:#302416;border:1px solid #5e4829;color:#f1e4ce}
      .vpms-msg.assistant{align-self:flex-start;background:#1c1c1c;border:1px solid #303030;color:#e6e6e6}
      .vpms-msg.error{border-color:#804c42;color:#f0b5a8}
      .vpms-msg img{display:block;max-width:min(100%,460px);max-height:360px;object-fit:contain;border-radius:8px;margin-top:8px}
      .vpms-download{display:inline-block;margin-top:9px;color:#e5bd70;text-decoration:underline;font-size:11px}
      .vpms-compose{padding:13px;border-top:1px solid #292929}
      .vpms-compose textarea{width:100%;min-height:82px;resize:vertical;background:#0a0a0a;border:1px solid #383838;border-radius:9px;color:#f0f0f0;padding:12px;font:12px/1.6 Inter,Arial,sans-serif;outline:none}
      .vpms-compose textarea:focus{border-color:#b88d42}
      .vpms-compose-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:9px}
      .vpms-actions-left,.vpms-actions-right{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .vpms-btn{border:1px solid #393939;background:#1b1b1b;color:#ddd;border-radius:8px;padding:10px 12px;font-size:11px;font-weight:700;cursor:pointer}
      .vpms-btn:hover{border-color:#b88d42}
      .vpms-btn.gold{background:#c99b4b;border-color:#c99b4b;color:#14110b}
      .vpms-btn:disabled{opacity:.45;cursor:wait}
      .vpms-file-input{display:none}
      .vpms-file-label{display:inline-block}
      .vpms-side-card{padding:14px;margin-bottom:12px}
      .vpms-side-card h3{font-size:12px;margin:0 0 10px}
      .vpms-side-card p,.vpms-side-card li{font-size:11px;line-height:1.7;color:#919191}
      .vpms-side-card ul{padding-left:17px;margin:8px 0}
      .vpms-preview{display:none;width:100%;max-height:230px;object-fit:contain;background:#080808;border:1px solid #333;border-radius:8px;margin:10px 0}
      .vpms-file-name{font-size:10px;color:#999;overflow-wrap:anywhere;margin-top:8px}
      .vpms-notice{font-size:10px;line-height:1.7;color:#8e8e8e;margin-top:12px;padding:10px;border:1px solid #2d2d2d;border-radius:8px}
      .vpms-suggestions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
      .vpms-suggestion{font-size:10px;color:#d5b579;background:#1d1811;border:1px solid #4c3920;border-radius:99px;padding:8px 10px;cursor:pointer}
      @media(max-width:1000px){.vpms-layout{grid-template-columns:1fr}.vpms-side-column{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.vpms-side-card{margin:0}.vpms-messages{height:50vh}}
      @media(max-width:600px){#vp-meta-studio{padding:0 0 16px}.vpms-head{display:block}.vpms-title{font-size:27px}.vpms-layout{display:block}.vpms-side-column{display:block;margin-top:12px}.vpms-side-card{margin-bottom:10px}.vpms-messages{min-height:300px;height:52vh}.vpms-msg{max-width:96%}.vpms-compose-actions{align-items:stretch}.vpms-actions-left,.vpms-actions-right{width:100%}.vpms-btn{flex:1}}
    `;
    document.head.appendChild(style);

    const nav = document.createElement("button");
    nav.id = "vp-meta-nav";
    nav.type = "button";
    nav.innerHTML = '<span class="vp-meta-nav-mark">M</span><span><strong>Meta AI Studio</strong><br><small style="color:#9b8b70;font-weight:400">Chat · fotos · edición</small></span>';
    const brand = sidebar.querySelector(".vp-brand");
    if (brand && brand.nextSibling) sidebar.insertBefore(nav, brand.nextSibling);
    else sidebar.prepend(nav);

    const studio = document.createElement("section");
    studio.id = "vp-meta-studio";
    studio.innerHTML = `
      <header class="vpms-head">
        <div><div class="vpms-kicker">Asistente creativo de Vilco</div><div class="vpms-title">Meta AI Studio</div><div class="vpms-sub">Conversá con los modelos de Meta desde VILCO MANAGER, adjuntá material y pedí ediciones reales. El estilo de trabajo de Vilco está incluido en las instrucciones del asistente.</div><div class="vpms-status"><i class="vpms-dot"></i><span id="vpms-status-text">Comprobando conexión con Meta…</span></div></div>
        <button class="vpms-btn" id="vpms-back" type="button">Volver al panel</button>
      </header>
      <div class="vpms-layout">
        <section class="vpms-panel">
          <div class="vpms-chat-head"><div><strong>Conversación de trabajo</strong><br><span>La conversación continúa mientras trabajás en esta sesión</span></div><button class="vpms-btn" id="vpms-clear" type="button">Nueva conversación</button></div>
          <div class="vpms-messages" id="vpms-messages"><div class="vpms-empty"><strong>¿Qué hacemos con el contenido de Vilco?</strong>Subí una foto para mejorarla, pedí una idea para un Reel o trabajá el texto de una publicación. Podés seguir ajustando el resultado por mensajes.</div></div>
          <div class="vpms-compose">
            <textarea id="vpms-prompt" placeholder="Ej.: Mejorá la luz de esta foto de parrilla, mantené la comida real y dale un acabado gastronómico profesional…"></textarea>
            <div class="vpms-compose-actions">
              <div class="vpms-actions-left"><label class="vpms-btn vpms-file-label" for="vpms-file">Adjuntar foto o video</label><input class="vpms-file-input" id="vpms-file" type="file" accept="image/*,video/*"><button class="vpms-btn" id="vpms-analyze" type="button">Analizar material</button></div>
              <div class="vpms-actions-right"><button class="vpms-btn gold" id="vpms-edit" type="button">Editar imagen</button><button class="vpms-btn gold" id="vpms-send" type="button">Enviar mensaje</button></div>
            </div>
            <img id="vpms-preview" class="vpms-preview" alt="Vista previa del material seleccionado">
            <div id="vpms-file-name" class="vpms-file-name">Todavía no hay material adjunto.</div>
            <div class="vpms-suggestions"><button class="vpms-suggestion" data-prompt="Dame tres ideas de Reel para Vilco con un gancho fuerte y natural.">Ideas de Reel</button><button class="vpms-suggestion" data-prompt="Prepará un copy cálido para promocionar los sábados de Vilco y generar reservas, sin sonar exagerado.">Copy para reservas</button><button class="vpms-suggestion" data-prompt="Analizá esta imagen desde fotografía gastronómica y recomendá los cambios más convenientes.">Analizar foto</button></div>
          </div>
        </section>
        <aside class="vpms-side-column">
          <section class="vpms-panel vpms-side-card"><h3>Identidad de Vilco aplicada</h3><p>Parrilla, restaurant y eventos en Laborde, Córdoba. Tono cálido, auténtico y gastronómico; salón para hasta 100 personas, catering y barra.</p><p>Prioridad: fotos reales y apetitosas, reservas, consultas por eventos y una identidad visual cuidada.</p></section>
          <section class="vpms-panel vpms-side-card"><h3>Qué puede hacer</h3><ul><li>Editar fotografías con instrucciones concretas.</li><li>Analizar imágenes y proponer mejoras.</li><li>Redactar copies, ideas y guiones para Reels.</li><li>Refinar una imagen editada en nuevos pasos.</li></ul><div class="vpms-notice">Los videos se pueden usar como referencia visual para analizar un fotograma y preparar ideas o guiones. La edición generativa directa de un archivo de video no está incluida en esta primera conexión.</div></section>
          <section class="vpms-panel vpms-side-card"><h3>Conexión segura</h3><p id="vpms-connection-note">La clave de Meta se configura en el servidor y no se expone en el navegador.</p><div class="vpms-notice">Meta Model API es independiente de la sesión personal de Meta AI. No hace falta abrir sesión de Meta AI en esta página; la integración utiliza una clave de desarrollador guardada como variable privada en Vercel.</div></section>
        </aside>
      </div>`;
    main.appendChild(studio);

    const messagesEl = studio.querySelector("#vpms-messages");
    const promptEl = studio.querySelector("#vpms-prompt");
    const fileEl = studio.querySelector("#vpms-file");
    const previewEl = studio.querySelector("#vpms-preview");
    const fileNameEl = studio.querySelector("#vpms-file-name");
    const statusEl = studio.querySelector("#vpms-status-text");
    const sendBtn = studio.querySelector("#vpms-send");
    const editBtn = studio.querySelector("#vpms-edit");
    const analyzeBtn = studio.querySelector("#vpms-analyze");
    let currentImage = null;
    let currentName = "";
    let conversation = [];
    let busy = false;

    function escapeText(s) { return String(s || ""); }
    function showMessage(role, text, imageData, download) {
      const empty = messagesEl.querySelector(".vpms-empty");
      if (empty) empty.remove();
      const bubble = document.createElement("div");
      bubble.className = "vpms-msg " + role;
      if (text) {
        const copy = document.createElement("div");
        copy.textContent = escapeText(text);
        bubble.appendChild(copy);
      }
      if (imageData) {
        const img = document.createElement("img");
        img.src = imageData;
        img.alt = "Imagen de trabajo";
        bubble.appendChild(img);
        if (download) {
          const a = document.createElement("a");
          a.className = "vpms-download";
          a.href = imageData;
          a.download = "vilco-imagen-editada.webp";
          a.textContent = "Descargar imagen editada";
          bubble.appendChild(a);
        }
      }
      messagesEl.appendChild(bubble);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return bubble;
    }
    function setBusy(value) {
      busy = value;
      [sendBtn, editBtn, analyzeBtn, fileEl].forEach((el) => { el.disabled = value; });
      sendBtn.textContent = value ? "Procesando…" : "Enviar mensaje";
      editBtn.textContent = value ? "Trabajando…" : "Editar imagen";
    }
    async function compressImage(file) {
      const bitmap = await createImageBitmap(file);
      const max = 1500;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close && bitmap.close();
      return canvas.toDataURL("image/jpeg", 0.84);
    }
    async function videoFrame(file) {
      const url = URL.createObjectURL(file);
      try {
        const video = document.createElement("video");
        video.muted = true; video.playsInline = true; video.preload = "metadata"; video.src = url;
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = () => reject(new Error("No se pudo leer el video."));
        });
        const target = Math.min(1, Math.max(0, (video.duration || 1) / 2));
        if (target > 0) {
          video.currentTime = target;
          await new Promise((resolve) => { video.onseeked = resolve; setTimeout(resolve, 1800); });
        }
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1500 / Math.max(video.videoWidth || 1, video.videoHeight || 1));
        canvas.width = Math.max(1, Math.round((video.videoWidth || 640) * scale));
        canvas.height = Math.max(1, Math.round((video.videoHeight || 360) * scale));
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.84);
      } finally { URL.revokeObjectURL(url); }
    }
    fileEl.addEventListener("change", async () => {
      const file = fileEl.files && fileEl.files[0];
      if (!file) return;
      fileNameEl.textContent = "Preparando material…";
      try {
        if (file.type.startsWith("image/")) currentImage = await compressImage(file);
        else if (file.type.startsWith("video/")) currentImage = await videoFrame(file);
        else throw new Error("Elegí una imagen o un video compatible.");
        currentName = file.name;
        previewEl.src = currentImage;
        previewEl.style.display = "block";
        fileNameEl.textContent = file.name + (file.type.startsWith("video/") ? " · se usará un fotograma como referencia" : " · listo para trabajar");
        showMessage("user", "Material adjunto: " + file.name, currentImage, false);
      } catch (error) {
        currentImage = null;
        previewEl.style.display = "none";
        fileNameEl.textContent = error.message || "No se pudo procesar el archivo.";
      }
    });
    function buildUserContent(text, includeImage) {
      const content = [{ type: "text", text: text }];
      if (includeImage && currentImage) content.push({ type: "image_url", image_url: { url: currentImage } });
      return content;
    }
    async function sendChat(mode) {
      if (busy) return;
      const text = promptEl.value.trim();
      if (!text && !currentImage) { promptEl.focus(); return; }
      const userText = text || (mode === "analyze" ? "Analizá este material y recomendá mejoras concretas para Vilco." : "¿Qué cambios recomendarías para este material?");
      showMessage("user", userText);
      const content = buildUserContent(userText, Boolean(currentImage));
      conversation.push({ role: "user", content });
      promptEl.value = "";
      setBusy(true);
      try {
        const response = await fetch("/api/meta-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: conversation })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "No se pudo completar la consulta.");
        const answer = data.answer || "Meta respondió sin texto.";
        conversation.push({ role: "assistant", content: answer });
        showMessage("assistant", answer);
      } catch (error) {
        showMessage("assistant error", error.message || "No se pudo conectar con Meta.", null, false);
      } finally { setBusy(false); promptEl.focus(); }
    }
    async function editImage() {
      if (busy) return;
      const prompt = promptEl.value.trim();
      if (!currentImage) {
        showMessage("assistant error", "Primero adjuntá una foto. Si cargás un video, se usará un fotograma como referencia; la edición generativa directa de video todavía no está disponible.");
        return;
      }
      if (!prompt) { promptEl.placeholder = "Describí qué querés cambiar en la foto…"; promptEl.focus(); return; }
      showMessage("user", "Editar " + currentName + ": " + prompt, currentImage, false);
      setBusy(true);
      try {
        const response = await fetch("/api/meta-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: currentImage, prompt })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "No se pudo editar la imagen.");
        currentImage = data.imageData;
        currentName = "vilco-imagen-editada.webp";
        previewEl.src = currentImage;
        previewEl.style.display = "block";
        fileNameEl.textContent = "Resultado editado · podés seguir pidiendo ajustes.";
        showMessage("assistant", "Listo: generé una versión editada. Podés descargarla o pedirme nuevos cambios sobre este resultado.", currentImage, true);
        conversation.push({ role: "assistant", content: "Se generó una versión editada de la imagen. La imagen actual está disponible como referencia para próximos cambios." });
        promptEl.value = "";
      } catch (error) {
        showMessage("assistant error", error.message || "No se pudo editar la imagen.");
      } finally { setBusy(false); }
    }
    nav.addEventListener("click", () => {
      original.style.display = "none";
      studio.style.display = "block";
      nav.style.background = "#3a2b18";
      window.scrollTo({ top: 0, behavior: "smooth" });
      promptEl.focus();
    });
    studio.querySelector("#vpms-back").addEventListener("click", () => {
      studio.style.display = "none";
      original.style.display = "";
      nav.style.background = "";
    });
    sendBtn.addEventListener("click", () => sendChat("chat"));
    analyzeBtn.addEventListener("click", () => sendChat("analyze"));
    editBtn.addEventListener("click", editImage);
    promptEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendChat("chat"); }
    });
    studio.querySelectorAll("[data-prompt]").forEach((btn) => btn.addEventListener("click", () => {
      promptEl.value = btn.getAttribute("data-prompt");
      promptEl.focus();
    }));
    studio.querySelector("#vpms-clear").addEventListener("click", () => {
      conversation = [];
      messagesEl.innerHTML = '<div class="vpms-empty"><strong>¿Qué hacemos con el contenido de Vilco?</strong>Subí una foto para mejorarla, pedí una idea para un Reel o trabajá el texto de una publicación. Podés seguir ajustando el resultado por mensajes.</div>';
    });
    async function checkMetaStatus() {
      try {
        const response = await fetch("/api/meta-status", { credentials: "same-origin", cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          statusEl.textContent = "Iniciá sesión para continuar";
          if (typeof vpLoginOpen === "function") vpLoginOpen();
          localStorage.removeItem("vilco_auth");
          return;
        }
        if (!response.ok) throw new Error(data.error || "No se pudo comprobar la conexión.");
        if (data.configured) {
          statusEl.textContent = "Conectado · Meta Model API";
          studio.querySelector("#vpms-connection-note").textContent = "La clave está configurada en el servidor. No se expone en el navegador.";
          studio.querySelector(".vpms-dot").style.background = "#5ba878";
        } else {
          statusEl.textContent = "Pendiente de clave de API";
          studio.querySelector("#vpms-connection-note").textContent = "Falta agregar MODEL_API_KEY en Vercel para activar el chat y la edición.";
        }
      } catch (error) { statusEl.textContent = "No se pudo comprobar la conexión"; }
    }
    const loginForm = document.getElementById("vp-login-form");
    if (loginForm) loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const password = document.getElementById("vp-password").value;
      const errorEl = document.getElementById("vp-login-error");
      const submit = loginForm.querySelector('button[type="submit"]');
      submit.disabled = true;
      errorEl.textContent = "Verificando acceso…";
      try {
        const response = await fetch("/api/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "No se pudo validar el acceso.");
        localStorage.setItem("vilco_auth", "ok");
        errorEl.textContent = "";
        if (typeof vpEnter === "function") vpEnter();
        await checkMetaStatus();
      } catch (error) {
        errorEl.textContent = error.message || "No se pudo validar el acceso.";
      } finally { submit.disabled = false; }
    }, true);
    checkMetaStatus();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();