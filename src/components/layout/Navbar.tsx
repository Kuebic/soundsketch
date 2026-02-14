import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, Upload, User, LogOut, Search, ArrowLeft } from 'lucide-react';
import { useQuery } from "convex/react";
import { api } from '../../../convex/_generated/api';
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from '../ui/Button';
import { SearchBar } from './SearchBar';

export function Navbar() {
  const viewer = useQuery(api.users.viewer);
  const isAuthenticated = viewer !== null && viewer !== undefined;
  const isLoading = viewer === undefined;
  const { signOut } = useAuthActions();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileSearchOpen(false);
  }, [location.pathname]);

  return (
    <nav className="border-b border-studio-gray bg-studio-darker/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {mobileSearchOpen ? (
            <div className="flex items-center w-full gap-3">
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="shrink-0 text-studio-text-secondary hover:text-studio-text-primary transition-colors"
                aria-label="Close search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <SearchBar
                isMobileOverlay
                onClose={() => setMobileSearchOpen(false)}
              />
            </div>
          ) : (
            <>
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-2">
                <Music className="w-6 h-6 text-studio-accent" />
                <span className="text-xl font-bold gradient-text">SoundSketch</span>
              </Link>

              {/* Search Bar */}
              <SearchBar />

              {/* Actions */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={() => setMobileSearchOpen(true)}
                  className="sm:hidden text-studio-text-secondary hover:text-studio-text-primary transition-colors p-1.5"
                  aria-label="Open search"
                >
                  <Search className="w-5 h-5" />
                </button>

                {!isLoading && (
                  <>
                    {isAuthenticated ? (
                      <>
                        <Link to="/upload">
                          <Button size="sm" className="flex items-center space-x-2">
                            <Upload className="w-4 h-4" />
                            <span className="hidden sm:inline">Upload</span>
                          </Button>
                        </Link>
                        <Link to="/profile">
                          <Button variant="secondary" size="sm">
                            <User className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void signOut()}
                        >
                          <LogOut className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Link to="/login">
                        <Button size="sm">Login</Button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
