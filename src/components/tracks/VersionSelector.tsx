import { ChevronDown } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Version, VersionId } from '@/types';

interface VersionSelectorProps {
  versions: Version[];
  currentVersionId: VersionId;
  onVersionChange: (versionId: VersionId) => void;
}

export function VersionSelector({
  versions,
  currentVersionId,
  onVersionChange,
}: VersionSelectorProps) {
  const currentVersion = versions.find((v) => v._id === currentVersionId);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-studio-text-secondary mono">Version:</span>
      <div className="relative">
        <select
          value={currentVersionId}
          onChange={(e) => onVersionChange(e.target.value as VersionId)}
          className="input appearance-none pr-8 py-1.5 text-sm cursor-pointer"
        >
          {versions.map((version) => (
            <option key={version._id} value={version._id}>
              {version.versionName} — {formatRelativeTime(version._creationTime)}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-secondary pointer-events-none" />
      </div>
      {currentVersion?.changeNotes && (
        <span className="text-xs text-studio-text-secondary italic truncate max-w-xs">
          {currentVersion.changeNotes}
        </span>
      )}
    </div>
  );
}
