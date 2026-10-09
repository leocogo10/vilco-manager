;(function () {
  "use strict";

  const mount = document.getElementById("meta-ai-chat-vilco");
  const bridge = window.VilcoMetaChatBridge;
  const gate = document.getElementById("vilco-gate");
  if (!mount || !bridge) return;

  const style = document.createElement("style");
  style.textContent = [
    "#meta-ai-chat-vilco .vmca-fab{position:fixed;right:16px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:9996;width:56px;height:56px;border:1px solid rgba(201,168,110,.7);border-radius:50%;background:#c9a86e;color:#111;box-shadow:0 12px 32px rgba(0,0,0,.48);font:700 25px/1 Georgia,serif;cursor:pointer}",
    "#meta-ai-chat-vilco .vmca-panel{position:fixed;right:16px;bottom:calc(154px + env(safe-area-inset-bottom));z-index:9997;display:flex;flex-direction:column;width:min(420px,calc(100vw - 24px));height:min(620px,calc(100dvh - 185px));min-height:340px;overflow:hidden;border:1px solid #393126;border-radius:20px;background:#0e0e0e;color:#f5f1e8;box-shadow:0 22px 80px rgba(0,0,0,.62);font:14px/1.45 Montserrat,Inter,ui-sans-serif,system-ui,sans-serif}",
    "#meta-ai-chat-vilco [hidden]{display:none!important}",
    "#meta-ai-chat-vilco .vmca-head{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #24211d;background:linear-gradient(135deg,#17130f,#0f0f0f)}",
    "#meta-ai-chat-vilco .vmca-mark{display:grid;place-items:center;width:38px;height:38px;flex:none;border:1px solid rgba(201,168,110,.55);border-radius:12px;color:#d6b77f;font:700 20px Georgia,serif}",
    "#meta-ai-chat-vilco .vmca-title{font:700 15px Georgia,serif;letter-spacing:.02em}",
    "#meta-ai-chat-vilco .vmca-subtitle{margin-top:2px;color:#96928b;font-size:10px}",
    "#meta-ai-chat-vilco .vmca-close{margin-left:auto;width:34px;height:34px;border:1px solid #312d27;border-radius:50%;color:#c7c0b4;font-size:20px;cursor:pointer}",
    "#meta-ai-chat-vilco .vmca-status{padding:8px 15px;border-bottom:1px solid #1c1c1c;background:#10100f;color:#aa9d82;font-size:10px}",
    "#meta-ai-chat-vilco .vmca-alert{padding:10px 14px;background:rgba(201,106,43,.12);border-bottom:1px solid rgba(201,106,43,.22);color:#e4b88c;font-size:11px;line-height:1.45}",
    "#meta-ai-chat-vilco .vmca-messages{display:flex;flex:1;flex-direction:column;gap:12px;overflow:auto;padding:16px 14px;overscroll-behavior:contain}",
    "#meta-ai-chat-vilco .vmca-message{max-width:92%;padding:11px 13px;border:1px solid #282621;border-radius:15px;background:#171715;color:#e8e3d9;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.55}",
    "#meta-ai-chat-vilco .vmca-message.user{align-self:flex-end;border-color:rgba(201,168,110,.35);background:#282219;color:#f5ecdc}",
    "#meta-ai-chat-vilco .vmca-message.assistant{align-self:flex-start}",
    "#meta-ai-chat-vilco .vmca-empty{margin:auto 6px;color:#a9a39a;font-size:12px;line-height:1.6}",
    "#meta-ai-chat-vilco .vmca-compose{display:flex;align-items:flex-end;gap:9px;padding:11px;border-top:1px solid #25231f;background:#111}",
    "#meta-ai-chat-vilco .vmca-input{flex:1;min-height:43px;max-height:120px;resize:vertical;padding:11px 12px;border:1px solid #34312b;border-radius:13px;outline:none;background:#181817;color:#f5f1e8;font:12px/1.45 Montserrat,Inter,ui-sans-serif,system-ui,sans-serif}",
    "#meta-ai-chat-vilco .vmca-input:focus{border-color:#b4935e}",
    "#meta-ai-chat-vilco .vmca-send{width:44px;height:43px;flex:none;border:0;border-radius:13px;background:#c9a86e;color:#16130e;font-weight:700;cursor:pointer}",
    "#meta-ai-chat-vilco .vmca-send:disabled{opacity:.45;cursor:wait}",
    "#meta-ai-chat-vilco .vmca-note{padding:0 13px 10px;color:#77736c;background:#111;text-align:center;font-size:9px}",
    "@media(max-width:600px){#meta-ai-chat-vilco .vmca-fab{right:14px;bottom:calc(88px + env(safe-area-inset-bottom))}#meta-ai-chat-vilco .vmca-panel{left:10px;right:10px;bottom:calc(151px + env(safe-area-inset-bottom));width:auto;height:min(68dvh,620px);max-height:calc(100dvh - 174px);min-height:300px;border-radius:18px}}",
    "@media(min-width:601px){#meta-ai-chat-vilco .vmca-fab{bottom:24px}#meta-ai-chat-vilco .vmca-panel{bottom:92px}}"
  ].join("\n");
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.className = "vmca-fab";
  button.type = "button";
  button.setAttribute("aria-label", "Abrir asistente de VILCO");
  button.setAttribute("aria-expanded", "false");
  button.textContent = "✦";

  const panel = document.createElement("section");
  panel.className = "vmca-panel";
  panel.setAttribute("aria-label", "Asistente de marketing VILCO");
  panel.hidden = true;

  const head = document.createElement("div");
  head.className = "vmca-head";
  const mark = document.createElement("div");
  mark.className = "vmca-mark";
  mark.textContent = "V";
  const heading = document.createElement("div");
  const title = document.createElement("div");
  title.className = "vmca-title";
  title.textContent = "Asistente de VILCO";
  const subtitle = document.createElement("div");
  subtitle.className = "vmca-subtitle";
  subtitle.textContent = "Marketing · contenido · decisiones";
  heading.append(title, subtitle);
  const close = document.createElement("button");
  close.className = "vmca-close";
  close.type = "button";
  close.setAttribute("aria-label", "Cerrar asistente");
  close.textContent = "×";
  head.append(mark, heading, close);

  const status = document.createElement("div");
  status.className = "vmca-status";
  status.textContent = "Conectando con el espacio VILCO…";

  const alert = document.createElement("div");
  alert.className = "vmca-alert";
  alert.hidden = true;

  const messages = document.createElement("div");
  messages.className = "vmca-messages";
  messages.setAttribute("aria-live", "polite");

  const form = document.createElement("form");
  form.className = "vmca-compose";
  const input = document.createElement("textarea");
  input.className = "vmca-input";
  input.rows = 1;
  input.maxLength = 4000;
  input.placeholder = "Contame qué querés resolver…";
  input.setAttribute("aria-label", "Mensaje para el asistente");
  const send = document.createElement("button");
  send.className = "vmca-send";
  send.type = "submit";
  send.setAttribute("aria-label", "Enviar mensaje");
  send.textContent = "↑";
  form.append(input, send);

  const note = document.createElement("div");
  note.className = "vmca-note";
  note.textContent = "Los mensajes y el perfil de VILCO se envían a Meta para responder. El historial se guarda en Supabase y se comparte en VILCO.";

  panel.append(head, status, alert, messages, form, note);
  mount.append(button, panel);

  let chatMessages = [];
  let configured = false;
  let loading = false;
  let typingNode = null;
  let syncTimer = null;

  function isAuthenticated() {
    return Boolean(gate && gate.hidden);
  }

  function showError(error) {
    if (error && error.status === 401) return "Tu sesión de VILCO venció. Volvé a ingresar y abrí el asistente de nuevo.";
    if (error && error.status === 503) return error.message || "Falta completar la configuración del asistente en Vercel Preview.";
    if (error && error.status === 409) return error.message;
    if (error && error.status === 429) return error.message;
    return error && error.message ? error.message : "No se pudo conectar. Revisá internet e intentá de nuevo.";
  }

  function render() {
    messages.replaceChildren();
    if (!chatMessages.length) {
      const welcome = document.createElement("div");
      welcome.className = "vmca-empty";
      welcome.textContent = "Soy tu asistente de marketing para VILCO. Tengo como base el contexto de negocio que compartiste. Puedo ayudarte con ideas, copies, calendario y decisiones; también voy a señalarte cuando falten datos o una propuesta no encaje con la marca.\n\nTodavía no tengo acceso directo a tus métricas de Instagram/Facebook ni a tu chat personal de Meta AI.";
      messages.appendChild(welcome);
    } else {
      chatMessages.forEach(function (item) {
        if (!item || (item.role !== "user" && item.role !== "assistant")) return;
        const bubble = document.createElement("div");
        bubble.className = "vmca-message " + item.role;
        bubble.textContent = item.content || "";
        messages.appendChild(bubble);
      });
    }
    if (typingNode) messages.appendChild(typingNode);
    messages.scrollTop = messages.scrollHeight;
  }

  async function load(silent) {
    if (!isAuthenticated()) return;
    try {
      const data = await bridge.load();
      chatMessages = Array.isArray(data.messages) ? data.messages : [];
      configured = Boolean(data.configured);
      status.textContent = configured ? "Meta Model API · conversación sincronizada" : "Historial seguro · falta activar la clave de Meta";
      alert.hidden = configured;
      alert.textContent = configured
        ? ""
        : "El asistente ya está integrado. Para que responda, agregá META_MODEL_API_KEY como variable Secret del entorno Preview en Vercel.";
      if (!loading || !silent) render();
    } catch (error) {
      if (error.status === 401) {
        status.textContent = "Ingresá a VILCO para continuar";
      } else {
        status.textContent = "No se pudo conectar con el espacio compartido";
        alert.hidden = false;
        alert.textContent = showError(error);
      }
    }
  }

  function setAuthenticated(yes) {
    button.hidden = !yes;
    if (!yes) {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }
      return;
    }
    load(false);
  }

  button.addEventListener("click", function () {
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) {
      load(false);
      input.focus();
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = setInterval(function () {
        if (!panel.hidden && !loading) load(true);
      }, 10000);
    } else if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  });

  close.addEventListener("click", function () {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || loading) return;
    if (!configured) {
      alert.hidden = false;
      alert.textContent = "Primero agregá META_MODEL_API_KEY como Secret en el entorno Preview de Vercel.";
      return;
    }

    loading = true;
    input.value = "";
    input.disabled = true;
    send.disabled = true;
    typingNode = document.createElement("div");
    typingNode.className = "vmca-message assistant";
    typingNode.textContent = "Meta está preparando una respuesta…";
    render();

    try {
      const result = await bridge.send(message);
      chatMessages = Array.isArray(result.messages) ? result.messages : [
        ...chatMessages,
        { role: "user", content: message },
        { role: "assistant", content: result.message }
      ];
      alert.hidden = true;
      status.textContent = "Meta Model API · conversación sincronizada";
      render();
    } catch (error) {
      typingNode = null;
      if (error.status === 409) await load(false);
      alert.hidden = false;
      alert.textContent = showError(error);
      render();
      input.value = message;
    } finally {
      loading = false;
      typingNode = null;
      input.disabled = false;
      send.disabled = false;
      input.focus();
      render();
    }
  });

  if (gate) {
    const observer = new MutationObserver(function () {
      setAuthenticated(isAuthenticated());
    });
    observer.observe(gate, { attributes: true, attributeFilter: ["hidden"] });
    setAuthenticated(isAuthenticated());
  } else {
    setAuthenticated(false);
  }

  const logout = document.getElementById("vilco-logout-btn");
  if (logout) {
    logout.addEventListener("click", function () {
      setAuthenticated(false);
    }, true);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }
    }
  });
})();
