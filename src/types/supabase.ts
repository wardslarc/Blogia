/**
 * Supabase Database Types
 * Generated types for type-safe database queries
 */

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          title: string;
          content: string;
          excerpt: string | null;
          featured_image: string | null;
          author_id: string;
          published: boolean;
          read_time: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          excerpt?: string | null;
          featured_image?: string | null;
          author_id: string;
          published?: boolean;
          read_time?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          excerpt?: string | null;
          featured_image?: string | null;
          author_id?: string;
          published?: boolean;
          read_time?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          avatar?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      rate_limits: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          action_count: number;
          window_start: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          action_count?: number;
          window_start?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          action_count?: number;
          window_start?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string;
          record_id: string | null;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          table_name: string;
          record_id?: string | null;
          old_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          table_name?: string;
          record_id?: string | null;
          old_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_post_author: {
        Args: { post_id: string };
        Returns: boolean;
      };
      can_modify_comment: {
        Args: { comment_id: string };
        Returns: boolean;
      };
      check_rate_limit: {
        Args: {
          p_user_id: string;
          p_action_type: string;
          p_max_requests?: number;
          p_window_seconds?: number;
        };
        Returns: boolean;
      };
      cleanup_old_rate_limits: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for working with the database
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T];

// Convenience type exports
export type Post = Tables<'posts'>;
export type Profile = Tables<'profiles'>;
export type Like = Tables<'likes'>;
export type CommentRow = Tables<'comments'>;
export type Bookmark = Tables<'bookmarks'>;
export type RateLimit = Tables<'rate_limits'>;
export type AuditLog = Tables<'audit_log'>;
