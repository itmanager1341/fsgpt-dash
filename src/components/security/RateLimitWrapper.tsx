
import React, { useState, useCallback } from 'react';
import { checkRateLimit, logSecurityEvent } from '@/utils/security';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface RateLimitWrapperProps {
  children: React.ReactNode;
  limitKey: string;
  maxRequests?: number;
  windowMs?: number;
  onRateLimited?: () => void;
}

export const RateLimitWrapper: React.FC<RateLimitWrapperProps> = ({
  children,
  limitKey,
  maxRequests = 10,
  windowMs = 60000,
  onRateLimited
}) => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const checkLimit = useCallback(async () => {
    const allowed = checkRateLimit(limitKey, maxRequests, windowMs);
    
    if (!allowed) {
      setIsRateLimited(true);
      setTimeRemaining(Math.ceil(windowMs / 1000));
      
      await logSecurityEvent('rate_limit_exceeded', {
        limitKey,
        maxRequests,
        windowMs
      });

      onRateLimited?.();

      // Start countdown
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRateLimited(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return allowed;
  }, [limitKey, maxRequests, windowMs, onRateLimited]);

  const wrappedChildren = React.Children.map(children, child => {
    if (React.isValidElement(child) && typeof child.props.onClick === 'function') {
      const originalOnClick = child.props.onClick;
      
      return React.cloneElement(child, {
        ...child.props,
        onClick: async (e: React.MouseEvent) => {
          const allowed = await checkLimit();
          if (allowed) {
            originalOnClick(e);
          }
        },
        disabled: child.props.disabled || isRateLimited
      });
    }
    return child;
  });

  return (
    <>
      {isRateLimited && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Rate limit exceeded. Please wait {timeRemaining} seconds before trying again.
          </AlertDescription>
        </Alert>
      )}
      {wrappedChildren}
    </>
  );
};
