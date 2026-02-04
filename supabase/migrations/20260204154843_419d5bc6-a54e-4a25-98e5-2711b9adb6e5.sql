-- Create storage bucket for story audio assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'story-assets', 
  'story-assets', 
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg']
);

-- Storage policies for story-assets bucket
CREATE POLICY "Anyone can view story assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-assets');

CREATE POLICY "Anyone can upload story assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'story-assets');

-- Create saved_stories table for sharing videos
CREATE TABLE public.saved_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Story content: timeline events, title, intro, summary
  content JSONB NOT NULL,
  
  -- Video settings: variant (slideshow/scrapbook), fps, vhs effect, music url, etc.
  settings JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_public BOOLEAN NOT NULL DEFAULT true,
  
  -- Optional: track views
  view_count INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.saved_stories ENABLE ROW LEVEL SECURITY;

-- RLS policies: public read, anyone can insert
CREATE POLICY "Anyone can view public stories"
ON public.saved_stories FOR SELECT
USING (is_public = true);

CREATE POLICY "Anyone can create stories"
ON public.saved_stories FOR INSERT
WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_saved_stories_created_at ON public.saved_stories(created_at DESC);
CREATE INDEX idx_saved_stories_is_public ON public.saved_stories(is_public) WHERE is_public = true;