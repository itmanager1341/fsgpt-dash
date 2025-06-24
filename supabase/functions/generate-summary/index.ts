
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
    const { summaryRequestId, transcript, templateId } = await req.json();
    
    console.log('Generating summary for request:', summaryRequestId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the summary template
    const { data: template, error: templateError } = await supabase
      .from('summary_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      throw new Error('Failed to load summary template');
    }

    // Create the prompt for OpenAI
    const prompt = `${template.prompt_template}

TRANSCRIPT:
${transcript}

Please provide a summary following the guidelines above.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const summaryContent = result.choices[0]?.message?.content || '';
    
    // Calculate cost estimate
    const promptTokens = result.usage?.prompt_tokens || 0;
    const completionTokens = result.usage?.completion_tokens || 0;
    const totalTokens = result.usage?.total_tokens || 0;
    
    // Cost estimation for gpt-4o-mini (approximate)
    const estimatedCost = (promptTokens * 0.00015 + completionTokens * 0.0006) / 1000;

    // Update the summary request with the generated content
    const { error: updateError } = await supabase
      .from('summary_requests')
      .update({
        summary_content: summaryContent,
        status: 'completed',
        processing_cost: estimatedCost,
        completed_at: new Date().toISOString()
      })
      .eq('id', summaryRequestId);

    if (updateError) {
      console.error('Error updating summary request:', updateError);
      throw new Error('Failed to save summary');
    }

    // Log the operation
    await supabase.from('llm_usage_logs').insert({
      function_name: 'generate-summary',
      model: 'gpt-4o-mini',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      estimated_cost: estimatedCost,
      status: 'success',
      operation_metadata: {
        summary_request_id: summaryRequestId,
        template_id: templateId,
        summary_length: summaryContent.length
      }
    });

    console.log('Summary generation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        summaryContent: summaryContent,
        cost: estimatedCost
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Summary generation error:', error);
    
    // Update summary request status to failed
    if (req.body && typeof req.body === 'object' && 'summaryRequestId' in req.body) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        
        await supabase
          .from('summary_requests')
          .update({
            status: 'failed',
            error_message: error.message || 'Summary generation failed'
          })
          .eq('id', req.body.summaryRequestId);
      } catch (updateError) {
        console.error('Failed to update summary request status:', updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Summary generation failed',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
