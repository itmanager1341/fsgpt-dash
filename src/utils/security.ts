
// Security utility functions for input validation and sanitization
import { supabase } from '@/integrations/supabase/client';

// Input validation functions
export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (max 100MB)
  if (file.size > 104857600) {
    return { isValid: false, error: 'File size exceeds 100MB limit' };
  }

  // Check allowed file types for audio uploads
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg', 'audio/flac'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only audio files are allowed.' };
  }

  // Check file name length and characters
  if (file.name.length > 255 || /[<>:"/\\|?*]/.test(file.name)) {
    return { isValid: false, error: 'Invalid file name' };
  }

  return { isValid: true };
};

export const sanitizeContent = (content: string): string => {
  // Basic HTML tag removal and XSS prevention
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

export const validateTextInput = (text: string, maxLength: number = 10000): { isValid: boolean; error?: string } => {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: 'Input cannot be empty' };
  }

  if (text.length > maxLength) {
    return { isValid: false, error: `Input exceeds ${maxLength} character limit` };
  }

  // Check for potentially malicious patterns
  const maliciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(text)) {
      return { isValid: false, error: 'Invalid content detected' };
    }
  }

  return { isValid: true };
};

// Rate limiting for client-side
const rateLimitStore = new Map<string, { count: number; lastReset: number }>();

export const checkRateLimit = (key: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now - record.lastReset > windowMs) {
    rateLimitStore.set(key, { count: 1, lastReset: now });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
};

// Secure headers helper
export const getSecureHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
};

// Audit logging function
export const logSecurityEvent = async (eventType: string, details: Record<string, any> = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('security_audit_log').insert({
      user_id: user?.id || null,
      event_type: eventType,
      event_details: details,
      ip_address: null, // Will be populated server-side
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};
