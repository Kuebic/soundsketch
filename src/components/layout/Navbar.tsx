import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, Upload, User, LogOut, Search, ArrowLeft, ChevronDown } from 'lucide-react';
import { useQuery } from "convex/react";
import { api } from '../../../convex/_generated/api';
import { useAuthActions } from "@convex-dev/auth/react";
import { SearchBar } from './SearchBar';
import { cn } from '@/lib/utils';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio-darker';

const primaryNavLink = cn(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium',
  'bg-studio-accent text-white hover:bg-studio-accent/90 transition-all duration-200',
  focusRing
);

export function Navbar() {
  const viewer = useQuery(api.users.viewer);
  const isAuthenticated = viewer !== null && viewer !== undefined;
  const isLoading = viewer === undefined;
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const location = useLocation();
  const onUpload = location.pathname === '/upload';
  const onLogin = location.pathname === '/login';

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
                className={cn('shrink-0 rounded text-studio-text-secondary hover:text-studio-text-primary transition-colors', focusRing)}
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
              <Link to="/" className={cn('flex items-center space-x-2 rounded-lg', focusRing)}>
                <Music className="w-6 h-6 text-studio-accent" />
                <span className="text-xl font-bold gradient-text">SoundSketch</span>
              </Link>

              {/* Search Bar */}
              <SearchBar />

              {/* Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setMobileSearchOpen(true)}
                  className={cn('sm:hidden rounded-lg text-studio-text-secondary hover:text-studio-text-primary transition-colors p-1.5', focusRing)}
                  aria-label="Open search"
                >
                  <Search className="w-5 h-5" />
                </button>

                {!isLoading && (
                  <>
                    {isAuthenticated ? (
                      <>
                        <Link
                          to="/upload"
                          aria-label="Upload"
                          title="Upload a track"
                          aria-current={onUpload ? 'page' : undefined}
                          className={cn(
                            primaryNavLink,
                            onUpload && 'ring-2 ring-studio-accent/60 ring-offset-2 ring-offset-studio-darker'
                          )}
                        >
                          <Upload className="w-4 h-4" />
                          <span className="hidden sm:inline">Upload</span>
                        </Link>
                        <UserMenu name={viewer.name} />
                      </>
                    ) : (
                      !onLogin && (
                        <Link
                          to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
                          className={primaryNavLink}
                        >
                          Login
                        </Link>
                      )
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

/**
 * Profile and sign-out behind one trigger, so sign-out is never a stray tap
 * next to Profile on small screens.
 */
function UserMenu({ name }: { name?: string }) {
  const { signOut } = useAuthActions();
  const location = useLocation();
  const onProfile = location.pathname === '/profile';
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const getItems = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    // Move focus into the menu on open so keyboard users can immediately navigate.
    getItems()[0]?.focus();

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setOpen(false);
        return;
      }
      const items = getItems();
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown' && items.length > 0) {
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
      } else if (e.key === 'ArrowUp' && items.length > 0) {
        e.preventDefault();
        items[idx <= 0 ? items.length - 1 : idx - 1]?.focus();
      } else if (e.key === 'Home' && items.length > 0) {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === 'End' && items.length > 0) {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const itemStyles = cn(
    'flex w-full items-center gap-2 px-3 py-2 text-sm text-left rounded-md transition-colors',
    'hover:bg-studio-dark focus-visible:outline-none focus-visible:bg-studio-dark focus-visible:ring-1 focus-visible:ring-studio-accent'
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        title="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200',
          'bg-studio-darker border',
          onProfile
            ? 'border-studio-accent text-studio-accent'
            : 'border-studio-gray text-white hover:border-studio-accent/50',
          focusRing
        )}
      >
        <User className="w-4 h-4" />
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          className="absolute right-0 mt-2 w-48 p-1 rounded-lg border border-studio-gray bg-studio-darker shadow-xl shadow-black/40 animate-fade-in"
        >
          {name && (
            <p className="px-3 pt-1.5 pb-2 mb-1 border-b border-studio-gray text-xs text-studio-text-secondary truncate">
              {name}
            </p>
          )}
          <Link
            to="/profile"
            role="menuitem"
            tabIndex={-1}
            aria-label="Profile"
            title="Profile"
            aria-current={onProfile ? 'page' : undefined}
            className={cn(itemStyles, onProfile && 'text-studio-accent')}
          >
            <User className="w-4 h-4" />
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-label="Sign out"
            title="Sign out"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className={itemStyles}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
