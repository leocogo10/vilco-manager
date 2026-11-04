import crypto from "node:crypto";
import { getDatabase } from "./_db.js";
import { META_GRAPH_VERSION, decryptInstagramToken, encryptInstagramToken, validTokenEncryptionKey } from "./_instagram-core.js";

export class InstagramApiError extends Error {
  constructor(code = 0, status = 0) {
    super("Meta Instagram API request failed.");
    this.name = "InstagramApiError";
    this.code = Number(code) || 0;
    this.status = Number(status) || 0;
  }
}

export function instagramEnvironmentStatus() {
  const missing = [];
  for (const key of ["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI", "META_CONFIG_ID"]) {
    if (!process.env[key]) missing.push(key);
  }
  if (!validTokenEncryptionKey(process.env.META_TOKEN_ENCRYPTION_KEY || "")) missing.push("META_TOKEN_ENCRYPTION_KEY");
  if (!process.env.VILCO_SESSION_SECRET) missing.push("VILCO_SESSION_SECRET");
  const callbackValid = validCallback(process.env.META_REDIRECT_URI || "");
  return { ready: missing.length === 0 && callbackValid, missing, callbackValid };
}

export function validCallback(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname === "/api/meta-callback" && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function appSecretProof(token) {
  return crypto.createHmac("sha256", process.env.META_APP_SECRET).update(token).digest("hex");
}

export async function graphGet(path, params, token) {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const url = new URL("https://graph.facebook.com/" + META_GRAPH_VERSION + "/" + cleanPath);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  url.searchParams.set("access_token", token);
  if (process.env.META_APP_SECRET) url.searchParams.set("appsecret_proof", appSecretProof(token));
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new InstagramApiError(data.error && data.error.code, response.status);
  return data;
}

export async function exchangeInstagramCode(code) {
  const url = new URL("https://graph.facebook.com/" + META_GRAPH_VERSION + "/oauth/access_token");
  url.searchParams.set("client_id", process.env.META_APP_ID);
  url.searchParams.set("client_secret", process.env.META_APP_SECRET);
  url.searchParams.set("code", code);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error || !data.access_token) throw new InstagramApiError(data.error && data.error.code, response.status);
  return data;
}

export async function getInstagramConnection() {
  const sql = getDatabase();
  const rows = await sql`SELECT id, client_business_id, config_id, instagram_user_id, username,
    token_ciphertext, token_expires_at, connected_at, updated_at, status,
    last_sync_attempt_at, last_sync_success_at
    FROM public.vilco_instagram_connections WHERE id = 'workspace' LIMIT 1`;
  return rows[0] || null;
}

export async function getLatestInstagramSnapshot() {
  const sql = getDatabase();
  const rows = await sql`SELECT instagram_user_id, snapshot_day, fetched_at, period_start, period_end,
    followers_count, media_count, current_metrics, previous_metrics, daily_reach, media_performance
    FROM public.vilco_instagram_metric_snapshots ORDER BY fetched_at DESC LIMIT 1`;
  return rows[0] || null;
}

export async function getInstagramSnapshotHistory(limit = 90) {
  const sql = getDatabase();
  const boundedLimit = Math.max(1, Math.min(90, Number(limit) || 90));
  const rows = await sql`SELECT snapshot_day, fetched_at, followers_count, media_count, current_metrics, previous_metrics
    FROM public.vilco_instagram_metric_snapshots ORDER BY snapshot_day DESC LIMIT ${boundedLimit}`;
  return rows;
}

export async function saveInstagramConnection({ businessId, configId, instagramId, username, token, expiresAt }) {
  const sql = getDatabase();
  const ciphertext = encryptInstagramToken(token, process.env.META_TOKEN_ENCRYPTION_KEY);
  await sql`INSERT INTO public.vilco_instagram_connections
    (id, client_business_id, config_id, instagram_user_id, username, token_ciphertext,
     token_expires_at, connected_at, updated_at, status, last_sync_attempt_at, last_sync_success_at)
    VALUES ('workspace', ${businessId}, ${configId}, ${instagramId}, ${username}, ${ciphertext},
     ${expiresAt}, now(), now(), 'connected', NULL, NULL)
    ON CONFLICT (id) DO UPDATE SET
      client_business_id = EXCLUDED.client_business_id,
      config_id = EXCLUDED.config_id,
      instagram_user_id = EXCLUDED.instagram_user_id,
      username = EXCLUDED.username,
      token_ciphertext = EXCLUDED.token_ciphertext,
      token_expires_at = EXCLUDED.token_expires_at,
      connected_at = now(),
      updated_at = now(),
      status = 'connected',
      last_sync_attempt_at = NULL,
      last_sync_success_at = NULL`;
}

