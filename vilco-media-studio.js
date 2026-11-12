(function () {
  "use strict";
  var BUTTON_ID = "vilco-media-studio-open";
  var BUILTIN = [
    { id: "todo", label: "Todo" },
    { id: "parrillada", label: "Parrillada" },
    { id: "pescados", label: "Pescados / Boga" },
    { id: "eventos", label: "Eventos" },
    { id: "salon", label: "Salón / Ambiente" },
    { id: "detalles", label: "Detalles / Chimichurri" },
    { id: "archivados", label: "Archivados" }
  ];
  var overlay, draft, revision, selected = new Set(), pendingEdits = [], dirty = false;
  var editorImage = null, editorItem = null, rotation = 0, aspect = "original";
  var dragId = null, filter = "all", search = "", busy = false;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ("vms-" + Date.now() + "-" + Math.random().toString(16).slice(2)); }
  function folders() {
    var list = BUILTIN.slice();
    (draft && Array.isArray(draft.customFolders) ? draft.customFolders : []).forEach(function (folder) {
      if (folder && folder.id && !list.some(function (x) { return x.id === folder.id; })) list.push({ id: folder.id, label: folder.label || folder.id });
    });
    return list;
  }
  function folderName(id) {
    var found = folders().find(function (folder) { return folder.id === id; });
    return found ? found.label : (id || "Todo");
  }
  function note(message, error) {
    var el = overlay && overlay.querySelector("#vms-message");
    if (el) { el.textContent = message || ""; el.className = error ? "vms-message error" : "vms-message"; }
  }
  function markDirty(message) {
    dirty = true;
    var save = overlay && overlay.querySelector("#vms-save");
    if (save) { save.disabled = false; save.textContent = pendingEdits.length ? "Guardar cambios en Neon" : "Guardar cambios"; }
    if (message) note(message, false);
  }
  async function request(url, options) {
    var response = await fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, options || {}));
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var error = new Error(data.error || "No se pudo completar la acción.");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }
  function installStyles() {
    if (document.getElementById("vilco-media-studio-style")) return;
    var style = document.createElement("style");
    style.id = "vilco-media-studio-style";
    style.textContent = ".vms-button{height:36px;padding:0 14px;border-radius:999px;border:1px solid #6a5735;background:#15130f;color:#e7c98d;font:600 11px Montserrat,Arial,sans-serif;cursor:pointer;white-space:nowrap}.vms-button:hover{border-color:#c9a86e;background:#211c13}.vms-overlay{position:fixed;inset:0;z-index:10020;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:14px;font-family:Montserrat,Arial,sans-serif;color:#efeee9}.vms-modal{width:min(1120px,100%);height:min(92vh,900px);display:flex;flex-direction:column;background:#0c0c0b;border:1px solid #34312a;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.65);overflow:hidden}.vms-head,.vms-foot{display:flex;align-items:center;gap:12px;padding:14px 18px;background:#10100e;border-bottom:1px solid #24231f}.vms-head h2{margin:0;font:600 21px Georgia,serif;color:#e4d1a6}.vms-head p{margin:4px 0 0;font-size:10px;color:#99978f;line-height:1.45}.vms-head .spacer{flex:1}.vms-x{width:34px;height:34px;border:1px solid #333;border-radius:50%;background:#171715;color:#eee;font-size:19px;cursor:pointer}.vms-body{overflow:auto;padding:16px 18px;flex:1}.vms-note{padding:10px 12px;background:#15140f;border:1px solid #413725;border-radius:10px;color:#cdbb94;font-size:11px;line-height:1.5;margin-bottom:14px}.vms-controls{display:grid;grid-template-columns:minmax(180px,1.4fr) minmax(140px,.8fr) minmax(155px,.9fr) auto;gap:8px;align-items:center;margin-bottom:10px}.vms-controls input,.vms-controls select,.vms-name,.vms-editor select,.vms-group-name{height:38px;background:#141413;border:1px solid #33322d;border-radius:9px;color:#eee;padding:0 10px;font:12px Montserrat,Arial,sans-serif;min-width:0}.vms-controls button,.vms-action,.vms-editor button{height:36px;padding:0 11px;border:1px solid #35332c;border-radius:9px;background:#171715;color:#e6d4ae;font:600 10px Montserrat,Arial,sans-serif;cursor:pointer;white-space:nowrap}.vms-controls button:hover,.vms-action:hover,.vms-editor button:hover{border-color:#c9a86e}.vms-toolbar{display:flex;flex-wrap:wrap;gap:7px;align-items:center;padding:10px 0;border-top:1px solid #24231f;border-bottom:1px solid #24231f;margin-bottom:12px}.vms-toolbar .vms-group-name{width:165px}.vms-toolbar label{display:flex;gap:7px;align-items:center;font-size:10px;color:#aaa79d}.vms-count{font-size:10px;color:#aaa;margin-right:auto}.vms-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:12px}.vms-card{background:#11110f;border:1px solid #2e2d28;border-radius:12px;padding:9px;min-width:0}.vms-card.dragging{opacity:.45}.vms-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.vms-check{display:flex;gap:7px;align-items:center;font-size:10px;color:#aaa}.vms-preview{height:142px;background:#080808;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#bfa36f;font-size:32px}.vms-preview img{width:100%;height:100%;object-fit:cover}.vms-video-mark{font-size:11px;letter-spacing:1px}.vms-name{width:100%;margin:8px 0 6px}.vms-card-meta{min-height:18px;font-size:9px;color:#a49e90;display:flex;justify-content:space-between;gap:5px}.vms-card-actions{display:flex;gap:5px;margin-top:8px}.vms-action{height:30px;padding:0 9px}.vms-empty{grid-column:1/-1;padding:34px 15px;border:1px dashed #413b30;border-radius:12px;text-align:center;color:#aaa;font:13px Georgia,serif}.vms-foot{border-top:1px solid #24231f;border-bottom:0;justify-content:space-between}.vms-foot small{font-size:9px;color:#888;line-height:1.4}.vms-save{height:40px;padding:0 18px;border:0;border-radius:999px;background:#e3d0a8;color:#14120e;font:700 11px Montserrat,Arial,sans-serif;cursor:pointer}.vms-save:disabled{opacity:.45;cursor:not-allowed}.vms-message{min-height:19px;margin:0 0 10px;color:#a8c69c;font-size:10px}.vms-message.error{color:#e4a39b}.vms-editor{padding:12px;margin:0 0 14px;background:#121210;border:1px solid #38352c;border-radius:12px}.vms-editor-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}.vms-editor-head strong{font:16px Georgia,serif;color:#e4d1a6}.vms-editor-head span{margin-left:auto}.vms-editor-canvas{display:block;max-width:100%;max-height:40vh;margin:8px auto;background:#080808;border-radius:8px;object-fit:contain}.vms-editor-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.vms-editor select{height:34px}.vms-editor-help{font-size:9px;color:#999;line-height:1.4;margin:8px 0 0}.vms-reload{display:none}.vms-reload.show{display:inline-flex}@media(max-width:650px){.vms-overlay{padding:0;align-items:flex-end}.vms-modal{height:96vh;border-radius:16px 16px 0 0}.vms-head,.vms-foot{padding:11px 13px}.vms-head h2{font-size:18px}.vms-body{padding:12px}.vms-controls{grid-template-columns:1fr 1fr}.vms-controls input{grid-column:1/-1}.vms-toolbar{gap:6px}.vms-toolbar .vms-group-name{width:145px}.vms-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.vms-preview{height:115px}.vms-card{padding:7px}.vms-card-actions{flex-wrap:wrap}.vms-action{font-size:9px;padding:0 7px}.vms-foot small{max-width:58%}}";
    document.head.appendChild(style);
  }
  function button(label, cls, action) {
    var b = document.createElement("button");
    b.type = "button"; b.className = cls || "vms-action"; b.textContent = label;
    if (action) b.addEventListener("click", action);
    return b;
  }
  function allItems() { return draft && Array.isArray(draft.items) ? draft.items : []; }
  function visibleItems() {
    var term = search.trim().toLocaleLowerCase();
    return allItems().filter(function (item) {
      if (filter === "archivados" ? item.status !== "Archivar" : filter !== "all" && filter !== "todo" && item.folder !== filter) return false;
      if (filter === "todo" && item.status === "Archivar") return false;
      var hay = [item.name, item.category, item.groupName, item.folder].join(" ").toLocaleLowerCase();
      return !term || hay.indexOf(term) !== -1;
    });
  }
  function renderOptions() {
    var filterSelect = overlay.querySelector("#vms-filter-folder");
    var moveSelect = overlay.querySelector("#vms-move-folder");
    if (!filterSelect || !moveSelect) return;
    var oldFilter = filterSelect.value || filter;
    filterSelect.innerHTML = "";
    var all = document.createElement("option"); all.value = "all"; all.textContent = "Todas las carpetas"; filterSelect.appendChild(all);
    folders().forEach(function (folder) {
      var option = document.createElement("option"); option.value = folder.id; option.textContent = folder.label; filterSelect.appendChild(option);
    });
    filterSelect.value = folders().some(function (folder) { return folder.id === oldFilter; }) ? oldFilter : "all";
    moveSelect.innerHTML = "";
    folders().forEach(function (folder) {
      var option = document.createElement("option"); option.value = folder.id; option.textContent = folder.label; moveSelect.appendChild(option);
    });
    if (!folders().some(function (folder) { return folder.id === moveSelect.value; })) moveSelect.value = "parrillada";
  }
  function updateSelectionLabel() {
    var label = overlay.querySelector("#vms-count");
    if (label) label.textContent = selected.size + " seleccionados · " + visibleItems().length + " visibles";
    var save = overlay.querySelector("#vms-save");
    if (save) save.disabled = !(dirty || pendingEdits.length);
  }
  function markFolderTag(item, target) {
    item.folder = target;
    if (target === "archivados") item.status = "Archivar";
    else if (item.status === "Archivar") item.status = "POR DEFINIR";
  }
  function normalizeGroups() {
    var seen = {};
    allItems().forEach(function (item) {
      if (!item.groupId) return;
      seen[item.groupId] = (seen[item.groupId] || 0) + 1;
      item.groupOrder = seen[item.groupId];
    });
  }
  function renderCards() {
    var host = overlay && overlay.querySelector("#vms-grid");
    if (!host || !draft) return;
    host.innerHTML = "";
    var items = visibleItems();
    if (!items.length) {
      var empty = document.createElement("div"); empty.className = "vms-empty";
      empty.textContent = allItems().length ? "No hay material en esta vista. Probá otra carpeta o búsqueda." : "La biblioteca está vacía. Cuando subas fotos o videos, vas a poder seleccionarlos y organizarlos acá.";
      host.appendChild(empty); updateSelectionLabel(); return;
    }
    items.forEach(function (item) {
      var card = document.createElement("article"); card.className = "vms-card"; card.draggable = true;
      var top = document.createElement("div"); top.className = "vms-card-top";
      var selectLabel = document.createElement("label"); selectLabel.className = "vms-check";
      var check = document.createElement("input"); check.type = "checkbox"; check.checked = selected.has(item.id);
      check.addEventListener("change", function () { if (check.checked) selected.add(item.id); else selected.delete(item.id); updateSelectionLabel(); });
      selectLabel.appendChild(check); selectLabel.appendChild(document.createTextNode("Seleccionar"));
      var folder = document.createElement("span"); folder.className = "vms-card-meta"; folder.textContent = folderName(item.folder);
      top.appendChild(selectLabel); top.appendChild(folder); card.appendChild(top);

      var preview = document.createElement("div"); preview.className = "vms-preview";
      if (/^image\//i.test(item.fileType || "") && item.url) {
        var img = document.createElement("img"); img.alt = item.name || "Foto de VILCO"; img.src = item.url; img.loading = "lazy";
        img.onerror = function () { preview.textContent = "FOTO"; };
        preview.appendChild(img);
      } else {
        var marker = document.createElement("span"); marker.className = "vms-video-mark"; marker.textContent = /^video\//i.test(item.fileType || "") ? "VIDEO" : "VILCO";
        preview.appendChild(marker);
      }
      card.appendChild(preview);
      var name = document.createElement("input"); name.type = "text"; name.className = "vms-name"; name.maxLength = 120; name.value = item.name || ""; name.setAttribute("aria-label", "Nombre visible");
      name.addEventListener("change", function () {
        var next = name.value.trim();
        if (!next) { name.value = item.name || ""; note("El nombre no puede quedar vacío.", true); return; }
        if (next !== item.name) { item.name = next; markDirty("Nombre listo para guardar."); }
      });
      card.appendChild(name);
      var meta = document.createElement("div"); meta.className = "vms-card-meta";
      meta.textContent = (item.groupName ? item.groupFormat + " · " + item.groupName + (item.groupOrder ? " · #" + item.groupOrder : "") : "Sin grupo") + " · " + (item.status || "Por revisar");
      card.appendChild(meta);
      var actions = document.createElement("div"); actions.className = "vms-card-actions";
      var up = button("↑", "vms-action", function () { reorder(item.id, -1); }); up.title = "Mover antes";
      var down = button("↓", "vms-action", function () { reorder(item.id, 1); }); down.title = "Mover después";
      actions.appendChild(up); actions.appendChild(down);
      if (/^image\//i.test(item.fileType || "") && item.url) actions.appendChild(button("Editar foto", "vms-action", function () { openEditor(item); }));
      card.appendChild(actions);
      card.addEventListener("dragstart", function (event) { dragId = item.id; card.classList.add("dragging"); if (event.dataTransfer) event.dataTransfer.setData("text/plain", item.id); });
      card.addEventListener("dragend", function () { card.classList.remove("dragging"); dragId = null; });
      card.addEventListener("dragover", function (event) { event.preventDefault(); });
      card.addEventListener("drop", function (event) { event.preventDefault(); var from = dragId || (event.dataTransfer && event.dataTransfer.getData("text/plain")); if (from && from !== item.id) swapItems(from, item.id); });
      host.appendChild(card);
    });
    updateSelectionLabel();
  }
  function swapItems(firstId, secondId) {
    var a = allItems().findIndex(function (item) { return item.id === firstId; });
    var b = allItems().findIndex(function (item) { return item.id === secondId; });
    if (a < 0 || b < 0 || a === b) return;
    var temp = draft.items[a]; draft.items[a] = draft.items[b]; draft.items[b] = temp;
    normalizeGroups(); markDirty("Orden actualizado; guardalo para compartirlo."); renderCards();
  }
  function reorder(id, direction) {
    var current = visibleItems(), index = current.findIndex(function (item) { return item.id === id; });
    var other = current[index + direction];
    if (other) swapItems(id, other.id);
  }
  function buildModal() {
    installStyles();
    overlay = document.createElement("div"); overlay.className = "vms-overlay"; overlay.id = "vilco-media-studio";
    overlay.innerHTML = '<section class="vms-modal" role="dialog" aria-modal="true" aria-labelledby="vms-title"><header class="vms-head"><div><h2 id="vms-title">Organizador de material</h2><p>Renombrá, mové, agrupá y ordená tus fotos y videos en el espacio compartido.</p></div><span class="spacer"></span><button id="vms-close" class="vms-x" type="button" aria-label="Cerrar">×</button></header><div class="vms-body"><div class="vms-note">Sin IA ni API paga. El recorte y giro se procesan en este navegador. Una copia editada se guarda en Neon cuando confirmás los cambios y ocupa espacio de almacenamiento.</div><p id="vms-message" class="vms-message">Cargando material compartido…</p><button id="vms-reload" class="vms-action vms-reload" type="button">Recargar biblioteca</button><div class="vms-controls"><input id="vms-search" type="search" placeholder="Buscar por nombre o grupo" aria-label="Buscar"><select id="vms-filter-folder" aria-label="Filtrar por carpeta"></select><select id="vms-move-folder" aria-label="Carpeta de destino"></select><button id="vms-move" type="button">Mover selección</button></div><div class="vms-toolbar"><span id="vms-count" class="vms-count">0 seleccionados</span><input id="vms-new-folder" class="vms-group-name" type="text" maxlength="50" placeholder="Nueva carpeta"><button id="vms-create-folder" type="button">Crear carpeta</button><input id="vms-group-name" class="vms-group-name" type="text" maxlength="80" placeholder="Nombre del grupo"><select id="vms-group-format" aria-label="Formato del grupo"><option>Carrusel</option><option>Reel · archivos para editar</option><option>Serie de historias</option></select><button id="vms-group" type="button">Agrupar selección</button><button id="vms-ungroup" type="button">Quitar grupo</button></div><section id="vms-editor" class="vms-editor" hidden><div class="vms-editor-head"><strong id="vms-editor-title">Editar una copia</strong><span><button id="vms-editor-close" type="button">Cerrar editor</button></span></div><canvas id="vms-canvas" class="vms-editor-canvas" width="480" height="320"></canvas><div class="vms-editor-tools"><button id="vms-rotate-left" type="button">Girar −90°</button><button id="vms-rotate-right" type="button">Girar +90°</button><label class="vms-check">Recorte<select id="vms-aspect" aria-label="Formato de recorte"><option value="original">Original</option><option value="1:1">Cuadrado 1:1</option><option value="4:5">Feed 4:5</option><option value="9:16">Historia/Reel 9:16</option></select></label><button id="vms-copy" type="button">Preparar copia</button></div><p class="vms-editor-help">El original se conserva. La copia editada queda pendiente hasta que pulses «Guardar cambios en Neon».</p></section><div id="vms-grid" class="vms-grid"></div></div><footer class="vms-foot"><small>Los cambios se comparten entre dispositivos después de guardarlos. Los videos se pueden agrupar y ordenar; la edición local de esta versión es para fotos.</small><button id="vms-save" class="vms-save" type="button" disabled>Guardar cambios</button></footer></section>';
    document.body.appendChild(overlay);
    overlay.addEventListener("mousedown", function (event) { if (event.target === overlay) closeModal(); });
    overlay.querySelector("#vms-close").addEventListener("click", closeModal);
    overlay.querySelector("#vms-search").addEventListener("input", function () { search = this.value; renderCards(); });
    overlay.querySelector("#vms-filter-folder").addEventListener("change", function () { filter = this.value; renderCards(); });
    overlay.querySelector("#vms-move").addEventListener("click", function () {
      if (!selected.size) { note("Seleccioná uno o más archivos para mover.", true); return; }
      var target = overlay.querySelector("#vms-move-folder").value;
      allItems().forEach(function (item) { if (selected.has(item.id)) markFolderTag(item, target); });
      markDirty("Selección movida a " + folderName(target) + ". Guardá para sincronizar."); renderCards();
    });
    overlay.querySelector("#vms-create-folder").addEventListener("click", function () {
      var input = overlay.querySelector("#vms-new-folder"), label = input.value.trim();
      if (!label) { note("Escribí el nombre de la carpeta.", true); return; }
      if (folders().some(function (folder) { return folder.label.toLocaleLowerCase() === label.toLocaleLowerCase(); })) { note("Ya existe una carpeta con ese nombre.", true); return; }
      var id = label.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || ("carpeta-" + Date.now());
      if (folders().some(function (folder) { return folder.id === id; })) id += "-" + Date.now().toString(36);
      draft.customFolders = Array.isArray(draft.customFolders) ? draft.customFolders : [];
      draft.customFolders.push({ id: id, label: label });
      input.value = ""; markDirty("Carpeta creada. Guardá para que aparezca en todos tus dispositivos."); renderOptions(); renderCards();
    });
    overlay.querySelector("#vms-group").addEventListener("click", function () {
      if (!selected.size) { note("Seleccioná material para agrupar.", true); return; }
      var format = overlay.querySelector("#vms-group-format").value;
      if (format === "Carrusel" && selected.size < 2) { note("Un carrusel necesita al menos dos archivos.", true); return; }
      var name = overlay.querySelector("#vms-group-name").value.trim() || (format + " " + new Date().toLocaleDateString("es-AR"));
      var groupId = uuid(), order = 1;
      allItems().forEach(function (item) { if (selected.has(item.id)) { item.groupId = groupId; item.groupName = name; item.groupFormat = format; item.groupOrder = order++; } });
      markDirty("Grupo creado. Ajustá el orden con las flechas o arrastrando."); selected.clear(); renderCards();
    });
    overlay.querySelector("#vms-ungroup").addEventListener("click", function () {
      if (!selected.size) { note("Seleccioná material para quitar del grupo.", true); return; }
      allItems().forEach(function (item) { if (selected.has(item.id)) { delete item.groupId; delete item.groupName; delete item.groupFormat; delete item.groupOrder; } });
      markDirty("Se quitó la selección de su grupo."); renderCards();
    });
    overlay.querySelector("#vms-save").addEventListener("click", persistDraft);
    overlay.querySelector("#vms-reload").addEventListener("click", reloadDraft);
    overlay.querySelector("#vms-editor-close").addEventListener("click", closeEditor);
    overlay.querySelector("#vms-rotate-left").addEventListener("click", function () { rotation = (rotation + 270) % 360; drawEditor(); });
    overlay.querySelector("#vms-rotate-right").addEventListener("click", function () { rotation = (rotation + 90) % 360; drawEditor(); });
    overlay.querySelector("#vms-aspect").addEventListener("change", function () { aspect = this.value; drawEditor(); });
    overlay.querySelector("#vms-copy").addEventListener("click", prepareEditedCopy);
    document.addEventListener("keydown", keyClose);
  }
  function keyClose(event) { if (event.key === "Escape" && overlay) closeModal(); }
  function closeModal() {
    if (!overlay) return;
    document.removeEventListener("keydown", keyClose);
    overlay.remove(); overlay = null; draft = null; selected.clear(); pendingEdits = []; dirty = false;
    document.body.style.overflow = "";
  }
  function closeEditor() {
    var panel = overlay && overlay.querySelector("#vms-editor");
    if (panel) panel.hidden = true;
    editorImage = null; editorItem = null;
  }
  function openEditor(item) {
    if (!/^image\//i.test(item.fileType || "") || !item.url) { note("La edición local está disponible para fotos; los videos se pueden organizar y agrupar.", true); return; }
    editorItem = item; editorImage = new Image(); rotation = 0; aspect = "original";
    var panel = overlay.querySelector("#vms-editor"); panel.hidden = false;
    overlay.querySelector("#vms-editor-title").textContent = "Editar una copia · " + (item.name || "foto");
    overlay.querySelector("#vms-aspect").value = aspect;
    var canvas = overlay.querySelector("#vms-canvas");
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    note("Cargando foto para edición local…");
    editorImage.crossOrigin = "anonymous";
    editorImage.onload = function () { drawEditor(); note("Elegí giro y recorte; el original no cambia."); };
    editorImage.onerror = function () { note("No se pudo abrir esta foto para editarla. Podés seguir organizándola.", true); };
    editorImage.src = item.url;
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function rotatedSource() {
    var w = editorImage.naturalWidth, h = editorImage.naturalHeight, swap = rotation % 180 !== 0;
    var canvas = document.createElement("canvas"); canvas.width = swap ? h : w; canvas.height = swap ? w : h;
    var ctx = canvas.getContext("2d"); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(rotation * Math.PI / 180); ctx.drawImage(editorImage, -w / 2, -h / 2);
    return canvas;
  }
  function cropGeometry(source) {
    var ratio = source.width / source.height;
    if (aspect === "1:1") ratio = 1; else if (aspect === "4:5") ratio = 4 / 5; else if (aspect === "9:16") ratio = 9 / 16;
    var sw = source.width, sh = source.height, cw = sw, ch = sh;
    if (sw / sh > ratio) cw = sh * ratio; else ch = sw / ratio;
    return { sx: (sw - cw) / 2, sy: (sh - ch) / 2, cw: cw, ch: ch };
  }
  function drawEditor() {
    if (!editorImage || !editorImage.complete || !editorImage.naturalWidth) return;
    var source = rotatedSource(), crop = cropGeometry(source), canvas = overlay.querySelector("#vms-canvas");
    var scale = Math.min(1, 900 / crop.cw, 440 / crop.ch);
    canvas.width = Math.max(1, Math.round(crop.cw * scale)); canvas.height = Math.max(1, Math.round(crop.ch * scale));
    canvas.getContext("2d").drawImage(source, crop.sx, crop.sy, crop.cw, crop.ch, 0, 0, canvas.width, canvas.height);
  }
  function prepareEditedCopy() {
    if (!editorImage || !editorItem) return;
    var source = rotatedSource(), crop = cropGeometry(source), out = document.createElement("canvas");
    var scale = Math.min(1, 4096 / crop.cw, 4096 / crop.ch);
    out.width = Math.max(1, Math.round(crop.cw * scale)); out.height = Math.max(1, Math.round(crop.ch * scale));
    out.getContext("2d").drawImage(source, crop.sx, crop.sy, crop.cw, crop.ch, 0, 0, out.width, out.height);
    var mime = editorItem.fileType === "image/png" ? "image/png" : "image/jpeg";
    out.toBlob(function (blob) {
      if (!blob) { note("El navegador no pudo preparar la copia.", true); return; }
      var stem = String(editorItem.name || "foto").replace(/\.[^.]+$/, "").trim() || "foto";
      pendingEdits.push({ blob: blob, base: clone(editorItem), name: stem + " - copia editada" + (mime === "image/png" ? ".png" : ".jpg"), mime: mime, uploaded: null });
      markDirty("Copia editada lista; se subirá a Neon al guardar."); closeEditor(); updateSelectionLabel();
    }, mime, 0.92);
  }
  function createEditedItem(pending, upload) {
    var copy = Object.assign({}, pending.base, upload);
    copy.id = uuid(); copy.name = pending.name; copy.fileType = pending.mime; copy.createdAt = new Date().toISOString(); copy.derivedFrom = pending.base.id;
    delete copy.groupId; delete copy.groupName; delete copy.groupFormat; delete copy.groupOrder;
    return copy;
  }
  async function persistDraft() {
    if (busy || !draft) return;
    if (!dirty && !pendingEdits.length) { note("No hay cambios para guardar."); return; }
    busy = true;
    var save = overlay.querySelector("#vms-save"); save.disabled = true; save.textContent = "Guardando…";
    try {
      if (pendingEdits.length) {
        var latest = await request("/api/state");
        if (String(latest.revision || "") !== String(revision || "")) {
          var conflict = new Error("Otro dispositivo guardó cambios. Recargá antes de editar esta versión.");
          conflict.status = 409; throw conflict;
        }
        for (var i = 0; i < pendingEdits.length; i++) {
          var pending = pendingEdits[i];
          if (!pending.uploaded) {
            if (typeof window.__VILCO_UPLOAD_MEDIA__ !== "function") throw new Error("La carga privada todavía no está lista. Recargá VILCO e intentá otra vez.");
            var uploaded = await window.__VILCO_UPLOAD_MEDIA__(pending.blob, pending.name, pending.mime);
            pending.uploaded = createEditedItem(pending, uploaded);
          }
          if (!draft.items.some(function (item) { return item.id === pending.uploaded.id; })) draft.items.push(pending.uploaded);
        }
      }
      draft.savedAt = new Date().toISOString(); draft.count = draft.items.length;
      var body = { state: draft };
      if (revision != null && revision !== "") body.expectedRevision = String(revision);
      var saved = await request("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      revision = saved.revision || revision;
      note("Guardado en Neon. Actualizando la mesa…");
      setTimeout(function () { window.location.reload(); }, 650);
    } catch (error) {
      if (error.status === 409) {
        var reloadButton = overlay.querySelector("#vms-reload");
        if (reloadButton) reloadButton.classList.add("show");
        note("Hay cambios de otro dispositivo. Recargá la biblioteca antes de volver a guardar.", true);
      } else note(error.message || "No se pudo guardar en Neon.", true);
      busy = false; save.disabled = !(dirty || pendingEdits.length); save.textContent = "Guardar cambios";
    }
  }
  async function reloadDraft() {
    try {
      var remote = await request("/api/state");
      draft = remote.state || { items: [], customFolders: [], savedAt: new Date().toISOString() };
      draft.items = Array.isArray(draft.items) ? draft.items : [];
      draft.customFolders = Array.isArray(draft.customFolders) ? draft.customFolders : [];
      revision = remote.revision || null; selected.clear(); pendingEdits = []; dirty = false; search = ""; filter = "all";
      overlay.querySelector("#vms-search").value = "";
      renderOptions(); renderCards(); note("Cambios actualizados desde el espacio compartido.");
    } catch (error) { note(error.message || "No se pudo actualizar.", true); }
  }
  function createButton() {
    if (document.getElementById(BUTTON_ID) || !window.__VILCO_BOOT_READY__) return;
    var gate = document.getElementById("vilco-gate");
    if (gate && !gate.hidden) return;
    var root = document.getElementById("root");
    if (!root) return;
    var guide = Array.from(root.querySelectorAll("button")).find(function (button) { return button.textContent.trim() === "Guía"; });
    if (!guide || !guide.parentElement) return;
    var open = document.createElement("button");
    open.id = BUTTON_ID; open.type = "button"; open.className = "vms-button"; open.textContent = "Organizar material";
    open.setAttribute("aria-label", "Abrir organizador de material");
    open.addEventListener("click", openModal);
    guide.parentElement.insertBefore(open, guide);
  }
  async function openModal() {
    if (overlay) return;
    selected.clear(); pendingEdits = []; dirty = false; search = ""; filter = "all"; busy = false;
    buildModal(); document.body.style.overflow = "hidden";
    try {
      var remote = await request("/api/state");
      draft = remote.state || { items: [], customFolders: [], savedAt: new Date().toISOString() };
      draft.items = Array.isArray(draft.items) ? draft.items : [];
      draft.customFolders = Array.isArray(draft.customFolders) ? draft.customFolders : [];
      revision = remote.revision || null;
      renderOptions(); renderCards(); note("Material cargado desde el espacio compartido.");
    } catch (error) { note(error.message || "No se pudo cargar el material compartido.", true); }
  }
  function start() {
    var root = document.getElementById("root");
    if (!root) { setTimeout(start, 600); return; }
    createButton();
    new MutationObserver(createButton).observe(root, { childList: true, subtree: true });
    setInterval(createButton, 1500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();