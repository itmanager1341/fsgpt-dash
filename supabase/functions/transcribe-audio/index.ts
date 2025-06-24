
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, knowledgeItemId } = await req.json();
    
    console.log('Starting transcription for:', filePath);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Download the audio file from storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('user-audio')
      .download(filePath);

    if (downloadError) {
      console.error('Error downloading audio:', downloadError);
      throw new Error('Failed to download audio file');
    }

    console.log('Audio file downloaded, size:', audioData.size);

    // Prepare form data for OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', audioData, filePath.split('/').pop());
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');

    // Call OpenAI Whisper API
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${transcriptionResponse.status}`);
    }

    const transcriptionResult = await transcriptionResponse.json();
    console.log('Transcription completed, length:', transcriptionResult.text?.length);

    // Extract useful information
    const transcriptText = transcriptionResult.text || '';
    const duration = transcriptionResult.duration || 0;
    const words = transcriptionResult.words || [];
    
    // Estimate cost (approximate based on OpenAI pricing)
    const audioMinutes = Math.ceil(duration / 60);
    const estimatedCost = audioMinutes * 0.006; // $0.006 per minute

    // Simple speaker count estimation (no complex analysis)
    const speakerCount = estimateSpeakerCount(transcriptText);

    // Update knowledge item with ONLY transcription results (no summary or keywords)
    const { error: updateError } = await supabase
      .from('knowledge_items')
      .update({
        transcript_text: transcriptText,
        audio_duration_seconds: Math.round(duration),
        speaker_count: speakerCount,
        processing_cost: estimatedCost,
        processing_status: 'completed',
        audio_metadata: {
          transcription_completed_at: new Date().toISOString(),
          word_count: words.length,
          confidence_scores: words.map(w => w.confidence || 0),
          language: transcriptionResult.language || 'en'
        }
      })
      .eq('file_path', filePath);

    if (updateError) {
      console.error('Error updating knowledge item:', updateError);
      throw new Error('Failed to update transcription results');
    }

    // Log the operation
    await supabase.from('llm_usage_logs').insert({
      function_name: 'transcribe-audio',
      model: 'whisper-1',
      prompt_tokens: 0,
      completion_tokens: transcriptText.length,
      total_tokens: transcriptText.length,
      estimated_cost: estimatedCost,
      status: 'success',
      operation_metadata: {
        file_path: filePath,
        duration_seconds: duration,
        speaker_count: speakerCount
      }
    });

    console.log('Transcription process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        transcriptLength: transcriptText.length,
        duration: duration,
        speakerCount: speakerCount,
        cost: estimatedCost
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Transcription failed',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Simplified helper function to estimate speaker count
function estimateSpeakerCount(text: string): number {
  // Simple heuristic: look for conversation patterns
  const dialogueMarkers = [
    /\b(he said|she said|they said)\b/gi,
    /\b(speaker \d+|person \d+)\b/gi,
    /^[A-Z][a-z]+:/gm, // Names followed by colons
    /\b(interviewer|interviewee|host|guest)\b/gi
  ];
  
  let speakerIndicators = 0;
  dialogueMarkers.forEach(marker => {
    const matches = text.match(marker);
    if (matches) speakerIndicators += matches.length;
  });
  
  // Estimate based on indicators (minimum 1, maximum 10)
  if (speakerIndicators === 0) return 1;
  if (speakerIndicators < 3) return 1;
  if (speakerIndicators < 6) return 2;
  if (speakerIndicators < 12) return 3;
  return Math.min(Math.ceil(speakerIndicators / 4), 10);
}
