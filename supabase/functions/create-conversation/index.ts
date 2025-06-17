
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateConversationRequest {
  title?: string;
  model_preference?: string;
  provider_preference?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== CREATE CONVERSATION FUNCTION START ===')
    
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
      title = 'New Conversation',
      model_preference = 'gpt-4.1-2025-04-14',
      provider_preference = 'openai'
    }: CreateConversationRequest = await req.json()

    console.log('Request payload:', { title, model_preference, provider_preference })

    const conversationData = {
      user_id: user.user.id,
      title,
      model_preference,
      provider_preference,
      status: 'active',
      total_cost: 0,
      metadata: {}
    }

    console.log('About to insert conversation with data:', conversationData)

    // Use the service role client for the actual database operation
    const { data: conversation, error } = await supabaseClient
      .from('conversations')
      .insert(conversationData)
      .select()
      .single()

    console.log('Insert result - data:', !!conversation, 'error:', error)

    if (error) {
      console.log('DATABASE ERROR DETAILS:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    console.log('Conversation created successfully:', conversation.id)

    return new Response(
      JSON.stringify({ conversation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.log('=== FUNCTION ERROR ===')
    console.log('Error type:', typeof error)
    console.log('Error message:', error.message)
    console.log('Error details:', error.details)
    console.log('Error hint:', error.hint)
    console.log('Error code:', error.code)
    console.log('Full error:', error)
    console.log('=== END ERROR ===')
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        type: typeof error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
