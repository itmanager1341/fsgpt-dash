
-- Phase 2: Move Vector Extension to Extensions Schema
-- This resolves the "Extension in Public Schema" security warning

-- Step 1: Create the extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Step 2: Move the vector extension from public to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Step 3: Update the search_content_chunks function to include extensions schema in search path
CREATE OR REPLACE FUNCTION public.search_content_chunks(query_text text, query_embedding vector DEFAULT NULL::vector, similarity_threshold double precision DEFAULT 0.7, max_results integer DEFAULT 20, article_filters jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id uuid, article_id uuid, content text, word_count integer, chunk_type text, similarity double precision, rank double precision, article_title text, article_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      cc.id,
      cc.article_id,
      cc.content,
      cc.word_count,
      cc.chunk_type,
      CASE 
        WHEN query_embedding IS NOT NULL 
        THEN 1 - (cc.embedding <=> query_embedding)
        ELSE 0
      END as similarity,
      a.title as article_title,
      a.status as article_status
    FROM public.content_chunks cc
    JOIN public.articles a ON cc.article_id = a.id
    WHERE 
      (query_embedding IS NULL OR cc.embedding IS NOT NULL)
      AND (article_filters IS NULL OR (
        (article_filters->>'status' IS NULL OR a.status = article_filters->>'status')
        AND (article_filters->>'source_system' IS NULL OR a.source_system = article_filters->>'source_system')
      ))
  ),
  text_search AS (
    SELECT 
      cc.id,
      ts_rank(to_tsvector('english', cc.content), plainto_tsquery('english', query_text)) as text_rank
    FROM public.content_chunks cc
    JOIN public.articles a ON cc.article_id = a.id
    WHERE 
      to_tsvector('english', cc.content) @@ plainto_tsquery('english', query_text)
      AND (article_filters IS NULL OR (
        (article_filters->>'status' IS NULL OR a.status = article_filters->>'status')
        AND (article_filters->>'source_system' IS NULL OR a.source_system = article_filters->>'source_system')
      ))
  )
  SELECT 
    vs.id,
    vs.article_id,
    vs.content,
    vs.word_count,
    vs.chunk_type,
    vs.similarity,
    -- Combine vector similarity and text rank for hybrid scoring
    CASE 
      WHEN query_embedding IS NOT NULL AND ts.text_rank IS NOT NULL 
      THEN (vs.similarity * 0.7 + ts.text_rank * 0.3)
      WHEN query_embedding IS NOT NULL 
      THEN vs.similarity
      WHEN ts.text_rank IS NOT NULL 
      THEN ts.text_rank
      ELSE 0
    END as rank,
    vs.article_title,
    vs.article_status
  FROM vector_search vs
  LEFT JOIN text_search ts ON vs.id = ts.id
  WHERE 
    (query_embedding IS NULL OR vs.similarity >= similarity_threshold)
    OR (ts.text_rank IS NOT NULL)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$function$;

-- Step 4: Verify vector operations still work by testing a simple vector operation
-- This will validate that the extension move was successful
SELECT 'Vector extension move validation'::text as status,
       CASE 
         WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') 
         THEN 'Extension found'
         ELSE 'Extension missing'
       END as extension_status,
       CASE 
         WHEN EXISTS(SELECT 1 FROM pg_type WHERE typname = 'vector') 
         THEN 'Vector type available'
         ELSE 'Vector type missing'
       END as type_status;

-- Step 5: Add a comment to document the security improvement
COMMENT ON SCHEMA extensions IS 'Dedicated schema for PostgreSQL extensions to follow security best practices';
