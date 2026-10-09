import crypto from "node:crypto";
import { verifySession } from "./_auth.js";

const SUPABASE_URL = "https://budnbinxfwgkcfgawlsa.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_ROOT = SUPABASE_URL + "/storage/v1";
const BUCKET = "vilco-media";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

function apiHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
  };
}

function replyError(res, status, message) {
  return res.status(status).json({ error: message });
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function validPath(path) {
  return typeof path === "string" &&
    path.startsWith("uploads/") &&
    !path.split("/").some((part) => !part || part === "." || part === "..") &&
    /^[A-Za-z0-9._/-]+$/.test(path);
}

function absoluteStorageUrl(value) {
  if (typeof value !== "string" || !value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/storage/v1/")) return SUPABASE_URL + value;
  return STORAGE_ROOT + (value.startsWith("/") ? value : "/" + value);
}

async function storageJson(path, body) {
  const response = await fetch(STORAGE_ROOT + path, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body || {}),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("VILCO storage operation failed:", response.status);
    throw new Error("Storage operation failed");
  }
  return data;
}

async function signOne(path) {
  const data = await storageJson("/object/sign/" + BUCKET + "/" + encodePath(path), { expiresIn: 604800 });
  const url = absoluteStorageUrl(data.signedURL || data.signedUrl || data.url);
  if (!url) throw new Error("No signed URL returned");
  return url;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return replyError(res, 405, "Método no permitido.");
  }
  if (!verifySession(req)) return replyError(res, 401, "Ingresá la contraseña de VILCO para continuar.");
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return replyError(res, 503, "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el entorno seguro de Vercel.");
  }

  const action = req.body && req.body.action;
  try {
    if (action === "prepare-upload") {
      const name = String(req.body.name || "archivo").replace(/[^A-Za-z0-9._-]/g, "_").slice(-90) || "archivo";
      const type = String(req.body.type || "");
      const size = Number(req.body.size || 0);
      if (!/^(image|video)\//i.test(type)) return replyError(res, 415, "Solo se pueden subir imágenes y videos.");
      if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) {
        return replyError(res, 413, "El archivo debe pesar menos de 50 MB.");
      }

      const path = "uploads/" + crypto.randomUUID() + "-" + name;
      const data = await storageJson("/object/upload/sign/" + BUCKET + "/" + encodePath(path), {});
      let uploadUrl = absoluteStorageUrl(data.signedUrl || data.signedURL || data.url);
      const token = data.token || (uploadUrl ? new URL(uploadUrl).searchParams.get("token") : "");
      if (!token) return replyError(res, 502, "No se pudo preparar la carga del archivo.");
      if (!uploadUrl) {
        uploadUrl = STORAGE_ROOT + "/object/upload/sign/" + BUCKET + "/" + encodePath(path);
      }
      const upload = new URL(uploadUrl);
      upload.searchParams.set("token", token);
      return res.status(200).json({ path, uploadUrl: upload.toString() });
    }

    if (action === "sign") {
      const paths = Array.isArray(req.body.paths) ? [...new Set(req.body.paths)] : [];
      if (paths.length > 250 || paths.some((path) => !validPath(path))) {
        return replyError(res, 400, "La lista de archivos no es válida.");
      }
      const urls = {};
      const errors = {};
      for (let start = 0; start < paths.length; start += 10) {
        const group = paths.slice(start, start + 10);
        const results = await Promise.all(group.map(async (path) => {
          try { return [path, await signOne(path), null]; }
          catch { return [path, "", "No se pudo abrir este archivo."]; }
        }));
        for (const [path, url, error] of results) {
          if (url) urls[path] = url;
          else errors[path] = error;
        }
      }
      return res.status(200).json({ urls, errors });
    }

    return replyError(res, 400, "Acción de almacenamiento desconocida.");
  } catch (error) {
    console.error("VILCO media request failed:", error?.message || "unknown error");
    return replyError(res, 502, "No se pudo preparar el archivo en la nube.");
  }
}
