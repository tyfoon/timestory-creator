-- Add UPDATE policy for view count incrementing
CREATE POLICY "Anyone can increment view count"
ON public.saved_stories FOR UPDATE
USING (is_public = true)
WITH CHECK (is_public = true);