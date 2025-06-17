
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
      title = 'New Conversation',
      model_preference = 'gpt-4.1-2025-04-14',
      provider_preference = 'openai'
    }: CreateConversationRequest = await req.json()

    const { data: conversation, error } = await supabaseClient
      .from('conversations')
      .insert({
        user_id: user.user.id,
        title,
        model_preference,
        provider_preference,
        status: 'active',
        total_cost: 0,
        metadata: {}
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ conversation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-conversation function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
