export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  authorId: string;
  author?: User;
  published: boolean;
  readTime: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostInput {
  title: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  published: boolean;
}

export interface UpdatePostInput extends Partial<CreatePostInput> {
  id: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user?: User;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommentInput {
  postId: string;
  content: string;
}
