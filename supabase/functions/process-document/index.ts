
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import PDF.js for Deno - using minified build for reliability
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'

// Configure PDF.js worker at module level
const workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

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

    // Convert to array buffer for PDF processing
    const arrayBuffer = await fileData.arrayBuffer()
    
    let extractedText = ''
    let summary = ''
    let pageCount = 0
    let chunks: any[] = []
    
    try {
      if (document.file_type === 'application/pdf') {
        console.log('Processing PDF document with PDF.js...')
        console.log('PDF.js module loaded:', typeof pdfjsLib, 'getDocument available:', typeof pdfjsLib.getDocument)
        
        // Process PDF using PDF.js
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Load PDF document with enhanced configuration
        const loadingTask = pdfjsLib.getDocument({
          data: uint8Array,
          standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        })
        
        const pdfDocument = await loadingTask.promise
        pageCount = pdfDocument.numPages
        console.log(`PDF loaded successfully with ${pageCount} pages`)
        
        // Extract text from each page with better processing
        const pageTexts = []
        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
          try {
            const page = await pdfDocument.getPage(pageNum)
            const textContent = await page.getTextContent()
            
            // Process text items with better spacing and structure
            const textItems = textContent.items.filter((item: any) => 
              item.str && item.str.trim() && item.str.trim().length > 0
            )
            
            // Group text items by approximate line position
            const lines: { [key: string]: string[] } = {}
            textItems.forEach((item: any) => {
              const lineKey = Math.round(item.transform[5] / 5) * 5 // Group by Y position
              if (!lines[lineKey]) lines[lineKey] = []
              lines[lineKey].push(item.str)
            })
            
            // Sort lines by Y position (top to bottom) and join text
            const sortedLines = Object.keys(lines)
              .sort((a, b) => parseFloat(b) - parseFloat(a)) // Descending Y (top to bottom)
              .map(key => lines[key].join(' ').trim())
              .filter(line => line.length > 0)
            
            const pageText = sortedLines.join('\n').trim()
            
            if (pageText) {
              pageTexts.push(pageText)
              console.log(`Page ${pageNum}: extracted ${pageText.length} characters`)
            }
          } catch (pageError) {
            console.warn(`Error processing page ${pageNum}:`, pageError)
            // Continue with other pages
          }
        }
        
        extractedText = pageTexts.join('\n\n').trim()
        console.log(`Total extracted text: ${extractedText.length} characters from ${pageCount} pages`)

        // Validate extraction quality
        if (extractedText.length < 100) {
          console.warn('Low text extraction quality - document may be image-based or corrupted')
          summary = `PDF document "${document.original_name}" processed with limited text extraction. Document may contain primarily images or have extraction issues.`
        } else {
          // Create semantic chunks with enhanced processing
          chunks = createEnhancedSemanticChunks(extractedText, documentId, pageCount)
          console.log(`Created ${chunks.length} semantic chunks`)
          
          // Generate summary from first 300 words
          const words = extractedText.trim().split(/\s+/)
          const firstWords = words.slice(0, 300).join(' ')
          summary = `PDF document "${document.original_name}" (${pageCount} pages) successfully processed. Content preview: ${firstWords}${words.length > 300 ? '...' : ''}`
        }

      } else {
        // Handle non-PDF files (images, etc.)
        console.log('Processing non-PDF document')
        extractedText = `Non-PDF document: ${document.original_name}`
        summary = `Document "${document.original_name}" uploaded but text extraction not supported for this file type.`
      }

    } catch (extractionError) {
      console.error('Text extraction error:', extractionError)
      throw new Error(`Failed to extract text from document: ${extractionError.message}`)
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
          extraction_quality: extractedText.length > 100 ? 'good' : 'limited'
        }
      })
      .eq('id', documentId)

    if (updateError) {
      throw updateError
    }

    console.log(`Document ${documentId} processed successfully - ${extractedText.length} chars, ${chunks.length} chunks`)

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        summary,
        extractedText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
        chunksCreated: chunks.length,
        pageCount,
        textLength: extractedText.length
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
