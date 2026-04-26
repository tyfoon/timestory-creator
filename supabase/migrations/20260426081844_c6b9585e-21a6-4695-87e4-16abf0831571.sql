-- 1. saved_stories: replace open UPDATE policy with restricted RPC
DROP POLICY IF EXISTS "Anyone can increment view count" ON public.saved_stories;

CREATE OR REPLACE FUNCTION public.increment_story_view_count(p_story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.saved_stories
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_story_id AND is_public = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_story_view_count(uuid)
  TO anon, authenticated;

-- 2. image_blacklist: restrict INSERT to authenticated users with size limits
DROP POLICY IF EXISTS "Anyone can add to blacklist" ON public.image_blacklist;

CREATE POLICY "Authenticated users can add to blacklist"
  ON public.image_blacklist
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND char_length(image_url) <= 2048
    AND char_length(COALESCE(event_title, '')) <= 200
    AND char_length(COALESCE(search_query, '')) <= 500
  );

-- 3. image_search_cache: restrict writes to service_role only
DROP POLICY IF EXISTS "Service role can insert cache" ON public.image_search_cache;
DROP POLICY IF EXISTS "Service role can update cache" ON public.image_search_cache;

CREATE POLICY "Service role can insert cache"
  ON public.image_search_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update cache"
  ON public.image_search_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);