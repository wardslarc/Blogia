/**
 * Security utilities for input validation and sanitization
 */

// Rate limiting store (in-memory, for client-side basic protection)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const SecurityConfig = {
  MAX_CONTENT_LENGTH: 50000, // 50KB max for post content
  MAX_COMMENT_LENGTH: 2000,
  MAX_TITLE_LENGTH: 200,
  MAX_EXCERPT_LENGTH: 500,
  MAX_NAME_LENGTH: 100,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 30,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as string[],
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  // Basic XSS prevention - encode dangerous characters
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize user input while preserving safe content for rich text
 * This is for content that will be rendered as HTML
 */
export function sanitizeRichText(input: string): string {
  if (!input) return '';
  
  // Remove potentially dangerous script tags and event handlers
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, 'data-blocked:');
  
  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate and sanitize post input
 */
export function validatePostInput(input: {
  title?: string;
  content?: string;
  excerpt?: string;
}): { valid: boolean; errors: string[]; sanitized: typeof input } {
  const errors: string[] = [];
  const sanitized = { ...input };

  if (input.title !== undefined) {
    if (input.title.length === 0) {
      errors.push('Title is required');
    } else if (input.title.length > SecurityConfig.MAX_TITLE_LENGTH) {
      errors.push(`Title must not exceed ${SecurityConfig.MAX_TITLE_LENGTH} characters`);
    }
    sanitized.title = sanitizeHtml(input.title);
  }

  if (input.content !== undefined) {
    if (input.content.length === 0) {
      errors.push('Content is required');
    } else if (input.content.length > SecurityConfig.MAX_CONTENT_LENGTH) {
      errors.push(`Content must not exceed ${SecurityConfig.MAX_CONTENT_LENGTH} characters`);
    }
    sanitized.content = sanitizeRichText(input.content);
  }

  if (input.excerpt !== undefined) {
    if (input.excerpt.length > SecurityConfig.MAX_EXCERPT_LENGTH) {
      errors.push(`Excerpt must not exceed ${SecurityConfig.MAX_EXCERPT_LENGTH} characters`);
    }
    sanitized.excerpt = sanitizeHtml(input.excerpt);
  }

  return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Validate comment input
 */
export function validateCommentInput(content: string): { valid: boolean; errors: string[]; sanitized: string } {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push('Comment content is required');
  } else if (content.length > SecurityConfig.MAX_COMMENT_LENGTH) {
    errors.push(`Comment must not exceed ${SecurityConfig.MAX_COMMENT_LENGTH} characters`);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: sanitizeHtml(content),
  };
}

/**
 * Validate image file for upload
 */
export function validateImageFile(file: File): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!SecurityConfig.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    errors.push(`Invalid file type. Allowed types: ${SecurityConfig.ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  if (file.size > SecurityConfig.MAX_IMAGE_SIZE) {
    errors.push(`File size exceeds ${SecurityConfig.MAX_IMAGE_SIZE / (1024 * 1024)}MB limit`);
  }

  // Check file extension matches content type
  const extension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
  };

  if (extension && !validExtensions[file.type]?.includes(extension)) {
    errors.push('File extension does not match content type');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Simple client-side rate limiting
 */
export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + SecurityConfig.RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (record.count >= SecurityConfig.RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count++;
  return { allowed: true };
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generate a secure random string
 */
export function generateSecureId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => chars[v % chars.length]).join('');
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up rate limit store every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
