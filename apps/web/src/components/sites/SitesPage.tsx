import { useState } from 'react';
import { Plus, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSites, useDeleteSite, useTriggerScrape } from '@/hooks/use-api';
import type { Site } from '@/lib/api-client';
import { AddSiteDialog } from './AddSiteDialog';

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusVariant(
  status: string,
): 'idle' | 'running' | 'success' | 'error' | 'requires_manual' {
  if (
    status === 'idle' ||
    status === 'running' ||
    status === 'success' ||
    status === 'error' ||
    status === 'requires_manual'
  ) {
    return status;
  }
  return 'idle';
}

export function SitesPage() {
  const { data, isLoading } = useSites();
  const deleteSite = useDeleteSite();
  const triggerScrape = useTriggerScrape();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    siteId: string | null;
    siteName: string;
  }>({ open: false, siteId: null, siteName: '' });

  const sites = data ?? [];

  function handleScrape(site: Site) {
    triggerScrape.mutate(
      { id: site.id },
      {
        onSuccess: () => toast.success(`Scrape triggered for "${site.name}"`),
        onError: (err) => toast.error(`Failed to trigger scrape: ${err.message}`),
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteConfirm.siteId) return;
    deleteSite.mutate(deleteConfirm.siteId, {
      onSuccess: () => {
        toast.success('Site deleted');
        setDeleteConfirm({ open: false, siteId: null, siteName: '' });
      },
      onError: (err) => toast.error(`Failed to delete: ${err.message}`),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sites</h1>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Site
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">URL</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Schedule</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Last Scraped</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-8 w-20" />
                  </td>
                </tr>
              ))
            ) : sites.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No sites added yet
                </td>
              </tr>
            ) : (
              sites.map((site) => {
                const lastScrapeStatus = site.lastScrape?.status ?? 'idle';
                return (
                  <tr key={site.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{site.name}</td>
                    <td className="max-w-[300px] truncate px-4 py-3 text-sm text-muted-foreground">
                      {site.baseUrl}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {site.scraperType === 'playwright' ? 'daily' : 'daily'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(site.lastScrape?.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(lastScrapeStatus)}>
                        {lastScrapeStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleScrape(site)}
                          disabled={triggerScrape.isPending}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Scrape Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDeleteConfirm({
                              open: true,
                              siteId: site.id,
                              siteName: site.name,
                            })
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AddSiteDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      <Dialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          setDeleteConfirm((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Site</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirm.siteName}&rdquo;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteConfirm({ open: false, siteId: null, siteName: '' })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteSite.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
