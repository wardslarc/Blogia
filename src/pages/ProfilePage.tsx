import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MessageCircle, Share2, FileText, Edit, Camera, Calendar, Loader2, Bookmark } from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';
import { useAppSelector } from '@/store/hooks';
import { PostService } from '@/lib/postService';
import { Post } from '@/types/blog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

const STORAGE_BUCKET = 'post-images';
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

interface UserStats {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  publishedCount: number;
}

interface ProfileUser {
  id: string;
  name: string;
  avatar: string;
  createdAt: Date;
}

export const ProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'articles' | 'bookmarks'>('articles');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if viewing own profile
  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetUserId = userId || currentUser?.id;

  useEffect(() => {
    if (authLoading) return;

    // If no userId param and not logged in, redirect
    if (!userId && !currentUser) {
      navigate('/');
      return;
    }

    loadProfileData();
  }, [userId, currentUser, authLoading, navigate]);

  const loadProfileData = async () => {
    if (!targetUserId) return;

    try {
      setIsLoading(true);

      // Fetch profile from Supabase if viewing another user
      if (!isOwnProfile) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle();

        if (error || !profile) {
          toast.error('User not found');
          navigate('/feed');
          return;
        }

        setProfileUser({
          id: profile.id,
          name: profile.name || 'Anonymous',
          avatar: profile.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.id}`,
          createdAt: new Date(profile.created_at),
        });
      } else if (currentUser) {
        setProfileUser({
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          createdAt: currentUser.createdAt,
        });
        setEditName(currentUser.name);
      }

      const [userStats, userPosts] = await Promise.all([
        PostService.getUserStats(targetUserId),
        PostService.getPostsByAuthor(targetUserId),
      ]);

      setStats(userStats);
      setPosts(userPosts.filter(p => p.published));

      // Load bookmarks only for own profile
      if (isOwnProfile && currentUser) {
        const userBookmarks = await PostService.getUserBookmarks(currentUser.id).catch(() => []);
        setBookmarks(userBookmarks);
      }
    } catch (error) {
      toast.error('Failed to load profile');
      console.error('Load profile error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({ name: editName.trim() })
        .eq('id', currentUser!.id);

      if (error) throw error;

      toast.success('Profile updated! Refresh to see changes.');
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Image must be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      setIsUploadingAvatar(true);

      // Generate unique filename with avatars folder
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${currentUser.id}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

      const avatarUrl = data.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: avatarUrl })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      // Update local state
      setProfileUser(prev => prev ? { ...prev, avatar: avatarUrl } : null);
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const memberSince = profileUser?.createdAt
    ? profileUser.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-48 bg-muted rounded-2xl"></div>
              <div className="flex gap-6">
                <div className="w-32 h-32 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Back Button */}
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-secondary hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </motion.button>

            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto"
            >
              {/* Cover & Avatar Section */}
              <div className="relative bg-white rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
                {/* Cover Image */}
                <div className="h-32 md:h-40 bg-gradient-to-br from-primary via-primary/80 to-primary/60 relative">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
                </div>

                {/* Profile Info */}
                <div className="px-6 md:px-8 pt-4 pb-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                    {/* Avatar */}
                    <div className="relative -mt-16 md:-mt-20 flex-shrink-0">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="relative"
                      >
                        <img
                          src={profileUser?.avatar}
                          alt={profileUser?.name}
                          className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-xl object-cover bg-muted"
                        />
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </motion.div>
                      {isOwnProfile && (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                          <button
                            onClick={handleAvatarClick}
                            disabled={isUploadingAvatar}
                            className="absolute bottom-1 right-1 p-1.5 bg-white rounded-full shadow-md hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            <Camera className="w-3.5 h-3.5 text-secondary" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Name & Info */}
                    <div className="flex-1 pt-0 md:pt-2">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <h1 className="font-fraunces text-2xl md:text-3xl font-semibold text-foreground">
                            {profileUser?.name}
                          </h1>
                          <div className="flex items-center gap-1.5 mt-2 text-sm text-secondary">
                            <Calendar className="w-4 h-4" />
                            Joined {memberSince}
                          </div>
                        </div>
                        {isOwnProfile && (
                          <Button
                            onClick={() => setIsEditModalOpen(true)}
                            variant="outline"
                            size="sm"
                            className="gap-2 w-full md:w-auto"
                          >
                            <Edit className="w-4 h-4" />
                            Edit Profile
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-xl border border-border p-5 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {stats?.publishedCount || 0}
                  </p>
                  <p className="text-sm text-secondary mt-1">Articles</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-white rounded-xl border border-border p-5 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {stats?.totalLikes || 0}
                  </p>
                  <p className="text-sm text-secondary mt-1">Likes</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-xl border border-border p-5 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {stats?.totalComments || 0}
                  </p>
                  <p className="text-sm text-secondary mt-1">Comments</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="bg-white rounded-xl border border-border p-5 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-50 flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {stats?.totalShares || 0}
                  </p>
                  <p className="text-sm text-secondary mt-1">Shares</p>
                </motion.div>
              </div>

              {/* Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                {/* Tab Headers */}
                <div className="flex items-center gap-1 mb-6 border-b border-border">
                  <button
                    onClick={() => setActiveTab('articles')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeTab === 'articles'
                        ? 'text-primary'
                        : 'text-secondary hover:text-foreground'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Articles
                    <span className="ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                      {posts.length}
                    </span>
                    {activeTab === 'articles' && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      />
                    )}
                  </button>
                  {isOwnProfile && (
                    <button
                      onClick={() => setActiveTab('bookmarks')}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                        activeTab === 'bookmarks'
                          ? 'text-primary'
                          : 'text-secondary hover:text-foreground'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                      Bookmarks
                      <span className="ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                        {bookmarks.length}
                      </span>
                      {activeTab === 'bookmarks' && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        />
                      )}
                    </button>
                  )}
                </div>

                {/* Articles Tab Content */}
                {activeTab === 'articles' && (
                  <>
                    {posts.length === 0 ? (
                      <div className="bg-white rounded-xl border border-border border-dashed p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="w-8 h-8 text-secondary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          No articles yet
                        </h3>
                        <p className="text-secondary mb-6">
                          {isOwnProfile
                            ? 'Start writing and share your thoughts with the world'
                            : `${profileUser?.name || 'This user'} hasn't published any articles yet`}
                        </p>
                        {isOwnProfile && (
                          <Button
                            onClick={() => navigate('/editor')}
                            className="bg-primary hover:bg-[#B23E15]"
                          >
                            Write Your First Article
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {posts.map((post, index) => (
                          <motion.article
                            key={post.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * index }}
                            onClick={() => navigate(`/post/${post.id}`)}
                            className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                          >
                            <div className="flex gap-5">
                              {post.featuredImage && (
                                <img
                                  src={post.featuredImage}
                                  alt={post.title}
                                  className="w-28 h-28 md:w-36 md:h-24 rounded-lg object-cover flex-shrink-0 group-hover:scale-[1.02] transition-transform"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                  {post.title}
                                </h3>
                                <p className="text-sm text-secondary mt-1 line-clamp-2 hidden md:block">
                                  {post.excerpt}
                                </p>
                                <div className="flex items-center gap-3 mt-3 text-xs text-secondary">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {post.createdAt.toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span>{post.readTime} min read</span>
                                </div>
                              </div>
                            </div>
                          </motion.article>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Bookmarks Tab Content */}
                {activeTab === 'bookmarks' && isOwnProfile && (
                  <>
                    {bookmarks.length === 0 ? (
                      <div className="bg-white rounded-xl border border-border border-dashed p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <Bookmark className="w-8 h-8 text-secondary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          No bookmarks yet
                        </h3>
                        <p className="text-secondary mb-6">
                          Save articles you want to read later by clicking the bookmark icon
                        </p>
                        <Button
                          onClick={() => navigate('/feed')}
                          variant="outline"
                        >
                          Explore Articles
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {bookmarks.map((post, index) => (
                          <motion.article
                            key={post.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * index }}
                            onClick={() => navigate(`/post/${post.id}`)}
                            className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                          >
                            <div className="flex gap-5">
                              {post.featuredImage && (
                                <img
                                  src={post.featuredImage}
                                  alt={post.title}
                                  className="w-28 h-28 md:w-36 md:h-24 rounded-lg object-cover flex-shrink-0 group-hover:scale-[1.02] transition-transform"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                  {post.title}
                                </h3>
                                <p className="text-sm text-secondary mt-1 line-clamp-2 hidden md:block">
                                  {post.excerpt}
                                </p>
                                <div className="flex items-center gap-3 mt-3 text-xs text-secondary">
                                  {post.author && (
                                    <>
                                      <span className="flex items-center gap-1">
                                        by {post.author.name || 'Unknown'}
                                      </span>
                                      <span>•</span>
                                    </>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {post.createdAt.toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span>{post.readTime} min read</span>
                                </div>
                              </div>
                            </div>
                          </motion.article>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </div>

      {/* Edit Profile Modal - Only for own profile */}
      {isOwnProfile && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Display Name
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-primary hover:bg-[#B23E15]"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
