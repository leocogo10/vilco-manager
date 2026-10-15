import crypto from "node:crypto";
import { graphGet, META_GRAPH_VERSION, saveMetaConnection } from "./_meta.js";

function safeEqual(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ""));
  const right = Buffer.from(String(rightValue || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function readCookie(req, name) {
  const item = (req.headers.cookie || "").split(";").map((value) => value.trim()).find((value) => value.startsWith(name + "="));
  if (!item) return "";
  try { return decodeURIComponent(item.slice(name.length + 1)); }
  catch { return ""; }
}

function clearStateCookie(res) {
  res.setHeader("Set-Cookie", "vilco_meta_state=; Path=/api/meta-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
}

function returnToApp(res, outcome) {
  const callback = new URL(process.env.META_REDIRECT_URI || "https://vilco-manager-git-vilco-v4-preview-vilco-manager.vercel.app/api/meta-callback");
  const destination = new URL("/vilco-v4.html", callback.origin);
  destination.searchParams.set("meta", outcome);
  res.statusCode = 302;
  res.setHeader("Location", destination.toString());
  return res.end();
}

function samePage(page, candidate) {
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return String(page.id) === "100083309292219" || normalize(page.name) === normalize("Vilco.Laborde") || normalize(candidate?.username) === normalize("vilco.laborde");
}

async function tokenExchange(params) {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error("Meta rechazó el intercambio de autorización.");
    error.code = Number(data.error?.code) || response.status;
    error.meta = {
      httpStatus: response.status,
      type: String(data.error?.type || "").slice(0, 60),
      code: Number(data.error?.code) || 0,
      subcode: Number(data.error?.error_subcode) || 0,
      isTransient: Boolean(data.error?.is_transient),
    };
    throw error;
  }
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Método no permitido.");
  }
  const incomingState = String(req.query?.state || "");
  const code = String(req.query?.code || "");
  const savedState = readCookie(req, "vilco_meta_state");
  clearStateCookie(res);

  if (req.query?.error) return returnToApp(res, "cancelled");
  const dot = savedState.indexOf(".");
  const state = dot > 0 ? savedState.slice(0, dot) : "";
  const signature = dot > 0 ? savedState.slice(dot + 1) : "";
  const expected = process.env.VILCO_SESSION_SECRET
    ? crypto.createHmac("sha256", process.env.VILCO_SESSION_SECRET).update(state).digest("hex")
    : "";
  if (!state || !code || !safeEqual(incomingState, state) || !safeEqual(signature, expected)) {
    return returnToApp(res, "state-error");
  }

  let stage = "short-token";
  try {
    stage = "short-token";
    const appToken = await tokenExchange({
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: process.env.META_REDIRECT_URI,
      code,
    });
    stage = "long-token";
    const longToken = await tokenExchange({
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      fb_exchange_token: appToken.access_token,
    });
    stage = "list-pages";
    const accounts = await graphGet("me/accounts", {
      fields: "id,name,access_token,tasks,instagram_business_account{id,username}",
      limit: 100,
    }, longToken.access_token);
    const pages = Array.isArray(accounts.data) ? accounts.data : [];
    const preferred = pages.filter((page) => samePage(page, page.instagram_business_account));
    const page = preferred.length === 1 ? preferred[0] : pages.length === 1 ? pages[0] : null;
    if (!page?.id || !page?.access_token) return returnToApp(res, "page-not-found");
    stage = "save-connection";
    await saveMetaConnection({
      token: page.access_token,
      pageId: page.id,
      pageName: page.name || "Facebook Page",
      instagramUserId: page.instagram_business_account?.id || "",
      instagramUsername: page.instagram_business_account?.username || "",
    });
    return returnToApp(res, "connected");
  } catch (error) {
    const details = error?.meta || {};
    console.error("VILCO Meta OAuth failed:", stage, error?.name || "Error", JSON.stringify({
      httpStatus: Number(details.httpStatus) || 0,
      type: String(details.type || "").slice(0, 60),
      code: Number(details.code) || Number(error?.code) || 0,
      subcode: Number(details.subcode) || 0,
      isTransient: Boolean(details.isTransient),
      hasAppId: Boolean(process.env.META_APP_ID),
      hasAppSecret: Boolean(process.env.META_APP_SECRET),
      hasRedirectUri: Boolean(process.env.META_REDIRECT_URI),
    }));
    return returnToApp(res, "connection-error");
  }
}

