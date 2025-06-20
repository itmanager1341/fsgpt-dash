import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ChatInputAreaProps {
  onSendMessage: (content: string, provider?: string, model?: string, documentIds?: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface AttachedFile {
  file: File;
  preview?: string;
  documentId?: string;
  processing?: boolean;
  processed?: boolean;
  summary?: string;
  processingError?: string;
  textLength?: number;
  pageCount?: number;
  processor?: string;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((message.trim() || attachedFiles.length > 0) && !disabled) {
      // Send clean user message without document metadata
      const cleanMessage = message.trim();
      
      // Get processed document IDs to pass separately
      const processedDocumentIds = attachedFiles
        .filter(af => af.processed && af.documentId)
        .map(af => af.documentId!);
      
      onSendMessage(cleanMessage, undefined, undefined, processedDocumentIds);
      setMessage('');
      setIsTyping(false);
      setAttachedFiles([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Enhanced storage naming function with uniqueness guarantee
  const generateUniqueStoragePath = (file: File, userId: string, documentId: string): string => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    // Sanitize filename - remove special chars, keep alphanumeric, dots, hyphens, underscores
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    
    const fileExt = file.name.split('.').pop();
    const nameWithoutExt = sanitizedName.replace(`.${fileExt}`, '');
    
    // Format: userId/timestamp_randomSuffix_filename_docId.ext
    return `${userId}/${timestamp}_${randomSuffix}_${nameWithoutExt}_${documentId.substring(0, 8)}.${fileExt}`;
  };

  const uploadToStorage = async (file: File, userId: string, documentId: string): Promise<string> => {
    const fileName = generateUniqueStoragePath(file, userId, documentId);
    console.log(`Attempting to upload file with unique path: ${fileName}`);
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log(`File uploaded successfully to: ${fileName}`);
    return fileName;
  };

  const processDocument = async (file: File, documentId: string): Promise<AttachedFile> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      const isLargeFile = fileSizeMB > 10;
      const isVeryLargeFile = fileSizeMB > 50;

      console.log(`Starting document processing for ${file.name} (${fileSizeMB}MB)`);

      // Show appropriate warning for large files
      if (isVeryLargeFile) {
        toast.warning(`Processing very large document (${fileSizeMB}MB). This may take 5-10 minutes. Please be patient.`);
      } else if (isLargeFile) {
        toast.warning(`Processing large document (${fileSizeMB}MB). This may take 2-5 minutes.`);
      }

      // Upload to storage with unique naming
      const storagePath = await uploadToStorage(file, session.user.id, documentId);

      // Update the document record with the actual storage path
      const { error: updateError } = await supabase
        .from('document_uploads')
        .update({ storage_path: storagePath })
        .eq('id', documentId);

      if (updateError) {
        console.error('Failed to update storage path:', updateError);
        throw new Error(`Failed to update document record: ${updateError.message}`);
      }

      console.log(`Updated document ${documentId} with storage path: ${storagePath}`);

      // Process the document with Azure (enhanced timeout handling)
      console.log('Invoking Azure document processing with enhanced timeout handling...');
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-document', {
        body: { documentId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (processError) {
        console.error('Azure processing error:', processError);
        
        // Enhanced error messaging for large documents
        let errorMessage = `Azure processing failed: ${processError.message}`;
        if (processError.message.includes('timeout') && isLargeFile) {
          errorMessage = `Large document processing timeout (${fileSizeMB}MB). This document may be too large or complex. Try splitting it into smaller sections.`;
        }
        throw new Error(errorMessage);
      }

      console.log('Azure processing result:', processResult);

      // Enhanced success messaging based on document size and results
      if (processResult.textLength > 1000 && processResult.chunksCreated > 0) {
        if (isVeryLargeFile) {
          toast.success(`Very large document processed successfully! ${processResult.textLength.toLocaleString()} characters from ${processResult.pageCount} pages in ${processResult.chunksCreated} chunks.`);
        } else if (isLargeFile) {
          toast.success(`Large document processed successfully! ${processResult.textLength.toLocaleString()} characters from ${processResult.pageCount} pages.`);
        } else {
          toast.success(`Document processed: ${processResult.textLength.toLocaleString()} characters, ${processResult.chunksCreated} chunks.`);
        }
      } else {
        toast.warning(`Document processed but extraction may be incomplete: ${processResult.textLength} characters from ${processResult.pageCount || 'unknown'} pages.`);
      }

      return {
        file,
        documentId,
        processing: false,
        processed: true,
        summary: processResult.summary,
        textLength: processResult.textLength,
        pageCount: processResult.pageCount,
        processor: processResult.processor || 'azure_document_intelligence_enhanced',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      };
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Enhanced validation for large documents
    const validFiles = files.filter(file => {
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error(`File ${file.name} is too large (${fileSizeMB}MB). Maximum size is 100MB. Consider splitting large documents.`);
        return false;
      }
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not supported. Only PDF and image files are allowed.`);
        return false;
      }
      
      // Warn about very large files
      if (fileSizeMB > 50) {
        toast.warning(`${file.name} is very large (${fileSizeMB}MB) and may take 5-10 minutes to process.`);
      } else if (fileSizeMB > 20) {
        toast.info(`${file.name} is large (${fileSizeMB}MB) and may take 2-5 minutes to process.`);
      }
      
      return true;
    });

    // Add files with processing state
    const newAttachedFiles: AttachedFile[] = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      processing: true,
      processed: false,
    }));

    setAttachedFiles(prev => [...prev, ...newAttachedFiles]);

    // Process files with enhanced error handling for large documents
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Authentication required');
        }

        const fileSizeMB = Math.round(file.size / (1024 * 1024));
        console.log(`Processing file ${i + 1}/${validFiles.length}: ${file.name} (${fileSizeMB}MB)`);

        // Create document record first with temporary storage path
        const { data: document, error: docError } = await supabase
          .from('document_uploads')
          .insert({
            user_id: session.user.id,
            file_name: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            original_name: file.name,
            storage_path: 'temp', // Will be updated after upload
            file_size: file.size,
            file_type: file.type,
            upload_status: 'completed',
            processing_status: 'processing'
          })
          .select()
          .single();

        if (docError || !document) {
          throw new Error(`Failed to create document record: ${docError?.message}`);
        }

        console.log(`Created document record: ${document.id}`);
        
        // Process document with improved error handling
        const processedFile = await processDocument(file, document.id);
        
        // Update the file in state
        setAttachedFiles(prev => prev.map(af => 
          af.file === file ? processedFile : af
        ));

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        
        const errorMessage = error.message || 'Unknown error occurred';
        let userFriendlyMessage = `Failed to process ${file.name}`;
        
        if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          userFriendlyMessage += ' (processing timeout - document may be too large or complex)';
        } else if (errorMessage.includes('duplicate') || errorMessage.includes('Duplicate')) {
          userFriendlyMessage += ' (file already exists - please rename and try again)';
        } else if (errorMessage.includes('storage')) {
          userFriendlyMessage += ' (storage error)';
        } else if (errorMessage.includes('Large document')) {
          userFriendlyMessage = errorMessage; // Use the enhanced error message as-is
        }
        
        toast.error(`${userFriendlyMessage}: ${errorMessage}`);
        
        // Update file to show error state with detailed error
        setAttachedFiles(prev => prev.map(af => 
          af.file === file ? { 
            ...af, 
            processing: false, 
            processed: false, 
            processingError: errorMessage
          } : af
        ));
      }
    }
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => {
      const newFiles = [...prev];
      // Clean up object URL if it exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const getFileStatusIcon = (attachedFile: AttachedFile) => {
    if (attachedFile.processing) {
      return <Loader2 size={16} className="animate-spin text-blue-500" />;
    }
    if (attachedFile.processingError) {
      return <AlertCircle size={16} className="text-red-500" />;
    }
    if (attachedFile.processed) {
      return <CheckCircle size={16} className="text-green-500" />;
    }
    return <FileText size={16} className="text-gray-500" />;
  };

  const getFileStatusText = (attachedFile: AttachedFile) => {
    const fileSizeMB = Math.round(attachedFile.file.size / (1024 * 1024));
    const isLargeFile = fileSizeMB > 10;
    
    if (attachedFile.processing) {
      if (isLargeFile) {
        return `Processing large document (${fileSizeMB}MB) with Azure - may take up to 10 minutes...`;
      }
      return "Processing with Azure (may take up to 5 minutes for large files)...";
    }
    if (attachedFile.processingError) {
      return `Processing failed: ${attachedFile.processingError}`;
    }
    if (attachedFile.processed && attachedFile.pageCount && attachedFile.textLength) {
      const quality = attachedFile.textLength > (attachedFile.pageCount * 200) ? 'excellent' : 
                     attachedFile.textLength > (attachedFile.pageCount * 100) ? 'good' : 'limited';
      return `Ready - ${attachedFile.pageCount} pages, ${attachedFile.textLength.toLocaleString()} chars (${quality} quality)`;
    }
    if (attachedFile.processed && attachedFile.textLength) {
      return `Ready - ${attachedFile.textLength.toLocaleString()} chars (Azure Enhanced)`;
    }
    if (attachedFile.processed) {
      return "Ready for analysis (Azure Enhanced)";
    }
    return "Uploaded";
  };

  return (
    <div className="p-4 border-t bg-background">
      {/* File Attachments Preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {attachedFiles.map((attachedFile, index) => (
            <div key={index} className="relative bg-muted rounded-lg p-3 flex items-center gap-3 max-w-80">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {attachedFile.preview ? (
                  <img 
                    src={attachedFile.preview} 
                    alt={attachedFile.file.name}
                    className="w-4 h-4 object-cover rounded"
                  />
                ) : (
                  getFileStatusIcon(attachedFile)
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{attachedFile.file.name}</span>
                  <span className={cn(
                    "text-xs",
                    attachedFile.processing ? "text-blue-600" : 
                    attachedFile.processingError ? "text-red-600" :
                    attachedFile.processed ? "text-green-600" : "text-gray-600"
                  )}>
                    {getFileStatusText(attachedFile)}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 absolute -top-1 -right-1"
                onClick={() => removeFile(index)}
              >
                <X size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        {/* Attachment Button */}
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className="flex-shrink-0"
          onClick={handleFileSelect}
        >
          <Paperclip size={18} />
        </Button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept="application/pdf,image/*"
        />

        {/* Message Input */}
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[44px] max-h-32 resize-none pr-12",
              "focus:ring-2 focus:ring-primary/20"
            )}
            rows={1}
          />
          
          {/* Character count or typing indicator */}
          {isTyping && (
            <div className="absolute -bottom-5 right-0 text-xs text-muted-foreground">
              {message.length} characters
            </div>
          )}
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachedFiles.length === 0)}
          size="icon"
          className="flex-shrink-0"
        >
          <Send size={18} />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
        {attachedFiles.length > 0 && (
          <span>• {attachedFiles.filter(af => af.processed).length}/{attachedFiles.length} documents ready</span>
        )}
      </div>
    </div>
  );
};

export default ChatInputArea;
