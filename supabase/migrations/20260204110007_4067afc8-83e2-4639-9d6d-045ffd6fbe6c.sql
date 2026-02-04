-- Create image search cache table
CREATE TABLE public.image_search_cache (
  query TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_image_search_cache_last_accessed ON public.image_search_cache(last_accessed);

-- Enable Row Level Security
ALTER TABLE public.image_search_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read from the cache
CREATE POLICY "Anyone can read image cache"
ON public.image_search_cache
FOR SELECT
USING (true);

-- Service role can insert/update (edge functions use service role)
CREATE POLICY "Service role can insert cache"
ON public.image_search_cache
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update cache"
ON public.image_search_cache
FOR UPDATE
USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.image_search_cache IS 'Caches successful image search results to reduce external API calls';