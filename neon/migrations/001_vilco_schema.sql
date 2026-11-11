-- VILCO Manager schema for Neon Free migration preview.
-- Applied only to the isolated Neon branch; no production database is changed.
CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  format text,
  network text,
  goal text,
  status text NOT NULL DEFAULT 'Idea',
  copy text,
  cta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.vilco_app_state (
  app_key text PRIMARY KEY CHECK (app_key = 'workspace'),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS public.vilco_meta_chat (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  messages jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(messages) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.vilco_marketing_profile (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.vilco_meta_connections (
  id text PRIMARY KEY CHECK (id = 'workspace'),
  token_ciphertext text NOT NULL,
  page_id text NOT NULL,
  page_name text NOT NULL,
  instagram_user_id text,
  instagram_username text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.vilco_meta_chat (id, messages)
VALUES (true, '[]'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.vilco_marketing_profile (id, content)
VALUES (true, '') ON CONFLICT (id) DO NOTHING;
