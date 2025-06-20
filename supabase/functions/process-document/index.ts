
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

    // Enhanced document size validation and user warnings
    const fileSizeMB = Math.round(document.file_size / (1024 * 1024))
    const estimatedPages = Math.max(1, Math.round(document.file_size / 50000)) // Rough estimate
    
    console.log(`Document analysis: ${document.original_name}`)
    console.log(`- File size: ${fileSizeMB}MB (${document.file_size} bytes)`)
    console.log(`- Estimated pages: ${estimatedPages}`)
    console.log(`- File type: ${document.file_type}`)

    // Update processing status with size info
    await supabaseClient
      .from('document_uploads')
      .update({ 
        processing_status: 'processing',
        metadata: {
          ...((document.metadata as Record<string, any>) || {}),
          file_size_mb: fileSizeMB,
          estimated_pages: estimatedPages,
          processing_started: new Date().toISOString()
        }
      })
      .eq('id', documentId)

    // Validate storage path
    if (!document.storage_path || document.storage_path === 'temp') {
      console.error('Invalid storage path:', document.storage_path)
      throw new Error(`Document has invalid storage path: ${document.storage_path || 'null'}. Upload may have failed.`)
    }

    console.log(`Using storage path: ${document.storage_path}`)

    // Download file from storage with enhanced error handling
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError)
      
      const { data: fileExists } = await supabaseClient.storage
        .from('documents')
        .list(document.storage_path.split('/').slice(0, -1).join('/'), {
          search: document.storage_path.split('/').pop()
        })

      if (!fileExists || fileExists.length === 0) {
        throw new Error(`File not found in storage at path: ${document.storage_path}. The file may have been deleted or the upload failed.`)
      }
      
      throw new Error(`Failed to download document: ${downloadError?.message || 'Unknown storage error'}`)
    }

    const actualFileSize = (await fileData.arrayBuffer()).byteLength
    console.log(`Downloaded file: ${document.original_name}, actual size: ${actualFileSize} bytes`)

    let extractedText = ''
    let summary = ''
    let pageCount = 0
    let chunks: any[] = []
    
    try {
      if (document.file_type === 'application/pdf' || document.file_type.startsWith('image/')) {
        console.log('Processing document with Azure Document Intelligence (optimized for large files)...')
        
        const azureEndpoint = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT')
        const azureKey = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY')
        
        if (!azureEndpoint || !azureKey) {
          throw new Error('Azure Document Intelligence credentials not configured')
        }

        // Convert file to array buffer
        const arrayBuffer = await fileData.arrayBuffer()
        const fileSizeKB = Math.round(arrayBuffer.byteLength / 1024)
        console.log(`File prepared for Azure: ${arrayBuffer.byteLength} bytes (${fileSizeKB} KB)`)
        
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

        console.log('Document submitted to Azure, implementing enhanced polling strategy...')
        
        // Enhanced polling strategy for large documents
        let attempts = 0
        const maxAttempts = 500 // Increased to 8+ minutes for very large documents
        let result: AzureAnalyzeResult | null = null
        let waitTime = 2000 // Start with 2 seconds for large files
        let lastProgressUpdate = Date.now()
        
        // Determine polling strategy based on file size
        const isVeryLargeFile = fileSizeMB > 50 // 50MB+
        const isLargeFile = fileSizeMB > 10 // 10MB+
        
        if (isVeryLargeFile) {
          waitTime = 5000 // 5 second intervals for very large files
          console.log(`Very large file detected (${fileSizeMB}MB) - using extended polling strategy`)
        } else if (isLargeFile) {
          waitTime = 3000 // 3 second intervals for large files
          console.log(`Large file detected (${fileSizeMB}MB) - using enhanced polling strategy`)
        }
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, waitTime))
          attempts++
          
          // Progressive backoff for very large files
          if (attempts > 60 && isVeryLargeFile) {
            waitTime = Math.min(waitTime * 1.05, 10000) // Max 10 second intervals
          } else if (attempts > 30 && isLargeFile) {
            waitTime = Math.min(waitTime * 1.1, 7000) // Max 7 second intervals
          }
          
          try {
            const resultResponse = await fetch(operationLocation, {
              headers: {
                'Ocp-Apim-Subscription-Key': azureKey,
              },
            })

            if (!resultResponse.ok) {
              console.error(`Failed to get analysis results: ${resultResponse.status}`)
              if (attempts > maxAttempts - 20) {
                throw new Error(`Failed to get analysis results: ${resultResponse.status}`)
              }
              continue
            }

            result = await resultResponse.json()
            const elapsedTime = Math.round(attempts * waitTime / 1000)
            
            console.log(`Analysis status: ${result.status} (attempt ${attempts}/${maxAttempts}, elapsed: ${elapsedTime}s, wait: ${Math.round(waitTime/1000)}s)`)
            
            // Update processing status every 30 seconds for long operations
            if (Date.now() - lastProgressUpdate > 30000) {
              await supabaseClient
                .from('document_uploads')
                .update({ 
                  metadata: {
                    ...((document.metadata as Record<string, any>) || {}),
                    processing_progress: `Azure processing: ${elapsedTime}s elapsed, status: ${result.status}`,
                    attempts: attempts,
                    estimated_completion: attempts < 100 ? 'Soon' : 'Processing large document...'
                  }
                })
                .eq('id', documentId)
              
              lastProgressUpdate = Date.now()
            }
            
            if (result.status === 'succeeded') {
              console.log(`Azure processing completed successfully after ${elapsedTime}s!`)
              break
            } else if (result.status === 'failed') {
              throw new Error('Azure document analysis failed')
            }
            
            // Enhanced progress logging for long operations
            if (attempts % 20 === 0 || (attempts % 10 === 0 && isVeryLargeFile)) {
              console.log(`Still processing large document... ${attempts} attempts, ${elapsedTime}s elapsed`)
              console.log(`Current status: ${result.status}, File size: ${fileSizeMB}MB`)
            }
            
          } catch (fetchError) {
            console.error(`Error polling Azure results (attempt ${attempts}):`, fetchError)
            if (attempts > maxAttempts - 10) {
              throw fetchError
            }
          }
        }

        if (!result || result.status !== 'succeeded' || !result.analyzeResult) {
          const elapsedTime = Math.round(attempts * waitTime / 1000)
          throw new Error(`Document analysis timeout after ${attempts} attempts (${elapsedTime}s). Large documents may require longer processing time.`)
        }

        // Extract text and page information with enhanced validation
        extractedText = result.analyzeResult.content || ''
        pageCount = result.analyzeResult.pages?.length || 1
        
        const elapsedTime = Math.round(attempts * waitTime / 1000)
        console.log(`Azure extraction completed: ${extractedText.length} characters, ${pageCount} pages`)
        console.log(`Processing statistics: ${attempts} attempts over ${elapsedTime} seconds`)
        console.log(`Average processing time per page: ${Math.round(elapsedTime / pageCount)}s`)
        
        // Enhanced validation for large documents
        const expectedMinChars = Math.max(100, Math.min(pageCount * 500, fileSizeMB * 1000)) // More conservative estimates
        const charsPerPage = Math.round(extractedText.length / pageCount)
        
        console.log(`Quality validation:`, {
          extractedLength: extractedText.length,
          expectedMinimum: expectedMinChars,
          pageCount: pageCount,
          fileSizeMB: fileSizeMB,
          charsPerPage: charsPerPage,
          processingTimeSeconds: elapsedTime,
          qualityRatio: extractedText.length / expectedMinChars
        })

        if (extractedText.length < expectedMinChars) {
          console.warn(`Potential extraction quality issue for large document:`, {
            actualChars: extractedText.length,
            expectedMinChars: expectedMinChars,
            pageCount: pageCount,
            averageCharsPerPage: charsPerPage
          })
        }

        // Create enhanced semantic chunks for large documents
        if (extractedText.length > 500) {
          chunks = createAdvancedSemanticChunks(extractedText, documentId, pageCount, fileSizeMB)
          console.log(`Created ${chunks.length} advanced chunks for large document`)
          
          // Validate chunk coverage
          const totalChunkChars = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0)
          const coverageRatio = totalChunkChars / extractedText.length
          
          console.log(`Large document chunk validation:`, {
            originalTextLength: extractedText.length,
            totalChunkLength: totalChunkChars,
            coverageRatio: coverageRatio,
            chunksCreated: chunks.length,
            avgChunkSize: Math.round(totalChunkChars / chunks.length),
            processingTime: elapsedTime
          })
          
          if (coverageRatio < 0.90) {
            console.warn(`Lower chunk coverage for large document: ${(coverageRatio * 100).toFixed(1)}%`)
          }
          
          // Generate comprehensive summary
          const words = extractedText.trim().split(/\s+/)
          const previewWords = Math.min(300, Math.max(150, words.length * 0.05))
          const firstWords = words.slice(0, previewWords).join(' ')
          
          summary = `Large document "${document.original_name}" (${pageCount} pages, ${fileSizeMB}MB, ${extractedText.length.toLocaleString()} characters) successfully processed with Azure Document Intelligence. Created ${chunks.length} content chunks with ${Math.round(coverageRatio * 100)}% coverage. Processing time: ${elapsedTime}s (${Math.round(elapsedTime/60)}min). Quality: ${charsPerPage} chars/page. Preview: ${firstWords}${words.length > previewWords ? '...' : ''}`
        } else {
          console.warn('Low text extraction from large document - may contain primarily images or have processing issues')
          summary = `Large document "${document.original_name}" (${pageCount} pages, ${fileSizeMB}MB) processed with limited text extraction (${extractedText.length} chars). Processing time: ${elapsedTime}s. Document may contain primarily images or require manual review.`
        }

      } else {
        console.log('Processing non-PDF/image document type')
        extractedText = `Unsupported document type: ${document.original_name}`
        summary = `Document "${document.original_name}" uploaded but text extraction not supported for this file type.`
      }

    } catch (extractionError) {
      console.error('Enhanced Azure document processing error:', extractionError)
      
      // Enhanced error reporting
      const errorDetails = {
        error: extractionError.message,
        document_size_mb: fileSizeMB,
        estimated_pages: estimatedPages,
        processing_time: Date.now(),
        error_type: extractionError.message.includes('timeout') ? 'timeout' : 
                   extractionError.message.includes('Azure') ? 'azure_api' : 'unknown'
      }
      
      await supabaseClient
        .from('document_uploads')
        .update({ 
          processing_status: 'failed',
          processing_error: extractionError.message,
          metadata: {
            ...((document.metadata as Record<string, any>) || {}),
            ...errorDetails
          }
        })
        .eq('id', documentId)
      
      throw new Error(`Failed to process large document: ${extractionError.message}`)
    }

    // Store chunks in database if we have any
    if (chunks.length > 0) {
      console.log(`Storing ${chunks.length} chunks for large document...`)
      
      // Store chunks in batches for very large documents
      const batchSize = 50
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)
        const { error: chunksError } = await supabaseClient
          .from('document_chunks')
          .insert(batch)

        if (chunksError) {
          console.error(`Error storing chunk batch ${i/batchSize + 1}:`, chunksError)
          throw chunksError
        }
        
        console.log(`Stored chunk batch ${i/batchSize + 1}/${Math.ceil(chunks.length/batchSize)} (${batch.length} chunks)`)
      }
      
      console.log(`Successfully stored all ${chunks.length} chunks in ${Math.ceil(chunks.length/batchSize)} batches`)
    }

    // Update document with final results
    const truncatedText = extractedText.length > 200000 ? 
      extractedText.substring(0, 200000) + '...[truncated for storage - full text available in chunks]' : 
      extractedText

    const finalMetadata = {
      ...((document.metadata as Record<string, any>) || {}),
      page_count: pageCount,
      text_length: extractedText.length,
      chunk_count: chunks.length,
      file_size_mb: fileSizeMB,
      processing_completed: new Date().toISOString(),
      extraction_quality: extractedText.length > (pageCount * 200) ? 'excellent' : 
                         extractedText.length > (pageCount * 100) ? 'good' : 'limited',
      processor: 'azure_document_intelligence_enhanced',
      chars_per_page: pageCount > 0 ? Math.round(extractedText.length / pageCount) : 0,
      processing_success: true,
      large_document_processing: fileSizeMB > 10
    }

    const { error: updateError } = await supabaseClient
      .from('document_uploads')
      .update({
        extracted_text: truncatedText,
        summary,
        processing_status: 'completed',
        metadata: finalMetadata
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Error updating document record:', updateError)
      throw updateError
    }

    console.log(`Large document ${documentId} processed successfully:`)
    console.log(`- Text: ${extractedText.length} chars`)
    console.log(`- Chunks: ${chunks.length}`)
    console.log(`- Pages: ${pageCount}`)
    console.log(`- Size: ${fileSizeMB}MB`)

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        summary,
        extractedText: extractedText.substring(0, 2000) + (extractedText.length > 2000 ? '...' : ''),
        chunksCreated: chunks.length,
        pageCount,
        textLength: extractedText.length,
        fileSizeMB,
        processor: 'azure_document_intelligence_enhanced',
        quality: extractedText.length > (pageCount * 200) ? 'excellent' : 
                extractedText.length > (pageCount * 100) ? 'good' : 'limited',
        processingTime: 'Large document processing completed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== ENHANCED AZURE DOCUMENT PROCESSING ERROR ===')
    console.error('Error details:', error)
    
    // Enhanced error handling and reporting
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
            processing_error: error.message,
            metadata: {
              error_timestamp: new Date().toISOString(),
              error_details: error.stack?.substring(0, 1000),
              large_document_error: true
            }
          })
          .eq('id', documentId)
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError)
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        isLargeDocumentError: true,
        suggestion: 'Large documents may require longer processing time. Please try again or contact support for documents over 100MB.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Enhanced semantic chunking function optimized for large documents
