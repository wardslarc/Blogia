import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/blog';
import { supabase, isSupabaseConfigured, withTimeout } from '@/lib/supabase';
import { isValidEmail, validatePassword, checkRateLimit } from '@/lib/security';
import { handleError, secureLog, ErrorCode, createAppError } from '@/lib/errorHandler';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const mapSessionToUser = async (sessionUser: any): Promise<User> => {
  const userName = sessionUser.email?.split('@')[0] || 'User';
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(sessionUser.email || 'user')}`;
  
  const defaultUser: User = {
    id: sessionUser.id,
    email: sessionUser.email || '',
    name: userName,
    avatar: defaultAvatar,
    createdAt: new Date(sessionUser.created_at),
  };

  if (!isSupabaseConfigured) {
    return defaultUser;
  }
  
  try {
    // Use Promise.race with a timeout
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
      .maybeSingle();
    
    const result = await withTimeout(profilePromise, 3000, 'Fetch profile');
    
    if (result && 'data' in result && result.data) {
      return {
        id: sessionUser.id,
        email: sessionUser.email || '',
        name: result.data.name || userName,
        avatar: result.data.avatar || defaultAvatar,
        createdAt: new Date(sessionUser.created_at),
      };
    }
    
    return defaultUser;
  } catch (error) {
    secureLog('warn', 'Failed to fetch user profile, using defaults');
    return defaultUser;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Initialize auth session on mount
    const initializeAuth = async () => {
      if (!isSupabaseConfigured) {
        secureLog('warn', 'Supabase not configured, skipping auth initialization');
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          'Get session'
        );
        if (isMounted) {
          if (session?.user) {
            const appUser = await mapSessionToUser(session.user);
            setUser(appUser);
          }
          setIsLoading(false);
        }
      } catch (error) {
        secureLog('error', 'Error initializing auth');
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) {
          return;
        }

        try {
          if (session?.user) {
            const appUser = await mapSessionToUser(session.user);
            setUser(appUser);
          } else {
            setUser(null);
          }
        } catch (error) {
          secureLog('error', 'Error in auth state change handler');
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    // Validate email format
    if (!isValidEmail(email)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid email format');
    }

    // Rate limiting for login attempts
    const rateLimitCheck = checkRateLimit(`login-${email}`);
    if (!rateLimitCheck.allowed) {
      throw createAppError(
        ErrorCode.RATE_LIMITED,
        `Too many login attempts. Please wait ${rateLimitCheck.retryAfter} seconds.`
      );
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Authentication service is not configured');
    }

    try {
      const { data: { user: authUser }, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        15000,
        'Login'
      );

      if (error) {
        throw error;
      }

      if (authUser) {
        const appUser = await mapSessionToUser(authUser);
        setUser(appUser);
        secureLog('info', 'User logged in successfully');
      }
    } catch (error) {
      secureLog('warn', 'Login failed');
      throw handleError(error, 'login');
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    // Validate email format
    if (!isValidEmail(email)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid email format');
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, passwordValidation.errors.join(', '));
    }

    // Validate name
    if (!name || name.trim().length < 2) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Name must be at least 2 characters');
    }

    // Rate limiting for signup
    const rateLimitCheck = checkRateLimit('signup');
    if (!rateLimitCheck.allowed) {
      throw createAppError(
        ErrorCode.RATE_LIMITED,
        `Too many signup attempts. Please wait ${rateLimitCheck.retryAfter} seconds.`
      );
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Authentication service is not configured');
    }

    try {
      const { data: { user: authUser }, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
        }),
        15000,
        'Signup'
      );

      if (error) {
        throw error;
      }

      if (authUser) {
        // Create user profile with sanitized name
        const sanitizedName = name.trim().slice(0, 100);
        try {
          await withTimeout(
            supabase
              .from('profiles')
              .insert({
                id: authUser.id,
                email,
                name: sanitizedName,
                avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(sanitizedName)}`,
              }),
            10000,
            'Create profile'
          );
        } catch (profileError) {
          secureLog('warn', 'Failed to create profile during signup');
          // Continue even if profile creation fails
        }

        const appUser = await mapSessionToUser(authUser);
        setUser(appUser);
        secureLog('info', 'User signed up successfully');
      }
    } catch (error) {
      secureLog('warn', 'Signup failed');
      throw handleError(error, 'signup');
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      setUser(null);
      secureLog('info', 'User logged out');
    } catch (error) {
      secureLog('error', 'Error during logout');
      // Still clear local user state even if signOut fails
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
