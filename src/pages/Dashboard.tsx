import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Eye, Edit, Trash2, Clock } from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { PostService } from '@/lib/postService';
import { Post } from '@/types/blog';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    if (!user) {
      navigate('/');
      return;
    }
    loadPosts();
  }, [user, authLoading, navigate, location.pathname]);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      const userPosts = await PostService.getPostsByAuthor(user!.id);
      setPosts(userPosts);
    } catch (error) {
      toast.error('Failed to load posts');
      console.error('Load posts error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await PostService.deletePost(postId);
      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Post deleted successfully');
    } catch (error) {
      toast.error('Failed to delete post');
      console.error('Delete error:', error);
    }
    setDeletePostId(null);
  };

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.published).length,
    drafts: posts.filter(p => !p.published).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="font-fraunces text-5xl font-semibold mb-4">
            Your Dashboard
          </h1>
          <p className="text-xl text-secondary">
            Manage your posts and track your writing journey
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <div className="bg-white rounded-lg p-6 border border-border shadow-sm">
            <p className="text-sm text-secondary mb-1">Total Posts</p>
            <p className="font-fraunces text-4xl font-semibold text-foreground">
              {stats.total}
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-border shadow-sm">
            <p className="text-sm text-secondary mb-1">Published</p>
            <p className="font-fraunces text-4xl font-semibold text-primary">
              {stats.published}
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-border shadow-sm">
            <p className="text-sm text-secondary mb-1">Drafts</p>
            <p className="font-fraunces text-4xl font-semibold text-secondary">
              {stats.drafts}
            </p>
          </div>
        </motion.div>

        {/* Posts Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-lg border border-border shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="font-fraunces text-2xl font-semibold">Your Posts</h2>
            <Button
              onClick={() => navigate('/editor')}
              className="bg-primary hover:bg-[#B23E15] gap-2"
            >
              <PenLine className="w-4 h-4" />
              New Post
            </Button>
          </div>

          {posts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-6 font-inter font-medium text-sm text-secondary">
                      Title
                    </th>
                    <th className="text-left py-3 px-6 font-inter font-medium text-sm text-secondary">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 font-inter font-medium text-sm text-secondary">
                      Read Time
                    </th>
                    <th className="text-left py-3 px-6 font-inter font-medium text-sm text-secondary">
                      Updated
                    </th>
                    <th className="text-right py-3 px-6 font-inter font-medium text-sm text-secondary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {posts.map((post) => (
                      <motion.tr
                        key={post.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <p className="font-medium text-foreground">
                            {post.title}
                          </p>
                          <p className="text-sm text-secondary line-clamp-1 mt-1">
                            {post.excerpt}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              post.published
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {post.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-secondary">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.readTime} min
                          </div>
                        </td>
                        <td className="py-4 px-6 text-secondary text-sm">
                          {post.updatedAt.toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            {post.published && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/post/${post.id}`)}
                                className="gap-1"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/editor/${post.id}`)}
                              className="gap-1"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletePostId(post.id)}
                              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          ) : isLoading ? (
            <div className="text-center py-16">
              <p className="text-xl text-secondary">Loading posts...</p>
            </div>
          ) : (
            <div className="text-center py-16">
              <PenLine className="w-16 h-16 text-secondary mx-auto mb-4 opacity-50" />
              <p className="text-xl text-secondary mb-6">
                You haven't created any posts yet
              </p>
              <Button
                onClick={() => navigate('/editor')}
                className="bg-primary hover:bg-[#B23E15] gap-2"
              >
                <PenLine className="w-4 h-4" />
                Write Your First Post
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && handleDelete(deletePostId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
