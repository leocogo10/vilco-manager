(function () {
  "use strict";

  const API_URL = "/api/calendar";
  const APP_STATE_KEY = "vilco_mesa_pro_data_v4";
  const MONTHS = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
  const SHORT_DATE = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
  const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const FORMATS = ["Reel", "Historia", "Feed", "Carrusel", "Foto", "Video", "Otro"];
  const CHANNELS = ["Instagram", "Facebook", "Instagram + Facebook"];
  const STATUSES = ["Idea", "En edición", "Aprobado", "Programado", "Publicado", "Archivado"];
  const STATUS_COLORS = {
    Idea: "#8a8a86",
    "En edición": "#d6b66f",
    Aprobado: "#93c5aa",
    Programado: "#8ebce6",
    Publicado: "#a8a8a3",
    Archivado: "#62625e",
  };

  let entries = [];
  let loaded = false;
  let loading = false;
  let currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let activeUi = null;

  const style = document.createElement("style");
  style.textContent = `
    .vilco-calendar-ui{margin-top:20px;color:#f5f5f0;font-family:Montserrat,system-ui,sans-serif}
    .vilco-cal-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
    .vilco-cal-actions,.vilco-cal-month{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .vilco-cal-button{min-height:36px;padding:8px 13px;border-radius:999px;border:1px solid #292929;background:#151515;color:#ddd;font:600 11px Montserrat,system-ui,sans-serif;cursor:pointer;transition:border-color .15s,color .15s,background .15s}
    .vilco-cal-button:hover{border-color:#80683f;color:#fff}
    .vilco-cal-button.primary{background:#c9a86e;border-color:#c9a86e;color:#0a0a0a;font-weight:700}
    .vilco-cal-month-label{min-width:150px;text-align:center;text-transform:capitalize;color:#f5f5f0;font:600 13px Montserrat,system-ui,sans-serif}
    .vilco-cal-note{padding:11px 13px;margin-bottom:14px;border:1px solid #29251d;border-radius:10px;background:#11100d;color:#a8a8a3;font-size:11px;line-height:1.55}
    .vilco-cal-note strong{color:#d6c29b;font-weight:600}
    .vilco-cal-status{min-height:18px;margin:0 0 10px;color:#8a8a86;font-size:11px}
    .vilco-cal-weekdays,.vilco-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
    .vilco-cal-weekdays{margin-bottom:7px}
    .vilco-cal-weekday{padding:4px 8px;text-align:center;color:#73736e;font-size:10px;text-transform:uppercase;letter-spacing:.1em}
    .vilco-cal-day{min-height:145px;padding:10px;border:1px solid #222;background:#0f0f0f;border-radius:13px;display:flex;flex-direction:column;gap:8px;transition:border-color .15s,background .15s}
    .vilco-cal-day:hover{border-color:#3a3326}
    .vilco-cal-day.outside{opacity:.48}
    .vilco-cal-day.today{border-color:#80683f;background:#17140f}
    .vilco-cal-day-head{display:flex;align-items:center;justify-content:space-between;gap:6px}
    .vilco-cal-date{font-size:11px;font-weight:700;color:#c8c8c2}
    .vilco-cal-day.today .vilco-cal-date{color:#e6c78e}
    .vilco-cal-add{border:0;background:transparent;color:#c9a86e;font:600 10px Montserrat,system-ui,sans-serif;cursor:pointer;padding:3px}
    .vilco-cal-add:hover{color:#f5dfb7}
    .vilco-cal-empty{color:#555550;font-size:10px;margin-top:3px}
    .vilco-cal-entry{position:relative;text-align:left;width:100%;padding:8px;border:1px solid #29251d;border-radius:9px;background:#14120e;color:#eee;cursor:pointer}
    .vilco-cal-entry:hover{border-color:#80683f;background:#19160f}
    .vilco-cal-entry-title{display:block;font-size:10px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}
    .vilco-cal-entry-meta{display:flex;justify-content:space-between;gap:5px;margin-top:5px;color:#99968e;font-size:9px}
    .vilco-cal-entry-status{display:inline-flex;align-items:center;gap:4px;margin-top:5px;color:#aaa;font-size:9px}
    .vilco-cal-dot{width:6px;height:6px;border-radius:50%;display:inline-block}
    .vilco-cal-thumb{width:28px;height:28px;object-fit:cover;border-radius:6px;float:right;margin-left:5px;border:1px solid #29251d}
    .vilco-cal-modal-backdrop{position:fixed;z-index:99999;inset:0;background:rgba(0,0,0,.76);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:16px}
    .vilco-cal-modal{width:min(640px,100%);max-height:min(90vh,850px);overflow:auto;background:#111;border:1px solid #302a1f;border-radius:18px;box-shadow:0 25px 90px rgba(0,0,0,.6);padding:22px}
    .vilco-cal-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}
    .vilco-cal-modal-title{margin:0;color:#f5f5f0;font:500 24px 'Playfair Display',Georgia,serif}
    .vilco-cal-modal-subtitle{margin:6px 0 0;color:#858580;font:11px/1.5 Montserrat,system-ui,sans-serif}
    .vilco-cal-close{width:34px;height:34px;border:1px solid #292929;border-radius:50%;background:#171717;color:#aaa;font-size:18px;cursor:pointer;flex-shrink:0}
    .vilco-cal-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .vilco-cal-field{display:flex;flex-direction:column;gap:6px;min-width:0}
    .vilco-cal-field.full{grid-column:1/-1}
    .vilco-cal-field label{color:#c9a86e;font:600 10px Montserrat,system-ui,sans-serif;letter-spacing:.06em}
    .vilco-cal-field input,.vilco-cal-field select,.vilco-cal-field textarea{width:100%;min-height:40px;padding:10px 11px;border:1px solid #2a2a2a;border-radius:9px;background:#0b0b0b;color:#f5f5f0;font:12px Montserrat,system-ui,sans-serif;outline:none}
    .vilco-cal-field textarea{min-height:90px;resize:vertical;line-height:1.5}
    .vilco-cal-field input:focus,.vilco-cal-field select:focus,.vilco-cal-field textarea:focus{border-color:#8d7244}
    .vilco-cal-form-hint{color:#777770;font:10px/1.5 Montserrat,system-ui,sans-serif}
    .vilco-cal-form-error{min-height:18px;margin:10px 0 0;color:#f0a49a;font:11px Montserrat,system-ui,sans-serif}
    .vilco-cal-form-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid #242424}
    .vilco-cal-form-actions-right{display:flex;gap:8px;margin-left:auto}
    .vilco-cal-button.danger{border-color:#59302c;color:#e2a29a}
    .vilco-cal-button:disabled{opacity:.55;cursor:wait}
    @media(max-width:700px){.vilco-cal-weekdays{display:none}.vilco-cal-grid{grid-template-columns:1fr;gap:7px}.vilco-cal-day{min-height:70px;padding:11px}.vilco-cal-day.outside{display:none}.vilco-cal-empty{display:none}.vilco-cal-day-head{margin-bottom:1px}.vilco-cal-entry{max-width:none}.vilco-cal-entry-title{font-size:11px}.vilco-cal-entry-meta,.vilco-cal-entry-status{font-size:10px}}
    @media(max-width:520px){.vilco-cal-modal{padding:17px;border-radius:15px}.vilco-cal-modal-title{font-size:21px}.vilco-cal-form-grid{grid-template-columns:1fr}.vilco-cal-field.full{grid-column:auto}.vilco-cal-toolbar{align-items:stretch}.vilco-cal-actions{justify-content:space-between}.vilco-cal-month{justify-content:space-between;width:100%}.vilco-cal-month-label{min-width:0}}
  `;
  document.head.appendChild(style);

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function button(label, className, handler, ariaLabel) {
    const node = element("button", "vilco-cal-button" + (className ? " " + className : ""), label);
    node.type = "button";
    if (ariaLabel) node.setAttribute("aria-label", ariaLabel);
    node.addEventListener("click", handler);
    return node;
  }

  async function request(url, options) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: { "Content-Type": "application/json", ...(options && options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
    return data;
  }

  function readLibrary() {
    try {
      const state = JSON.parse(localStorage.getItem(APP_STATE_KEY) || "{}");
      return Array.isArray(state.items) ? state.items.filter((item) => item && item.id && item.status !== "Archivar") : [];
    } catch {
      return [];
    }
  }

  function localDay(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function parseLocalDay(value) {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !part)) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function findCalendar() {
    const root = document.getElementById("root");
    if (!root) return null;
    const heading = Array.from(root.querySelectorAll("h2")).find((item) =>
      item.dataset.vilcoCalendarTitle === "true" || item.textContent.trim().startsWith("Calendario 30 días")
    );
    if (!heading) return null;
    const main = heading.closest("main");
    const panel = main && main.firstElementChild;
    if (!panel) return null;
    const grid = Array.from(panel.children).find((item) => item.classList.contains("grid") && item.children.length > 20);
    return grid ? { heading, main, panel, grid } : null;
  }

  function makeCalendarUi() {
    const ui = element("section", "vilco-calendar-ui");
    ui.setAttribute("aria-label", "Agenda de contenido VILCO");
    const toolbar = element("div", "vilco-cal-toolbar");
    const monthControls = element("div", "vilco-cal-month");
    const actions = element("div", "vilco-cal-actions");
    const monthLabel = element("strong", "vilco-cal-month-label");
    const status = element("div", "vilco-cal-status", "Cargando el calendario compartido…");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const note = element("div", "vilco-cal-note");
    const noteStrong = element("strong", "", "Planificación manual.");
    note.append(noteStrong, document.createTextNode(" Los cambios se guardan en la nube para que aparezcan en tu computadora y celular. El estado “Programado” organiza el trabajo; VILCO todavía no publica automáticamente en Meta."));
    const weekdays = element("div", "vilco-cal-weekdays");
    WEEKDAYS.forEach((day) => weekdays.appendChild(element("div", "vilco-cal-weekday", day)));
    const board = element("div", "vilco-cal-grid");
    ui.append(toolbar, note, status, weekdays, board);
    ui._monthControls = monthControls;
    ui._actions = actions;
    ui._monthLabel = monthLabel;
    ui._status = status;
    ui._board = board;
    ui._prev = button("‹", "", () => changeMonth(-1), "Mes anterior");
    ui._today = button("Hoy", "", () => { currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); render(); }, "Ir al mes actual");
    ui._next = button("›", "", () => changeMonth(1), "Mes siguiente");
    ui._new = button("+ Nueva publicación", "primary", () => openForm(localDay(new Date())), "Agregar una publicación al calendario");
    monthControls.append(ui._prev, monthLabel, ui._next, ui._today);
    actions.append(ui._new);
    toolbar.append(monthControls, actions);
    return ui;
  }

  function changeMonth(delta) {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    render();
  }

  function updateHeader(found, ui) {
    found.heading.dataset.vilcoCalendarTitle = "true";
    if (found.heading.textContent !== "Calendario de contenido") found.heading.textContent = "Calendario de contenido";
    const description = found.heading.parentElement && found.heading.parentElement.querySelector("p");
    const descriptionText = "Organizá tus publicaciones de Vilco por fecha, formato y estado. El plan se comparte entre tus dispositivos.";
    if (description && description.textContent !== descriptionText) description.textContent = descriptionText;
    const oldCopyButton = Array.from(found.panel.querySelectorAll("button")).find((item) => item.textContent.trim() === "Copiar plan 30 días");
    if (oldCopyButton) oldCopyButton.remove();
    const autoLabel = Array.from(found.panel.querySelectorAll("div,span")).find((item) => item.childElementCount === 0 && ["v4 persistente • auto-plan IA", "Planificación con ayuda de IA"].includes(item.textContent.trim()));
    if (autoLabel) autoLabel.textContent = "Agenda compartida";
    found.grid.hidden = true;
    found.grid.style.display = "none";
    if (!ui.isConnected) found.grid.after(ui);
    activeUi = ui;
  }

  function mount() {
    const found = findCalendar();
    if (!found) return;
    let ui = found.panel.querySelector(":scope > .vilco-calendar-ui");
    if (!ui) ui = makeCalendarUi();
    updateHeader(found, ui);
    render();
    if (!loaded && !loading) loadEntries(ui);
  }

  async function loadEntries(ui) {
    loading = true;
    ui._status.textContent = "Cargando el calendario compartido…";
    try {
      const data = await request(API_URL, { method: "GET" });
      entries = Array.isArray(data.items) ? data.items : [];
      loaded = true;
      ui._status.textContent = entries.length ? `${entries.length} publicación${entries.length === 1 ? "" : "es"} en la agenda.` : "Todavía no hay publicaciones. Agregá la primera desde un día del calendario.";
      render();
    } catch (error) {
      ui._status.textContent = error.message;
      const retry = button("Reintentar carga", "", () => { loaded = false; loadEntries(ui); });
      ui._status.append(" ", retry);
    } finally {
      loading = false;
    }
  }

  function render() {
    const ui = activeUi;
    if (!ui || !ui.isConnected) return;
    ui._monthLabel.textContent = MONTHS.format(currentMonth);
    const board = ui._board;
    board.replaceChildren();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayOffset);
    const today = localDay(new Date());
    const totalCells = Math.ceil((mondayOffset + new Date(year, month + 1, 0).getDate()) / 7) * 7;

    for (let offset = 0; offset < totalCells; offset += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
      const dayKey = localDay(date);
      const dayEntries = entries.filter((entry) => entry.day === dayKey).sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
      const card = element("article", "vilco-cal-day" + (date.getMonth() !== month ? " outside" : "") + (dayKey === today ? " today" : ""));
      card.dataset.date = dayKey;
      const head = element("div", "vilco-cal-day-head");
      const dateLabel = element("span", "vilco-cal-date", `${WEEKDAYS[(date.getDay() + 6) % 7]} ${date.getDate()}`);
      const add = element("button", "vilco-cal-add", "+ Agregar");
      add.type = "button";
      add.setAttribute("aria-label", `Agregar publicación para ${SHORT_DATE.format(date)}`);
      add.addEventListener("click", () => {
        if (date.getMonth() !== month || date.getFullYear() !== year) {
          currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
          render();
        }
        openForm(dayKey);
      });
      head.append(dateLabel, add);
      card.appendChild(head);

      if (!dayEntries.length) card.appendChild(element("div", "vilco-cal-empty", "Sin contenido"));
      dayEntries.forEach((entry) => card.appendChild(renderEntry(entry)));
      board.appendChild(card);
    }
  }

  function renderEntry(entry) {
    const card = element("button", "vilco-cal-entry");
    card.type = "button";
    card.setAttribute("aria-label", `Editar ${entry.title || "publicación"}, ${entry.format || "contenido"}, ${entry.time || "sin horario"}`);
    card.addEventListener("click", () => openForm(entry.day, entry));
    const media = readLibrary().find((item) => String(item.id) === String(entry.mediaId));
    if (media && media.url && media.fileType === "image") {
      const image = document.createElement("img");
      image.className = "vilco-cal-thumb";
      image.src = media.url;
      image.alt = "Material adjunto";
      image.loading = "lazy";
      card.appendChild(image);
    }
    card.appendChild(element("span", "vilco-cal-entry-title", entry.title || "Publicación"));
    card.appendChild(element("span", "vilco-cal-entry-meta", `${entry.time || ""} · ${entry.format || "Contenido"}`));
    const status = element("span", "vilco-cal-entry-status");
    const dot = element("span", "vilco-cal-dot");
    dot.style.backgroundColor = STATUS_COLORS[entry.status] || STATUS_COLORS.Idea;
    status.append(dot, document.createTextNode(`${entry.channel || "Instagram"} · ${entry.status || "Idea"}`));
    card.appendChild(status);
    return card;
  }

  function addField(form, labelText, name, options) {
    const config = options || {};
    const wrapper = element("div", "vilco-cal-field" + (config.full ? " full" : ""));
    const label = element("label", "", labelText);
    label.htmlFor = `vilco-calendar-${name}`;
    let control;
    if (config.options) {
      control = document.createElement("select");
      config.options.forEach((option) => {
        const item = document.createElement("option");
        item.value = option;
        item.textContent = option;
        control.appendChild(item);
      });
    } else if (config.multiline) {
      control = document.createElement("textarea");
    } else {
      control = document.createElement("input");
      control.type = config.type || "text";
      if (config.maxLength) control.maxLength = config.maxLength;
      if (config.required) control.required = true;
    }
    control.id = label.htmlFor;
    control.name = name;
    if (config.maxLength && config.multiline) control.maxLength = config.maxLength;
    wrapper.append(label, control);
    if (config.hint) wrapper.appendChild(element("small", "vilco-cal-form-hint", config.hint));
    form.appendChild(wrapper);
    return control;
  }

  function openForm(day, entry) {
    const backdrop = element("div", "vilco-cal-modal-backdrop");
    backdrop.setAttribute("role", "presentation");
    const dialog = element("section", "vilco-cal-modal");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "vilco-cal-modal-title");
    const head = element("div", "vilco-cal-modal-head");
    const titleBlock = document.createElement("div");
    const title = element("h3", "vilco-cal-modal-title", entry ? "Editar publicación" : "Nueva publicación");
    title.id = "vilco-cal-modal-title";
    titleBlock.append(title, element("p", "vilco-cal-modal-subtitle", "Organizá el contenido de VILCO y guardá el plan para abrirlo desde cualquier dispositivo."));
    const close = element("button", "vilco-cal-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Cerrar formulario");
    head.append(titleBlock, close);
    const form = document.createElement("form");
    form.noValidate = false;
    const fields = {};
    fields.title = addField(form, "TÍTULO O IDEA", "title", { required: true, maxLength: 160, full: true });
    fields.day = addField(form, "FECHA", "day", { type: "date", required: true });
    fields.time = addField(form, "HORARIO", "time", { type: "time", required: true });
    fields.channel = addField(form, "CANAL", "channel", { options: CHANNELS });
    fields.format = addField(form, "FORMATO", "format", { options: FORMATS });
    fields.status = addField(form, "ESTADO", "status", { options: STATUSES });

    const library = readLibrary();
    const mediaOptions = ["Sin material adjunto", ...library.map((item) => item.id)];
    fields.mediaId = addField(form, "MATERIAL DE BIBLIOTECA", "mediaId", { options: mediaOptions, full: true, hint: library.length ? "El archivo queda vinculado desde la Biblioteca de VILCO." : "Todavía no hay material cargado. Subí primero la foto o el video en Mesa de trabajo / Biblioteca." });
    const mediaSelect = fields.mediaId;
    mediaSelect.options[0].value = "";
    library.forEach((item, index) => {
      const option = mediaSelect.options[index + 1];
      option.textContent = `${item.name || item.category || "Material"}${item.fileType ? " · " + item.fileType : ""}`;
    });

    fields.caption = addField(form, "COPY / CAPTION", "caption", { multiline: true, maxLength: 5000, full: true });
    fields.cta = addField(form, "LLAMADO A LA ACCIÓN", "cta", { maxLength: 300, full: true });
    fields.notes = addField(form, "NOTAS INTERNAS", "notes", { multiline: true, maxLength: 2000, full: true });

    fields.title.value = entry && entry.title || "";
    fields.day.value = entry && entry.day || day || localDay(new Date());
    fields.time.value = entry && entry.time || "19:00";
    fields.channel.value = entry && CHANNELS.includes(entry.channel) ? entry.channel : "Instagram";
    fields.format.value = entry && FORMATS.includes(entry.format) ? entry.format : "Reel";
    fields.status.value = entry && STATUSES.includes(entry.status) ? entry.status : "Idea";
    fields.mediaId.value = entry && entry.mediaId && library.some((item) => String(item.id) === String(entry.mediaId)) ? entry.mediaId : "";
    fields.caption.value = entry && entry.caption || "";
    fields.cta.value = entry && entry.cta || "";
    fields.notes.value = entry && entry.notes || "";

    const error = element("div", "vilco-cal-form-error");
    error.setAttribute("role", "status");
    const footer = element("div", "vilco-cal-form-actions");
    const remove = entry ? button("Eliminar", "danger", () => deleteEntry(entry, error, remove, submit, closeDialog)) : element("span");
    if (!entry) remove.setAttribute("aria-hidden", "true");
    const right = element("div", "vilco-cal-form-actions-right");
    const cancel = button("Cancelar", "", closeDialog);
    const submit = button(entry ? "Guardar cambios" : "Guardar en el calendario", "primary", () => {}, "Guardar la publicación");
    submit.type = "submit";
    right.append(cancel, submit);
    footer.append(remove, right);
    form.append(error, footer);
    dialog.append(head, form);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    let busy = false;
    function setBusy(value) {
      busy = value;
      submit.disabled = value;
      cancel.disabled = value;
      close.disabled = value;
      if (entry) remove.disabled = value;
      submit.textContent = value ? "Guardando…" : entry ? "Guardar cambios" : "Guardar en el calendario";
    }
    function closeDialog() {
      if (busy) return;
      backdrop.remove();
      document.removeEventListener("keydown", onKeyDown);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") closeDialog();
    }
    close.addEventListener("click", closeDialog);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeDialog(); });
    document.addEventListener("keydown", onKeyDown);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;
      const payload = Object.fromEntries(new FormData(form).entries());
      if (!payload.title.trim()) { fields.title.focus(); return; }
      setBusy(true);
      error.textContent = "";
      try {
        const data = await request(API_URL, {
          method: entry ? "PATCH" : "POST",
          body: JSON.stringify({ ...(entry ? { id: entry.id } : {}), ...payload }),
        });
        if (entry) entries = entries.map((item) => item.id === entry.id ? data.item : item);
        else entries = [...entries, data.item];
        closeDialog();
        render();
        if (activeUi && activeUi._status) activeUi._status.textContent = "✓ Publicación guardada en la agenda compartida.";
      } catch (cause) {
        error.textContent = cause.message || "No se pudo guardar. Probá nuevamente.";
        setBusy(false);
      }
    });
    fields.title.focus();
  }

  async function deleteEntry(entry, error, removeButton, submitButton, closeDialog) {
    if (!window.confirm(`¿Eliminar “${entry.title || "esta publicación"}” del calendario?`)) return;
    removeButton.disabled = true;
    submitButton.disabled = true;
    error.textContent = "Eliminando…";
    try {
      await request(API_URL, { method: "DELETE", body: JSON.stringify({ id: entry.id }) });
      entries = entries.filter((item) => item.id !== entry.id);
      closeDialog();
      render();
      if (activeUi && activeUi._status) activeUi._status.textContent = "Publicación eliminada del calendario.";
    } catch (cause) {
      error.textContent = cause.message || "No se pudo eliminar.";
      removeButton.disabled = false;
      submitButton.disabled = false;
    }
  }

  let mountQueued = false;
  function queueMount(records) {
    if (records && !records.some((record) => {
      const target = record.target && (record.target.nodeType === 1 ? record.target : record.target.parentElement);
      return !target || !target.closest || !target.closest(".vilco-calendar-ui");
    })) return;
    if (mountQueued) return;
    mountQueued = true;
    requestAnimationFrame(() => {
      mountQueued = false;
      mount();
    });
  }

  const observer = new MutationObserver(queueMount);
  function start() {
    const root = document.getElementById("root");
    if (!root) return;
    observer.observe(root, { childList: true, subtree: true });
    queueMount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();

