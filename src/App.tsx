import { Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { initializeAuth, setUser } from "@/store/slices/authSlice";
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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
      .maybeSingle();

    if (data) {
      return {
        id: sessionUser.id,
        email: sessionUser.email || '',
        name: data.name || userName,
        avatar: data.avatar || defaultAvatar,
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
    // Initialize auth on mount
    dispatch(initializeAuth());

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const appUser = await mapSessionToUser(session.user);
          dispatch(setUser(appUser));
        } else {
          dispatch(setUser(null));
        }
      }
    );

    return () => {
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
