
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessDocumentRequest {
  documentId: string;
  conversationId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== PROCESS DOCUMENT FUNCTION START ===')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
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
    if (authError || !user.user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { documentId, conversationId }: ProcessDocumentRequest = await req.json()
    console.log(`Processing document ${documentId} for user ${user.user.id}`)

    // Get document record
    const { data: document, error: docError } = await supabaseClient
      .from('document_uploads')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.user.id)
      .single()

    if (docError || !document) {
      throw new Error('Document not found or access denied')
    }

    // Update status to processing
    await supabaseClient
      .from('document_uploads')
      .update({ processing_status: 'processing' })
      .eq('id', documentId)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      throw new Error('Failed to download document')
    }

    // Convert to array buffer for PDF processing
    const arrayBuffer = await fileData.arrayBuffer()
    
    // For now, we'll extract basic text (in production, you'd use a PDF parsing library)
    // This is a simplified implementation - in reality you'd use pdf-parse or similar
    let extractedText = ''
    let summary = ''
    
    try {
      // Simulate PDF text extraction (replace with actual PDF parsing)
      const decoder = new TextDecoder()
      const potentialText = decoder.decode(arrayBuffer)
      
      // Very basic text extraction simulation
      if (potentialText.includes('%PDF')) {
        extractedText = `[PDF Processing] Document: ${document.original_name}\nSize: ${document.file_size} bytes\nThis is a PDF document that would be processed with a proper PDF parser in production.`
        summary = `PDF document "${document.original_name}" uploaded and ready for analysis.`
      } else {
        extractedText = potentialText.substring(0, 10000) // Limit text length
        summary = `Document processed: ${document.original_name}`
      }
    } catch (error) {
      console.error('Text extraction error:', error)
      extractedText = `Document: ${document.original_name} - Text extraction pending proper PDF parser implementation.`
      summary = `Document uploaded: ${document.original_name}`
    }

    // Create text chunks (simplified chunking)
    const chunkSize = 1000
    const chunks = []
    for (let i = 0; i < extractedText.length; i += chunkSize) {
      const chunkContent = extractedText.substring(i, i + chunkSize)
      chunks.push({
        document_id: documentId,
        chunk_index: Math.floor(i / chunkSize),
        content: chunkContent,
        word_count: chunkContent.split(' ').length,
        metadata: {
          start_char: i,
          end_char: Math.min(i + chunkSize, extractedText.length)
        }
      })
    }

    // Store chunks in database
    if (chunks.length > 0) {
      const { error: chunksError } = await supabaseClient
        .from('document_chunks')
        .insert(chunks)

      if (chunksError) {
        console.error('Error storing chunks:', chunksError)
        throw chunksError
      }
    }

    // Update document with extracted text and summary
    const { error: updateError } = await supabaseClient
      .from('document_uploads')
      .update({
        extracted_text: extractedText,
        summary,
        processing_status: 'completed'
      })
      .eq('id', documentId)

    if (updateError) {
      throw updateError
    }

    console.log(`Document ${documentId} processed successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        summary,
        extractedText: extractedText.substring(0, 500) + '...',
        chunksCreated: chunks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== PROCESS DOCUMENT ERROR ===')
    console.error('Error:', error)
    
    // Try to update document status to failed
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      const { documentId } = await req.json()
      if (documentId) {
        await supabaseClient
          .from('document_uploads')
          .update({ 
            processing_status: 'failed',
            processing_error: error.message
          })
          .eq('id', documentId)
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError)
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.details
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
