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
    console.log('=== SEND MESSAGE FUNCTION START ===')
    
    // Create Supabase client with service role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    console.log('Supabase client created successfully with service role')

    // Still verify the user is authenticated via the auth header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('ERROR: No authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)
    
    // Create a separate client with anon key to verify the user token
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )
    
    const { data: user, error: authError } = await anonClient.auth.getUser(token)
    console.log('Auth result - user:', !!user.user, 'error:', authError)

    if (authError) {
      console.log('AUTH ERROR:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user.user) {
      console.log('ERROR: No user found in auth result')
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated successfully:', user.user.id)

    const { 
      conversationId, 
      message, 
      provider = 'openai', 
      model = 'gpt-4.1-2025-04-14',
      stream = true 
    }: SendMessageRequest = await req.json()

    console.log(`Processing message for conversation ${conversationId} with ${provider}:${model}`)

    // Check if message references documents
    const documentReferences = message.match(/\[Documents available for analysis:(.*?)\]/s);
    let documentContext = '';
    
    if (documentReferences) {
      console.log('Document references found, fetching document content...');
      
      // Extract document information from the message
      const docInfo = documentReferences[1];
      
      // Get documents associated with this conversation or user
      const { data: documents, error: docError } = await supabaseClient
        .from('document_uploads')
        .select(`
          id,
          original_name,
          summary,
          extracted_text,
          document_chunks (
            content,
            chunk_index,
            word_count
          )
        `)
        .eq('user_id', user.user.id)
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5); // Limit to recent documents

      if (!docError && documents && documents.length > 0) {
        console.log(`Found ${documents.length} processed documents`);
        
        // Build document context for the AI
        documentContext = '\n\n--- DOCUMENT CONTEXT ---\n';
        documents.forEach(doc => {
          documentContext += `\nDocument: ${doc.original_name}\n`;
          if (doc.summary) {
            documentContext += `Summary: ${doc.summary}\n`;
          }
          
          // Include first few chunks for context
          if (doc.document_chunks && doc.document_chunks.length > 0) {
            const contextChunks = doc.document_chunks
              .sort((a, b) => a.chunk_index - b.chunk_index)
              .slice(0, 3); // First 3 chunks
            
            contextChunks.forEach(chunk => {
              documentContext += `Content excerpt: ${chunk.content.substring(0, 500)}...\n`;
            });
          } else if (doc.extracted_text) {
            documentContext += `Content excerpt: ${doc.extracted_text.substring(0, 1000)}...\n`;
          }
        });
        documentContext += '--- END DOCUMENT CONTEXT ---\n\n';
      }
    }

    // Store user message with user_id
    const { data: userMessage, error: userMessageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        user_id: user.user.id,
      })
      .select()
      .single()

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError)
      throw userMessageError
    }

    console.log('User message stored successfully:', userMessage.id)

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

    // Add system message for document analysis if we have document context
    if (documentContext) {
      contextMessages.unshift({
        role: 'system',
        content: `You are an AI assistant that can analyze documents. When users ask questions about uploaded documents, use the provided document context to give accurate, specific answers. Always cite which document you're referencing when possible.${documentContext}`
      });
    }

    // Add current message (clean it of document metadata for the AI)
    const cleanMessage = message.replace(/\[Documents available for analysis:.*?\]/s, '').trim();
    contextMessages.push({ role: 'user', content: cleanMessage });

    console.log(`Calling ${provider} API with ${contextMessages.length} messages`);

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

    // Store assistant message with user_id
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
        user_id: user.user.id,
      })
      .select()
      .single()

    if (assistantMessageError) {
      console.error('Error storing assistant message:', assistantMessageError)
      throw assistantMessageError
    }

    console.log('Assistant message stored successfully:', assistantMessageData.id)

    // Update user API usage tracking
    try {
      const { error: usageError } = await supabaseClient
        .rpc('update_user_api_usage', {
          user_id_param: user.user.id,
          provider_param: provider,
          model_param: model,
          cost_param: cost
        })

      if (usageError) {
        console.error('Error updating usage:', usageError)
        // Don't throw - usage tracking failure shouldn't break the message flow
      } else {
        console.log(`Usage updated: $${cost.toFixed(4)} for ${provider}:${model}`)
      }
    } catch (usageUpdateError) {
      console.error('Error in usage update:', usageUpdateError)
      // Don't throw - continue with message processing
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
    console.error('=== SEND MESSAGE ERROR ===')
    console.error('Error type:', typeof error)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
    console.error('Full error:', error)
    console.error('=== END ERROR ===')
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.details,
        type: typeof error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
