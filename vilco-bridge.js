;(function () {
  "use strict";

  async function request(method, body) {
    const response = await fetch("/api/meta-chat", {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch (_) {
      payload = {};
    }
    if (!response.ok) {
      const error = new Error(payload.error || "No se pudo conectar con el asistente.");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  window.VilcoMetaChatBridge = Object.freeze({
    load: function () {
      return request("GET");
    },
    send: function (message) {
      return request("POST", { message });
    }
  });
})();