export async function noteInstagramSyncAttempt() {
  const sql = getDatabase();
  await sql`UPDATE public.vilco_instagram_connections
    SET last_sync_attempt_at = now(), updated_at = now()
    WHERE id = 'workspace' AND status = 'connected'`;
}

export async function noteInstagramSyncSuccess() {
  const sql = getDatabase();
  await sql`UPDATE public.vilco_instagram_connections
    SET last_sync_success_at = now(), status = 'connected', updated_at = now()
    WHERE id = 'workspace'`;
}

export async function setInstagramConnectionStatus(status) {
  if (!["connected", "reauth_required", "disconnected"].includes(status)) throw new Error("Invalid Instagram connection status.");
  const sql = getDatabase();
  if (status === "disconnected") {
    await sql`UPDATE public.vilco_instagram_connections
      SET status = 'disconnected', token_ciphertext = NULL, updated_at = now()
      WHERE id = 'workspace'`;
    return;
  }
  await sql`UPDATE public.vilco_instagram_connections SET status = ${status}, updated_at = now()
    WHERE id = 'workspace'`;
}

export async function saveInstagramSnapshot(snapshot) {
  const sql = getDatabase();
  await sql`INSERT INTO public.vilco_instagram_metric_snapshots
    (instagram_user_id, snapshot_day, fetched_at, period_start, period_end,
     followers_count, media_count, current_metrics, previous_metrics, daily_reach, media_performance)
    VALUES (${snapshot.instagramUserId}, ${snapshot.snapshotDay}::date, ${snapshot.fetchedAt}::timestamptz,
     ${snapshot.periodStart}::timestamptz, ${snapshot.periodEnd}::timestamptz,
     ${snapshot.followersCount}, ${snapshot.mediaCount}, ${JSON.stringify(snapshot.currentMetrics)}::jsonb,
     ${JSON.stringify(snapshot.previousMetrics)}::jsonb, ${JSON.stringify(snapshot.dailyReach)}::jsonb,
     ${JSON.stringify(snapshot.mediaPerformance)}::jsonb)
    ON CONFLICT (instagram_user_id, snapshot_day) DO UPDATE SET
      fetched_at = EXCLUDED.fetched_at,
      period_start = EXCLUDED.period_start,
      period_end = EXCLUDED.period_end,
      followers_count = EXCLUDED.followers_count,
      media_count = EXCLUDED.media_count,
      current_metrics = EXCLUDED.current_metrics,
      previous_metrics = EXCLUDED.previous_metrics,
      daily_reach = EXCLUDED.daily_reach,
      media_performance = EXCLUDED.media_performance`;
}

export function decryptConnectionToken(connection) {
  if (!connection || !connection.token_ciphertext) return null;
  return decryptInstagramToken(connection.token_ciphertext, process.env.META_TOKEN_ENCRYPTION_KEY);
}

export function publicInstagramConnection(connection) {
  if (!connection) return { connected: false, status: "not_connected" };
  return {
    connected: connection.status === "connected" && Boolean(connection.token_ciphertext),
    status: connection.status,
    username: connection.username ? "@" + connection.username.replace(/^@/, "") : null,
    connectedAt: connection.connected_at || null,
    tokenExpiresAt: connection.token_expires_at || null,
    lastUpdatedAt: connection.last_sync_success_at || null,
  };
}

export function publicInstagramSnapshot(row) {
  if (!row) return null;
  return {
    snapshotDay: row.snapshot_day,
    fetchedAt: row.fetched_at,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    followersCount: row.followers_count === null ? null : Number(row.followers_count),
    mediaCount: row.media_count === null ? null : Number(row.media_count),
    currentMetrics: row.current_metrics || {},
    previousMetrics: row.previous_metrics || {},
    dailyReach: Array.isArray(row.daily_reach) ? row.daily_reach : [],
    mediaPerformance: Array.isArray(row.media_performance) ? row.media_performance : [],
  };
}
