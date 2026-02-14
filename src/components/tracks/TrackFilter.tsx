import { Search, X } from 'lucide-react';

interface TrackFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TrackFilter({ value, onChange, placeholder = 'Filter tracks...' }: TrackFilterProps) {
  return (
    <div className="relative max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-secondary pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-8 py-2 bg-studio-dark border border-studio-gray rounded-lg text-sm text-studio-text-primary placeholder:text-studio-text-secondary focus:ring-2 focus:ring-studio-accent focus:outline-none transition-all duration-200"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-studio-text-secondary hover:text-studio-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
