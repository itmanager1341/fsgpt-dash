
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatInputAreaProps {
  onSendMessage: (content: string, provider?: string, model?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface AttachedFile {
  file: File;
  preview?: string;
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
      
      // If files are attached, add file information to the message
      if (attachedFiles.length > 0) {
        const fileList = attachedFiles.map(af => af.file.name).join(', ');
        finalMessage += `\n\n[Attached files: ${fileList}]`;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    const newAttachedFiles: AttachedFile[] = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setAttachedFiles(prev => [...prev, ...newAttachedFiles]);
    
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
            <div key={index} className="relative bg-muted rounded-lg p-2 flex items-center gap-2">
              {attachedFile.preview && (
                <img 
                  src={attachedFile.preview} 
                  alt={attachedFile.file.name}
                  className="w-8 h-8 object-cover rounded"
                />
              )}
              <span className="text-sm truncate max-w-32">{attachedFile.file.name}</span>
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
          accept="image/*,.pdf,.doc,.docx,.txt,.md"
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
