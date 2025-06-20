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

interface AzureAnalyzeResult {
  status: string;
  createdDateTime: string;
  lastUpdatedDateTime: string;
  analyzeResult?: {
    content: string;
    pages: Array<{
      pageNumber: number;
      words: Array<{
        content: string;
        boundingBox: number[];
        confidence: number;
      }>;
    }>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== AZURE DOCUMENT INTELLIGENCE PROCESS START ===')
    
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

    const { documentId }: ProcessDocumentRequest = await req.json()
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

    console.log(`Found document: ${document.original_name}, type: ${document.file_type}`)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      throw new Error('Failed to download document')
    }

    console.log(`Downloaded file: ${document.original_name}, size: ${document.file_size} bytes`)

    let extractedText = ''
    let summary = ''
    let pageCount = 0
    let chunks: any[] = []
    
    try {
      if (document.file_type === 'application/pdf' || document.file_type.startsWith('image/')) {
        console.log('Processing document with Azure Document Intelligence...')
        
        const azureEndpoint = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT')
        const azureKey = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY')
        
        if (!azureEndpoint || !azureKey) {
          throw new Error('Azure Document Intelligence credentials not configured')
        }

        // Convert file to array buffer
        const arrayBuffer = await fileData.arrayBuffer()
        
        // Submit document for analysis
        const analyzeUrl = `${azureEndpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`
        
        console.log('Submitting document to Azure for analysis...')
        const submitResponse = await fetch(analyzeUrl, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': azureKey,
            'Content-Type': document.file_type,
          },
          body: arrayBuffer,
        })

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text()
          throw new Error(`Azure API error: ${submitResponse.status} - ${errorText}`)
        }

        // Get the operation location from response headers
        const operationLocation = submitResponse.headers.get('Operation-Location')
        if (!operationLocation) {
          throw new Error('No operation location returned from Azure')
        }

        console.log('Document submitted, polling for results...')
        
        // Poll for results
        let attempts = 0
        const maxAttempts = 30 // 30 seconds max wait time
        let result: AzureAnalyzeResult | null = null
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
          attempts++
          
          const resultResponse = await fetch(operationLocation, {
            headers: {
              'Ocp-Apim-Subscription-Key': azureKey,
            },
          })

          if (!resultResponse.ok) {
            throw new Error(`Failed to get analysis results: ${resultResponse.status}`)
          }

          result = await resultResponse.json()
          console.log(`Analysis status: ${result.status} (attempt ${attempts})`)
          
          if (result.status === 'succeeded') {
            break
          } else if (result.status === 'failed') {
            throw new Error('Azure document analysis failed')
          }
        }

        if (!result || result.status !== 'succeeded' || !result.analyzeResult) {
          throw new Error('Document analysis did not complete successfully')
        }

        // Extract text and page information
        extractedText = result.analyzeResult.content || ''
        pageCount = result.analyzeResult.pages?.length || 1
        
        console.log(`Azure extraction complete: ${extractedText.length} characters, ${pageCount} pages`)

        // Validate extraction quality
        if (extractedText.length < 100) {
          console.warn('Low text extraction quality - document may be image-based or corrupted')
          summary = `Document "${document.original_name}" processed with limited text extraction. Document may contain primarily images or have extraction issues.`
        } else {
          // Create semantic chunks
          chunks = createEnhancedSemanticChunks(extractedText, documentId, pageCount)
          console.log(`Created ${chunks.length} semantic chunks`)
          
          // Generate summary from first 300 words
          const words = extractedText.trim().split(/\s+/)
          const firstWords = words.slice(0, 300).join(' ')
          summary = `Document "${document.original_name}" (${pageCount} pages) successfully processed with Azure Document Intelligence. Content preview: ${firstWords}${words.length > 300 ? '...' : ''}`
        }

      } else {
        // Handle unsupported file types
        console.log('Processing non-supported document type')
        extractedText = `Unsupported document type: ${document.original_name}`
        summary = `Document "${document.original_name}" uploaded but text extraction not supported for this file type.`
      }

    } catch (extractionError) {
      console.error('Azure document processing error:', extractionError)
      throw new Error(`Failed to process document with Azure: ${extractionError.message}`)
    }

    // Store chunks in database if we have any
    if (chunks.length > 0) {
      const { error: chunksError } = await supabaseClient
        .from('document_chunks')
        .insert(chunks)

      if (chunksError) {
        console.error('Error storing chunks:', chunksError)
        throw chunksError
      }
    }

    // Update document with extracted text and processing results
    const { error: updateError } = await supabaseClient
      .from('document_uploads')
      .update({
        extracted_text: extractedText.length > 50000 ? extractedText.substring(0, 50000) + '...[truncated]' : extractedText,
        summary,
        processing_status: 'completed',
        metadata: {
          ...((document.metadata as Record<string, any>) || {}),
          page_count: pageCount,
          text_length: extractedText.length,
          chunk_count: chunks.length,
          processing_timestamp: new Date().toISOString(),
          extraction_quality: extractedText.length > 100 ? 'good' : 'limited',
          processor: 'azure_document_intelligence'
        }
      })
      .eq('id', documentId)

    if (updateError) {
      throw updateError
    }

    console.log(`Document ${documentId} processed successfully with Azure - ${extractedText.length} chars, ${chunks.length} chunks`)

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        summary,
        extractedText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
        chunksCreated: chunks.length,
        pageCount,
        textLength: extractedText.length,
        processor: 'azure_document_intelligence'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== AZURE DOCUMENT PROCESSING ERROR ===')
    console.error('Error:', error)
    
    // Try to update document status to failed
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      const body = await req.json().catch(() => ({}))
      const documentId = body.documentId
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
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Enhanced semantic chunking function
function createEnhancedSemanticChunks(text: string, documentId: string, pageCount: number) {
  const chunks = []
  const targetChunkSize = 1000 // Target words per chunk
  const maxChunkSize = 1500   // Maximum words per chunk
  const overlapSize = 150     // Words to overlap between chunks
  
  // Split text into paragraphs and sentences
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  
  let currentChunk = ''
  let currentWordCount = 0
  let chunkIndex = 0
  let totalWordsProcessed = 0
  
  for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.trim().split(/\s+/)
    const paragraphWordCount = paragraphWords.length
    
    // If adding this paragraph would exceed max chunk size, finalize current chunk
    if (currentWordCount > 0 && (currentWordCount + paragraphWordCount) > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push({
          document_id: documentId,
          chunk_index: chunkIndex++,
          content: currentChunk.trim(),
          word_count: currentWordCount,
          metadata: {
            start_word: totalWordsProcessed - currentWordCount,
            end_word: totalWordsProcessed,
            chunk_type: 'semantic',
            page_count: pageCount,
            overlap_with_next: overlapSize
          }
        })
      }
      
      // Start new chunk with overlap from previous chunk
      const overlapText = getLastNWords(currentChunk, overlapSize)
      currentChunk = overlapText ? overlapText + '\n\n' + paragraph : paragraph
      currentWordCount = (overlapText ? estimateWordCount(overlapText) : 0) + paragraphWordCount
    } else {
      // Add paragraph to current chunk
      if (currentChunk) {
        currentChunk += '\n\n' + paragraph
      } else {
        currentChunk = paragraph
      }
      currentWordCount += paragraphWordCount
    }
    
    totalWordsProcessed += paragraphWordCount
    
    // If current chunk reaches target size, finalize it
    if (currentWordCount >= targetChunkSize) {
      if (currentChunk.trim()) {
        chunks.push({
          document_id: documentId,
          chunk_index: chunkIndex++,
          content: currentChunk.trim(),
          word_count: currentWordCount,
          metadata: {
            start_word: totalWordsProcessed - currentWordCount,
            end_word: totalWordsProcessed,
            chunk_type: 'semantic',
            page_count: pageCount,
            overlap_with_next: overlapSize
          }
        })
      }
      
      // Prepare overlap for next chunk
      const overlapText = getLastNWords(currentChunk, overlapSize)
      currentChunk = overlapText || ''
      currentWordCount = overlapText ? estimateWordCount(overlapText) : 0
    }
  }
  
  // Add final chunk if there's remaining content
  if (currentChunk.trim()) {
    chunks.push({
      document_id: documentId,
      chunk_index: chunkIndex++,
      content: currentChunk.trim(),
      word_count: currentWordCount,
      metadata: {
        start_word: totalWordsProcessed - currentWordCount,
        end_word: totalWordsProcessed,
        chunk_type: 'semantic',
        page_count: pageCount,
        is_final: true
      }
    })
  }
  
  return chunks
}

// Helper function to get last N words from text
function getLastNWords(text: string, n: number): string {
  if (!text) return ''
  const words = text.trim().split(/\s+/)
  return words.slice(-n).join(' ')
}

// Helper function to estimate word count
function estimateWordCount(text: string): number {
  return text.trim().split(/\s+/).length
}
