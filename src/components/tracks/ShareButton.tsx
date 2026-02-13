import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { generateShareableLink } from '@/lib/utils';

interface ShareButtonProps {
  shareableId: string;
}

export function ShareButton({ shareableId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const link = generateShareableLink(shareableId);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-1" />
          Copied!
        </>
      ) : (
        <>
          <Link2 className="w-4 h-4 mr-1" />
          Share
        </>
      )}
    </Button>
  );
}
