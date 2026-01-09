import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Save, Upload, CheckCircle2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { PostService } from '@/lib/postService';
import { toast } from 'sonner';

export const PostEditor = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishStep, setPublishStep] = useState<'uploading' | 'saving' | 'done'>('uploading');

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    if (!user) {
      navigate('/');
      return;
    }

    // Load existing post for editing
    if (id) {
      loadPost();
    }
  }, [id, user, authLoading, navigate]);

  const loadPost = async () => {
    try {
      const post = await PostService.getPostById(id!);
      if (!post) {
        toast.error('Post not found');
        navigate('/dashboard');
        return;
      }

      if (post.authorId !== user?.id) {
        toast.error('You can only edit your own posts');
        navigate('/dashboard');
        return;
      }

      setTitle(post.title);
      setContent(post.content);
      setExcerpt(post.excerpt);
      setFeaturedImage(post.featuredImage || '');
      setPublished(post.published);
    } catch (error) {
      toast.error('Failed to load post');
      navigate('/dashboard');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image');
      return;
    }

    // Store the file for upload on save
    setFeaturedImageFile(file);
    
    // Create preview URL for display
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    toast.success(`Image selected: ${file.name}. Click Publish to upload.`);
  };

  const handleSave = async (showToast = true, uploadImage = false, isPublishing = false) => {
    if (!user) return;
    if (!title.trim()) {
      if (showToast) toast.error('Title is required');
      return;
    }

    setIsSaving(true);
    let finalFeaturedImage = featuredImage;
    const finalPublished = isPublishing ? true : published;

    try {
      // Upload image ONLY if explicitly requested (i.e., during publish)
      if (featuredImageFile && uploadImage) {
        setIsUploading(true);
        try {
          const imageUrl = await PostService.uploadImage(featuredImageFile);
          finalFeaturedImage = imageUrl;
          setFeaturedImage(imageUrl);
          setFeaturedImageFile(null);
          setImagePreview(null);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          toast.error('Image upload failed. Post saved without image.');
          setFeaturedImageFile(null);
        }
      }

      if (id) {
        // Update existing post
        await PostService.updatePost({
          id,
          title: title.trim(),
          content: content.trim(),
          excerpt: excerpt.trim() || content.trim().substring(0, 200),
          featuredImage: finalFeaturedImage ? finalFeaturedImage.trim() : undefined,
          published: finalPublished,
        });
      } else {
        // Create new post
        const newPost = await PostService.createPost(
          {
            title: title.trim(),
            content: content.trim(),
            excerpt: excerpt.trim() || content.trim().substring(0, 200),
            featuredImage: finalFeaturedImage ? finalFeaturedImage.trim() : undefined,
            published: finalPublished,
          },
          user.id,
          user
        );
        navigate(`/editor/${newPost.id}`, { replace: true });
      }

      setPublished(finalPublished);
      setLastSaved(new Date());
      if (showToast) {
        toast.success(finalPublished ? 'Post published!' : 'Draft saved');
      }
    } catch (error) {
      if (showToast) {
        toast.error('Failed to save post');
      }
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }

    setShowPublishModal(true);
    setPublishStep('uploading');
    
    try {
      await handleSave(false, true, true); // true = uploadImage, true = isPublishing
      setPublishStep('saving');
      
      // Wait a moment for the save to complete before showing done
      setTimeout(() => {
        setPublishStep('done');
        setTimeout(() => {
          setShowPublishModal(false);
          navigate('/dashboard');
        }, 2000);
      }, 500);
    } catch (error) {
      toast.error('Failed to publish post');
      setShowPublishModal(false);
      console.error('Publish error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-editor">
      {/* Publish Modal */}
      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publishing Post</DialogTitle>
            <DialogDescription>
              {publishStep === 'done'
                ? 'Your post has been published successfully!'
                : 'Please wait while we publish your post...'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Image Upload Step */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {publishStep === 'done' || (publishStep !== 'uploading' && featuredImageFile) ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : publishStep === 'uploading' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader className="w-6 h-6 text-blue-600" />
                  </motion.div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {featuredImageFile ? 'Uploading image' : 'No image selected'}
                </p>
                <p className="text-xs text-secondary">
                  {publishStep === 'done' && featuredImageFile ? 'Image uploaded' : 'Optional'}
                </p>
              </div>
            </div>

            {/* Save Step */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {publishStep === 'done' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : publishStep === 'saving' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader className="w-6 h-6 text-blue-600" />
                  </motion.div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Publishing post</p>
                <p className="text-xs text-secondary">
                  {publishStep === 'done'
                    ? 'Post published successfully'
                    : 'Saving to database...'}
                </p>
              </div>
            </div>
          </div>

          {publishStep === 'done' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center py-4"
            >
              <p className="text-sm text-green-600 font-medium">
                Redirecting to dashboard...
              </p>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Editor Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-secondary hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4">
            {lastSaved && (
              <span className="text-sm text-secondary">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Edit' : 'Preview'}
            </Button>

            <Button
              onClick={() => handleSave(true)}
              variant="outline"
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>

            <Button
              onClick={handlePublish}
              className="bg-primary hover:bg-[#B23E15] gap-2"
            >
              Publish
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {!showPreview ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto"
          >
            {/* Meta Information */}
            <div className="bg-white rounded-lg p-8 mb-6 border border-border shadow-sm">
              <h2 className="font-fraunces text-2xl font-semibold mb-6">
                Post Settings
              </h2>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="featured-image-upload" className="mb-2">
                    Featured Image
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="featured-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="flex-1"
                    />
                    {isUploading && (
                      <Button disabled className="gap-2 shrink-0">
                        <Upload className="w-4 h-4" />
                        Uploading...
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-secondary mt-1">
                    Max file size: 5MB. Supported formats: JPG, PNG, WebP, etc.
                  </p>
                  {featuredImage || imagePreview ? (
                    <div className="mt-4">
                      <img
                        src={imagePreview || featuredImage}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="excerpt" className="mb-2">
                    Excerpt
                  </Label>
                  <Textarea
                    id="excerpt"
                    placeholder="A brief summary of your post..."
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    rows={3}
                  />
                  <p className="text-sm text-secondary mt-1">
                    {excerpt.length > 0
                      ? `${excerpt.length} characters`
                      : 'Leave empty to auto-generate from content'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="published">Publish Status</Label>
                    <p className="text-sm text-secondary mt-1">
                      {published ? 'Visible to everyone' : 'Only visible to you'}
                    </p>
                  </div>
                  <Switch
                    id="published"
                    checked={published}
                    onCheckedChange={setPublished}
                  />
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="bg-white rounded-lg p-8 border border-border shadow-sm">
              <div className="mb-6">
                <Input
                  placeholder="Post Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-4xl font-fraunces font-semibold border-0 px-0 focus-visible:ring-0 placeholder:text-secondary/40"
                />
              </div>

              <Textarea
                placeholder="Start writing your story..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[600px] text-lg leading-relaxed border-0 px-0 focus-visible:ring-0 resize-none placeholder:text-secondary/40"
              />

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-secondary">
                  <strong>Tip:</strong> Use ## for headings, **text** for bold emphasis
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-3xl mx-auto bg-white rounded-lg p-12 border border-border shadow-sm"
          >
            <h1 className="font-fraunces text-article-title mb-8">
              {title || 'Untitled Post'}
            </h1>

            {featuredImage && (
              <img
                src={featuredImage}
                alt={title}
                className="w-full rounded-lg mb-8"
              />
            )}

            <div className="prose prose-lg max-w-none">
              {content.split('\n\n').map((paragraph, index) => {
                if (paragraph.startsWith('## ')) {
                  return (
                    <h2
                      key={index}
                      className="font-fraunces text-3xl font-semibold mt-12 mb-6"
                    >
                      {paragraph.replace('## ', '')}
                    </h2>
                  );
                }

                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return (
                    <p key={index} className="font-semibold text-foreground mb-4">
                      {paragraph.replace(/\*\*/g, '')}
                    </p>
                  );
                }

                return (
                  <p key={index} className="text-foreground mb-6 leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
