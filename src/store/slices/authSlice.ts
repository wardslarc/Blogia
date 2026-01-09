import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types/blog';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
};

// Helper function to map session user to app user
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

// Async thunks
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, skipping auth initialization');
      return null;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const appUser = await mapSessionToUser(session.user);
        return appUser;
      }
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    if (!isSupabaseConfigured) {
      return rejectWithValue('Authentication is not configured. Please contact support.');
    }
    try {
      // Add timeout to the auth call itself
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Login request timed out. Please try again.')), 10000);
      });

      const { data: { user: authUser }, error } = await Promise.race([authPromise, timeoutPromise]);

      if (error) throw error;

      if (authUser) {
        const appUser = await mapSessionToUser(authUser);
        return appUser;
      }
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (
    { email, password, name }: { email: string; password: string; name: string },
    { rejectWithValue }
  ) => {
    if (!isSupabaseConfigured) {
      return rejectWithValue('Authentication is not configured. Please contact support.');
    }
    try {
      // Add timeout to the auth call itself
      const authPromise = supabase.auth.signUp({
        email,
        password,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Signup request timed out. Please try again.')), 10000);
      });

      const { data: { user: authUser }, error } = await Promise.race([authPromise, timeoutPromise]);

      if (error) throw error;

      if (authUser) {
        // Create user profile (don't block on this)
        supabase.from('profiles').insert({
          id: authUser.id,
          email,
          name,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
        }).catch(profileError => {
          console.error('Error creating profile:', profileError);
        });

        const appUser = await mapSessionToUser(authUser);
        return appUser;
      }
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await supabase.auth.signOut();
    return null;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize auth
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Login - don't set global isLoading (modal has its own loading state)
      .addCase(login.pending, (state) => {
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Signup - don't set global isLoading (modal has its own loading state)
      .addCase(signup.pending, (state) => {
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(signup.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isLoading = false;
        state.error = null;
      });
  },
});

export const { setUser, setLoading, clearError } = authSlice.actions;
export default authSlice.reducer;
