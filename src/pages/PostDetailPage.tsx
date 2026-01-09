import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, Edit, Heart, MessageCircle, Share2, Bookmark, Send, Trash2, X } from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PostService } from '@/lib/postService';
import { Post, Comment } from '@/types/blog';
import { useAppSelector } from '@/store/hooks';
import { toast } from 'sonner';

export const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id, navigate]);

  const loadPost = async () => {
    try {
      setIsLoading(true);
      const foundPost = await PostService.getPostById(id!);
      if (foundPost) {
        setPost(foundPost);
        
        // Load like count
        const count = await PostService.getLikesCount(id!).catch(() => 0);
        setLikeCount(count);
        
        if (user) {
          const liked = await PostService.checkUserLiked(id!, user.id).catch(() => false);
          setIsLiked(liked);
          const bookmarked = await PostService.checkUserBookmarked(id!, user.id).catch(() => false);
          setIsBookmarked(bookmarked);
        }
        
        // Load comment count
        const commentsCount = await PostService.getCommentsCount(id!).catch(() => 0);
        setCommentCount(commentsCount);
      } else {
        navigate('/feed');
      }
    } catch (error) {
      console.error('Error loading post:', error);
      toast.error('Failed to load post');
      navigate('/feed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }
    
    try {
      if (isLiked) {
        await PostService.removeLike(post!.id, user.id);
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        await PostService.addLike(post!.id, user.id);
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      toast.error('Failed to update like');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Please sign in to bookmark posts');
      return;
    }
    
    try {
      if (isBookmarked) {
        await PostService.removeBookmark(post!.id, user.id);
        setIsBookmarked(false);
        toast.success('Removed from bookmarks');
      } else {
        await PostService.addBookmark(post!.id, user.id);
        setIsBookmarked(true);
        toast.success('Added to bookmarks');
      }
    } catch (error) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleToggleComments = async () => {
    if (!showComments) {
      // Load comments when opening
      try {
        const loadedComments = await PostService.getComments(post!.id);
        setComments(loadedComments);
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    }
    setShowComments(!showComments);
    
    // Scroll to comments section after opening
    if (!showComments) {
      setTimeout(() => {
        commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }
    
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    try {
      setIsSubmittingComment(true);
      const comment = await PostService.addComment(
        { postId: post!.id, content: newComment.trim() },
        user.id
      );
      
      // Add user info to the comment
      const commentWithUser = {
        ...comment,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          createdAt: user.createdAt,
        },
      };
      
      setComments(prev => [commentWithUser, ...prev]);
      setCommentCount(prev => prev + 1);
      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await PostService.deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCount(prev => prev - 1);
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-6 py-20 text-center">
          <div className="animate-pulse space-y-8 max-w-3xl mx-auto">
            <div className="h-12 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-6 bg-muted rounded w-1/2 mx-auto"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-6 py-20 text-center">
          <p className="text-xl text-secondary">Post not found</p>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === post.authorId;
  const formattedDate = post.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const authorName = post.author?.name || 'Anonymous';
  const authorAvatar = post.author?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${post.authorId}`;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <motion.article
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Back Button */}
        <div className="container mx-auto px-6 pt-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-secondary hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Feed
          </button>
        </div>

        {/* Article Header */}
        <header className="container mx-auto px-6 py-12">
          <div className="max-w-3xl mx-auto text-center">
            {/* Category/Tag - Optional */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
                Article
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-fraunces text-4xl md:text-5xl lg:text-6xl font-semibold mb-6 leading-tight"
            >
              {post.title}
            </motion.h1>

            {/* Excerpt */}
            {post.excerpt && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="text-xl text-secondary mb-8 leading-relaxed"
              >
                {post.excerpt}
              </motion.p>
            )}

            {/* Author & Meta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6 py-6 border-y border-border"
            >
              {/* Author Info */}
              <button
                onClick={() => navigate(`/profile/${post.authorId}`)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-border"
                />
                <div className="text-left">
                  <p className="font-semibold text-foreground hover:text-primary transition-colors">
                    {authorName}
                  </p>
                  <p className="text-sm text-secondary">Author</p>
                </div>
              </button>

              <div className="hidden sm:block w-px h-10 bg-border"></div>

              {/* Meta Info */}
              <div className="flex items-center gap-6 text-sm text-secondary">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formattedDate}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {post.readTime} min read
                </div>
              </div>

              {/* Edit Button for Author */}
              {isAuthor && (
                <>
                  <div className="hidden sm:block w-px h-10 bg-border"></div>
                  <Button
                    onClick={() => navigate(`/editor/${post.id}`)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </>
              )}
            </motion.div>
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <motion.figure
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="container mx-auto px-6 mb-12"
          >
            <div className="max-w-4xl mx-auto">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full rounded-2xl shadow-2xl object-cover aspect-video"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </motion.figure>
        )}

        {/* Article Content */}
        <div className="container mx-auto px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-[680px] mx-auto"
          >
            {/* Content */}
            <div className="prose prose-lg prose-neutral max-w-none">
              {post.content.split('\n\n').map((paragraph, index) => {
                // Check if it's a heading
                if (paragraph.startsWith('## ')) {
                  return (
                    <motion.h2
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      viewport={{ once: true }}
                      className="font-fraunces text-3xl font-semibold mt-12 mb-6 text-foreground"
                    >
                      {paragraph.replace('## ', '')}
                    </motion.h2>
                  );
                }

                // Check if it's a subheading
                if (paragraph.startsWith('### ')) {
                  return (
                    <motion.h3
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      viewport={{ once: true }}
                      className="font-fraunces text-2xl font-semibold mt-10 mb-4 text-foreground"
                    >
                      {paragraph.replace('### ', '')}
                    </motion.h3>
                  );
                }

                // Check if it's bold text
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return (
                    <motion.p
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      viewport={{ once: true }}
                      className="font-semibold text-foreground mb-6 text-lg"
                    >
                      {paragraph.replace(/\*\*/g, '')}
                    </motion.p>
                  );
                }

                // Check if it's a blockquote
                if (paragraph.startsWith('> ')) {
                  return (
                    <motion.blockquote
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      viewport={{ once: true }}
                      className="border-l-4 border-primary pl-6 py-2 my-8 italic text-secondary text-xl"
                    >
                      {paragraph.replace('> ', '')}
                    </motion.blockquote>
                  );
                }

                // Regular paragraph
                return (
                  <motion.p
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="text-foreground mb-6 leading-relaxed text-lg"
                  >
                    {paragraph}
                  </motion.p>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Engagement Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="sticky bottom-6 z-10 container mx-auto px-6"
        >
          <div className="max-w-md mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-border px-6 py-3 flex items-center justify-center gap-6">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 text-secondary hover:text-red-500 transition-colors"
              >
                <Heart
                  className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
                />
                <span className="text-sm font-medium">{likeCount}</span>
              </button>

              <div className="w-px h-6 bg-border"></div>

              <button 
                onClick={handleToggleComments}
                className={`flex items-center gap-2 transition-colors ${showComments ? 'text-primary' : 'text-secondary hover:text-foreground'}`}
              >
                <MessageCircle className={`w-5 h-5 ${showComments ? 'fill-primary/20' : ''}`} />
                <span className="text-sm font-medium">{commentCount}</span>
              </button>

              <div className="w-px h-6 bg-border"></div>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-secondary hover:text-foreground transition-colors"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-medium">Share</span>
              </button>

              <div className="w-px h-6 bg-border"></div>

              <button
                onClick={handleBookmark}
                className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
              >
                <Bookmark
                  className={`w-5 h-5 ${isBookmarked ? 'fill-primary text-primary' : ''}`}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              ref={commentsRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="container mx-auto px-6 pb-8"
            >
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-fraunces text-xl font-semibold">
                      Comments ({commentCount})
                    </h3>
                    <button
                      onClick={() => setShowComments(false)}
                      className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-secondary" />
                    </button>
                  </div>

                  {/* Add Comment */}
                  {user ? (
                    <div className="flex gap-3 mb-6 pb-6 border-b border-border">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1">
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="min-h-[80px] resize-none mb-2"
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={handleSubmitComment}
                            disabled={isSubmittingComment || !newComment.trim()}
                            size="sm"
                            className="bg-primary hover:bg-[#B23E15] gap-2"
                          >
                            <Send className="w-4 h-4" />
                            {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 mb-6 bg-muted/50 rounded-lg">
                      <p className="text-secondary">
                        Please sign in to leave a comment
                      </p>
                    </div>
                  )}

                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-muted mx-auto mb-3" />
                        <p className="text-secondary">No comments yet. Be the first to comment!</p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3 p-4 bg-muted/30 rounded-xl"
                        >
                          <img
                            src={comment.user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.userId}`}
                            alt={comment.user?.name || 'User'}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {comment.user?.name || 'Unknown User'}
                                </span>
                                <span className="text-xs text-secondary">
                                  {comment.createdAt.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                              {user?.id === comment.userId && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="p-1.5 text-secondary hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="text-foreground mt-1 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Author Card */}
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl border border-border p-8"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <button onClick={() => navigate(`/profile/${post.authorId}`)}>
                  <img
                    src={authorAvatar}
                    alt={authorName}
                    className="w-20 h-20 rounded-full object-cover border-2 border-border hover:ring-4 ring-primary/20 transition-all"
                  />
                </button>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-secondary mb-1">Written by</p>
                  <button
                    onClick={() => navigate(`/profile/${post.authorId}`)}
                    className="font-fraunces text-2xl font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {authorName}
                  </button>
                  <p className="text-secondary mt-3">
                    Thanks for reading! Follow for more articles and updates.
                  </p>
                  <Button
                    onClick={() => navigate(`/profile/${post.authorId}`)}
                    className="mt-4 bg-primary hover:bg-[#B23E15]"
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* More Stories Section */}
        <div className="border-t border-border bg-muted/30">
          <div className="container mx-auto px-6 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <h3 className="font-fraunces text-3xl font-semibold mb-4">
                Explore More Stories
              </h3>
              <p className="text-secondary mb-8">
                Discover more articles from our community
              </p>
              <Button
                onClick={() => navigate('/feed')}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                View All Posts
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </motion.article>
    </div>
  );
};
