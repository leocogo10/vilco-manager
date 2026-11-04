import { verifySession } from "./_auth.js";
import {
  decryptConnectionToken, getInstagramConnection, getInstagramSnapshotHistory, getLatestInstagramSnapshot,
  graphGet, InstagramApiError, instagramEnvironmentStatus, noteInstagramSyncAttempt,
  noteInstagramSyncSuccess, publicInstagramConnection, publicInstagramSnapshot,
  saveInstagramSnapshot, setInstagramConnectionStatus,
} from "./_instagram.js";
import { metricSeries, metricValue } from "./_instagram-core.js";

const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const MIN_ATTEMPT_GAP_MS = 5 * 60 * 1000;
const PERIOD_DAYS = 30;
const ACCOUNT_METRICS = ["views", "reach", "accounts_engaged", "total_interactions"];
const MEDIA_METRICS = ["comments", "likes", "reach", "saved", "shares", "total_interactions", "views"];

function error(res, status, message) { return res.status(status).json({ error: message }); }
function unixSeconds(date) { return Math.floor(date.getTime() / 1000); }
function fromDate(value, days) { return new Date(value.getTime() - days * 24 * 60 * 60 * 1000); }
async function accountMetricMap(instagramId, token, params) {
  const values = await Promise.all(ACCOUNT_METRICS.map(async (name) => {
    try {
      const payload = await graphGet(instagramId + "/insights", { ...params, metric: name }, token);
      return [name, metricValue(payload, name)];
    } catch {
      return [name, null];
    }
  }));
  return Object.fromEntries(values);
}

async function getMediaPerformance(token, instagramId) {
  const response = await graphGet(instagramId + "/media", {
    fields: "id,caption,media_type,media_product_type,permalink,timestamp", limit: 50,
  }, token);
  const media = (Array.isArray(response.data) ? response.data : [])
    .filter((item) => ["FEED", "REELS"].includes(String(item.media_product_type || "").toUpperCase()))
    .sort((a, b) => Date.parse(b.timestamp || "") - Date.parse(a.timestamp || ""))
    .slice(0, 8);
  const output = [];
  for (let i = 0; i < media.length; i += 3) {
    const group = media.slice(i, i + 3);
    const results = await Promise.all(group.map(async (item) => {
      try {
        const payload = await graphGet(item.id + "/insights", { metric: MEDIA_METRICS.join(",") }, token);
        return {
          id: String(item.id), productType: item.media_product_type || null, mediaType: item.media_type || null,
          caption: String(item.caption || "").slice(0, 240), permalink: item.permalink || null, timestamp: item.timestamp || null,
          insights: Object.fromEntries(MEDIA_METRICS.map((name) => [name, metricValue(payload, name)])),
        };
      } catch {
        return {
          id: String(item.id), productType: item.media_product_type || null, mediaType: item.media_type || null,
          caption: String(item.caption || "").slice(0, 240), permalink: item.permalink || null, timestamp: item.timestamp || null,
          insights: Object.fromEntries(MEDIA_METRICS.map((name) => [name, null])),
        };
      }
    }));
    output.push(...results);
  }
  return output;
}

async function fetchSnapshot(token, connection) {
  const now = new Date();
  const start = fromDate(now, PERIOD_DAYS);
  const previousStart = fromDate(now, PERIOD_DAYS * 2);
  const base = { period: "day", metric_type: "total_value" };
  const currentParams = { ...base, since: unixSeconds(start), until: unixSeconds(now) };
  const previousParams = { ...base, since: unixSeconds(previousStart), until: unixSeconds(start) };
  const trendParams = { metric: "reach", period: "day", metric_type: "time_series", since: unixSeconds(start), until: unixSeconds(now) };
  const id = connection.instagram_user_id;
  const [profile, currentMetrics, previousMetrics, trendData, mediaPerformance] = await Promise.all([
    graphGet(id, { fields: "id,username,followers_count,media_count" }, token),
    accountMetricMap(id, token, currentParams),
    accountMetricMap(id, token, previousParams),
    graphGet(id + "/insights", trendParams, token),
    getMediaPerformance(token, id),
  ]);
  const fetchedAt = now.toISOString();
  return {
    instagramUserId: String(id), snapshotDay: fetchedAt.slice(0, 10), fetchedAt,
    periodStart: start.toISOString(), periodEnd: fetchedAt,
    followersCount: typeof profile.followers_count === "number" ? profile.followers_count : null,
    mediaCount: typeof profile.media_count === "number" ? profile.media_count : null,
    currentMetrics, previousMetrics,
    dailyReach: metricSeries(trendData, "reach"), mediaPerformance,
  };
}

