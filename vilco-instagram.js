(function () {
  "use strict";

  var ENDPOINT = "/api/instagram-metrics";
  var root;
  var view = { open: false, loading: false, error: "", payload: null, notice: "" };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function number(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Sin dato";
    return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value);
  }

  function date(value) {
    if (!value) return "Fecha no disponible";
    var parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Fecha no disponible" :
      new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
  }

  function metricChange(current, previous) {
    if (typeof current !== "number" || typeof previous !== "number" || previous === 0) return "";
    var percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
    return (percent > 0 ? "+" : "") + percent + "% frente a los 30 días anteriores";
  }

  function safeInstagramUrl(value) {
    try {
      var url = new URL(value);
      return url.protocol === "https:" && (url.hostname === "instagram.com" || url.hostname === "www.instagram.com")
        ? url.toString() : "";
    } catch (_) {
      return "";
    }
  }

  function metricCards(snapshot) {
    if (!snapshot) return '<p class="vi-empty">Todavía no hay métricas guardadas.</p>';
    var current = snapshot.currentMetrics || {};
    var previous = snapshot.previousMetrics || {};
    var items = [
      ["Alcance", current.reach, previous.reach],
      ["Reproducciones", current.views, previous.views],
      ["Cuentas con interacción", current.accounts_engaged, previous.accounts_engaged],
      ["Interacciones", current.total_interactions, previous.total_interactions]
    ];
    return '<div class="vi-grid">' + items.map(function (item) {
      var change = metricChange(item[1], item[2]);
      return '<article class="vi-card"><span>' + item[0] + '</span><strong>' + number(item[1]) +
        '</strong><small>' + (change ? escapeHtml(change) : "Comparación no disponible") + '</small></article>';
    }).join("") + '</div><div class="vi-grid vi-grid-small">' +
      '<article class="vi-card"><span>Seguidores actuales</span><strong>' + number(snapshot.followersCount) +
      '</strong></article><article class="vi-card"><span>Publicaciones en la cuenta</span><strong>' +
      number(snapshot.mediaCount) + '</strong></article></div>';
  }

  function reachChart(snapshot) {
    var values = snapshot && Array.isArray(snapshot.dailyReach) ? snapshot.dailyReach : [];
    if (!values.length) return '<p class="vi-muted">La serie diaria de alcance todavía no está disponible.</p>';
    var max = Math.max.apply(null, values.map(function (item) { return item.value; }).concat([1]));
    return '<div class="vi-chart" role="img" aria-label="Alcance diario de los últimos 30 días">' +
      values.map(function (item) {
        var height = Math.max(3, Math.round((item.value / max) * 100));
        return '<span title="' + escapeHtml(date(item.endTime)) + ': ' + number(item.value) +
          '" style="height:' + height + '%"></span>';
      }).join("") + '</div><div class="vi-chart-labels"><span>' +
      escapeHtml(date(values[0].endTime)) + '</span><span>' +
      escapeHtml(date(values[values.length - 1].endTime)) + '</span></div>';
  }

  function mediaList(snapshot) {
    var items = snapshot && Array.isArray(snapshot.mediaPerformance) ? snapshot.mediaPerformance : [];
    if (!items.length) return '<p class="vi-muted">No hay datos disponibles para Reels o publicaciones del feed.</p>';
    return '<div class="vi-media-list">' + items.map(function (item) {
      var insights = item.insights || {};
      var link = safeInstagramUrl(item.permalink);
      var title = String(item.caption || "").trim() || (item.productType === "REELS" ? "Reel" : "Publicación del feed");
      var engagement = insights.total_interactions;
      return '<article class="vi-media"><div class="vi-media-head"><span class="vi-tag">' +
        escapeHtml(item.productType || item.mediaType || "Feed") + '</span><time>' + escapeHtml(date(item.timestamp)) +
        '</time></div><p>' + escapeHtml(title) + '</p><div class="vi-media-stats"><span>Alcance: <b>' +
        number(insights.reach) + '</b></span><span>Reproducciones: <b>' + number(insights.views) +
        '</b></span><span>Interacciones: <b>' + number(engagement) + '</b></span></div>' +
        (link ? '<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener noreferrer">Ver en Instagram ↗</a>' : '') +
        '</article>';
    }).join("") + '</div>';
  }

  function statusText(payload) {
    if (!payload) return "Consultando la conexión…";
    if (payload.connection && payload.connection.status === "reauth_required") return "Meta necesita que vuelvas a autorizar el acceso.";
    if (payload.connection && payload.connection.connected) return "Conectada " + (payload.connection.username || "@vilco.laborde");
    if (!payload.connectReady) return "Falta completar la configuración segura de Meta.";
    return "Instagram todavía no está conectado.";
  }

  function errorMessage(response, payload) {
    if (response.status === 401) return "Ingresá a VILCO para ver tus métricas.";
    return payload && payload.error ? payload.error : "No se pudieron cargar las métricas. Probá de nuevo más tarde.";
  }

  function render() {
    if (!root) return;
    var payload = view.payload;
    var connection = payload && payload.connection ? payload.connection : {};
    var snapshot = payload && payload.snapshot;
    var connected = Boolean(connection.connected);
    var setupMissing = payload && Array.isArray(payload.setupMissing) ? payload.setupMissing : [];
    var setupCopy = setupMissing.length
      ? '<p class="vi-muted">Falta configurar en Vercel: ' + escapeHtml(setupMissing.join(", ")) + '.</p>'
      : "";
    var warning = view.error ? '<p class="vi-warning">' + escapeHtml(view.error) + '</p>' : "";
    if (view.notice) warning = '<p class="vi-notice">' + escapeHtml(view.notice) + '</p>' + warning;
    if (payload && payload.stale) warning += '<p class="vi-muted">Meta no respondió al último intento. Mostrando el último registro guardado: ' +
      escapeHtml(date(snapshot && snapshot.fetchedAt)) + '.</p>';
    if (payload && payload.permissionMissing) warning += '<p class="vi-warning">Meta no devolvió alguna métrica con los permisos actuales. Los valores ausentes se muestran como “Sin dato”.</p>';
    var canConnect = Boolean(payload && payload.connectReady && !connected);
    var headerButtons = connected
      ? '<button class="vi-btn" data-action="refresh" ' + (view.loading ? "disabled" : "") + '>Actualizar</button><button class="vi-btn vi-btn-light" data-action="disconnect">Desconectar</button>'
      : '<button class="vi-btn vi-btn-primary" data-action="connect" ' + (!canConnect || view.loading ? "disabled" : "") + '>' +
        (connection.status === "reauth_required" ? "Volver a conectar" : "Conectar Instagram") + '</button>';
    root.innerHTML = '<button class="vi-launch" type="button" aria-expanded="' + view.open +
      '" aria-controls="vi-panel">Instagram · Métricas</button>' +
      (view.open ? '<section class="vi-panel" id="vi-panel" role="dialog" aria-modal="false" aria-label="Métricas de Instagram">' +
        '<header class="vi-header"><div><span class="vi-kicker">VILCO MANAGER</span><h2>Instagram Insights</h2><p>' +
        escapeHtml(statusText(payload)) + '</p></div><button class="vi-close" data-action="close" aria-label="Cerrar">×</button></header>' +
        '<div class="vi-content">' + warning + setupCopy +
        (view.loading && !payload ? '<p class="vi-muted">Cargando métricas reales…</p>' : '') +
        (connected ? '<section class="vi-section"><h3>Últimos 30 días</h3>' + metricCards(snapshot) +
          '<p class="vi-footnote">Comparación con los 30 días anteriores. Meta puede demorar la actualización y algunas métricas dependen de la cuenta.</p></section>' +
          '<section class="vi-section"><h3>Alcance por día</h3>' + reachChart(snapshot) + '</section>' +
          '<section class="vi-section"><h3>Feed y Reels recientes</h3>' + mediaList(snapshot) + '</section>' +
          '<p class="vi-footnote">Datos leídos de Meta. VILCO no publica ni modifica contenido. Carruseles e historias pueden no ofrecer Insights.</p>' :
          (!view.loading ? '<div class="vi-empty-state"><strong>Datos reales, con tu autorización</strong><p>Conectá la cuenta profesional de Instagram vinculada a la empresa Vilco para leer sus estadísticas.</p>' +
          (canConnect ? '' : '<p class="vi-muted">La conexión estará disponible cuando termine la configuración de Meta.</p>') + '</div>' : '')) +
        '</div><footer class="vi-footer"><span>' + (snapshot ? 'Última consulta: ' + escapeHtml(date(snapshot.fetchedAt)) : 'Sin registros') +
        '</span>' + headerButtons + '</footer></section>' : '');
  }

  async function load(force) {
    view.loading = true;
    view.error = "";
    render();
    try {
      var url = ENDPOINT + (force ? "?force=1" : "");
      var response = await fetch(url, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(errorMessage(response, payload));
      view.payload = payload;
      if (payload.refreshDeferred) view.notice = "La última consulta fue hace menos de 5 minutos. Conservamos el dato guardado para evitar llamadas repetidas a Meta.";
      else if (payload.stale) view.notice = "Los datos guardados pueden estar desactualizados; se actualizarán cuando Meta lo permita.";
      else view.notice = "";
    } catch (error) {
      view.error = error && error.message ? error.message : "No se pudieron cargar las métricas.";
    } finally {
      view.loading = false;
      render();
    }
  }

  async function connect() {
    view.loading = true;
    view.error = "";
    render();
    try {
      var response = await fetch("/api/instagram-connection?action=connect", {
        credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok || !payload.url) throw new Error(errorMessage(response, payload));
      window.location.assign(payload.url);
    } catch (error) {
      view.loading = false;
      view.error = error && error.message ? error.message : "No se pudo iniciar la conexión.";
      render();
    }
  }

  async function disconnect() {
    if (!window.confirm("¿Desconectar Instagram de VILCO? El historial de métricas se conservará.")) return;
    view.loading = true;
    render();
    try {
      var response = await fetch("/api/instagram-connection", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json" }, body: "{}"
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(errorMessage(response, payload));
      await load(false);
      view.notice = "Instagram quedó desconectado. El historial se conservó.";
      render();
    } catch (error) {
      view.loading = false;
      view.error = error && error.message ? error.message : "No se pudo desconectar Instagram.";
      render();
    }
  }

  function init() {
    var style = document.createElement("style");
    style.textContent = [
      "#vilco-instagram-root{font-family:Arial,sans-serif;color:#f5f5f0}",
      "#vilco-instagram-root *{box-sizing:border-box}",
      ".vi-launch{position:fixed;right:18px;bottom:18px;z-index:89;border:1px solid #8b7047;border-radius:999px;background:#c9a86e;color:#10100f;font-size:13px;font-weight:700;padding:12px 17px;box-shadow:0 8px 28px #0009;cursor:pointer}",
      ".vi-panel{position:fixed;right:18px;bottom:78px;z-index:89;width:min(440px,calc(100vw - 24px));max-height:min(82dvh,760px);display:flex;flex-direction:column;overflow:hidden;background:#10100f;border:1px solid #3b3428;border-radius:18px;box-shadow:0 18px 65px #000d}",
      ".vi-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 18px 14px;background:linear-gradient(135deg,#1b1812,#10100f);border-bottom:1px solid #29251e}",
      ".vi-header h2{font-family:Georgia,serif;font-size:23px;margin:4px 0 5px;color:#f5f5f0}",
      ".vi-header p,.vi-muted,.vi-footnote{color:#a9a7a1;font-size:12px;line-height:1.45;margin:0}",
      ".vi-kicker{color:#c9a86e;letter-spacing:.13em;font-size:9px;font-weight:700}",
      ".vi-close{border:1px solid #333;border-radius:50%;background:#191919;color:#ddd;width:32px;height:32px;font-size:21px;cursor:pointer}",
      ".vi-content{overflow:auto;padding:14px 16px 18px}",
      ".vi-section{margin:0 0 20px}.vi-section h3{margin:0 0 10px;color:#e7d5b3;font-size:13px;letter-spacing:.04em}",
      ".vi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}",
      ".vi-grid-small{margin-top:8px}",
      ".vi-card{min-width:0;padding:11px;border:1px solid #2c2b27;border-radius:12px;background:#151513}",
      ".vi-card span,.vi-card small{display:block;color:#a8a59d;font-size:10px;line-height:1.4}",
      ".vi-card strong{display:block;color:#f4f1e9;font-size:20px;margin:5px 0;font-variant-numeric:tabular-nums}",
      ".vi-card small{font-size:9px;color:#c9a86e}",
      ".vi-chart{height:82px;display:flex;align-items:flex-end;gap:2px;padding:8px 0 0;border-bottom:1px solid #403a31}",
      ".vi-chart span{flex:1;min-width:2px;background:linear-gradient(0deg,#8b7047,#d9bb87);border-radius:2px 2px 0 0;opacity:.9}",
      ".vi-chart-labels{display:flex;justify-content:space-between;margin-top:5px;color:#8d8a83;font-size:9px}",
      ".vi-media-list{display:grid;gap:8px}.vi-media{padding:11px;border:1px solid #2c2b27;border-radius:12px;background:#151513}",
      ".vi-media-head{display:flex;justify-content:space-between;align-items:center;color:#8d8a83;font-size:10px}",
      ".vi-tag{color:#d2b77f;border:1px solid #51442d;border-radius:999px;padding:3px 8px}",
      ".vi-media p{font-size:12px;line-height:1.4;color:#efede7;margin:9px 0}",
      ".vi-media-stats{display:flex;flex-wrap:wrap;gap:8px;color:#a9a7a1;font-size:10px}.vi-media-stats b{color:#f4f1e9}",
      ".vi-media a{display:inline-block;margin-top:9px;color:#d5b779;font-size:11px;text-decoration:none}",
      ".vi-empty,.vi-empty-state{padding:13px;border:1px solid #302c24;border-radius:12px;background:#151411;color:#c7c2b7;font-size:12px;line-height:1.5}",
      ".vi-empty-state strong{color:#f0e2c3}.vi-empty-state p{margin:6px 0 0}",
      ".vi-warning,.vi-notice{padding:10px 11px;border-radius:10px;font-size:11px;line-height:1.45;margin:0 0 10px}",
      ".vi-warning{background:#3a241c;color:#ffd2bb;border:1px solid #70442e}.vi-notice{background:#282318;color:#e3c78e;border:1px solid #51442d}",
      ".vi-footnote{font-size:10px;margin-top:8px}",
      ".vi-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 14px;border-top:1px solid #29251e;color:#8d8a83;font-size:10px}",
      ".vi-btn{border:1px solid #51442d;border-radius:999px;background:#211f1a;color:#e6d2a7;padding:8px 11px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap}",
      ".vi-btn-primary{background:#c9a86e;color:#14120e;border-color:#c9a86e}.vi-btn-light{color:#c7c2b7;border-color:#393832}",
      ".vi-btn:disabled{opacity:.45;cursor:not-allowed}",
      "@media(max-width:520px){.vi-launch{right:12px;bottom:12px}.vi-panel{right:8px;bottom:68px;width:calc(100vw - 16px);max-height:84dvh}.vi-header{padding:15px}.vi-content{padding:12px}.vi-footer{align-items:flex-end}.vi-footer>span{max-width:110px}}"
    ].join("");
    document.head.appendChild(style);
    root = document.createElement("div");
    root.id = "vilco-instagram-root";
    document.body.appendChild(root);
    root.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action],.vi-launch");
      if (!button) return;
      if (button.classList.contains("vi-launch")) {
        view.open = !view.open;
        render();
        if (view.open) load(false);
        return;
      }
      var action = button.getAttribute("data-action");
      if (action === "close") { view.open = false; render(); }
      if (action === "connect") connect();
      if (action === "refresh") load(true);
      if (action === "disconnect") disconnect();
    });
    var callbackOutcome = new URLSearchParams(window.location.search).get("instagram");
    if (callbackOutcome) {
      var notices = {
        connected: "Instagram quedó conectado a VILCO.",
        cancelled: "Cancelaste la autorización de Instagram.",
        "state-error": "La autorización venció o no pudo verificarse. Volvé a iniciar la conexión.",
        "configuration-error": "La configuración de Meta todavía está incompleta.",
        "business-not-found": "Meta no devolvió una empresa autorizada para esta cuenta.",
        "account-mismatch": "Meta no devolvió la cuenta @vilco.laborde. Revisá los activos elegidos en la autorización.",
        "connection-error": "Meta no pudo completar la conexión. Revisá permisos y configuración."
      };
      view.notice = notices[callbackOutcome] || "La autorización de Instagram terminó.";
      var cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("instagram");
      window.history.replaceState({}, "", cleanUrl.toString());
      view.open = true;
    }
    render();
    load(false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
