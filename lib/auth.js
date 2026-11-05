import crypto from "node:crypto";

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function signature(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}
export function verifySession(req) {
  const secret = process.env.VILCO_SESSION_SECRET;
  if (!secret) return false;
  const raw = (req.headers.cookie || "").split(";").map((x) => x.trim()).find((x) => x.startsWith("vilco_session="));
  if (!raw) return false;
  const token = decodeURIComponent(raw.slice("vilco_session=".length));
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expires = token.slice(0, dot);
  const supplied = token.slice(dot + 1);
  if (!/^\d+$/.test(expires) || Number(expires) <= Date.now()) return false;
  return safeEqual(supplied, signature(expires, secret));
}
export function checkPassword(input) {
  const expected = process.env.VILCO_MANAGER_PASSWORD;
  if (!expected || !input) return false;
  return safeEqual(input, expected);
}
export function createSessionCookie() {
  const secret = process.env.VILCO_SESSION_SECRET;
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  const token = expires + "." + signature(expires, secret);
  return "vilco_session=" + encodeURIComponent(token) + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800";
}
export function clearSessionCookie() {
  return "vilco_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}
