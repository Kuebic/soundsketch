import { ChevronDown } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Version, VersionId } from '@/types';

interface VersionSelectorProps {
  versions: Version[];
  currentVersionId: VersionId;
  onVersionChange: (versionId: VersionId) => void;
}

/** Version dropdown. Change notes for the selected version are rendered by the page. */
export function VersionSelector({
  versions,
  currentVersionId,
  onVersionChange,
}: VersionSelectorProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <label
        htmlFor="version-select"
        className="text-sm text-studio-text-secondary mono hidden sm:inline flex-shrink-0"
      >
        Version:
      </label>
      <div className="relative min-w-0 flex-1 sm:flex-initial">
        <select
          id="version-select"
          value={currentVersionId}
          onChange={(e) => onVersionChange(e.target.value as VersionId)}
          className="input appearance-none w-full sm:w-auto sm:min-w-[220px] max-w-full pr-9 py-1.5 text-sm cursor-pointer truncate"
          aria-label="Version"
        >
          {versions.map((version) => (
            <option key={version._id} value={version._id}>
              {version.versionName} · {formatRelativeTime(version._creationTime)}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-secondary pointer-events-none" />
      </div>
    </div>
  );
}