function responseBody(config, connection, snapshot, extra = {}) {
  return {
    configured: config.ready, connectReady: config.ready,
    connected: Boolean(connection && connection.status === "connected" && connection.token_ciphertext),
    setupRequired: !config.ready, setupMissing: config.missing,
    connection: publicInstagramConnection(connection), snapshot: publicInstagramSnapshot(snapshot), ...extra,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return error(res, 405, "Método no permitido.");
  }
  if (!verifySession(req)) return error(res, 401, "Tu sesión de VILCO venció. Ingresá de nuevo para ver Instagram.");

  try {
    const config = instagramEnvironmentStatus();
    const connection = await getInstagramConnection();
    let snapshot = await getLatestInstagramSnapshot();
    const history = String(req.query && req.query.history || "") === "1" ? await getInstagramSnapshotHistory() : undefined;
    if (!connection || connection.status === "disconnected" || !connection.token_ciphertext) {
      return res.status(200).json(responseBody(config, connection, snapshot, { history }));
    }
    const now = Date.now();
    const lastSuccess = snapshot ? (Date.parse(snapshot.fetched_at || "") || 0) : 0;
    const lastAttempt = Date.parse(connection.last_sync_attempt_at || "") || 0;
    const force = String(req.query && req.query.force || "") === "1";
    const stale = !snapshot || now - lastSuccess >= CACHE_MAX_AGE_MS;
    if ((force || stale) && now - lastAttempt >= MIN_ATTEMPT_GAP_MS) {
      const expiresAt = connection.token_expires_at ? Date.parse(connection.token_expires_at) : 0;
      if (expiresAt && expiresAt <= now) {
        await setInstagramConnectionStatus("reauth_required");
        return res.status(200).json(responseBody(config, { ...connection, status: "reauth_required" }, snapshot, { reconnectRequired: true, history }));
      }
      await noteInstagramSyncAttempt();
      try {
        await saveInstagramSnapshot(await fetchSnapshot(decryptConnectionToken(connection), connection));
        await noteInstagramSyncSuccess();
        snapshot = await getLatestInstagramSnapshot();
      } catch (cause) {
        const code = Number(cause && cause.code) || 0;
        const revoked = code === 190 || (cause instanceof InstagramApiError && cause.status === 401);
        const permissionMissing = code === 10 || code === 200;
        if (revoked) {
          await setInstagramConnectionStatus("reauth_required");
          return res.status(200).json(responseBody(config, { ...connection, status: "reauth_required" }, snapshot, { stale: Boolean(snapshot), reconnectRequired: true, history }));
        }
        console.error("VILCO Instagram metrics refresh failed:", code || "unknown");
        if (snapshot) {
          return res.status(200).json(responseBody(config, connection, snapshot, {
            stale: true, permissionMissing, rateLimited: [4, 17, 32, 613].includes(code), history,
          }));
        }
        return res.status(502).json({ error: permissionMissing
          ? "Meta no devolvió métricas con los permisos de Insights actuales."
          : "Meta no respondió con métricas disponibles. Volvé a intentar más tarde." });
      }
    }
    const latestConnection = await getInstagramConnection();
    const deferred = (force || stale) && Date.now() - lastAttempt < MIN_ATTEMPT_GAP_MS;
    return res.status(200).json(responseBody(config, latestConnection || connection, snapshot, {
      stale: Boolean(snapshot && Date.now() - (Date.parse(snapshot.fetched_at || "") || 0) >= CACHE_MAX_AGE_MS),
      refreshDeferred: deferred, history,
    }));
  } catch (cause) {
    console.error("VILCO Instagram metrics request failed:", cause && cause.name || "Error");
    return error(res, 502, "No se pudieron consultar las métricas de Instagram.");
  }
}
