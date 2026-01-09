import { supabase, isSupabaseConfigured, withTimeout } from './supabase';
import { Post, CreatePostInput, UpdatePostInput, User, Comment, CreateCommentInput } from '@/types/blog';
import { 
  validatePostInput, 
  validateCommentInput, 
  validateImageFile, 
  checkRateLimit, 
  isValidUUID,
  SecurityConfig 
} from './security';
import { handleError, secureLog, ErrorCode, createAppError } from './errorHandler';

const BUCKET_NAME = 'post-images';
const MAX_FILE_SIZE = SecurityConfig.MAX_IMAGE_SIZE;
const DEFAULT_TIMEOUT = 15000; // 15 seconds

export class PostService {
  static async uploadImage(file: File): Promise<string> {
    // Check configuration
    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Storage service is not configured');
    }

    // Rate limiting
    const rateLimitCheck = checkRateLimit('upload');
    if (!rateLimitCheck.allowed) {
      throw createAppError(
        ErrorCode.RATE_LIMITED, 
        `Upload rate limited. Retry after ${rateLimitCheck.retryAfter} seconds`
      );
    }

    // Comprehensive file validation
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, validation.errors.join(', '));
    }

    try {
      // Generate secure filename with sanitized extension
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const safeExt = allowedExtensions.includes(fileExt || '') ? fileExt : 'jpg';
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

      const uploadPromise = supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false, // Prevent overwriting
          contentType: file.type,
        });

      const { error: uploadError } = await withTimeout(uploadPromise, 30000, 'Image upload');

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      secureLog('error', 'Image upload failed', { fileSize: file.size, fileType: file.type });
      throw handleError(error, 'image upload');
    }
  }

  static async getAllPosts(publishedOnly = true): Promise<Post[]> {
    if (!isSupabaseConfigured) {
      secureLog('warn', 'Attempted to fetch posts without valid configuration');
      return [];
    }

    try {
      let query = supabase
        .from('posts')
        .select('*');

      if (publishedOnly) {
        query = query.eq('published', true);
      }

      const { data, error } = await withTimeout(
        query.order('created_at', { ascending: false }),
        DEFAULT_TIMEOUT,
        'Fetch posts'
      );

      if (error) throw error;

      // Get unique author IDs
      const authorIds = [...new Set((data || []).map(post => post.author_id))];
      
      // Fetch all author profiles in one query
      const { data: profiles, error: profilesError } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .in('id', authorIds),
        DEFAULT_TIMEOUT,
        'Fetch profiles'
      );

      if (profilesError) {
        secureLog('warn', 'Failed to fetch author profiles', { errorCode: profilesError.code });
      }

      // Create a map of author profiles
      const profileMap = new Map();
      (profiles || []).forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      // Attach author profiles to posts
      const postsWithAuthors = (data || []).map(post => {
        const authorProfile = profileMap.get(post.author_id);
        return { ...post, author_profile: authorProfile };
      });

      return postsWithAuthors.map(post => this.mapPostFromDB(post));
    } catch (error) {
      secureLog('error', 'Failed to fetch posts', { publishedOnly });
      throw handleError(error, 'posts');
    }
  }

  static async getPostById(id: string): Promise<Post | null> {
    // Validate UUID format to prevent injection
    if (!isValidUUID(id)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid post ID format');
    }

    if (!isSupabaseConfigured) {
      return null;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single(),
        DEFAULT_TIMEOUT,
        'Fetch post'
      );

      if (error) throw error;
      if (!data) return null;

      // Fetch author profile
      const { data: authorProfile } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', data.author_id)
          .maybeSingle(),
        DEFAULT_TIMEOUT,
        'Fetch author profile'
      );

      return this.mapPostFromDB({ ...data, author_profile: authorProfile });
    } catch (error) {
      secureLog('error', 'Failed to fetch post by ID');
      throw handleError(error, 'post');
    }
  }

  static async getPostsByAuthor(authorId: string): Promise<Post[]> {
    // Validate UUID format
    if (!isValidUUID(authorId)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid author ID format');
    }

    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('posts')
          .select('*')
          .eq('author_id', authorId)
          .order('created_at', { ascending: false }),
        DEFAULT_TIMEOUT,
        'Fetch author posts'
      );

      if (error) {
        throw error;
      }

      return (data || []).map(post => this.mapPostFromDB(post));
    } catch (error) {
      secureLog('error', 'Failed to fetch author posts');
      throw handleError(error, 'author posts');
    }
  }

  static async createPost(
    input: CreatePostInput,
    authorId: string,
    author: User
  ): Promise<Post> {
    // Validate author ID
    if (!isValidUUID(authorId)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid author ID');
    }

    // Rate limiting for post creation
    const rateLimitCheck = checkRateLimit(`create-post-${authorId}`);
    if (!rateLimitCheck.allowed) {
      throw createAppError(
        ErrorCode.RATE_LIMITED,
        `Post creation rate limited. Retry after ${rateLimitCheck.retryAfter} seconds`
      );
    }

    // Validate and sanitize input
    const validation = validatePostInput({
      title: input.title,
      content: input.content,
      excerpt: input.excerpt,
    });

    if (!validation.valid) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, validation.errors.join(', '));
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Database service is not configured');
    }

    try {
      const readTime = this.calculateReadTime(validation.sanitized.content || input.content);

      const { data, error } = await withTimeout(
        supabase
          .from('posts')
          .insert({
            title: validation.sanitized.title,
            content: validation.sanitized.content,
            excerpt: validation.sanitized.excerpt,
            featured_image: input.featuredImage || null,
            author_id: authorId,
            published: input.published,
            read_time: readTime,
          })
          .select()
          .single(),
        DEFAULT_TIMEOUT,
        'Create post'
      );

      if (error) throw error;

      secureLog('info', 'Post created successfully');
      return this.mapPostFromDB({ ...data, author });
    } catch (error) {
      secureLog('error', 'Failed to create post');
      throw handleError(error, 'post creation');
    }
  }

  static async updatePost(input: UpdatePostInput): Promise<Post | null> {
    // Validate post ID
    if (!isValidUUID(input.id)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid post ID');
    }

    // Validate and sanitize input
    const validation = validatePostInput({
      title: input.title,
      content: input.content,
      excerpt: input.excerpt,
    });

    if (!validation.valid) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, validation.errors.join(', '));
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Database service is not configured');
    }

    try {
      const updates: Record<string, any> = {
        id: input.id,
      };

      if (input.title !== undefined) updates.title = validation.sanitized.title;
      if (input.content !== undefined) {
        updates.content = validation.sanitized.content;
        updates.read_time = this.calculateReadTime(validation.sanitized.content || input.content);
      }
      if (input.excerpt !== undefined) updates.excerpt = validation.sanitized.excerpt;
      if (input.featuredImage !== undefined) updates.featured_image = input.featuredImage || null;
      if (input.published !== undefined) updates.published = input.published;

      const { data, error } = await withTimeout(
        supabase
          .from('posts')
          .update(updates)
          .eq('id', input.id)
          .select(`
            *,
            author:profiles(id, email, name, avatar, created_at)
          `)
          .single(),
        DEFAULT_TIMEOUT,
        'Update post'
      );

      if (error) throw error;
      if (!data) return null;

      secureLog('info', 'Post updated successfully');
      return this.mapPostFromDB(data);
    } catch (error) {
      secureLog('error', 'Failed to update post');
      throw handleError(error, 'post update');
    }
  }

  static async deletePost(id: string): Promise<boolean> {
    // Validate post ID
    if (!isValidUUID(id)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid post ID');
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Database service is not configured');
    }

    try {
      const { error } = await withTimeout(
        supabase
          .from('posts')
          .delete()
          .eq('id', id),
        DEFAULT_TIMEOUT,
        'Delete post'
      );

      if (error) throw error;
      secureLog('info', 'Post deleted successfully');
      return true;
    } catch (error) {
      secureLog('error', 'Failed to delete post');
      throw handleError(error, 'post deletion');
    }
  }

  private static calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  }

  private static mapPostFromDB(dbPost: any): Post {
    const authorData = dbPost.author || dbPost.author_profile;
    return {
      id: dbPost.id,
      title: dbPost.title,
      content: dbPost.content,
      excerpt: dbPost.excerpt,
      featuredImage: dbPost.featured_image,
      authorId: dbPost.author_id,
      author: authorData ? {
        id: authorData.id,
        email: authorData.email,
        name: authorData.name,
        avatar: authorData.avatar,
        createdAt: new Date(authorData.created_at),
      } : undefined,
      published: dbPost.published,
      readTime: dbPost.read_time,
      createdAt: new Date(dbPost.created_at),
      updatedAt: new Date(dbPost.updated_at),
    };
  }

  // Likes methods
  static async addLike(postId: string, userId: string): Promise<void> {
    // Validate IDs
    if (!isValidUUID(postId) || !isValidUUID(userId)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid post or user ID');
    }

    // Rate limiting
    const rateLimitCheck = checkRateLimit(`like-${userId}`);
    if (!rateLimitCheck.allowed) {
      throw createAppError(ErrorCode.RATE_LIMITED, 'Too many like actions');
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Database service is not configured');
    }

    try {
      const { error } = await withTimeout(
        supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: userId,
          }),
        DEFAULT_TIMEOUT,
        'Add like'
      );

      if (error) throw error;
    } catch (error) {
      secureLog('error', 'Failed to add like');
      throw handleError(error, 'like');
    }
  }

  static async removeLike(postId: string, userId: string): Promise<void> {
    // Validate IDs
    if (!isValidUUID(postId) || !isValidUUID(userId)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid post or user ID');
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Database service is not configured');
    }

    try {
      const { error } = await withTimeout(
        supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId),
        DEFAULT_TIMEOUT,
        'Remove like'
      );

      if (error) throw error;
    } catch (error) {
      secureLog('error', 'Failed to remove like');
      throw handleError(error, 'like removal');
    }
  }

  static async getLikesCount(postId: string): Promise<number> {
    if (!isValidUUID(postId)) {
      return 0;
    }

    if (!isSupabaseConfigured) {
      return 0;
    }

    try {
      const { count, error } = await withTimeout(
        supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
        DEFAULT_TIMEOUT,
        'Get likes count'
      );

      if (error) throw error;
      return count || 0;
    } catch (error) {
      secureLog('error', 'Failed to fetch likes count');
      return 0; // Return 0 instead of throwing to gracefully handle errors
    }
  }

  static async checkUserLiked(postId: string, userId: string): Promise<boolean> {
    if (!isValidUUID(postId) || !isValidUUID(userId)) {
      return false;
    }

    if (!isSupabaseConfigured) {
      return false;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .single(),
        DEFAULT_TIMEOUT,
        'Check user liked'
      );

      if (error && error.code === 'PGRST116') {
        return false; // No row found
      }

      if (error) throw error;
      return !!data;
    } catch (error) {
      secureLog('error', 'Failed to check user like');
      return false; // Return false instead of throwing
    }
  }

  // Comments methods
  static async addComment(input: CreateCommentInput, userId: string): Promise<Comment> {
    // Validate IDs
    if (!isValidUUID(input.postId) || !isValidUUID(userId)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid post or user ID');
    }

    // Validate and sanitize comment content
    const validation = validateCommentInput(input.content);
    if (!validation.valid) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, validation.errors.join(', '));
    }

    // Rate limiting for comments
    const rateLimitCheck = checkRateLimit(`comment-${userId}`);
    if (!rateLimitCheck.allowed) {
      throw createAppError(ErrorCode.RATE_LIMITED, 'Too many comment actions');
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Database service is not configured');
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('comments')
          .insert({
            post_id: input.postId,
            user_id: userId,
            content: validation.sanitized,
          })
          .select('*')
          .single(),
        DEFAULT_TIMEOUT,
        'Add comment'
      );

      if (error) throw error;

      secureLog('info', 'Comment added successfully');
      return this.mapCommentFromDB(data);
    } catch (error) {
      secureLog('error', 'Failed to add comment');
      throw handleError(error, 'comment');
    }
  }

  static async getComments(postId: string): Promise<Comment[]> {
    if (!isValidUUID(postId)) {
      return [];
    }

    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: false }),
        DEFAULT_TIMEOUT,
        'Fetch comments'
      );

      if (error) {
        throw error;
      }

      if (!data) return [];

      // Fetch user data for each comment in batch
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, email, name, avatar, created_at')
          .in('id', userIds),
        DEFAULT_TIMEOUT,
        'Fetch comment profiles'
      );

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const commentsWithUsers = data.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id),
      }));

      return commentsWithUsers.map(comment => this.mapCommentFromDB(comment));
    } catch (error) {
      secureLog('error', 'Failed to fetch comments');
      return []; // Return empty array to gracefully handle errors
    }
  }

  static async getCommentsCount(postId: string): Promise<number> {
    if (!isValidUUID(postId)) {
      return 0;
    }

    if (!isSupabaseConfigured) {
      return 0;
    }

    try {
      const { count, error } = await withTimeout(
        supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
        DEFAULT_TIMEOUT,
        'Get comments count'
      );

      if (error) throw error;
      return count || 0;
    } catch (error) {
      secureLog('error', 'Failed to fetch comments count');
      return 0;
    }
  }

  static async deleteComment(commentId: string): Promise<void> {
    if (!isValidUUID(commentId)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid comment ID');
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Database service is not configured');
    }

    try {
      const { error } = await withTimeout(
        supabase
          .from('comments')
          .delete()
          .eq('id', commentId),
        DEFAULT_TIMEOUT,
        'Delete comment'
      );

      if (error) throw error;
      secureLog('info', 'Comment deleted successfully');
    } catch (error) {
      secureLog('error', 'Failed to delete comment');
      throw handleError(error, 'comment deletion');
    }
  }

  private static mapCommentFromDB(dbComment: any): Comment {
    return {
      id: dbComment.id,
      postId: dbComment.post_id,
      userId: dbComment.user_id,
      content: dbComment.content,
      user: dbComment.profiles ? {
        id: dbComment.profiles.id,
        email: dbComment.profiles.email,
        name: dbComment.profiles.name,
        avatar: dbComment.profiles.avatar,
        createdAt: new Date(dbComment.profiles.created_at),
      } : undefined,
      createdAt: new Date(dbComment.created_at),
      updatedAt: new Date(dbComment.updated_at),
    };
  }

  // User stats methods
  static async getUserStats(userId: string): Promise<{
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    publishedCount: number;
  }> {
    if (!isValidUUID(userId)) {
      return { totalLikes: 0, totalComments: 0, totalShares: 0, publishedCount: 0 };
    }

    if (!isSupabaseConfigured) {
      return { totalLikes: 0, totalComments: 0, totalShares: 0, publishedCount: 0 };
    }

    try {
      // Get all published posts by user
      const { data: userPosts, error: postsError } = await withTimeout(
        supabase
          .from('posts')
          .select('id')
          .eq('author_id', userId)
          .eq('published', true),
        DEFAULT_TIMEOUT,
        'Fetch user posts'
      );

      if (postsError) throw postsError;

      const postIds = (userPosts || []).map(p => p.id);
      const publishedCount = postIds.length;

      let totalLikes = 0;
      let totalComments = 0;

      // Get likes count for all posts
      if (postIds.length > 0) {
        const { count: likesCount, error: likesError } = await withTimeout(
          supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .in('post_id', postIds),
          DEFAULT_TIMEOUT,
          'Fetch likes count'
        );

        if (likesError) throw likesError;
        totalLikes = likesCount || 0;

        // Get comments count for all posts
        const { count: commentsCount, error: commentsError } = await withTimeout(
          supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .in('post_id', postIds),
          DEFAULT_TIMEOUT,
          'Fetch comments count'
        );

        if (commentsError) throw commentsError;
        totalComments = commentsCount || 0;
      }

      return {
        totalLikes,
        totalComments,
        totalShares: 0, // Placeholder for future implementation
        publishedCount,
      };
    } catch (error) {
      secureLog('error', 'Failed to fetch user stats');
      return { totalLikes: 0, totalComments: 0, totalShares: 0, publishedCount: 0 };
    }
  }

  // Bookmark methods
  static async addBookmark(postId: string, userId: string): Promise<void> {
    if (!isValidUUID(postId) || !isValidUUID(userId)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid post or user ID');
    }

    // Rate limiting
    const rateLimitCheck = checkRateLimit(`bookmark-${userId}`);
    if (!rateLimitCheck.allowed) {
      throw createAppError(ErrorCode.RATE_LIMITED, 'Too many bookmark actions');
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Database service is not configured');
    }

    try {
      const { error } = await withTimeout(
        supabase
          .from('bookmarks')
          .insert({
            post_id: postId,
            user_id: userId,
          }),
        DEFAULT_TIMEOUT,
        'Add bookmark'
      );

      if (error) throw error;
    } catch (error) {
      secureLog('error', 'Failed to add bookmark');
      throw handleError(error, 'bookmark');
    }
  }

  static async removeBookmark(postId: string, userId: string): Promise<void> {
    if (!isValidUUID(postId) || !isValidUUID(userId)) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid post or user ID');
    }

    if (!isSupabaseConfigured) {
      throw createAppError(ErrorCode.CONFIGURATION_ERROR, 'Database service is not configured');
    }

    try {
      const { error } = await withTimeout(
        supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId),
        DEFAULT_TIMEOUT,
        'Remove bookmark'
      );

      if (error) throw error;
    } catch (error) {
      secureLog('error', 'Failed to remove bookmark');
      throw handleError(error, 'bookmark removal');
    }
  }

  static async checkUserBookmarked(postId: string, userId: string): Promise<boolean> {
    if (!isValidUUID(postId) || !isValidUUID(userId)) {
      return false;
    }

    if (!isSupabaseConfigured) {
      return false;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('bookmarks')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle(),
        DEFAULT_TIMEOUT,
        'Check user bookmarked'
      );

      if (error) throw error;
      return !!data;
    } catch (error) {
      secureLog('error', 'Failed to check user bookmark');
      return false;
    }
  }

  static async getUserBookmarks(userId: string): Promise<Post[]> {
    if (!isValidUUID(userId)) {
      return [];
    }

    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const { data: bookmarks, error } = await withTimeout(
        supabase
          .from('bookmarks')
          .select('post_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        DEFAULT_TIMEOUT,
        'Fetch user bookmarks'
      );

      if (error) throw error;
      if (!bookmarks || bookmarks.length === 0) return [];

      const postIds = bookmarks.map(b => b.post_id);

      const { data: posts, error: postsError } = await withTimeout(
        supabase
          .from('posts')
          .select('*')
          .in('id', postIds)
          .eq('published', true),
        DEFAULT_TIMEOUT,
        'Fetch bookmarked posts'
      );

      if (postsError) throw postsError;
      if (!posts) return [];

      // Fetch author profiles
      const authorIds = [...new Set(posts.map(p => p.author_id))];
      const { data: profiles } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .in('id', authorIds),
        DEFAULT_TIMEOUT,
        'Fetch profiles'
      );

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return posts.map(post => ({
        ...this.mapPostFromDB(post),
        author: profileMap.get(post.author_id) ? {
          id: profileMap.get(post.author_id)!.id,
          email: profileMap.get(post.author_id)!.email,
          name: profileMap.get(post.author_id)!.name,
          avatar: profileMap.get(post.author_id)!.avatar,
          createdAt: new Date(profileMap.get(post.author_id)!.created_at),
        } : undefined,
      }));
    } catch (error) {
      secureLog('error', 'Failed to fetch user bookmarks');
      return [];
    }
  }
}
