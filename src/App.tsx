import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { LandingPage } from "@/pages/LandingPage";
import { BlogFeed } from "@/pages/BlogFeed";
import { PostDetailPage } from "@/pages/PostDetailPage";
import { Dashboard } from "@/pages/Dashboard";
import { PostEditor } from "@/pages/PostEditor";
import { ProfilePage } from "@/pages/ProfilePage";

function AppContent() {
  const { isLoading } = useAuth();

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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
