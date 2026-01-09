/**
 * Centralized error handling for backend operations
 */

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  originalError?: unknown;
  timestamp: Date;
}

// Check if we're in production
const isProduction = import.meta.env.PROD;

/**
 * Map Supabase error codes to app error codes
 */
function mapSupabaseErrorCode(error: any): ErrorCode {
  const code = error?.code || error?.status;
  const message = error?.message?.toLowerCase() || '';

  // Auth errors
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return ErrorCode.AUTHENTICATION_ERROR;
  }
  if (code === 'user_not_found' || code === '22P02') {
    return ErrorCode.NOT_FOUND;
  }
  if (code === 'PGRST301' || code === '401' || message.includes('jwt')) {
    return ErrorCode.AUTHENTICATION_ERROR;
  }
  if (code === 'PGRST204' || code === '403' || message.includes('permission')) {
    return ErrorCode.AUTHORIZATION_ERROR;
  }
  if (code === 'PGRST116') {
    return ErrorCode.NOT_FOUND;
  }
  if (code === '429' || message.includes('rate limit')) {
    return ErrorCode.RATE_LIMITED;
  }
  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    return ErrorCode.VALIDATION_ERROR;
  }
  if (code?.startsWith('5') || message.includes('server error')) {
    return ErrorCode.SERVER_ERROR;
  }
  if (message.includes('network') || message.includes('fetch')) {
    return ErrorCode.NETWORK_ERROR;
  }

  return ErrorCode.UNKNOWN_ERROR;
}

/**
 * Get user-friendly error message
 */
function getUserMessage(code: ErrorCode, context?: string): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection.',
    [ErrorCode.AUTHENTICATION_ERROR]: 'Invalid email or password. Please try again.',
    [ErrorCode.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action.',
    [ErrorCode.VALIDATION_ERROR]: 'The data provided is invalid. Please check your input.',
    [ErrorCode.NOT_FOUND]: context ? `The ${context} was not found.` : 'The requested resource was not found.',
    [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
    [ErrorCode.SERVER_ERROR]: 'Something went wrong on our end. Please try again later.',
    [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    [ErrorCode.CONFIGURATION_ERROR]: 'The application is not properly configured. Please contact support.',
  };

  return messages[code];
}

/**
 * Handle and transform errors into a consistent format
 */
export function handleError(error: unknown, context?: string): AppError {
  const appError: AppError = {
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'An unknown error occurred',
    userMessage: getUserMessage(ErrorCode.UNKNOWN_ERROR),
    timestamp: new Date(),
  };

  // Store original error only in development
  if (!isProduction) {
    appError.originalError = error;
  }

  if (error instanceof Error) {
    appError.message = error.message;
    
    // Check if it's a Supabase error
    if ('code' in error || 'status' in error) {
      appError.code = mapSupabaseErrorCode(error);
      appError.userMessage = getUserMessage(appError.code, context);
    }
  } else if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    appError.code = mapSupabaseErrorCode(errorObj);
    appError.message = errorObj.message || errorObj.error_description || 'Unknown error';
    appError.userMessage = getUserMessage(appError.code, context);
  }

  // Log error in development only
  if (!isProduction) {
    console.error(`[${appError.code}] ${context || 'Error'}:`, {
      message: appError.message,
      originalError: error,
    });
  }

  return appError;
}

/**
 * Log error securely (removes sensitive data in production)
 */
export function secureLog(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
  if (isProduction) {
    // In production, only log minimal info without sensitive data
    const safeData = data && typeof data === 'object' 
      ? { type: (data as any)?.code || 'unknown' }
      : undefined;
    
    console[level](`[Editorial] ${message}`, safeData || '');
  } else {
    // In development, log full details
    console[level](`[Editorial] ${message}`, data || '');
  }
}

/**
 * Create a typed error for throwing
 */
export function createAppError(
  code: ErrorCode,
  message: string,
  context?: string
): AppError {
  return {
    code,
    message,
    userMessage: getUserMessage(code, context),
    timestamp: new Date(),
  };
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'userMessage' in error
  );
}

/**
 * Wrapper for async operations with consistent error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: handleError(error, context) };
  }
}
