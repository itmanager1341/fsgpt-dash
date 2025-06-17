
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

  return (
    <div className="flex items-center gap-2">
      <Select
        value={`${selectedProvider}:${selectedModel}`}
        onValueChange={handleModelChange}
      >
        <SelectTrigger className="w-[200px]">
          <div className="flex items-center gap-2">
            <Settings size={16} />
            <SelectValue placeholder="Select model" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {modelAccess.map((access) => (
            <SelectItem
              key={`${access.provider}:${access.modelName}`}
              value={`${access.provider}:${access.modelName}`}
              disabled={!access.isEnabled || access.isOverLimit}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {getStatusIcon(access)}
                  <span className="font-medium">{access.modelName}</span>
                  <Badge variant="outline" className="text-xs">
                    {access.provider}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 ml-4">
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
        <div className="flex items-center gap-1">
          <div className={cn(
            "w-2 h-2 rounded-full",
            currentAccess.isOverLimit ? "bg-destructive" :
            currentAccess.usagePercentage >= 80 ? "bg-orange-500" :
            currentAccess.usagePercentage >= 60 ? "bg-yellow-500" :
            "bg-green-500"
          )} />
          <span className="text-xs text-muted-foreground">
            ${currentAccess.remainingCredits.toFixed(2)} left
          </span>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
