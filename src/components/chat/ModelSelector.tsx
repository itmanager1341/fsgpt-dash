import React from 'react';
import { ModelAccess } from '@/types/frontend';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  modelAccess: ModelAccess[];
  selectedModel: string;
  selectedProvider: string;
  onModelSelect: (model: string, provider: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  modelAccess,
  selectedModel,
  selectedProvider,
  onModelSelect
}) => {
  const getCurrentModelAccess = () => {
    return modelAccess.find(
      (access) => access.modelName === selectedModel && access.provider === selectedProvider
    );
  };

  const currentAccess = getCurrentModelAccess();

  const handleModelChange = (value: string) => {
    const [provider, model] = value.split(':');
    onModelSelect(model, provider);
  };

  const getUsageColor = (percentage: number, isOverLimit: boolean) => {
    if (isOverLimit) return 'text-destructive';
    if (percentage >= 80) return 'text-orange-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = (access: ModelAccess) => {
    if (!access.isEnabled) return <AlertTriangle size={14} className="text-destructive" />;
    if (access.isOverLimit) return <AlertTriangle size={14} className="text-destructive" />;
    return <CheckCircle size={14} className="text-green-500" />;
  };

  const formatModelName = (modelName: string) => {
    // Keep the original model name but ensure it displays nicely
    return modelName;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Select
          value={`${selectedProvider}:${selectedModel}`}
          onValueChange={handleModelChange}
        >
          <SelectTrigger className="w-[280px] min-w-[280px]">
            <div className="flex items-center gap-2 w-full">
              <Settings size={16} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="truncate text-left">
                      {selectedModel ? formatModelName(selectedModel) : "Select model"}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{selectedModel ? `${selectedProvider}: ${formatModelName(selectedModel)}` : "Select a model"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SelectTrigger>
          <SelectContent className="w-[320px]">
            {modelAccess.map((access) => (
              <SelectItem
                key={`${access.provider}:${access.modelName}`}
                value={`${access.provider}:${access.modelName}`}
                disabled={!access.isEnabled || access.isOverLimit}
                className="p-3"
              >
                <div className="flex items-center justify-between w-full gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getStatusIcon(access)}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium truncate max-w-[160px]">
                          {formatModelName(access.modelName)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{formatModelName(access.modelName)}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {access.provider}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-xs font-medium",
                      getUsageColor(access.usagePercentage, access.isOverLimit)
                    )}>
                      {access.usagePercentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentAccess && (
          <div className="flex items-center gap-1 shrink-0">
            <div className={cn(
              "w-2 h-2 rounded-full",
              currentAccess.isOverLimit ? "bg-destructive" :
              currentAccess.usagePercentage >= 80 ? "bg-orange-500" :
              currentAccess.usagePercentage >= 60 ? "bg-yellow-500" :
              "bg-green-500"
            )} />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  ${currentAccess.remainingCredits.toFixed(2)} left
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remaining credits for {selectedModel}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ModelSelector;
