
CREATE TABLE public.saved_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_title TEXT NOT NULL,
  event_date TEXT,
  event_year INTEGER,
  event_description TEXT,
  event_category TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved events"
  ON public.saved_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved events"
  ON public.saved_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved events"
  ON public.saved_events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
