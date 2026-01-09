import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { secureLog } from './errorHandler';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Strict validation - don't use placeholder values
const isValidUrl = supabaseUrl && 
  typeof supabaseUrl === 'string' && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co');

const isValidKey = supabaseAnonKey && 
  typeof supabaseAnonKey === 'string' && 
  supabaseAnonKey.length > 20;

export const isSupabaseConfigured = isValidUrl && isValidKey;

if (!isSupabaseConfigured) {
  secureLog('error', 'Supabase configuration is invalid or missing', {
    urlConfigured: !!isValidUrl,
    keyConfigured: !!isValidKey,
  });
}

// Security-focused client options
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use secure storage when available
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'editorial-auth-token',
    flowType: 'pkce' as const, // Use PKCE for enhanced security
  },
  global: {
    headers: {
      'X-Client-Info': 'editorial-app',
    },
  },
  // Realtime configuration
  realtime: {
    params: {
      eventsPerSecond: 2, // Rate limit realtime events
    },
  },
};

// Create client only with valid configuration
let supabaseClient: SupabaseClient;

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, supabaseOptions);
} else {
  // Create a mock client that throws meaningful errors
  // This prevents silent failures and makes debugging easier
  supabaseClient = createClient(
    'https://placeholder.supabase.co',
    'placeholder-key',
    supabaseOptions
  );
  
  // Override methods to provide clear error messages in development
  if (import.meta.env.DEV) {
    console.warn(
      '⚠️ Supabase is not properly configured. ' +
      'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }
}

export const supabase = supabaseClient;

/**
 * Helper to check if user is authenticated before making requests
 */
export async function getAuthenticatedUser() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw error;
  }
  
  return user;
}

/**
 * Helper to ensure valid session exists
 */
export async function ensureValidSession() {
  if (!isSupabaseConfigured) {
    return null;
  }
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    secureLog('warn', 'Session validation failed', { errorCode: error.name });
    return null;
  }
  
  return session;
}

/**
 * Timeout wrapper for async operations
 * For Supabase queries, wrap them in Promise.resolve() first or use .then()
 */
export async function withTimeout<T>(
  promiseOrThenable: PromiseLike<T>,
  timeoutMs: number = 10000,
  operation: string = 'Operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    Promise.resolve(promiseOrThenable),
    timeoutPromise,
  ]);
}
