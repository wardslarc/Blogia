import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PenLine, LogOut, LayoutDashboard, Newspaper, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { AuthModal } from '@/components/auth/AuthModal';

export const Navigation = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isOnFeed = location.pathname === '/feed';
  const isOnDashboard = location.pathname === '/dashboard';

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/');
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            to="/" 
            className="font-fraunces text-2xl font-semibold hover:text-primary transition-colors"
          >
            Blogia
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              isOnDashboard ? (
                <Button
                  onClick={() => navigate('/feed')}
                  variant="outline"
                  className="font-inter font-medium gap-2"
                >
                  <Newspaper className="w-4 h-4" />
                  Blog Feed
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="font-inter font-medium gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              )
            )}

            {isLoading ? (
              <div className="w-20 h-10 bg-muted rounded animate-pulse" />
            ) : user ? (
              <>
                <Button
                  onClick={() => navigate('/editor')}
                  className="bg-primary hover:bg-[#B23E15] font-inter font-medium gap-2"
                >
                  <PenLine className="w-4 h-4" />
                  New Post
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-primary text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-secondary">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                variant="outline"
                className="font-inter font-medium border-primary text-primary hover:bg-primary hover:text-white"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => navigate('/dashboard')}
      />
    </>
  );
};
