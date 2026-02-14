import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  isMobileOverlay?: boolean;
  onClose?: () => void;
}

export function SearchBar({ isMobileOverlay = false, onClose }: SearchBarProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(queryParam);
  const debouncedValue = useDebounce(inputValue, 400);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMobileOverlay && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMobileOverlay]);

  // Sync input when URL param changes externally (e.g. navigating to /)
  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  // Navigate on debounced value change
  useEffect(() => {
    const trimmed = debouncedValue.trim();
    if (trimmed && trimmed !== queryParam) {
      navigate(`/?q=${encodeURIComponent(trimmed)}`, { replace: true });
    } else if (!trimmed && queryParam) {
      navigate('/', { replace: true });
    }
  }, [debouncedValue, navigate, queryParam]);

  const handleClear = () => {
    setInputValue('');
    navigate('/');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = inputValue.trim();
      if (trimmed) {
        navigate(`/?q=${encodeURIComponent(trimmed)}`);
      } else {
        navigate('/');
      }
    }
    if (e.key === 'Escape') {
      if (isMobileOverlay && onClose) {
        onClose();
      } else {
        handleClear();
      }
    }
  };

  return (
    <div className={cn(
      "relative flex-1",
      isMobileOverlay ? "flex" : "hidden sm:flex max-w-md mx-4"
    )}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-secondary pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search tracks..."
        className="w-full pl-10 pr-8 py-2 bg-studio-dark border border-studio-gray rounded-lg text-sm text-studio-text-primary placeholder:text-studio-text-secondary focus:ring-2 focus:ring-studio-accent focus:outline-none transition-all duration-200"
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-studio-text-secondary hover:text-studio-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
