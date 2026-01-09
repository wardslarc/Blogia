# Blogia

A modern blogging platform built with React, TypeScript, and Supabase. Create, share, and discover stories with a beautiful, responsive interface.

![Blogia](public/blogia.png)

## Features

- **Authentication** - Secure user authentication with Supabase Auth (email/password, social login)
- **Rich Text Editor** - Create beautiful blog posts with a powerful editor
- **Social Features** - Like, comment, and bookmark your favorite posts
- **Profile Pages** - Customizable user profiles with avatar upload
- **Dashboard** - Manage your posts with an intuitive dashboard
- **Responsive Design** - Optimized for all devices with Tailwind CSS
- **Dark/Light Mode** - Theme support for comfortable reading

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/wardslarc/Blogia.git
   cd Blogia
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up your Supabase database with the required tables (see Database Setup below)

5. Start the development server:
   ```bash
   npm run dev
   ```

### Database Setup

Create the following tables in your Supabase dashboard:

#### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Posts Table
```sql
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Likes Table
```sql
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

#### Comments Table
```sql
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Bookmarks Table
```sql
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
```

### Supabase Storage

Create a storage bucket named `post-images` for storing post cover images and user avatars.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── layout/        # Navigation, headers, footers
│   └── ui/            # Reusable UI components (shadcn/ui)
├── contexts/          # React contexts (Auth)
├── hooks/             # Custom React hooks
├── lib/               # Utilities and services
│   ├── postService.ts # Database operations
│   ├── supabase.ts    # Supabase client
│   └── utils.ts       # Helper functions
├── pages/             # Page components
│   ├── BlogFeed.tsx   # Public blog feed
│   ├── Dashboard.tsx  # User dashboard
│   ├── LandingPage.tsx
│   ├── PostDetailPage.tsx
│   ├── PostEditor.tsx
│   └── ProfilePage.tsx
└── types/             # TypeScript types
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) for the styling system
