import { Link } from 'react-router-dom';
import { Music, Upload, User, LogOut } from 'lucide-react';
import { useQuery } from "convex/react";
import { api } from '../../../convex/_generated/api';
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from '../ui/Button';

export function Navbar() {
  const viewer = useQuery(api.users.viewer);
  const isAuthenticated = viewer !== null && viewer !== undefined;
  const isLoading = viewer === undefined;
  const { signOut } = useAuthActions();

  return (
    <nav className="border-b border-studio-gray bg-studio-darker/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Music className="w-6 h-6 text-studio-accent" />
            <span className="text-xl font-bold gradient-text">SoundSketch</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <>
                    <Link to="/upload">
                      <Button size="sm" className="flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
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
        </div>
      </div>
    </nav>
  );
}
