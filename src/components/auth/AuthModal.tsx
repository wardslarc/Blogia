import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppDispatch } from '@/store/hooks';
import { login, signup } from '@/store/slices/authSlice';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal = ({ isOpen, onClose, onSuccess }: AuthModalProps) => {
  const dispatch = useAppDispatch();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!loginEmail) {
      newErrors.loginEmail = 'Email is required';
    } else if (!validateEmail(loginEmail)) {
      newErrors.loginEmail = 'Invalid email address';
    }

    if (!loginPassword) {
      newErrors.loginPassword = 'Password is required';
    } else if (loginPassword.length < 6) {
      newErrors.loginPassword = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const result = await dispatch(login({ email: loginEmail, password: loginPassword })).unwrap();
      if (result) {
        setLoginEmail('');
        setLoginPassword('');
        onClose();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Login failed. Please try again.';
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!signupName) {
      newErrors.signupName = 'Name is required';
    } else if (signupName.length < 2) {
      newErrors.signupName = 'Name must be at least 2 characters';
    }

    if (!signupEmail) {
      newErrors.signupEmail = 'Email is required';
    } else if (!validateEmail(signupEmail)) {
      newErrors.signupEmail = 'Invalid email address';
    }

    if (!signupPassword) {
      newErrors.signupPassword = 'Password is required';
    } else if (signupPassword.length < 6) {
      newErrors.signupPassword = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const result = await dispatch(signup({ email: signupEmail, password: signupPassword, name: signupName })).unwrap();
      if (result) {
        setSignupEmail('');
        setSignupPassword('');
        setSignupName('');
        onClose();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Signup error:', error);
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Signup failed. Please try again.';
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full max-w-md bg-white rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-8"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-secondary hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-fraunces text-3xl font-semibold mb-6">Welcome</h2>

            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {errors.general}
              </div>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="font-inter font-medium">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setErrors({ ...errors, loginEmail: '' });
                      }}
                      className={errors.loginEmail ? 'border-red-500' : ''}
                    />
                    {errors.loginEmail && (
                      <p className="text-sm text-red-600">{errors.loginEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="font-inter font-medium">
                      Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setErrors({ ...errors, loginPassword: '' });
                      }}
                      className={errors.loginPassword ? 'border-red-500' : ''}
                    />
                    {errors.loginPassword && (
                      <p className="text-sm text-red-600">{errors.loginPassword}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-[#B23E15] font-inter font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="font-inter font-medium">
                      Name
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your name"
                      value={signupName}
                      onChange={(e) => {
                        setSignupName(e.target.value);
                        setErrors({ ...errors, signupName: '' });
                      }}
                      className={errors.signupName ? 'border-red-500' : ''}
                    />
                    {errors.signupName && (
                      <p className="text-sm text-red-600">{errors.signupName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="font-inter font-medium">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => {
                        setSignupEmail(e.target.value);
                        setErrors({ ...errors, signupEmail: '' });
                      }}
                      className={errors.signupEmail ? 'border-red-500' : ''}
                    />
                    {errors.signupEmail && (
                      <p className="text-sm text-red-600">{errors.signupEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="font-inter font-medium">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => {
                        setSignupPassword(e.target.value);
                        setErrors({ ...errors, signupPassword: '' });
                      }}
                      className={errors.signupPassword ? 'border-red-500' : ''}
                    />
                    {errors.signupPassword && (
                      <p className="text-sm text-red-600">{errors.signupPassword}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-[#B23E15] font-inter font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
