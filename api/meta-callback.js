import { exchangeInstagramCode, graphGet, instagramEnvironmentStatus, saveInstagramConnection } from "./_instagram.js";
import { normalizeInstagramUsername, TARGET_INSTAGRAM_USERNAME, verifyInstagramOAuthState } from "./_instagram-core.js";

function readCookie(req, name) {
  const item = (req.headers.cookie || "").split(";").map((value) => value.trim()).find((value) => value.startsWith(name + "="));
  if (!item) return "";
  try { return decodeURIComponent(item.slice(name.length + 1)); } catch { return ""; }
}
function clearStateCookie(res) {
  res.setHeader("Set-Cookie", "vilco_instagram_state=; Path=/api/meta-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
}
function returnToApp(res, outcome) {
  let origin = "https://vilco-manager-git-codex-neon-free-migration-vilco-manager.vercel.app";
  try { origin = new URL(process.env.META_REDIRECT_URI || origin + "/api/meta-callback").origin; } catch {}
  const destination = new URL("/vilco-v4.html", origin);
  destination.searchParams.set("instagram", outcome);
  res.statusCode = 302;
  res.setHeader("Location", destination.toString());
  return res.end();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Método no permitido.");
  }
  const setup = instagramEnvironmentStatus();
  const query = req.query || {};
  const state = String(query.state || "");
  const code = String(query.code || "");
  const cookie = readCookie(req, "vilco_instagram_state");
  clearStateCookie(res);
  if (!verifyInstagramOAuthState(state, cookie, process.env.VILCO_SESSION_SECRET)) return returnToApp(res, "state-error");
  if (query.error) return returnToApp(res, "cancelled");
  if (!code || !setup.ready) return returnToApp(res, "configuration-error");

  let stage = "code-exchange";
  try {
    const tokenData = await exchangeInstagramCode(code);
    const accessToken = tokenData.access_token;
    stage = "business-account";
    const business = await graphGet("me", { fields: "client_business_id" }, accessToken);
    const businessId = String(business.client_business_id || "");
    if (!businessId) return returnToApp(res, "business-not-found");
    stage = "instagram-assets";
    const assigned = await graphGet("me/assigned_instagram_accounts", { fields: "id,username", limit: 100 }, accessToken);
    const accounts = Array.isArray(assigned.data) ? assigned.data : [];
    const account = accounts.find((item) => normalizeInstagramUsername(item && item.username) === TARGET_INSTAGRAM_USERNAME);
    if (!account || !account.id) return returnToApp(res, "account-mismatch");
    const expiresAt = Number(tokenData.expires_in) > 0
      ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
      : null;
    stage = "save-connection";
    await saveInstagramConnection({
      businessId,
      configId: process.env.META_CONFIG_ID,
      instagramId: String(account.id),
      username: TARGET_INSTAGRAM_USERNAME,
      token: accessToken,
      expiresAt,
    });
    return returnToApp(res, "connected");
  } catch (error) {
    console.error("VILCO Instagram OAuth failed:", stage, Number(error && error.code) || 0);
    return returnToApp(res, "connection-error");
  }
}
