import crypto from "node:crypto";
export const META_GRAPH_VERSION = "v27.0";
export const TARGET_INSTAGRAM_USERNAME = "vilco.laborde";

export function normalizeInstagramUsername(value) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}
export function validTokenEncryptionKey(raw) {
  if (typeof raw !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(raw)) return false;
  const bytes = Buffer.from(raw, "base64");
  return bytes.length === 32 && bytes.toString("base64") === raw;
}
export function encryptInstagramToken(token, encodedKey) {
  if (!validTokenEncryptionKey(encodedKey)) throw new Error("Instagram token encryption is not configured.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(encodedKey, "base64"), iv);
  const ciphertext = Buffer.concat([cipher.update(String(token), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}
export function decryptInstagramToken(value, encodedKey) {
  if (!validTokenEncryptionKey(encodedKey)) throw new Error("Instagram token encryption is not configured.");
  const [version, ivText, tagText, ciphertextText] = String(value || "").split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) throw new Error("Stored Instagram token is invalid.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(encodedKey, "base64"), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64")), decipher.final()]).toString("utf8");
}
function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function stateSignature(state, secret) {
  return crypto.createHmac("sha256", secret).update(state).digest("hex");
}
export function createInstagramOAuthState(secret, now = Date.now()) {
  if (!secret) throw new Error("VILCO session security is not configured.");
  const state = String(now + 10 * 60 * 1000) + "." + crypto.randomBytes(32).toString("base64url");
  return { state, cookieValue: state + "." + stateSignature(state, secret) };
}
export function verifyInstagramOAuthState(receivedState, cookieValue, secret, now = Date.now()) {
  if (!receivedState || !cookieValue || !secret) return false;
  const lastDot = cookieValue.lastIndexOf(".");
  if (lastDot < 1) return false;
  const state = cookieValue.slice(0, lastDot);
  const suppliedSignature = cookieValue.slice(lastDot + 1);
  const expiry = Number(state.slice(0, state.indexOf(".")));
  return Number.isFinite(expiry) && expiry > now &&
    safeEqual(receivedState, state) && safeEqual(suppliedSignature, stateSignature(state, secret));
}
export function buildUnifiedInstagramLoginUrl({ appId, configId, redirectUri, state }) {
  const url = new URL("https://www.facebook.com/" + META_GRAPH_VERSION + "/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("config_id", configId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}
export function metricValue(payload, name) {
  const metric = Array.isArray(payload && payload.data) ? payload.data.find((entry) => entry && entry.name === name) : null;
  if (!metric) return null;
  if (metric.total_value && typeof metric.total_value.value === "number") return metric.total_value.value;
  const values = Array.isArray(metric.values) ? metric.values : [];
  const numbers = values.map((item) => item && item.value).filter((value) => typeof value === "number" && Number.isFinite(value));
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) : null;
}
export function metricSeries(payload, name) {
  const metric = Array.isArray(payload && payload.data) ? payload.data.find((entry) => entry && entry.name === name) : null;
  if (!metric || !Array.isArray(metric.values)) return [];
  return metric.values
    .filter((item) => item && typeof item.value === "number" && Number.isFinite(item.value))
    .map((item) => ({ value: item.value, endTime: item.end_time || null }));
}
