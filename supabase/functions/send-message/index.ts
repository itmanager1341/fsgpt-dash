
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
  conversationId: string;
  message: string;
  provider?: string;
  model?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabaseClient.auth.getUser(token)

    if (!user.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { conversationId, message, provider = 'openai', model = 'gpt-4.1-2025-04-14' }: SendMessageRequest = await req.json()

    // Store user message
    const { data: userMessage, error: userMessageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      })
      .select()
      .single()

    if (userMessageError) {
      throw userMessageError
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const assistantMessage = openaiData.choices[0].message.content
    const usage = openaiData.usage

    // Calculate cost (approximate)
    const cost = (usage.prompt_tokens * 0.01 + usage.completion_tokens * 0.03) / 1000

    // Store assistant message
    const { data: assistantMessageData, error: assistantMessageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage,
        model_used: model,
        provider_used: provider,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        cost: cost,
      })
      .select()
      .single()

    if (assistantMessageError) {
      throw assistantMessageError
    }

    return new Response(
      JSON.stringify({
        userMessage,
        assistantMessage: assistantMessageData,
        usage,
        cost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-message function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