function createAdvancedSemanticChunks(text: string, documentId: string, pageCount: number, fileSizeMB?: number) {
  const chunks = []
  
  // Adaptive strategies based on document size
  const isVeryLargeDoc = (fileSizeMB && fileSizeMB > 50) || pageCount > 100
  const isLargeDoc = (fileSizeMB && fileSizeMB > 10) || pageCount > 25
  
  // Optimized chunk sizes for large documents
  let targetChunkSize = 800  // Default
  let maxChunkSize = 1200    // Default
  let overlapSize = 100      // Default
  
  if (isVeryLargeDoc) {
    targetChunkSize = 1500   // Larger chunks for very large docs
    maxChunkSize = 2000      // Higher max
    overlapSize = 200        // More overlap
  } else if (isLargeDoc) {
    targetChunkSize = 1200   // Larger chunks for large docs  
    maxChunkSize = 1600      // Higher max
    overlapSize = 150        // More overlap
  }
  
  console.log(`Advanced chunking for ${isVeryLargeDoc ? 'very large' : isLargeDoc ? 'large' : 'normal'} document:`)
  console.log(`- Text length: ${text.length} chars`)
  console.log(`- Target chunk: ${targetChunkSize} words`)
  console.log(`- Max chunk: ${maxChunkSize} words`)
  console.log(`- Overlap: ${overlapSize} words`)
  
  // Enhanced sentence splitting for better accuracy
  const sentences = text
    .split(/[.!?]+\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10) // Filter out very short fragments
  
  console.log(`Found ${sentences.length} sentences for advanced processing`)
  
  let currentChunk = ''
  let currentWordCount = 0
  let chunkIndex = 0
  let processedSentences = 0
  let totalWordsProcessed = 0
  
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
            start_sentence: Math.max(0, processedSentences - Math.floor(currentWordCount / 15)),
            end_sentence: processedSentences,
            chunk_type: 'advanced_semantic_large_doc',
            page_count: pageCount,
            overlap_with_next: overlapSize,
            processing_method: 'enhanced_sentence_based',
            is_large_document: isLargeDoc,
            is_very_large_document: isVeryLargeDoc,
            document_size_mb: fileSizeMB,
            quality_score: Math.min(1.0, currentWordCount / targetChunkSize)
          }
        })
        
        totalWordsProcessed += currentWordCount
        if (chunkIndex % 10 === 0 || isVeryLargeDoc) {
          console.log(`Created chunk ${chunkIndex - 1}: ${currentWordCount} words (${totalWordsProcessed} total)`)
        }
      }
      
      // Start new chunk with enhanced overlap
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
    
    // Finalize chunk when reaching target size (but not at the very end)
    if (currentWordCount >= targetChunkSize && i < sentences.length - 1) {
      if (currentChunk.trim()) {
        chunks.push({
          document_id: documentId,
          chunk_index: chunkIndex++,
          content: currentChunk.trim(),
          word_count: currentWordCount,
          metadata: {
            start_sentence: Math.max(0, processedSentences - Math.floor(currentWordCount / 15)),
            end_sentence: processedSentences,
            chunk_type: 'advanced_semantic_large_doc',
            page_count: pageCount,
            overlap_with_next: overlapSize,
            processing_method: 'enhanced_sentence_based',
            is_large_document: isLargeDoc,
            is_very_large_document: isVeryLargeDoc,
            document_size_mb: fileSizeMB,
            quality_score: Math.min(1.0, currentWordCount / targetChunkSize)
          }
        })
        
        totalWordsProcessed += currentWordCount
        if (chunkIndex % 10 === 0 || isVeryLargeDoc) {
          console.log(`Created chunk ${chunkIndex - 1}: ${currentWordCount} words (${totalWordsProcessed} total)`)
        }
      }
      
      // Prepare overlap for next chunk
      const overlapText = getLastNWords(currentChunk, overlapSize)
      currentChunk = overlapText || ''
      currentWordCount = overlapText ? estimateWordCount(overlapText) : 0
    }
    
    // Progress logging for very large documents
    if (isVeryLargeDoc && i % 1000 === 0 && i > 0) {
      console.log(`Advanced chunking progress: ${i}/${sentences.length} sentences, ${chunkIndex} chunks created`)
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
        start_sentence: Math.max(0, processedSentences - Math.floor(currentWordCount / 15)),
        end_sentence: processedSentences,
        chunk_type: 'advanced_semantic_large_doc',
        page_count: pageCount,
        is_final: true,
        processing_method: 'enhanced_sentence_based',
        is_large_document: isLargeDoc,
        is_very_large_document: isVeryLargeDoc,
        document_size_mb: fileSizeMB,
        quality_score: Math.min(1.0, currentWordCount / targetChunkSize)
      }
    })
    
    totalWordsProcessed += currentWordCount
    console.log(`Created final chunk ${chunkIndex - 1}: ${currentWordCount} words`)
  }
  
  // Enhanced validation for large documents
  const totalChunkContent = chunks.map(c => c.content).join(' ')
  const originalWords = text.split(/\s+/).filter(w => w.length > 0).length
  const chunkWords = totalChunkContent.split(/\s+/).filter(w => w.length > 0).length
  const coverageRatio = chunkWords / originalWords
  const avgChunkSize = Math.round(chunkWords / chunks.length)
  
  console.log(`Advanced chunking completed for ${isVeryLargeDoc ? 'very large' : 'large'} document:`)
  console.log(`- Original: ${originalWords} words`)
  console.log(`- Chunks: ${chunkWords} words in ${chunks.length} chunks`)
  console.log(`- Coverage: ${Math.round(coverageRatio * 100)}%`)
  console.log(`- Average chunk size: ${avgChunkSize} words`)
  console.log(`- Target was: ${targetChunkSize} words`)
  
  if (coverageRatio < 0.92) {
    console.warn(`Coverage below optimal for large document: ${Math.round(coverageRatio * 100)}%`)
  }
  
  return chunks
}

// Helper function to get last N words from text
function getLastNWords(text: string, n: number): string {
  if (!text) return ''
  const words = text.trim().split(/\s+/)
  return words.slice(-n).join(' ')
}

function estimateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}
