
import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { validateTextInput, sanitizeContent } from '@/utils/security';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SecureTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  required?: boolean;
  className?: string;
  sanitize?: boolean;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const SecureTextInput: React.FC<SecureTextInputProps> = ({
  value,
  onChange,
  placeholder,
  maxLength = 10000,
  multiline = false,
  required = false,
  className,
  sanitize = true,
  onKeyPress
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const inputValue = e.target.value;
    
    // Validate input
    const validation = validateTextInput(inputValue, maxLength);
    if (!validation.isValid && inputValue.trim().length > 0) {
      setError(validation.error || 'Invalid input');
      return;
    }
    
    setError(null);
    
    // Sanitize if enabled
    const cleanValue = sanitize ? sanitizeContent(inputValue) : inputValue;
    onChange(cleanValue);
  }, [onChange, maxLength, sanitize]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (onKeyPress) {
      onKeyPress(e);
    }
  }, [onKeyPress]);

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className="space-y-2">
      <InputComponent
        value={value}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        className={`${className} ${error ? 'border-red-500' : ''}`}
      />
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {maxLength && (
        <div className="text-sm text-muted-foreground text-right">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
};
