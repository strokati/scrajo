import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ExternalLink, Star, ThumbsUp, XCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Job } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface JobCardProps {
  job: Job;
  onStatusChange?: (jobId: string, status: string) => void;
  formatRelativeDate?: (dateStr: string) => string;
}

const statusBadgeVariant: Record<string, 'new' | 'saved' | 'interested' | 'applied' | 'rejected' | 'outline'> = {
  NEW: 'new',
  VIEWED: 'outline',
  SAVED: 'saved',
  INTERESTED: 'interested',
  APPLIED: 'applied',
  REJECTED: 'rejected',
};

function defaultRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay < 1) {
    if (diffHr < 1) {
      if (diffMin < 1) return 'just now';
      return `${diffMin} min ago`;
    }
    return `${diffHr}h ago`;
  }
  if (diffDay === 1) return '1 day ago';
  if (diffDay < 30) return `${diffDay} days ago`;
  const diffWeeks = Math.floor(diffDay / 7);
  if (diffWeeks === 1) return '1 week ago';
  return `${diffWeeks} weeks ago`;
}

export function JobCard({ job, onStatusChange, formatRelativeDate }: JobCardProps) {
  const queryClient = useQueryClient();

  const formatDate = formatRelativeDate ?? defaultRelativeDate;

  const handleStatusUpdate = useCallback(
    async (status: string) => {
      if (onStatusChange) {
        onStatusChange(job.id, status);
        return;
      }

      // Snapshot previous data for rollback
      const previousQueries = queryClient.getQueriesData<{ data: Job[] }>({
        queryKey: ['jobs'],
      });

      // Optimistically update cache
      queryClient.setQueriesData<{ data: Job[] }>({ queryKey: ['jobs'] }, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((j) =>
            j.id === job.id ? { ...j, status: status as Job['status'] } : j,
          ),
        };
      });

      try {
        await api.updateJobStatus(job.id, status);
      } catch {
        // Rollback on error
        for (const [queryKey, data] of previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      } finally {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }
    },
    [job.id, onStatusChange, queryClient],
  );

  const isCurrentStatus = (status: string) => job.status === status;

  return (
    <Card className="mb-3 transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold">{job.title}</h3>
            <p className="text-sm text-muted-foreground">
              {job.company}
              {job.location && <span className="ml-1"> &middot; {job.location}</span>}
            </p>
          </div>
          <Badge variant={statusBadgeVariant[job.status] ?? 'outline'}>{job.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {job.salary && (
            <span className="font-medium text-muted-foreground">{job.salary}</span>
          )}
          {job.siteName && (
            <span className="text-xs text-muted-foreground">via {job.siteName}</span>
          )}
          {job.postedDate && (
            <span className="text-xs text-muted-foreground">{formatDate(job.postedDate)}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className={isCurrentStatus('SAVED') ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' : ''}
            onClick={() => handleStatusUpdate('SAVED')}
            disabled={isCurrentStatus('SAVED')}
          >
            <Star className="mr-1 h-3.5 w-3.5" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={isCurrentStatus('INTERESTED') ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : ''}
            onClick={() => handleStatusUpdate('INTERESTED')}
            disabled={isCurrentStatus('INTERESTED')}
          >
            <ThumbsUp className="mr-1 h-3.5 w-3.5" />
            Interested
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={isCurrentStatus('APPLIED') ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : ''}
            onClick={() => handleStatusUpdate('APPLIED')}
            disabled={isCurrentStatus('APPLIED')}
          >
            <CheckCircle className="mr-1 h-3.5 w-3.5" />
            Applied
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={isCurrentStatus('REJECTED') ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' : ''}
            onClick={() => handleStatusUpdate('REJECTED')}
            disabled={isCurrentStatus('REJECTED')}
          >
            <XCircle className="mr-1 h-3.5 w-3.5" />
            Rejected
          </Button>

          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(job.url, '_blank')}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Open &amp; Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
