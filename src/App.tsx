import { Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { initializeAuth, setUser, setLoading } from "@/store/slices/authSlice";
import { supabase } from "@/lib/supabase";
import { Toaster } from "@/components/ui/sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { LandingPage } from "@/pages/LandingPage";
import { BlogFeed } from "@/pages/BlogFeed";
import { PostDetailPage } from "@/pages/PostDetailPage";
import { Dashboard } from "@/pages/Dashboard";
import { PostEditor } from "@/pages/PostEditor";
import { ProfilePage } from "@/pages/ProfilePage";

// Helper function to map session user to app user (duplicated from authSlice for listener)
const mapSessionToUser = async (sessionUser: any) => {
  const userName = sessionUser.email?.split('@')[0] || 'User';
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${sessionUser.email}`;

  const defaultUser = {
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

    // 2-second timeout for profile fetch
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
  } catch {
    return defaultUser;
  }
};

function App() {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    let isMounted = true;

    // Initialize auth on mount
    const initialize = async () => {
      try {
        await dispatch(initializeAuth()).unwrap();
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Ensure loading is set to false even on error
        dispatch(setLoading(false));
      }
    };

    initialize();

    // Failsafe: ensure loading state is cleared after 5 seconds max
    const timeout = setTimeout(() => {
      dispatch(setLoading(false));
    }, 5000);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const appUser = await mapSessionToUser(session.user);
            dispatch(setUser(appUser));
          }
        } else if (event === 'SIGNED_OUT') {
          dispatch(setUser(null));
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/feed" element={<BlogFeed />} />
        <Route path="/post/:id" element={<PostDetailPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor" element={<PostEditor />} />
        <Route path="/editor/:id" element={<PostEditor />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
      </Routes>
      <Toaster position="bottom-right" />
    </Suspense>
  );
}

export default App;
