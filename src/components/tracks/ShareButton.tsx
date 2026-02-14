import { toast } from 'sonner';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { generateShareableLink } from '@/lib/utils';

interface ShareButtonProps {
  shareableId: string;
}

export function ShareButton({ shareableId }: ShareButtonProps) {
  const handleCopy = async () => {
    try {
      const link = generateShareableLink(shareableId);
      await navigator.clipboard.writeText(link);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleCopy}>
      <Link2 className="w-4 h-4 mr-1" />
      Share
    </Button>
  );
}
