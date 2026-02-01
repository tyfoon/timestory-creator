-- Create table for globally blacklisted images
CREATE TABLE public.image_blacklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL UNIQUE,
  event_title TEXT,
  search_query TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public read access (no auth needed to check blacklist)
ALTER TABLE public.image_blacklist ENABLE ROW LEVEL SECURITY;

-- Anyone can read the blacklist
CREATE POLICY "Anyone can view blacklisted images" 
ON public.image_blacklist 
FOR SELECT 
USING (true);

-- Anyone can add to blacklist (for now - remove this in production)
CREATE POLICY "Anyone can add to blacklist" 
ON public.image_blacklist 
FOR INSERT 
WITH CHECK (true);

-- Create index for fast lookups by image_url
CREATE INDEX idx_image_blacklist_url ON public.image_blacklist(image_url);