import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSite } from '@/hooks/use-api';

interface AddSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSiteDialog({ open, onOpenChange }: AddSiteDialogProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const createSite = useCreateSite();

  function validateUrl(value: string): boolean {
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      setUrlError('URL must start with http:// or https://');
      return false;
    }
    setUrlError('');
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    if (!validateUrl(url.trim())) return;

    createSite.mutate(
      {
        name: name.trim(),
        baseUrl: url.trim(),
        scraperType: 'playwright',
      },
      {
        onSuccess: () => {
          toast.success('Site added successfully');
          setName('');
          setUrl('');
          setUrlError('');
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(`Failed to add site: ${err.message}`);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Site</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="site-name">Name</Label>
            <Input
              id="site-name"
              placeholder="e.g. LinkedIn Jobs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-url">URL</Label>
            <Input
              id="site-url"
              placeholder="https://example.com/jobs"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError('');
              }}
              required
            />
            {urlError && (
              <p className="text-sm text-destructive">{urlError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="scraper-type">Scraper Type</Label>
            <Input
              id="scraper-type"
              value="playwright"
              disabled
              className="bg-muted"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createSite.isPending}>
              {createSite.isPending ? 'Adding...' : 'Add Site'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
