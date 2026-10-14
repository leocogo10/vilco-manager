import crypto from "node:crypto";

export const META_GRAPH_VERSION = "v26.0";
const SUPABASE_URL = "https://budnbinxfwgkcfgawlsa.supabase.co";
const CONNECTION_URL = SUPABASE_URL + "/rest/v1/vilco_meta_connections";
const CONNECTION_ID = "workspace";

export class MetaApiError extends Error {
  constructor(message, code = 0) {
    super(message);
    this.name = "MetaApiError";
    this.code = Number(code) || 0;
  }
}

export function metaConfigurationReady() {
  return Boolean(
    process.env.META_APP_ID &&
    process.env.META_APP_SECRET &&
    process.env.META_REDIRECT_URI &&
    validEncryptionKey() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function validEncryptionKey() {
  const raw = process.env.META_TOKEN_ENCRYPTION_KEY || "";
  if (!/^[A-Za-z0-9+/]{43}=$/.test(raw)) return false;
  return Buffer.from(raw, "base64").length === 32;
}

function encryptionKey() {
  if (!validEncryptionKey()) throw new Error("Meta token encryption is not configured.");
  return Buffer.from(process.env.META_TOKEN_ENCRYPTION_KEY, "base64");
}

export function encryptMetaToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptMetaToken(value) {
  const [version, ivText, tagText, ciphertextText] = String(value || "").split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) throw new Error("Stored Meta token is invalid.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function appSecretProof(token) {
  return crypto.createHmac("sha256", process.env.META_APP_SECRET).update(token).digest("hex");
}

export function graphUrl(path, params = {}, token = "") {
  const cleanPath = String(path).replace(/^\/+/, "");
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/${cleanPath}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  if (token) url.searchParams.set("appsecret_proof", appSecretProof(token));
  return url;
}

export async function graphGet(path, params, token) {
  const url = graphUrl(path, params, token);
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new MetaApiError("Meta no pudo completar la consulta de datos.", data.error?.code || response.status);
  }
  return data;
}

function databaseHeaders(prefer) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Secure database access is not configured.");
  return {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

export async function getMetaConnection() {
  const response = await fetch(CONNECTION_URL + "?id=eq." + CONNECTION_ID + "&select=id,token_ciphertext,page_id,page_name,instagram_user_id,instagram_username,updated_at", {
    headers: databaseHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Could not load the Meta connection.");
  const rows = await response.json();
  return rows[0] || null;
}

export async function saveMetaConnection(value) {
  const response = await fetch(CONNECTION_URL + "?on_conflict=id", {
    method: "POST",
    headers: databaseHeaders("resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify([{
      id: CONNECTION_ID,
      token_ciphertext: encryptMetaToken(value.token),
      page_id: value.pageId,
      page_name: value.pageName,
      instagram_user_id: value.instagramUserId || null,
      instagram_username: value.instagramUsername || null,
      updated_at: new Date().toISOString(),
    }]),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Could not save the Meta connection.");
}

export async function deleteMetaConnection() {
  const response = await fetch(CONNECTION_URL + "?id=eq." + CONNECTION_ID, {
    method: "DELETE",
    headers: databaseHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Could not remove the Meta connection.");
}

export function publicConnection(connection) {
  if (!connection) return { connected: false };
  return {
    connected: true,
    page: { id: connection.page_id, name: connection.page_name },
    instagram: connection.instagram_user_id ? {
      id: connection.instagram_user_id,
      username: connection.instagram_username,
    } : null,
    connectedAt: connection.updated_at,
  };
}

export function sumInsightValues(payload) {
  const metric = Array.isArray(payload?.data) ? payload.data[0] : null;
  if (!metric) return null;
  if (typeof metric.total_value?.value === "number") return metric.total_value.value;
  const values = Array.isArray(metric.values) ? metric.values : [];
  const numbers = values.map((item) => item?.value).filter((value) => typeof value === "number");
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) : null;
}

