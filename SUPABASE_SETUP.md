# Supabase Setup Guide

## Step 1: Database Schema

Run the SQL script in [supabase_migration.sql](supabase_migration.sql) in your Supabase dashboard:

1. Go to https://app.supabase.com
2. Select your project
3. Go to SQL Editor
4. Create a new query
5. Copy and paste the entire contents of `supabase_migration.sql`
6. Click "Run"

This will create:
- `profiles` table for user information
- `posts` table for blog posts
- Proper indexes and Row Level Security (RLS) policies

## Step 2: Storage Bucket

Create a public storage bucket for post images:

1. Go to Storage in your Supabase dashboard
2. Click "Create a new bucket"
3. Name it: `post-images`
4. Make it **public** (toggle "Public bucket")
5. Click "Create bucket"

## Step 3: Environment Variables

Your `.env.local` file should already have:
```
VITE_SUPABASE_URL=https://ktzgsuejakvnzcmqyzgn.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Both values are already configured.

## Step 4: Test the Setup

1. Start your dev server: `npm run dev`
2. Sign up with a new account
3. Try creating a blog post
4. Upload an image (max 5MB)
5. Publish the post
6. Check your Supabase dashboard to verify:
   - User appears in `auth.users` and `profiles` table
   - Post appears in `posts` table
   - Image appears in `post-images` bucket

## Features

✅ **Image Upload**: Upload images directly to Supabase Storage
✅ **5MB Limit**: Enforced client-side with clear error messages
✅ **Real-time Sync**: Posts sync with Supabase database
✅ **Authentication**: Using Supabase Auth
✅ **Row Level Security**: Users can only see/edit their own posts and published posts
✅ **Auto-save**: Draft posts are saved automatically

## Troubleshooting

### Images won't upload
- Check that the `post-images` bucket exists and is **public**
- Verify the bucket name matches "post-images" exactly
- Check file size is under 5MB
- Ensure file is a valid image format

### Can't see other posts
- Make sure the post is published (toggle in editor)
- Check that RLS policies are correctly set up
- Verify the post's `published` field is `true` in the database

### Auth errors
- Confirm ANON_KEY is correct in `.env.local`
- Check that email confirmation is not required (disable in Auth → Settings)
- Verify users are being created in `auth.users` table

## File Size Limits

- **Max Image Size**: 5MB
- **Error Message**: "File size exceeds 5MB limit. File size: X.XXMB"

The limit is enforced in [src/lib/postService.ts](src/lib/postService.ts) in the `uploadImage` method.
