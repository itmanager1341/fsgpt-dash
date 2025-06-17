
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputAreaProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  selectedModel: string;
  selectedProvider: string;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSendMessage,
  isLoading,
  selectedModel,
  selectedProvider
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      resetTextareaHeight();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className={cn(
          "flex items-end gap-3 p-3 border rounded-2xl transition-all duration-200",
          "bg-background shadow-sm",
          isFocused ? "border-primary ring-2 ring-primary/20" : "border-border"
        )}>
          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={isLoading}
          >
            <Paperclip size={18} />
          </Button>

          {/* Text Input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type your message..."
              className={cn(
                "w-full resize-none border-0 bg-transparent",
                "focus:outline-none focus:ring-0",
                "placeholder:text-muted-foreground",
                "min-h-[20px] max-h-[120px]"
              )}
              rows={1}
              disabled={isLoading}
            />
          </div>

          {/* Voice Input Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={isLoading}
          >
            <Mic size={18} />
          </Button>

          {/* Send Button */}
          <Button
            type="submit"
            size="icon"
            className={cn(
              "h-8 w-8 transition-all duration-200",
              message.trim() && !isLoading
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            disabled={!message.trim() || isLoading}
          >
            <Send size={16} />
          </Button>
        </div>

        {/* Model Info */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="text-xs text-muted-foreground">
            Using {selectedProvider} • {selectedModel}
          </div>
          <div className="text-xs text-muted-foreground">
            {message.length > 0 && `${message.length} characters`}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInputArea;
