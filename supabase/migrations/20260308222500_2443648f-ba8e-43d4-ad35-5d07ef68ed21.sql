
-- Add optional user_id to saved_stories to link stories to accounts
ALTER TABLE public.saved_stories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Policy: authenticated users can view their own stories (even private ones)
CREATE POLICY "Users can view own stories"
  ON public.saved_stories FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: authenticated users can update their own stories
CREATE POLICY "Users can update own stories"
  ON public.saved_stories FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: authenticated users can delete their own stories  
CREATE POLICY "Users can delete own stories"
  ON public.saved_stories FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
