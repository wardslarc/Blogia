import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, Heart, MessageCircle, Share2, ArrowRight, X } from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';
import { PostService } from '@/lib/postService';
import { Post, Comment } from '@/types/blog';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const BlogFeed = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likes, setLikes] = useState<{ [key: string]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/profile');
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      const publishedPosts = await PostService.getAllPosts(true);
      setPosts(publishedPosts);
      setIsLoading(false); // Show posts immediately
      
      // Load likes and comment counts in the background (don't block)
      for (const post of publishedPosts) {
        try {
          const [likeCount, commentCount] = await Promise.all([
            PostService.getLikesCount(post.id).catch(() => 0),
            PostService.getCommentsCount(post.id).catch(() => 0),
          ]);
          
          setLikeCounts(prev => ({ ...prev, [post.id]: likeCount }));
          setCommentCounts(prev => ({ ...prev, [post.id]: commentCount }));
          
          if (user) {
            const isLiked = await PostService.checkUserLiked(post.id, user.id).catch(() => false);
            setLikes(prev => ({ ...prev, [post.id]: isLiked }));
          }
        } catch (err) {
          console.error('Error loading post stats:', err);
        }
      }
    } catch (error) {
      toast.error('Failed to load posts');
      console.error('Load posts error:', error);
      setIsLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error('Please log in to like posts');
      return;
    }

    try {
      const currentlyLiked = likes[postId] || false;
      
      if (currentlyLiked) {
        await PostService.removeLike(postId, user.id);
        setLikes(prev => ({ ...prev, [postId]: false }));
        setLikeCounts(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) - 1,
        }));
      } else {
        await PostService.addLike(postId, user.id);
        setLikes(prev => ({ ...prev, [postId]: true }));
        setLikeCounts(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1,
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <h1 className="font-fraunces text-5xl font-semibold mb-4">
            Blog Feed
          </h1>
          <p className="text-lg text-secondary">
            Discover stories from the community
          </p>
        </motion.div>

        {isLoading ? (
          <div className="max-w-2xl mx-auto text-center py-20">
            <p className="text-lg text-secondary">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-20">
            <p className="text-lg text-secondary">
              No posts published yet. Be the first to share a story!
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                index={index}
                isLiked={likes[post.id] || false}
                likeCount={likeCounts[post.id] || 0}
                commentCount={commentCounts[post.id] || 0}
                onLike={() => handleLike(post.id)}
                onClick={() => handlePostClick(post.id)}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface PostCardProps {
  post: Post;
  index: number;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  onLike: () => void;
  onClick: () => void;
  isAuthenticated: boolean;
}

const PostCard = ({
  post,
  index,
  isLiked,
  likeCount,
  commentCount,
  onLike,
  onClick,
  isAuthenticated,
}: PostCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [localCommentDelta, setLocalCommentDelta] = useState(0);
  const { user } = useAppSelector((state) => state.auth);

  // Display count = parent count + local changes (adds/deletes)
  const displayCommentCount = commentCount + localCommentDelta;

  const loadComments = async () => {
    try {
      setIsLoadingComments(true);
      const fetchedComments = await PostService.getComments(post.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleToggleComments = async () => {
    if (!showComments) {
      await loadComments();
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!user) {
      toast.error('Please log in to comment');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setIsAddingComment(true);
      const newComment = await PostService.addComment(
        { postId: post.id, content: commentText },
        user.id
      );
      setComments([newComment, ...comments]);
      setCommentText('');
      setLocalCommentDelta(prev => prev + 1);
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await PostService.deleteComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
      setLocalCommentDelta(prev => prev - 1);
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white rounded-lg border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Post Header - Author Info */}
      <div className="p-4 flex items-center gap-3">
        <img
          src={post.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`}
          alt={post.author?.name || 'Author'}
          className="w-10 h-10 rounded-full object-cover border border-border"
        />
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">
            {post.author?.name || 'Unknown User'}
          </p>
          <p className="text-xs text-secondary">
            {post.createdAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Featured Image */}
      {post.featuredImage && (
        <div 
          className="aspect-video overflow-hidden bg-muted cursor-pointer"
          onClick={onClick}
        >
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Post Content */}
      <div className="p-6">
        <h2 
          onClick={onClick}
          className="font-fraunces text-2xl font-semibold mb-3 cursor-pointer hover:text-primary transition-colors"
        >
          {post.title}
        </h2>

        <p className="text-secondary mb-4 line-clamp-2 leading-relaxed">
          {post.excerpt}
        </p>

        <button
          onClick={onClick}
          className="inline-flex items-center gap-2 text-primary hover:text-[#B23E15] font-medium transition-colors mb-4"
        >
          Read More
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 text-sm text-secondary mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {post.readTime} min read
          </div>
        </div>

        {/* Interaction Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onLike}
              className="flex items-center gap-2 group transition-all"
            >
              <Heart
                className={`w-5 h-5 transition-all ${
                  isLiked
                    ? 'fill-red-500 text-red-500'
                    : 'text-secondary group-hover:text-red-500'
                }`}
              />
              <span className="text-sm text-secondary group-hover:text-foreground">
                {likeCount}
              </span>
            </button>

            <button
              onClick={handleToggleComments}
              className="flex items-center gap-2 text-secondary hover:text-foreground transition-colors group"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{displayCommentCount}</span>
            </button>

            <button className="flex items-center gap-2 text-secondary hover:text-foreground transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-border space-y-4"
          >
            {isAuthenticated ? (
              <div className="flex gap-3">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  disabled={isAddingComment}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddComment}
                  disabled={isAddingComment}
                  className="bg-primary hover:bg-[#B23E15]"
                >
                  {isAddingComment ? 'Posting...' : 'Post'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-secondary text-center py-2">
                <button 
                  onClick={() => window.location.href = '/'}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
                {' '}to comment
              </p>
            )}

            {isLoadingComments ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-secondary">Loading comments...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-secondary">
                  No comments yet. Be the first to comment!
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {comments.map(comment => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-muted/50 rounded-lg p-3"
                  >
                    {/* Comment Header - User Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={comment.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`}
                        alt={comment.user?.name || 'User'}
                        className="w-8 h-8 rounded-full object-cover border border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {comment.user?.name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-secondary">
                            {new Date(comment.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {user?.id === comment.userId && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                      {user?.id === comment.userId && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-secondary hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors"
                          title="Delete comment"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Comment Text */}
                    <p className="text-sm text-foreground leading-relaxed pl-10">
                      {comment.content}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.article>
  );
};
