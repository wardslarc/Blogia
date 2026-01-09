import { Post, CreatePostInput, UpdatePostInput } from '@/types/blog';

const STORAGE_KEY = 'blog_posts';

// Mock initial posts
const initialPosts: Post[] = [
  {
    id: '1',
    title: 'The Art of Minimalist Design',
    content: `Minimalism in design is not about removing everything—it's about finding the essence. It's about distilling an experience down to its most critical elements, removing the noise, and letting what remains shine with clarity and purpose.

In the digital age, where attention is fragmented and time is precious, minimalist design offers a refuge. It respects the user's cognitive load and creates space for contemplation. Every element serves a purpose, every pixel has intention.

The beauty of minimalist design lies in its restraint. It's easy to add features, colors, and embellishments. The real challenge is knowing what to leave out. As Antoine de Saint-Exupéry famously said, "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away."

## The Principles of Minimalism

**Whitespace as a Design Element**: Whitespace isn't empty space—it's an active element that gives breathing room to content. It creates visual hierarchy and guides the eye.

**Typography First**: When you strip away decorative elements, typography becomes paramount. The choice of typeface, size, spacing, and rhythm becomes the primary means of communication.

**Intentional Color**: A restrained color palette isn't limiting—it's liberating. Each color carries more weight and meaning when there are fewer of them competing for attention.

## Implementing Minimalism

Start by asking what truly matters. What is the core message? What action do you want users to take? Once you know this, build only what supports that goal. Everything else is noise.`,
    excerpt: 'Exploring how minimalist design creates clarity and purpose in the digital age through intentional restraint and thoughtful composition.',
    featuredImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
    authorId: 'demo-user',
    author: {
      id: 'demo-user',
      email: 'demo@blog.com',
      name: 'Emma Richardson',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Emma Richardson',
      createdAt: new Date('2024-01-15'),
    },
    published: true,
    readTime: 5,
    createdAt: new Date('2024-03-15T10:00:00'),
    updatedAt: new Date('2024-03-15T10:00:00'),
  },
  {
    id: '2',
    title: 'Typography in Digital Publishing',
    content: `Typography is the voice of written content. It conveys not just information, but mood, personality, and authority. In digital publishing, where the medium is light rather than paper, typography takes on new dimensions and challenges.

The transition from print to digital has forced designers to reconsider fundamental typographic principles. Screen resolution, variable viewing distances, and diverse devices all impact how type is perceived and read.

## The Digital Context

Unlike print, digital typography must be fluid. Responsive design means our carefully crafted layouts must adapt across countless screen sizes. This isn't a limitation—it's an opportunity to think about hierarchy and readability in new ways.

**Hierarchy Through Scale**: Digital typography allows for more dramatic scale differences. We can use oversized headlines that would be impractical in print, creating instant visual impact.

**Performance Considerations**: Every font file adds to page load time. The art is balancing typographic richness with performance. Variable fonts offer one solution, providing multiple weights and styles in a single file.

## Choosing Typefaces

The right typeface can transform a design from forgettable to memorable. For digital publishing, consider:

- **Readability at multiple sizes**: Your typeface should work for both body text and headings
- **Character and personality**: Does it match your content's tone?
- **Technical performance**: File size, language support, and rendering quality

Typography is infrastructure. It's the foundation upon which all content rests. Invest time in getting it right.`,
    excerpt: 'How typography shapes the reading experience in digital publishing, from choosing the right typefaces to creating visual hierarchy.',
    featuredImage: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80',
    authorId: 'demo-user',
    author: {
      id: 'demo-user',
      email: 'demo@blog.com',
      name: 'Emma Richardson',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Emma Richardson',
      createdAt: new Date('2024-01-15'),
    },
    published: true,
    readTime: 6,
    createdAt: new Date('2024-03-10T14:30:00'),
    updatedAt: new Date('2024-03-10T14:30:00'),
  },
  {
    id: '3',
    title: 'Building Engaging User Interfaces',
    content: `A great user interface is invisible. It guides without instructing, delights without distracting, and makes complex tasks feel effortless. But achieving this kind of clarity requires deep thought about interaction, feedback, and user intent.

The best interfaces anticipate user needs. They provide feedback at the right moment, offer clear paths forward, and handle errors with grace. This level of polish doesn't happen by accident—it's the result of careful consideration of every interaction point.

## Principles of Engaging UI

**Immediate Feedback**: Every action should have a reaction. Buttons should respond to hover and click. Forms should validate in real-time. Loading states should communicate progress.

**Clear Affordances**: Users should understand what's clickable, draggable, or interactive without experimentation. Visual cues guide behavior.

**Smooth Transitions**: Animation isn't decoration—it's communication. Transitions explain what's changing and maintain context during state changes.

## Designing for Delight

Beyond functionality, great interfaces create emotional connections. This might be through:

- Thoughtful microinteractions
- Personality in copy and messaging  
- Unexpected but useful features
- Beautiful, confident visual design

The goal is to make users feel capable and in control, not confused or overwhelmed.`,
    excerpt: 'Creating user interfaces that feel intuitive and delightful through thoughtful interaction design and attention to detail.',
    featuredImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80',
    authorId: 'demo-user-2',
    author: {
      id: 'demo-user-2',
      email: 'james@blog.com',
      name: 'James Chen',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=James Chen',
      createdAt: new Date('2024-02-01'),
    },
    published: true,
    readTime: 4,
    createdAt: new Date('2024-03-08T09:15:00'),
    updatedAt: new Date('2024-03-08T09:15:00'),
  },
];

class PostStore {
  private posts: Post[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      this.posts = JSON.parse(stored).map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        author: p.author ? {
          ...p.author,
          createdAt: new Date(p.author.createdAt),
        } : undefined,
      }));
    } else {
      this.posts = initialPosts;
      this.saveToStorage();
    }
  }

  private saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.posts));
  }

  getAllPosts(publishedOnly = true): Post[] {
    return this.posts
      .filter(p => !publishedOnly || p.published)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getPostById(id: string): Post | undefined {
    return this.posts.find(p => p.id === id);
  }

  getPostsByAuthor(authorId: string): Post[] {
    return this.posts
      .filter(p => p.authorId === authorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  createPost(input: CreatePostInput, authorId: string, author?: any): Post {
    const newPost: Post = {
      id: Math.random().toString(36).substr(2, 9),
      ...input,
      authorId,
      author,
      readTime: this.calculateReadTime(input.content),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.posts.push(newPost);
    this.saveToStorage();
    return newPost;
  }

  updatePost(input: UpdatePostInput): Post | null {
    const index = this.posts.findIndex(p => p.id === input.id);
    if (index === -1) return null;

    const updated: Post = {
      ...this.posts[index],
      ...input,
      readTime: input.content 
        ? this.calculateReadTime(input.content)
        : this.posts[index].readTime,
      updatedAt: new Date(),
    };

    this.posts[index] = updated;
    this.saveToStorage();
    return updated;
  }

  deletePost(id: string): boolean {
    const index = this.posts.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.posts.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  private calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  }
}

export const postStore = new PostStore();
