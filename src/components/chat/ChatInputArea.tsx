import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SecureTextInput } from '@/components/security/SecureTextInput';
import { RateLimitWrapper } from '@/components/security/RateLimitWrapper';
import { validateTextInput, logSecurityEvent } from '@/utils/security';
import { toast } from 'sonner';

interface ChatInputAreaProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message..."
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    
    // Validate message
    const validation = validateTextInput(message, 5000);
    if (!validation.isValid) {
      toast.error(validation.error);
      await logSecurityEvent('message_validation_failed', {
        messageLength: message.length,
        error: validation.error
      });
      return;
    }

    onSendMessage(message.trim());
    setMessage('');
    
    await logSecurityEvent('message_sent', {
      messageLength: message.trim().length
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    // Implement voice recording logic here
    console.log('Start recording...');
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Implement stop recording logic here
    console.log('Stop recording...');
  };

  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [isRecording]);

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <SecureTextInput
            value={message}
            onChange={setMessage}
            placeholder={placeholder}
            maxLength={5000}
            multiline={true}
            className="min-h-[44px] max-h-32 resize-none pr-12"
            onKeyPress={handleKeyPress}
          />
          
          <div className="absolute right-2 bottom-2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {/* Handle file attachment */}}
              disabled={isLoading}
            >
              <Paperclip size={16} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${isRecording ? 'text-red-500' : ''}`}
              onClick={() => setIsRecording(!isRecording)}
              disabled={isLoading}
            >
              {isRecording ? <Square size={16} /> : <Mic size={16} />}
            </Button>
          </div>
        </div>
        
        <RateLimitWrapper
          limitKey="send-message"
          maxRequests={30}
          windowMs={60000} // 30 messages per minute
        >
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className="h-11"
          >
            <Send size={16} className="mr-2" />
            Send
          </Button>
        </RateLimitWrapper>
      </div>
    </div>
  );
};

export default ChatInputArea;
