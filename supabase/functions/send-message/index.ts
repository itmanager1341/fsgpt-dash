
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
  stream?: boolean;
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

    const { 
      conversationId, 
      message, 
      provider = 'openai', 
      model = 'gpt-4.1-2025-04-14',
      stream = true 
    }: SendMessageRequest = await req.json()

    console.log(`Processing message for conversation ${conversationId} with ${provider}:${model}`)

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
      console.error('Error storing user message:', userMessageError)
      throw userMessageError
    }

    // Get API key based on provider
    let apiKey: string | undefined;
    let apiUrl: string;
    
    if (provider === 'openai') {
      apiKey = Deno.env.get('OPENAI_API_KEY')
      apiUrl = 'https://api.openai.com/v1/chat/completions'
    } else if (provider === 'perplexity') {
      apiKey = Deno.env.get('PERPLEXITY_API_KEY')
      apiUrl = 'https://api.perplexity.ai/chat/completions'
    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    if (!apiKey) {
      throw new Error(`${provider.toUpperCase()} API key not configured`)
    }

    // Prepare messages for context
    const { data: previousMessages } = await supabaseClient
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10) // Last 10 messages for context

    const contextMessages = (previousMessages || []).slice(-9).map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }))

    // Add current message
    contextMessages.push({ role: 'user', content: message })

    console.log(`Calling ${provider} API with ${contextMessages.length} messages`)

    // Call LLM API
    const llmResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: contextMessages,
        max_tokens: 2000,
        temperature: 0.7,
        stream,
      }),
    })

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text()
      console.error(`${provider} API error:`, errorText)
      throw new Error(`${provider} API error: ${llmResponse.statusText}`)
    }

    let assistantMessage: string;
    let usage: any = {};
    let cost = 0;

    if (stream) {
      // Handle streaming response
      const reader = llmResponse.body?.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      console.log('Processing streaming response...')

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  fullResponse += content
                }
                if (parsed.usage) {
                  usage = parsed.usage
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
      assistantMessage = fullResponse
    } else {
      // Handle non-streaming response
      const llmData = await llmResponse.json()
      assistantMessage = llmData.choices[0].message.content
      usage = llmData.usage || {}
    }

    console.log(`Generated response (${assistantMessage.length} chars)`)

    // Calculate cost (approximate)
    const promptTokens = usage.prompt_tokens || 0
    const completionTokens = usage.completion_tokens || 0
    
    if (provider === 'openai') {
      if (model.includes('gpt-4')) {
        cost = (promptTokens * 0.03 + completionTokens * 0.06) / 1000
      } else {
        cost = (promptTokens * 0.0015 + completionTokens * 0.002) / 1000
      }
    } else if (provider === 'perplexity') {
      cost = (promptTokens * 0.001 + completionTokens * 0.001) / 1000
    }

    // Store assistant message
    const { data: assistantMessageData, error: assistantMessageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage,
        model_used: model,
        provider_used: provider,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        cost: cost,
      })
      .select()
      .single()

    if (assistantMessageError) {
      console.error('Error storing assistant message:', assistantMessageError)
      throw assistantMessageError
    }

    // Update conversation timestamp
    await supabaseClient
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    console.log(`Message processed successfully. Cost: $${cost.toFixed(4)}`)

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
