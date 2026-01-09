import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Post, CreatePostInput, UpdatePostInput, User, Comment } from '@/types/blog';
import { PostService } from '@/lib/postService';

interface PostsState {
  posts: Post[];
  userPosts: Post[];
  currentPost: Post | null;
  bookmarks: Post[];
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PostsState = {
  posts: [],
  userPosts: [],
  currentPost: null,
  bookmarks: [],
  comments: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchAllPosts = createAsyncThunk(
  'posts/fetchAll',
  async (publishedOnly: boolean = true, { rejectWithValue }) => {
    try {
      const posts = await PostService.getAllPosts(publishedOnly);
      return posts;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPostById = createAsyncThunk(
  'posts/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const post = await PostService.getPostById(id);
      return post;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserPosts = createAsyncThunk(
  'posts/fetchUserPosts',
  async (authorId: string, { rejectWithValue }) => {
    try {
      const posts = await PostService.getPostsByAuthor(authorId);
      return posts;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createPost = createAsyncThunk(
  'posts/create',
  async (
    { input, authorId, author }: { input: CreatePostInput; authorId: string; author: User },
    { rejectWithValue }
  ) => {
    try {
      const post = await PostService.createPost(input, authorId, author);
      return post;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updatePost = createAsyncThunk(
  'posts/update',
  async (input: UpdatePostInput, { rejectWithValue }) => {
    try {
      const post = await PostService.updatePost(input);
      return post;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deletePost = createAsyncThunk(
  'posts/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await PostService.deletePost(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleLike = createAsyncThunk(
  'posts/toggleLike',
  async ({ postId, userId }: { postId: string; userId: string }, { rejectWithValue }) => {
    try {
      const isLiked = await PostService.checkUserLiked(postId, userId);
      if (isLiked) {
        await PostService.removeLike(postId, userId);
      } else {
        await PostService.addLike(postId, userId);
      }
      const likeCount = await PostService.getLikesCount(postId);
      return { postId, likeCount, isLiked: !isLiked };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleBookmark = createAsyncThunk(
  'posts/toggleBookmark',
  async ({ postId, userId }: { postId: string; userId: string }, { rejectWithValue }) => {
    try {
      const isBookmarked = await PostService.checkUserBookmarked(postId, userId);
      if (isBookmarked) {
        await PostService.removeBookmark(postId, userId);
      } else {
        await PostService.addBookmark(postId, userId);
      }
      return { postId, isBookmarked: !isBookmarked };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserBookmarks = createAsyncThunk(
  'posts/fetchBookmarks',
  async (userId: string, { rejectWithValue }) => {
    try {
      const bookmarks = await PostService.getUserBookmarks(userId);
      return bookmarks;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchComments = createAsyncThunk(
  'posts/fetchComments',
  async (postId: string, { rejectWithValue }) => {
    try {
      const comments = await PostService.getComments(postId);
      return comments;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const addComment = createAsyncThunk(
  'posts/addComment',
  async (
    { postId, userId, content }: { postId: string; userId: string; content: string },
    { rejectWithValue }
  ) => {
    try {
      const comment = await PostService.addComment({ postId, content }, userId);
      return comment;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteComment = createAsyncThunk(
  'posts/deleteComment',
  async (commentId: string, { rejectWithValue }) => {
    try {
      await PostService.deleteComment(commentId);
      return commentId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setPosts: (state, action: PayloadAction<Post[]>) => {
      state.posts = action.payload;
    },
    setCurrentPost: (state, action: PayloadAction<Post | null>) => {
      state.currentPost = action.payload;
    },
    clearCurrentPost: (state) => {
      state.currentPost = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all posts
      .addCase(fetchAllPosts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAllPosts.fulfilled, (state, action) => {
        state.posts = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchAllPosts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch post by ID
      .addCase(fetchPostById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        state.currentPost = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchPostById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch user posts
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        state.userPosts = action.payload;
      })
      // Create post
      .addCase(createPost.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
        state.userPosts.unshift(action.payload);
        state.isLoading = false;
        state.error = null;
      })
      .addCase(createPost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update post
      .addCase(updatePost.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.posts.findIndex((p) => p.id === action.payload!.id);
          if (index !== -1) {
            state.posts[index] = action.payload;
          }
          const userIndex = state.userPosts.findIndex((p) => p.id === action.payload!.id);
          if (userIndex !== -1) {
            state.userPosts[userIndex] = action.payload;
          }
          if (state.currentPost?.id === action.payload.id) {
            state.currentPost = action.payload;
          }
        }
      })
      // Delete post
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter((p) => p.id !== action.payload);
        state.userPosts = state.userPosts.filter((p) => p.id !== action.payload);
      })
      // Toggle like
      .addCase(toggleLike.fulfilled, (state, action) => {
        const { postId, likeCount } = action.payload;
        const post = state.posts.find((p) => p.id === postId);
        if (post) {
          post.likeCount = likeCount;
        }
        if (state.currentPost?.id === postId) {
          state.currentPost.likeCount = likeCount;
        }
      })
      // Fetch bookmarks
      .addCase(fetchUserBookmarks.fulfilled, (state, action) => {
        state.bookmarks = action.payload;
      })
      // Toggle bookmark
      .addCase(toggleBookmark.fulfilled, (state, action) => {
        const { postId, isBookmarked } = action.payload;
        if (!isBookmarked) {
          state.bookmarks = state.bookmarks.filter((p) => p.id !== postId);
        }
      })
      // Fetch comments
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.comments = action.payload;
      })
      // Add comment
      .addCase(addComment.fulfilled, (state, action) => {
        if (action.payload) {
          state.comments.unshift(action.payload);
        }
      })
      // Delete comment
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.comments = state.comments.filter((c) => c.id !== action.payload);
      });
  },
});

export const { setPosts, setCurrentPost, clearCurrentPost, clearError } = postsSlice.actions;
export default postsSlice.reducer;
