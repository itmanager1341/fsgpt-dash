
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ChatInputAreaProps {
  onSendMessage: (content: string, provider?: string, model?: string) => void;
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
      let finalMessage = message.trim();
      
      // Include processed document information
      const processedDocs = attachedFiles.filter(af => af.processed && af.summary);
      if (processedDocs.length > 0) {
        const docInfo = processedDocs.map(doc => 
          `Document: ${doc.file.name} - ${doc.summary}`
        ).join('\n');
        finalMessage += `\n\n[Documents available for analysis:\n${docInfo}]`;
      }
      
      onSendMessage(finalMessage);
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

  const uploadToStorage = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    return fileName;
  };

  const processDocument = async (file: File, storagePath: string): Promise<AttachedFile> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      // Create document record
      const { data: document, error: docError } = await supabase
        .from('document_uploads')
        .insert({
          user_id: session.user.id,
          file_name: `doc_${Date.now()}`,
          original_name: file.name,
          storage_path: storagePath,
          file_size: file.size,
          file_type: file.type,
          upload_status: 'completed'
        })
        .select()
        .single();

      if (docError || !document) {
        throw new Error('Failed to create document record');
      }

      // Process the document
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-document', {
        body: { documentId: document.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (processError) {
        throw processError;
      }

      return {
        file,
        documentId: document.id,
        processing: false,
        processed: true,
        summary: processResult.summary,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      };
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not supported. Only PDF and image files are allowed.`);
        return false;
      }
      return true;
    });

    // Add files with processing state
    const newAttachedFiles: AttachedFile[] = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      processing: file.type === 'application/pdf',
      processed: file.type.startsWith('image/'), // Images don't need processing
    }));

    setAttachedFiles(prev => [...prev, ...newAttachedFiles]);

    // Process PDF files
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      if (file.type === 'application/pdf') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Authentication required');
          }

          // Upload to storage
          const storagePath = await uploadToStorage(file, session.user.id);
          
          // Process document
          const processedFile = await processDocument(file, storagePath);
          
          // Update the file in state
          setAttachedFiles(prev => prev.map(af => 
            af.file === file ? processedFile : af
          ));

          toast.success(`Document ${file.name} processed successfully`);
        } catch (error) {
          console.error('Error processing document:', error);
          toast.error(`Failed to process ${file.name}: ${error.message}`);
          
          // Update file to show error state
          setAttachedFiles(prev => prev.map(af => 
            af.file === file ? { ...af, processing: false, processed: false } : af
          ));
        }
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

  return (
    <div className="p-4 border-t bg-background">
      {/* File Attachments Preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {attachedFiles.map((attachedFile, index) => (
            <div key={index} className="relative bg-muted rounded-lg p-2 flex items-center gap-2 max-w-64">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {attachedFile.processing ? (
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                ) : attachedFile.file.type === 'application/pdf' ? (
                  <FileText size={16} className={attachedFile.processed ? 'text-green-500' : 'text-gray-500'} />
                ) : attachedFile.preview ? (
                  <img 
                    src={attachedFile.preview} 
                    alt={attachedFile.file.name}
                    className="w-4 h-4 object-cover rounded"
                  />
                ) : (
                  <FileText size={16} className="text-gray-500" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate block">{attachedFile.file.name}</span>
                  {attachedFile.processing && (
                    <span className="text-xs text-blue-600">Processing...</span>
                  )}
                  {attachedFile.processed && attachedFile.summary && (
                    <span className="text-xs text-green-600">Ready for analysis</span>
                  )}
                  {!attachedFile.processing && !attachedFile.processed && attachedFile.file.type === 'application/pdf' && (
                    <span className="text-xs text-red-600">Processing failed</span>
                  )}
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
          <span>• {attachedFiles.length} file(s) attached</span>
        )}
      </div>
    </div>
  );
};

export default ChatInputArea;
