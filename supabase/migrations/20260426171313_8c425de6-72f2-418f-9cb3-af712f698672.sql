CREATE TABLE public.youtube_search_cache (
  query TEXT PRIMARY KEY,
  video_id TEXT,
  title TEXT,
  thumbnail TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_youtube_search_cache_last_accessed
  ON public.youtube_search_cache(last_accessed);

ALTER TABLE public.youtube_search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read youtube cache"
  ON public.youtube_search_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert youtube cache"
  ON public.youtube_search_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update youtube cache"
  ON public.youtube_search_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.youtube_search_cache IS
  'Caches YouTube search.list results to keep daily quota usage manageable. Same query → cached video_id (or null = cached no-result).';