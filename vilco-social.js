(function () {
  "use strict";

  const numberFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  const style = document.createElement("style");
  style.textContent = `
    #vilco-meta-action{display:inline-flex;align-items:center;justify-content:center;gap:6px;margin-top:7px;min-height:28px;padding:5px 10px;border:1px solid #59482c;border-radius:8px;background:#c9a86e14;color:#e6d5b0;font:600 10px system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer}
    #vilco-meta-action:hover{background:#c9a86e24;border-color:#c9a86e}
    #vilco-meta-overlay{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;background:#000a;backdrop-filter:blur(5px)}
    #vilco-meta-overlay[data-open="true"]{display:flex}
    #vilco-meta-dialog{width:min(520px,100%);max-height:min(82vh,760px);overflow:auto;border:1px solid #302a20;border-radius:16px;background:#111;color:#f5f5f0;box-shadow:0 22px 80px #000b;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
    #vilco-meta-dialog *{box-sizing:border-box}
    .vilco-meta-head{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 20px 12px;border-bottom:1px solid #242424}
    .vilco-meta-title{margin:0;color:#e8d5ae;font-size:17px;font-weight:700}
    .vilco-meta-subtitle{margin:5px 0 0;color:#aaa;font-size:12px;line-height:1.5}
    .vilco-meta-close{border:0;background:transparent;color:#aaa;font-size:24px;line-height:1;cursor:pointer}
    .vilco-meta-content{padding:16px 20px 20px}
    .vilco-meta-status{padding:11px 12px;border:1px solid #292929;border-radius:10px;background:#171717;color:#ccc;font-size:12px;line-height:1.5}
    .vilco-meta-status[data-kind="ok"]{border-color:#1b4937;color:#9ee2be}
    .vilco-meta-status[data-kind="error"]{border-color:#623431;color:#ffb4ac}
    .vilco-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:14px}
    .vilco-meta-card{min-height:76px;padding:12px;border:1px solid #292929;border-radius:10px;background:#151515}
    .vilco-meta-label{color:#aaa;font-size:10px}
    .vilco-meta-value{margin-top:6px;color:#f5f5f0;font-size:18px;font-weight:700;overflow-wrap:anywhere}
    .vilco-meta-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
    .vilco-meta-button{min-height:38px;padding:9px 13px;border:1px solid #51432b;border-radius:9px;background:#c9a86e;color:#17130d;font-size:12px;font-weight:700;cursor:pointer}
    .vilco-meta-button[disabled]{opacity:.55;cursor:wait}
    .vilco-meta-button.secondary{border-color:#343434;background:#1b1b1b;color:#eee}
    .vilco-meta-button.danger{border-color:#633a38;background:#241615;color:#ffb4ac}
    .vilco-meta-foot{margin:14px 0 0;color:#888;font-size:10px;line-height:1.5}
    @media(max-width:520px){#vilco-meta-overlay{padding:8px}.vilco-meta-head{padding:16px 15px 10px}.vilco-meta-content{padding:13px 15px 16px}.vilco-meta-grid{gap:7px}.vilco-meta-card{padding:10px}.vilco-meta-value{font-size:16px}}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "vilco-meta-overlay";
  overlay.innerHTML = `
    <section id="vilco-meta-dialog" role="dialog" aria-modal="true" aria-labelledby="vilco-meta-title">
      <header class="vilco-meta-head">
        <div><h2 id="vilco-meta-title" class="vilco-meta-title">Facebook e Instagram</h2><p class="vilco-meta-subtitle">Lectura de métricas de tus cuentas. VILCO no publicará ni editará contenido.</p></div>
        <button class="vilco-meta-close" type="button" aria-label="Cerrar">×</button>
      </header>
      <div class="vilco-meta-content">
        <div class="vilco-meta-status" id="vilco-meta-status" role="status" aria-live="polite">Consultando conexión…</div>
        <div class="vilco-meta-grid" id="vilco-meta-grid"></div>
        <div class="vilco-meta-actions" id="vilco-meta-actions"></div>
        <p class="vilco-meta-foot">La conexión se guarda en el servidor de VILCO cifrada. Podés desconectarla desde acá.</p>
      </div>
    </section>`;
  document.body.appendChild(overlay);

  const statusBox = overlay.querySelector("#vilco-meta-status");
  const grid = overlay.querySelector("#vilco-meta-grid");
  const actions = overlay.querySelector("#vilco-meta-actions");

  function setStatus(message, kind) {
    statusBox.textContent = message;
    statusBox.dataset.kind = kind || "";
  }

  function button(label, className, action) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "vilco-meta-button" + (className ? " " + className : "");
    item.textContent = label;
    item.addEventListener("click", action);
    return item;
  }

  function showActions(data) {
    actions.replaceChildren();
    if (data?.connected) {
      actions.append(
        button("Actualizar métricas", "", refresh),
        button("Desconectar Meta", "danger", disconnect)
      );
    } else {
      actions.append(button("Conectar Facebook e Instagram", "", connect));
    }
  }

  function addMetric(label, value) {
    const card = document.createElement("div");
    card.className = "vilco-meta-card";
    const name = document.createElement("div");
    name.className = "vilco-meta-label";
    name.textContent = label;
    const figure = document.createElement("div");
    figure.className = "vilco-meta-value";
    figure.textContent = typeof value === "number" ? numberFormat.format(value) : "—";
    card.append(name, figure);
    grid.appendChild(card);
  }

  function paintMetrics(data) {
    grid.replaceChildren();
    if (!data?.connected) return;
    addMetric("Seguidores de Instagram", data.instagram?.followers);
    addMetric("Publicaciones de Instagram", data.instagram?.mediaCount);
    addMetric("Vistas de Instagram · 30 días", data.instagram?.views30d);
    addMetric("Alcance de Instagram · 30 días", data.instagram?.reach30d);
    addMetric("Me gusta de Facebook", data.page?.likes);
    addMetric("Interacciones en Facebook · 30 días", data.page?.engagements30d);
    if (data.fetchedAt) {
      const date = new Date(data.fetchedAt);
      setStatus(`Conectada con ${data.page?.name || "Facebook"}${data.instagram?.username ? " e Instagram @" + data.instagram.username : ""}. Actualizado ${date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}.`, "ok");
    }
    showActions(data);
    updateHeader(data);
  }

  function updateHeader(data) {
    if (!data?.connected) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue || "";
      if (value.trim() === "Instagram sin conectar") node.nodeValue = "Instagram conectado";
      if (value.trim() === "No conectada") node.nodeValue = "Conectada";
      if (value.trim() === "Sin métricas actuales") node.nodeValue = "Datos de Meta";
      if (value.trim() === "Conectá Meta para ver datos reales") node.nodeValue = "Métricas reales desde Meta";
      if (value.includes("— views") && typeof data.instagram?.views30d === "number") node.nodeValue = value.replace("— views", `${numberFormat.format(data.instagram.views30d)} views`);
      if (value.includes("— alcance") && typeof data.instagram?.reach30d === "number") node.nodeValue = value.replace("— alcance", `${numberFormat.format(data.instagram.reach30d)} alcance`);
      if (value.includes("— visitas") && typeof data.instagram?.followers === "number") node.nodeValue = value.replace("— visitas", `${numberFormat.format(data.instagram.followers)} seguidores`);
    }
  }

  async function requestInsights() {
    const response = await fetch("/api/meta-insights", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error(data.error || "Tu sesión de VILCO venció. Volvé a ingresar.");
    if (!response.ok) throw new Error(data.error || "No se pudieron leer las métricas.");
    return data;
  }

  async function refresh() {
    setStatus("Consultando métricas actuales en Meta…");
    grid.replaceChildren();
    for (const item of actions.querySelectorAll("button")) item.disabled = true;
    try {
      const data = await requestInsights();
      if (!data.connected) {
        grid.replaceChildren();
        setStatus(data.configured === false ? "La conexión todavía requiere configuración privada en Vercel Preview." : "Todavía no conectaste Facebook e Instagram.");
        showActions(data);
        return;
      }
      paintMetrics(data);
    } catch (error) {
      setStatus(error.message || "No se pudo consultar Meta.", "error");
    } finally {
      for (const item of actions.querySelectorAll("button")) item.disabled = false;
    }
  }

  async function connect() {
    setStatus("Preparando el acceso seguro a Meta…");
    for (const item of actions.querySelectorAll("button")) item.disabled = true;
    try {
      const response = await fetch("/api/meta-connect", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || "No se pudo iniciar la conexión.");
      window.location.assign(data.url);
    } catch (error) {
      setStatus(error.message || "No se pudo iniciar la conexión.", "error");
      for (const item of actions.querySelectorAll("button")) item.disabled = false;
    }
  }

  async function disconnect() {
    if (!window.confirm("¿Desconectar Facebook e Instagram de VILCO?")) return;
    setStatus("Desconectando…");
    try {
      const response = await fetch("/api/meta-disconnect", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo desconectar Meta.");
      grid.replaceChildren();
      setStatus("Meta quedó desconectada de VILCO.", "ok");
      showActions({ connected: false });
      window.setTimeout(() => location.reload(), 800);
    } catch (error) {
      setStatus(error.message || "No se pudo desconectar Meta.", "error");
    }
  }

  function openPanel() {
    overlay.dataset.open = "true";
    refresh();
  }

  function closePanel() {
    overlay.dataset.open = "false";
  }

  overlay.querySelector(".vilco-meta-close").addEventListener("click", closePanel);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) closePanel(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closePanel(); });

  function mountAction() {
    if (document.getElementById("vilco-meta-action")) return true;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if ((node.nodeValue || "").trim() !== "Conectá Meta para ver datos reales") continue;
      const host = node.parentElement;
      if (!host) continue;
      const action = document.createElement("button");
      action.id = "vilco-meta-action";
      action.type = "button";
      action.textContent = "Conectar Meta · solo lectura";
      action.addEventListener("click", openPanel);
      host.appendChild(action);
      return true;
    }
    return false;
  }

  let initialRefreshStarted = false;
  function maybeRefreshOnLoad() {
    if (initialRefreshStarted || new URLSearchParams(window.location.search).has("meta")) return;
    if (document.getElementById("vilco-gate-form")) return;
    if (!document.getElementById("vilco-meta-action")) return;
    initialRefreshStarted = true;
    refresh();
  }

  const observer = new MutationObserver(() => {
    mountAction();
    maybeRefreshOnLoad();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  mountAction();
  maybeRefreshOnLoad();

  const outcome = new URLSearchParams(window.location.search).get("meta");
  if (outcome) {
    const messages = {
      connected: ["Meta quedó conectada. Estoy leyendo las métricas de tus cuentas…", "ok"],
      cancelled: ["Cancelaste el acceso en Meta. No se guardó ninguna conexión.", ""],
      "state-error": ["No se pudo validar el inicio seguro. Volvé a tocar Conectar Meta.", "error"],
      "page-not-found": ["Meta no devolvió la fan page esperada. Confirmá que tu usuario la administra y que Instagram profesional está vinculado.", "error"],
      "connection-error": ["Meta no completó la conexión. Revisá permisos y configuración de la app.", "error"],
    };
    const [message, kind] = messages[outcome] || ["No se pudo completar la conexión con Meta.", "error"];
    window.history.replaceState({}, document.title, window.location.pathname);
    openPanel();
    window.setTimeout(() => setStatus(message, kind), 100);
  }
})();

