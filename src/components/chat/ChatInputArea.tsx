
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputAreaProps {
  onSendMessage: (content: string, provider?: string, model?: string) => void;
  disabled?: boolean;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      setIsTyping(false);
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

  return (
    <div className="p-4 border-t bg-background">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        {/* Attachment Button */}
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className="flex-shrink-0"
        >
          <Paperclip size={18} />
        </Button>

        {/* Message Input */}
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
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
          disabled={disabled || !message.trim()}
          size="icon"
          className="flex-shrink-0"
        >
          <Send size={18} />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
      </div>
    </div>
  );
};

export default ChatInputArea;
