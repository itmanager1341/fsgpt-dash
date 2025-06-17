
import React from 'react';
import { ModelAccess, UsageAlert } from '@/types/frontend';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Calendar,
  Info,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageDashboardProps {
  modelAccess: ModelAccess[];
  usageAlerts: UsageAlert[];
  onClose: () => void;
}

const UsageDashboard: React.FC<UsageDashboardProps> = ({
  modelAccess,
  usageAlerts,
  onClose
}) => {
  const totalSpent = modelAccess.reduce(
    (sum, access) => sum + (access.monthlyLimit - access.remainingCredits), 
    0
  );

  const totalLimit = modelAccess.reduce(
    (sum, access) => sum + access.monthlyLimit, 
    0
  );

  const overallUsagePercentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  const getUsageColor = (percentage: number, isOverLimit: boolean) => {
    if (isOverLimit) return 'bg-destructive';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle size={16} className="text-destructive" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-orange-500" />;
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <SheetHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <SheetTitle>Usage Dashboard</SheetTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Overall Usage */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp size={18} />
            Overall Usage
          </h3>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Monthly Usage</span>
              <span className="text-sm text-muted-foreground">
                ${totalSpent.toFixed(2)} / ${totalLimit.toFixed(2)}
              </span>
            </div>
            <Progress 
              value={overallUsagePercentage} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{overallUsagePercentage.toFixed(1)}% used</span>
              <span>${(totalLimit - totalSpent).toFixed(2)} remaining</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {usageAlerts.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle size={18} />
              Alerts ({usageAlerts.length})
            </h3>
            
            <div className="space-y-2">
              {usageAlerts.map((alert, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{alert.provider}</Badge>
                      <span>{alert.modelName}</span>
                      <span>•</span>
                      <span>${alert.remainingAmount.toFixed(2)} left</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model Breakdown */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <DollarSign size={18} />
            Model Usage
          </h3>
          
          <div className="space-y-3">
            {modelAccess.map((access) => {
              const spent = access.monthlyLimit - access.remainingCredits;
              return (
                <div 
                  key={`${access.provider}-${access.modelName}`}
                  className="bg-muted/50 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{access.modelName}</span>
                      <Badge variant="outline">{access.provider}</Badge>
                      {!access.isEnabled && (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                      {access.isOverLimit && (
                        <Badge variant="destructive">Over Limit</Badge>
                      )}
                    </div>
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      getUsageColor(access.usagePercentage, access.isOverLimit)
                    )} />
                  </div>
                  
                  <Progress 
                    value={access.usagePercentage} 
                    className="h-2"
                  />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      ${spent.toFixed(2)} / ${access.monthlyLimit.toFixed(2)}
                    </span>
                    <span>{access.usagePercentage.toFixed(1)}% used</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing Period */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar size={18} />
            Billing Information
          </h3>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Current Period</span>
              <span className="font-medium">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Resets</span>
              <span className="text-muted-foreground">
                {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
                  .toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageDashboard;
