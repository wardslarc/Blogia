import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, PenTool, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/layout/Navigation';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAppSelector } from '@/store/hooks';

export const LandingPage = () => {
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Auto-redirect to dashboard if user is logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      setShowAuthModal(true);
    }
  };

  const features = [
    {
      icon: PenTool,
      title: 'Distraction-Free Editor',
      description: 'Write in a beautiful, focused environment designed to let your words flow naturally.',
    },
    {
      icon: BookOpen,
      title: 'Reader-First Design',
      description: 'Your content is presented with elegant typography and generous whitespace for maximum readability.',
    },
    {
      icon: Sparkles,
      title: 'Simple Publishing',
      description: 'Go from draft to published in seconds. No complex workflows, just pure writing and sharing.',
    },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden mesh-gradient grain-texture">
        <div className="container mx-auto px-6 py-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="font-fraunces text-hero text-foreground mb-6">
              Write. Publish. <span className="text-primary">Inspire.</span>
            </h1>
            <p className="text-xl md:text-2xl text-secondary mb-12 max-w-2xl mx-auto leading-relaxed">
              A modern publishing platform for writers who believe in the power of words. 
              Create beautiful stories without the noise.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-primary hover:bg-[#B23E15] text-white font-inter font-medium text-lg px-8 py-6 gap-2 group"
              >
                Start Writing
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/feed')}
                className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-inter font-medium text-lg px-8 py-6"
              >
                Browse Stories
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="font-fraunces text-5xl font-semibold mb-6">
              Everything you need to write
            </h2>
            <p className="text-xl text-secondary max-w-2xl mx-auto">
              Focused tools that help you create your best work without getting in the way.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-fraunces text-2xl font-semibold mb-4">
                  {feature.title}
                </h3>
                <p className="text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-foreground text-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="font-fraunces text-5xl font-semibold mb-6">
              Ready to share your story?
            </h2>
            <p className="text-xl text-white/80 mb-12 leading-relaxed">
              Join a community of writers who value craft, clarity, and the written word.
            </p>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-primary hover:bg-[#B23E15] text-white font-inter font-medium text-lg px-8 py-6 gap-2 group"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-border">
        <div className="container mx-auto px-6">
          <div className="text-center text-secondary">
            <p className="font-fraunces text-2xl font-semibold mb-2 text-foreground">
              Blogia
            </p>
            <p className="text-sm">
              A modern platform for thoughtful writing. © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => navigate('/dashboard')}
      />
    </div>
  );
};
