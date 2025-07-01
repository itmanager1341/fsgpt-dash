
// Security middleware for edge functions
import { createClient } from '@supabase/supabase-js';

interface SecurityContext {
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  rateLimitKey: string;
}

export const withSecurity = (handler: Function) => {
  return async (req: Request) => {
    const headers = new Headers();
    
    // Add security headers
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Content-Security-Policy', "default-src 'self'");

    try {
      // Rate limiting check (simplified for edge functions)
      const userAgent = req.headers.get('user-agent') || '';
      const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
      
      // Input validation
      const contentType = req.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        return new Response(
          JSON.stringify({ error: 'Invalid content type' }),
          { status: 400, headers }
        );
      }

      // Size limit check
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10485760) { // 10MB
        return new Response(
          JSON.stringify({ error: 'Request too large' }),
          { status: 413, headers }
        );
      }

      const context: SecurityContext = {
        userAgent,
        ipAddress,
        rateLimitKey: `${ipAddress}:${userAgent.slice(0, 50)}`
      };

      // Call the original handler
      const response = await handler(req, context);
      
      // Add security headers to response
      if (response instanceof Response) {
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      
      return response;

    } catch (error) {
      console.error('Security middleware error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers }
      );
    }
  };
};

// Helper function for input sanitization in edge functions
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};
