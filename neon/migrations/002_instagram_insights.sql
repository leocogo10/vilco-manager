-- Instagram Unified Login and Insights, isolated to the Neon Preview branch.
-- Tokens are AES-256-GCM ciphertext and are only used by VILCO server routes.
CREATE TABLE IF NOT EXISTS public.vilco_instagram_connections (
  id text PRIMARY KEY CHECK (id = 'workspace'),
  client_business_id text NOT NULL,
  config_id text NOT NULL,
  instagram_user_id text NOT NULL,
  username text NOT NULL,
  token_ciphertext text,
  token_expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'reauth_required', 'disconnected')),
  last_sync_attempt_at timestamptz,
  last_sync_success_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.vilco_instagram_metric_snapshots (
  id bigserial PRIMARY KEY,
  instagram_user_id text NOT NULL,
  snapshot_day date NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  followers_count bigint,
  media_count bigint,
  current_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  daily_reach jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_performance jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT vilco_instagram_snapshot_day_unique UNIQUE (instagram_user_id, snapshot_day),
  CONSTRAINT vilco_instagram_daily_reach_array CHECK (jsonb_typeof(daily_reach) = 'array'),
  CONSTRAINT vilco_instagram_media_array CHECK (jsonb_typeof(media_performance) = 'array')
);

CREATE INDEX IF NOT EXISTS vilco_instagram_snapshots_fetched_idx
  ON public.vilco_instagram_metric_snapshots (fetched_at DESC);
REVOKE ALL ON public.vilco_instagram_connections FROM PUBLIC;
REVOKE ALL ON public.vilco_instagram_metric_snapshots FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.vilco_instagram_connections TO vilco_app;
GRANT SELECT, INSERT, UPDATE ON public.vilco_instagram_metric_snapshots TO vilco_app;
GRANT USAGE, SELECT ON SEQUENCE public.vilco_instagram_metric_snapshots_id_seq TO vilco_app;
