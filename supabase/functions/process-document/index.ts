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
        console.log(`File converted to array buffer: ${arrayBuffer.byteLength} bytes`)
        
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
          console.error(`Azure API submission error: ${submitResponse.status} - ${errorText}`)
          throw new Error(`Azure API error: ${submitResponse.status} - ${errorText}`)
        }

        // Get the operation location from response headers
        const operationLocation = submitResponse.headers.get('Operation-Location')
        if (!operationLocation) {
          throw new Error('No operation location returned from Azure')
        }

        console.log('Document submitted to Azure, polling for results...')
        
        // Poll for results with extended timeout for large documents
        let attempts = 0
        const maxAttempts = 60 // 60 seconds max wait time for large PDFs
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
            console.error(`Failed to get analysis results: ${resultResponse.status}`)
            throw new Error(`Failed to get analysis results: ${resultResponse.status}`)
          }

          result = await resultResponse.json()
          console.log(`Analysis status: ${result.status} (attempt ${attempts}/${maxAttempts})`)
          
          if (result.status === 'succeeded') {
            break
          } else if (result.status === 'failed') {
            throw new Error('Azure document analysis failed')
          }
        }

        if (!result || result.status !== 'succeeded' || !result.analyzeResult) {
          throw new Error(`Document analysis did not complete successfully after ${attempts} attempts`)
        }

        // Extract text and page information with comprehensive validation
        extractedText = result.analyzeResult.content || ''
        pageCount = result.analyzeResult.pages?.length || 1
        
        console.log(`Azure extraction complete: ${extractedText.length} characters, ${pageCount} pages`)
        console.log(`Pages array length: ${result.analyzeResult.pages?.length || 0}`)
        
        // Enhanced validation for extraction quality
        const expectedMinCharsPerPage = 50 // Minimum chars expected per page
        const expectedMinChars = pageCount * expectedMinCharsPerPage
        
        if (extractedText.length < expectedMinChars) {
          console.warn(`Low text extraction quality detected:`, {
            extractedLength: extractedText.length,
            expectedMinimum: expectedMinChars,
            pageCount: pageCount,
            averageCharsPerPage: Math.round(extractedText.length / pageCount)
          });
        }

        if (extractedText.length < 100) {
          console.warn('Very low text extraction - document may be image-based or corrupted')
          summary = `Document "${document.original_name}" processed with limited text extraction (${extractedText.length} chars from ${pageCount} pages). Document may contain primarily images or have extraction issues.`
        } else {
          // Create enhanced semantic chunks that preserve all content
          chunks = createComprehensiveSemanticChunks(extractedText, documentId, pageCount)
          console.log(`Created ${chunks.length} comprehensive chunks from ${pageCount} pages`)
          
          // Validate chunk coverage
          const totalChunkChars = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0)
          const coverageRatio = totalChunkChars / extractedText.length
          
          console.log(`Chunk coverage validation:`, {
            originalTextLength: extractedText.length,
            totalChunkLength: totalChunkChars,
            coverageRatio: coverageRatio,
            chunksCreated: chunks.length
          })
          
          if (coverageRatio < 0.9) {
            console.warn(`Low chunk coverage detected: ${(coverageRatio * 100).toFixed(1)}%`)
          }
          
          // Generate comprehensive summary
          const words = extractedText.trim().split(/\s+/)
          const firstWords = words.slice(0, 500).join(' ') // Increased from 300 to 500
          summary = `Document "${document.original_name}" (${pageCount} pages, ${extractedText.length} chars) successfully processed with Azure Document Intelligence. ${chunks.length} content chunks created. Preview: ${firstWords}${words.length > 500 ? '...' : ''}`
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
      console.log(`Storing ${chunks.length} chunks in database...`)
      const { error: chunksError } = await supabaseClient
        .from('document_chunks')
        .insert(chunks)

      if (chunksError) {
        console.error('Error storing chunks:', chunksError)
        throw chunksError
      }
      console.log(`Successfully stored ${chunks.length} chunks`)
    }

    // Update document with extracted text and processing results
    const truncatedText = extractedText.length > 100000 ? 
      extractedText.substring(0, 100000) + '...[truncated for storage]' : 
      extractedText;

    const { error: updateError } = await supabaseClient
      .from('document_uploads')
      .update({
        extracted_text: truncatedText,
        summary,
        processing_status: 'completed',
        metadata: {
          ...((document.metadata as Record<string, any>) || {}),
          page_count: pageCount,
          text_length: extractedText.length,
          chunk_count: chunks.length,
          processing_timestamp: new Date().toISOString(),
          extraction_quality: extractedText.length > 100 ? 'good' : 'limited',
          processor: 'azure_document_intelligence',
          chars_per_page: pageCount > 0 ? Math.round(extractedText.length / pageCount) : 0,
          coverage_validated: true
        }
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Error updating document record:', updateError)
      throw updateError
    }

    console.log(`Document ${documentId} processed successfully - ${extractedText.length} chars, ${chunks.length} chunks, ${pageCount} pages`)

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        summary,
        extractedText: extractedText.substring(0, 1000) + (extractedText.length > 1000 ? '...' : ''),
        chunksCreated: chunks.length,
        pageCount,
        textLength: extractedText.length,
        processor: 'azure_document_intelligence',
        quality: extractedText.length > 100 ? 'good' : 'limited'
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

// Comprehensive semantic chunking function that preserves all content
function createComprehensiveSemanticChunks(text: string, documentId: string, pageCount: number) {
  const chunks = []
  const targetChunkSize = 800   // Target words per chunk
  const maxChunkSize = 1200     // Maximum words per chunk
  const overlapSize = 100       // Words to overlap between chunks
  
  console.log(`Starting comprehensive chunking: ${text.length} chars, target: ${targetChunkSize} words`)
  
  // Split text into sentences for better boundary detection
  const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0)
  console.log(`Found ${sentences.length} sentences to process`)
  
  let currentChunk = ''
  let currentWordCount = 0
  let chunkIndex = 0
  let processedSentences = 0
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim()
    if (!sentence) continue
    
    const sentenceWords = sentence.split(/\s+/).filter(w => w.length > 0)
    const sentenceWordCount = sentenceWords.length
    
    // Check if adding this sentence would exceed max chunk size
    if (currentWordCount > 0 && (currentWordCount + sentenceWordCount) > maxChunkSize) {
      // Finalize current chunk
      if (currentChunk.trim()) {
        chunks.push({
          document_id: documentId,
          chunk_index: chunkIndex++,
          content: currentChunk.trim(),
          word_count: currentWordCount,
          metadata: {
            start_sentence: processedSentences - Math.floor(currentWordCount / 10), // Rough estimate
            end_sentence: processedSentences,
            chunk_type: 'comprehensive_semantic',
            page_count: pageCount,
            overlap_with_next: overlapSize,
            processing_method: 'sentence_based'
          }
        })
        
        console.log(`Created chunk ${chunkIndex - 1}: ${currentWordCount} words`)
      }
      
      // Start new chunk with overlap from previous chunk
      const overlapText = getLastNWords(currentChunk, overlapSize)
      currentChunk = overlapText ? overlapText + ' ' + sentence : sentence
      currentWordCount = (overlapText ? estimateWordCount(overlapText) : 0) + sentenceWordCount
    } else {
      // Add sentence to current chunk
      if (currentChunk) {
        currentChunk += ' ' + sentence
      } else {
        currentChunk = sentence
      }
      currentWordCount += sentenceWordCount
    }
    
    processedSentences++
    
    // If current chunk reaches target size, finalize it
    if (currentWordCount >= targetChunkSize && i < sentences.length - 1) {
      if (currentChunk.trim()) {
        chunks.push({
          document_id: documentId,
          chunk_index: chunkIndex++,
          content: currentChunk.trim(),
          word_count: currentWordCount,
          metadata: {
            start_sentence: processedSentences - Math.floor(currentWordCount / 10),
            end_sentence: processedSentences,
            chunk_type: 'comprehensive_semantic',
            page_count: pageCount,
            overlap_with_next: overlapSize,
            processing_method: 'sentence_based'
          }
        })
        
        console.log(`Created chunk ${chunkIndex - 1}: ${currentWordCount} words`)
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
        start_sentence: processedSentences - Math.floor(currentWordCount / 10),
        end_sentence: processedSentences,
        chunk_type: 'comprehensive_semantic',
        page_count: pageCount,
        is_final: true,
        processing_method: 'sentence_based'
      }
    })
    
    console.log(`Created final chunk ${chunkIndex - 1}: ${currentWordCount} words`)
  }
  
  // Validation: ensure we haven't lost content
  const totalChunkContent = chunks.map(c => c.content).join(' ')
  const originalWords = text.split(/\s+/).filter(w => w.length > 0).length
  const chunkWords = totalChunkContent.split(/\s+/).filter(w => w.length > 0).length
  
  console.log(`Chunking validation: Original ${originalWords} words, Chunks contain ${chunkWords} words (${Math.round(chunkWords/originalWords*100)}% coverage)`)
  
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
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}
