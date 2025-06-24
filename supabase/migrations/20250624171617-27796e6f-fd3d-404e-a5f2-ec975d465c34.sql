
-- Extend knowledge_items table to support audio-specific metadata
ALTER TABLE knowledge_items 
ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS transcript_text TEXT,
ADD COLUMN IF NOT EXISTS speaker_count INTEGER,
ADD COLUMN IF NOT EXISTS processing_cost NUMERIC(10,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS audio_metadata JSONB DEFAULT '{}';

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-audio',
  'user-audio', 
  false,
  104857600, -- 100MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/webm', 'video/mp4']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for audio bucket
CREATE POLICY "Users can upload their own audio files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-audio' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own audio files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-audio' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own audio files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-audio' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own audio files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-audio' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update knowledge_items content_type enum to include audio types
ALTER TABLE knowledge_items 
DROP CONSTRAINT IF EXISTS knowledge_items_content_type_check;

ALTER TABLE knowledge_items 
ADD CONSTRAINT knowledge_items_content_type_check 
CHECK (content_type IN ('document', 'presentation', 'recording', 'template', 'guideline', 'report', 'audio'));

-- Create index on transcript_text for full-text search
CREATE INDEX IF NOT EXISTS idx_knowledge_items_transcript_search 
ON knowledge_items USING gin(to_tsvector('english', transcript_text));
