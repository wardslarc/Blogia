import { supabase } from './supabase';
import { Post, CreatePostInput, UpdatePostInput, User, Comment, CreateCommentInput } from '@/types/blog';

const BUCKET_NAME = 'post-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class PostService {
  static async uploadImage(file: File): Promise<string> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 5MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  static async getAllPosts(publishedOnly = true): Promise<Post[]> {
    try {
      let query = supabase
        .from('posts')
        .select('*');

      if (publishedOnly) {
        query = query.eq('published', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique author IDs
      const authorIds = [...new Set((data || []).map(post => post.author_id))];
      
      // Fetch all author profiles in one query
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
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
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  static async getPostById(id: string): Promise<Post | null> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Fetch author profile
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.author_id)
        .maybeSingle();

      return this.mapPostFromDB({ ...data, author_profile: authorProfile });
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  }

  static async getPostsByAuthor(authorId: string): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(post => this.mapPostFromDB(post));
    } catch (error) {
      console.error('Error fetching author posts:', error);
      throw error;
    }
  }

  static async createPost(
    input: CreatePostInput,
    authorId: string,
    author: User
  ): Promise<Post> {
    try {
      const readTime = this.calculateReadTime(input.content);

      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: input.title,
          content: input.content,
          excerpt: input.excerpt,
          featured_image: input.featuredImage || null,
          author_id: authorId,
          published: input.published,
          read_time: readTime,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapPostFromDB({ ...data, author });
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  static async updatePost(input: UpdatePostInput): Promise<Post | null> {
    try {
      const updates: Record<string, any> = {
        id: input.id,
      };

      if (input.title !== undefined) updates.title = input.title;
      if (input.content !== undefined) {
        updates.content = input.content;
        updates.read_time = this.calculateReadTime(input.content);
      }
      if (input.excerpt !== undefined) updates.excerpt = input.excerpt;
      if (input.featuredImage !== undefined) updates.featured_image = input.featuredImage || null;
      if (input.published !== undefined) updates.published = input.published;

      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', input.id)
        .select(`
          *,
          author:profiles(id, email, name, avatar, created_at)
        `)
        .single();

      if (error) throw error;
      if (!data) return null;

      return this.mapPostFromDB(data);
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  static async deletePost(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
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
    try {
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: userId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding like:', error);
      throw error;
    }
  }

  static async removeLike(postId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing like:', error);
      throw error;
    }
  }

  static async getLikesCount(postId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching likes count:', error);
      throw error;
    }
  }

  static async checkUserLiked(postId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        return false; // No row found
      }

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking user like:', error);
      throw error;
    }
  }

  // Comments methods
  static async addComment(input: CreateCommentInput, userId: string): Promise<Comment> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: input.postId,
          user_id: userId,
          content: input.content,
        })
        .select('*')
        .single();

      if (error) throw error;

      return this.mapCommentFromDB(data);
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  static async getComments(postId: string): Promise<Comment[]> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data) return [];

      // Fetch user data for each comment separately
      const commentsWithUsers = await Promise.all(
        data.map(async (comment) => {
          try {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('id, email, name, avatar, created_at')
              .eq('id', comment.user_id)
              .single();

            return { ...comment, profiles: userProfile };
          } catch (err) {
            console.error('Error fetching user profile:', err);
            return comment;
          }
        })
      );

      return commentsWithUsers.map(comment => this.mapCommentFromDB(comment));
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  static async getCommentsCount(postId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching comments count:', error);
      throw error;
    }
  }

  static async deleteComment(commentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
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
    try {
      // Get all published posts by user
      const { data: userPosts, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .eq('author_id', userId)
        .eq('published', true);

      if (postsError) throw postsError;

      const postIds = (userPosts || []).map(p => p.id);
      const publishedCount = postIds.length;

      let totalLikes = 0;
      let totalComments = 0;

      // Get likes count for all posts
      if (postIds.length > 0) {
        const { count: likesCount, error: likesError } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds);

        if (likesError) throw likesError;
        totalLikes = likesCount || 0;

        // Get comments count for all posts
        const { count: commentsCount, error: commentsError } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds);

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
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  // Bookmark methods
  static async addBookmark(postId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .insert({
          post_id: postId,
          user_id: userId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  }

  static async removeBookmark(postId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      throw error;
    }
  }

  static async checkUserBookmarked(postId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking user bookmark:', error);
      return false;
    }
  }

  static async getUserBookmarks(userId: string): Promise<Post[]> {
    try {
      const { data: bookmarks, error } = await supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!bookmarks || bookmarks.length === 0) return [];

      const postIds = bookmarks.map(b => b.post_id);

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIds)
        .eq('published', true);

      if (postsError) throw postsError;
      if (!posts) return [];

      // Fetch author profiles
      const authorIds = [...new Set(posts.map(p => p.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorIds);

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
      console.error('Error fetching user bookmarks:', error);
      throw error;
    }
  }
}
