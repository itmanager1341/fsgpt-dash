
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

    // Enhanced document context retrieval with proper column name
    let documentContext = ''
    const documentReferences = message.match(/\[Documents available for analysis:(.*?)\]/s);
    
    if (documentReferences) {
      console.log('Document references found, fetching enhanced document content...');
      
      // Get processed documents with full text content - using correct column name
      const { data: documents, error: docError } = await supabaseClient
        .from('document_uploads')
        .select(`
          id,
          original_name,
          summary,
          extracted_text,
          metadata,
          document_chunks!inner (
            content,
            chunk_index,
            word_count,
            metadata
          )
        `)
        .eq('user_id', user.user.id)
        .eq('processing_status', 'completed')
        .order('uploaded_at', { ascending: false }) // Fixed: use uploaded_at instead of created_at
        .limit(5); // Increased limit to get more documents

      if (!docError && documents && documents.length > 0) {
        console.log(`Found ${documents.length} processed documents with full content`);
        
        // Build comprehensive document context
        documentContext = '\n\n=== COMPREHENSIVE DOCUMENT ANALYSIS CONTEXT ===\n';
        
        documents.forEach((doc, docIndex) => {
          documentContext += `\n--- DOCUMENT ${docIndex + 1}: ${doc.original_name} ---\n`;
          
          if (doc.summary) {
            documentContext += `Document Summary: ${doc.summary}\n`;
          }
          
          // Include comprehensive metadata
          const metadata = doc.metadata as Record<string, any> || {};
          if (metadata.page_count) {
            documentContext += `Total Pages: ${metadata.page_count}\n`;
          }
          if (metadata.text_length) {
            documentContext += `Total Characters Extracted: ${metadata.text_length}\n`;
          }
          if (metadata.processor) {
            documentContext += `Processed with: ${metadata.processor}\n`;
          }
          
          // Include ALL chunks for comprehensive analysis
          if (doc.document_chunks && doc.document_chunks.length > 0) {
            const allChunks = doc.document_chunks
              .sort((a, b) => a.chunk_index - b.chunk_index);
            
            documentContext += `\nFULL DOCUMENT CONTENT (${allChunks.length} sections):\n`;
            allChunks.forEach((chunk, chunkIndex) => {
              documentContext += `\n[Section ${chunk.chunk_index + 1}]\n${chunk.content}\n`;
              if (chunkIndex < allChunks.length - 1) {
                documentContext += '\n--- SECTION BREAK ---\n';
              }
            });
          } else if (doc.extracted_text) {
            // Use full extracted text if chunks not available
            documentContext += `\nFULL DOCUMENT TEXT:\n${doc.extracted_text}\n`;
          }
          
          documentContext += `\n--- END OF DOCUMENT ${docIndex + 1} ---\n`;
        });
        
        documentContext += '\n=== END OF ALL DOCUMENTS ===\n\n';
        console.log(`Built comprehensive document context: ${documentContext.length} characters from ${documents.length} documents`);
      } else {
        console.log('No processed documents found or error:', docError);
        if (docError) {
          console.error('Document query error details:', docError);
        }
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

    // Enhanced system message for comprehensive document analysis
    if (documentContext) {
      const systemMessage = `You are an AI assistant specialized in comprehensive document analysis and question answering. You have access to the user's uploaded documents with COMPLETE content extraction.

IMPORTANT INSTRUCTIONS:
- You have access to the FULL content of all uploaded documents
- Analyze ALL sections and pages thoroughly 
- Reference specific details, clauses, sections, and page numbers when relevant
- Provide comprehensive analysis covering all aspects of the documents
- Quote exact text when answering questions about specific content
- If information spans multiple sections, synthesize it comprehensively
- Always cite which document and section you're referencing

COMPLETE DOCUMENT CONTENT AVAILABLE:
${documentContext}

Please provide thorough, detailed analysis based on the COMPLETE document content provided above. Do not indicate that you only have partial access - you have the full documents.`;

      contextMessages.unshift({
        role: 'system',
        content: systemMessage
      });
    }

    // Add current message (clean it of document metadata for the AI)
    const cleanMessage = message.replace(/\[Documents available for analysis:.*?\]/s, '').trim();
    contextMessages.push({ role: 'user', content: cleanMessage });

    console.log(`Calling ${provider} API with ${contextMessages.length} messages (including ${documentContext.length} chars of document context)`);

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
        max_tokens: 4000, // Increased for comprehensive responses
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

    console.log(`Generated comprehensive response (${assistantMessage.length} chars)`)

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

    console.log(`Message processed successfully with comprehensive document context. Cost: $${cost.toFixed(4)}`)

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
