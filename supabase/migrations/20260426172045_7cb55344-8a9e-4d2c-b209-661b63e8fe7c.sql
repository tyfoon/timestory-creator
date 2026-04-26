CREATE TABLE public.tvfilm_overview_cache (
  cache_key TEXT PRIMARY KEY,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL,
  country TEXT,
  items JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tvfilm_overview_cache_cached_at
  ON public.tvfilm_overview_cache(cached_at);

ALTER TABLE public.tvfilm_overview_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tvfilm overview cache"
  ON public.tvfilm_overview_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert tvfilm overview cache"
  ON public.tvfilm_overview_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update tvfilm overview cache"
  ON public.tvfilm_overview_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.tvfilm_overview_cache IS
  'Caches generate-tv-films Gemini responses per (start_year, end_year, city, language) combo. 30-day TTL enforced in the edge function.';