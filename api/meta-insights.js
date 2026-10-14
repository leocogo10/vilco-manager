import { decryptMetaToken, getMetaConnection, graphGet, metaConfigurationReady, publicConnection, sumInsightValues } from "./_meta.js";
import { verifySession } from "./_auth.js";

function error(res, status, message) {
  return res.status(status).json({ error: message });
}

async function insight(token, id, metric, since, until) {
  try {
    const data = await graphGet(id + "/insights", { metric, period: "day", since, until }, token);
    return sumInsightValues(data);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return error(res, 405, "Método no permitido.");
  }
  if (!verifySession(req)) return error(res, 401, "Tu sesión de VILCO venció. Ingresá de nuevo para ver Meta.");
  if (!metaConfigurationReady()) return res.status(200).json({ configured: false, connected: false });

  try {
    const connection = await getMetaConnection();
    if (!connection) return res.status(200).json({ configured: true, ...publicConnection(null) });
    const pageToken = decryptMetaToken(connection.token_ciphertext);
    const accessToken = pageToken;
    const instagramId = connection.instagram_user_id;
    const now = Math.floor(Date.now() / 1000);
    const since = now - 29 * 24 * 60 * 60;

    const [pageProfile, igProfile] = await Promise.all([
      graphGet(connection.page_id, { fields: "id,name,fan_count" }, accessToken).catch(() => null),
      instagramId ? graphGet(instagramId, { fields: "id,username,followers_count,media_count" }, accessToken).catch(() => null) : Promise.resolve(null),
    ]);
    const [pageViews, pageEngagement, igViews, igReach, igInteractions] = await Promise.all([
      insight(accessToken, connection.page_id, "page_total_media_view_unique", since, now),
      insight(accessToken, connection.page_id, "page_post_engagements", since, now),
      instagramId ? insight(accessToken, instagramId, "views", since, now) : Promise.resolve(null),
      instagramId ? insight(accessToken, instagramId, "reach", since, now) : Promise.resolve(null),
      instagramId ? insight(accessToken, instagramId, "total_interactions", since, now) : Promise.resolve(null),
    ]);

    return res.status(200).json({
      configured: true,
      connected: true,
      page: {
        id: connection.page_id,
        name: pageProfile?.name || connection.page_name,
        likes: pageProfile?.fan_count ?? null,
        views30d: pageViews,
        engagements30d: pageEngagement,
      },
      instagram: instagramId ? {
        id: instagramId,
        username: igProfile?.username || connection.instagram_username,
        followers: igProfile?.followers_count ?? null,
        mediaCount: igProfile?.media_count ?? null,
        views30d: igViews,
        reach30d: igReach,
        interactions30d: igInteractions,
      } : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (cause) {
    console.error("VILCO Meta insights request failed:", cause?.name || "Error", Number(cause?.code) || 0);
    return error(res, 502, "No se pudieron leer las métricas de Meta. Reconectá las cuentas si el permiso venció.");
  }
}

