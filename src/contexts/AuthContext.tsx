import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/blog';
import { supabase } from '@/lib/supabase';

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
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${sessionUser.email}`;
  
  const defaultUser: User = {
    id: sessionUser.id,
    email: sessionUser.email || '',
    name: userName,
    avatar: defaultAvatar,
    createdAt: new Date(sessionUser.created_at),
  };
  
  try {
    // Use Promise.race with a timeout
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
      .maybeSingle();
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 2000);
    });
    
    const result = await Promise.race([profilePromise, timeoutPromise]);
    
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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          if (session?.user) {
            const appUser = await mapSessionToUser(session.user);
            setUser(appUser);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
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
          console.error('Error in onAuthStateChange:', error);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (authUser) {
        const appUser = await mapSessionToUser(authUser);
        setUser(appUser);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (authUser) {
        // Create user profile
        try {
          await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              email,
              name,
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
            });
        } catch (profileError) {
          console.error('Error creating profile:', profileError);
          // Continue even if profile creation fails
        }

        const appUser = await mapSessionToUser(authUser);
        setUser(appUser);
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
