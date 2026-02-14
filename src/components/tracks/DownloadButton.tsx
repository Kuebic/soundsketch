import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { VersionId } from '@/types';

interface DownloadButtonProps {
  versionId: VersionId;
  disabled?: boolean;
}

export function DownloadButton({ versionId, disabled }: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const getDownloadUrl = useAction(api.r2.getOriginalDownloadUrl);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const result = await getDownloadUrl({ versionId });

      if (!result) {
        toast.error('Download not available');
        return;
      }

      // Create temporary anchor and trigger download
      const a = document.createElement('a');
      a.href = result.downloadUrl;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('Download started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleDownload}
      disabled={disabled || downloading}
    >
      {downloading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span className="ml-1.5">Download</span>
    </Button>
  );
}
