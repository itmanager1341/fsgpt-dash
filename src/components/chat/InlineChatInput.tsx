import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Send, 
  Paperclip, 
  ChevronDown, 
  Search, 
  FileText, 
  BarChart,
  Download,
  Zap,
  Megaphone
} from 'lucide-react';
import { ModelAccess } from '@/types/frontend';
import { useCampaign } from '@/hooks/useCampaign';

interface InlineChatInputProps {
  onSendMessage: (content: string, provider?: string, model?: string, documentIds?: string[]) => void;
  disabled: boolean;
  placeholder: string;
  modelAccess: ModelAccess[];
  selectedModel: string;
  selectedProvider: string;
  onModelSelect: (model: string, provider: string) => void;
  onNewConversation?: (projectId?: string) => void;
}

const InlineChatInput: React.FC<InlineChatInputProps> = ({
  onSendMessage,
  disabled,
  placeholder,
  modelAccess,
  selectedModel,
  selectedProvider,
  onModelSelect,
  onNewConversation,
}) => {
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { selectedCampaignTool, setSelectedCampaignTool, createCampaign, generateCampaignBriefLink } = useCampaign();

  // Model shortcuts mapping with updated display names
  const modelShortcuts = {
    '@gpt4': { model: 'gpt-4.1-2025-04-14', provider: 'openai', display: 'GPT-4.1 (2025)' },
    '@o3': { model: 'o3-2025-04-16', provider: 'openai', display: 'O3 (2025)' },
    '@fast': { model: 'gpt-4o-mini', provider: 'openai', display: 'GPT-4o Mini' },
    '@perplexity': { model: 'llama-3.1-sonar-small-128k-online', provider: 'perplexity', display: 'Perplexity Sonar Small' },
  };

  // Tool commands
  const toolCommands = {
    '/search': { icon: Search, description: 'Search knowledge base' },
    '/analyze': { icon: FileText, description: 'Analyze document' },
    '/summarize': { icon: BarChart, description: 'Summarize conversation' },
    '/export': { icon: Download, description: 'Export conversation' },
    '/campaign': { icon: Megaphone, description: 'Create campaign' },
  };

  // Get current model display info
  const currentModel = modelAccess.find(m => 
    m.modelName === selectedModel && m.provider === selectedProvider
  );

  // Updated function to provide more descriptive model names
  const getModelDisplayName = (modelName: string, isFullName: boolean = false) => {
    const modelMappings = {
      'gpt-4.1-2025-04-14': isFullName ? 'GPT-4.1 (April 2025)' : 'GPT-4.1',
      'o3-2025-04-16': isFullName ? 'O3 (April 2025)' : 'O3',
      'o4-mini-2025-04-16': isFullName ? 'O4 Mini (April 2025)' : 'O4 Mini',
      'gpt-4.1-mini-2025-04-14': isFullName ? 'GPT-4.1 Mini (April 2025)' : 'GPT-4.1 Mini',
      'gpt-4o': isFullName ? 'GPT-4o (Omni)' : 'GPT-4o',
      'gpt-4o-mini': isFullName ? 'GPT-4o Mini (Fast)' : 'GPT-4o Mini',
      'claude-opus-4-20250514': isFullName ? 'Claude 4 Opus (May 2025)' : 'Claude 4 Opus',
      'claude-sonnet-4-20250514': isFullName ? 'Claude 4 Sonnet (May 2025)' : 'Claude 4 Sonnet',
      'claude-3-5-haiku-20241022': isFullName ? 'Claude 3.5 Haiku (Oct 2024)' : 'Claude 3.5 Haiku',
      'claude-3-7-sonnet-20250219': isFullName ? 'Claude 3.7 Sonnet (Feb 2025)' : 'Claude 3.7 Sonnet',
      'claude-3-5-sonnet-20241022': isFullName ? 'Claude 3.5 Sonnet (Oct 2024)' : 'Claude 3.5 Sonnet',
      'claude-3-opus-20240229': isFullName ? 'Claude 3 Opus (Feb 2024)' : 'Claude 3 Opus',
      'llama-3.1-sonar-small-128k-online': isFullName ? 'Perplexity Sonar Small (128k)' : 'Perplexity Small',
      'llama-3.1-sonar-large-128k-online': isFullName ? 'Perplexity Sonar Large (128k)' : 'Perplexity Large',
      'llama-3.1-sonar-huge-128k-online': isFullName ? 'Perplexity Sonar Huge (128k)' : 'Perplexity Huge',
    };

    return modelMappings[modelName as keyof typeof modelMappings] || (isFullName ? modelName : modelName.split('-')[0].toUpperCase());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }

    // Check for model shortcuts
    const words = value.split(' ');
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith('@')) {
      const matchingShortcuts = Object.keys(modelShortcuts).filter(shortcut =>
        shortcut.startsWith(lastWord.toLowerCase())
      );
      if (matchingShortcuts.length > 0) {
        setSuggestions(matchingShortcuts);
        setShowSuggestions(true);
      }
    } else if (lastWord.startsWith('/')) {
      const matchingCommands = Object.keys(toolCommands).filter(command =>
        command.startsWith(lastWord.toLowerCase())
      );
      if (matchingCommands.length > 0) {
        setSuggestions(matchingCommands);
        setShowSuggestions(true);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    const words = message.split(' ');
    words[words.length - 1] = suggestion + ' ';
    const newMessage = words.join(' ');
    setMessage(newMessage);
    setShowSuggestions(false);

    // Handle model shortcut selection
    if (suggestion in modelShortcuts) {
      const { model, provider } = modelShortcuts[suggestion as keyof typeof modelShortcuts];
      onModelSelect(model, provider);
    }

    // Handle tool command selection
    if (suggestion in toolCommands) {
      setSelectedTool(suggestion);
    }

    textareaRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!message.trim() || disabled) return;

    let processedMessage = message;
    let finalProvider = selectedProvider;
    let finalModel = selectedModel;

    // Handle campaign creation
    if (selectedCampaignTool || selectedTool === '/campaign') {
      if (!message.trim()) return;
      
      try {
        const result = await createCampaign.mutateAsync(message.trim());
        
        // Generate and download the campaign brief template
        generateCampaignBriefLink();
        
        // Create new conversation for this campaign
        if (onNewConversation) {
          onNewConversation(result.project.id);
        }
        
        // Send campaign creation message
        onSendMessage(
          `Campaign "${message.trim()}" created successfully! I've downloaded a Campaign Brief template for you to complete. Please fill it out and upload it back to this chat for me to review and help you create your marketing framework and content calendar.`,
          finalProvider,
          finalModel
        );
      } catch (error) {
        console.error('Error creating campaign:', error);
      }
      
      setMessage('');
      setSelectedTool(null);
      setSelectedCampaignTool(false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      return;
    }

    // Process model shortcuts in message
    Object.entries(modelShortcuts).forEach(([shortcut, config]) => {
      if (processedMessage.includes(shortcut)) {
        processedMessage = processedMessage.replace(shortcut, '').trim();
        finalProvider = config.provider;
        finalModel = config.model;
      }
    });

    // Process tool commands
    if (selectedTool) {
      processedMessage = `${selectedTool} ${processedMessage}`.trim();
    }

    onSendMessage(processedMessage, finalProvider, finalModel);
    setMessage('');
    setSelectedTool(null);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-3xl mx-auto p-4">
        {/* Selected Tool Indicator */}
        {selectedTool && (
          <div className="mb-2">
            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
              {React.createElement(toolCommands[selectedTool as keyof typeof toolCommands].icon, { size: 12 })}
              {toolCommands[selectedTool as keyof typeof toolCommands].description}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setSelectedTool(null)}
              >
                ×
              </Button>
            </Badge>
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-3">
          {/* Attachment Button */}
          <Button variant="ghost" size="sm" className="p-2 h-9 w-9">
            <Paperclip size={16} />
          </Button>

          {/* Main Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={selectedCampaignTool || selectedTool === '/campaign' ? "Give your campaign a name to start" : placeholder}
              disabled={disabled}
              className="min-h-[44px] max-h-[120px] resize-none pr-12 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={1}
            />
            
            {/* Send Button */}
            <Button
              onClick={handleSubmit}
              disabled={disabled || !message.trim()}
              size="sm"
              className="absolute right-2 bottom-2 h-8 w-8 p-0"
            >
              <Send size={14} />
            </Button>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-background border rounded-md shadow-lg z-10">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion}
                    className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex items-center gap-2"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    {suggestion.startsWith('@') && (
                      <>
                        <Zap size={14} className="text-blue-500" />
                        <span className="font-medium">{suggestion}</span>
                        <span className="text-muted-foreground">
                          {modelShortcuts[suggestion as keyof typeof modelShortcuts]?.display}
                        </span>
                      </>
                    )}
                    {suggestion.startsWith('/') && (
                      <>
                        {React.createElement(toolCommands[suggestion as keyof typeof toolCommands].icon, { 
                          size: 14, 
                          className: "text-purple-500" 
                        })}
                        <span className="font-medium">{suggestion}</span>
                        <span className="text-muted-foreground">
                          {toolCommands[suggestion as keyof typeof toolCommands].description}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1 h-9">
                <span className="text-xs font-medium">
                  {getModelDisplayName(selectedModel)}
                </span>
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {modelAccess.filter(m => m.isEnabled && !m.isOverLimit).map((model) => (
                <DropdownMenuItem
                  key={`${model.provider}-${model.modelName}`}
                  onClick={() => onModelSelect(model.modelName, model.provider)}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-sm truncate">
                        {getModelDisplayName(model.modelName, true)}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {model.provider}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {Math.round(model.usagePercentage)}%
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-2">
                <span className="text-xs mr-1">Tools</span>
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {Object.entries(toolCommands).map(([command, config]) => (
                <DropdownMenuItem
                  key={command}
                  onClick={() => {
                    if (command === '/campaign') {
                      setSelectedCampaignTool(true);
                      setSelectedTool(command);
                    } else {
                      setSelectedTool(command);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <config.icon size={14} />
                  <span>{config.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Model Status */}
        {currentModel && (
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                currentModel.usagePercentage < 80 ? 'bg-green-500' : 
                currentModel.usagePercentage < 95 ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span>{currentModel.provider}/{getModelDisplayName(currentModel.modelName)}</span>
            </div>
            <span>${currentModel.remainingCredits.toFixed(2)} remaining</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineChatInput;
