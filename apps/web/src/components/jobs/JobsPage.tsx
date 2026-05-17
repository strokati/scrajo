import { useEffect, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Briefcase, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useJobs, useUpdateJobStatus } from '@/hooks/use-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { JobCard } from './JobCard';

type StatusFilter = 'all' | 'NEW' | 'SAVED' | 'INTERESTED' | 'APPLIED' | 'REJECTED';
type DateFilter = 'all' | 'last24h' | 'last7days';

function formatRelativeDate(dateStr: string): string {
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

export function JobsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // 300ms debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Build API params from filter state
  const params = useMemo(() => {
    const p: Record<string, string> = {
      page: '1',
      limit: '50',
    };
    if (debouncedSearch) p.search = debouncedSearch;
    if (statusFilter !== 'all') p.status = statusFilter;

    if (dateFilter === 'last24h') {
      const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
      p.postedAfter = date.toISOString();
    } else if (dateFilter === 'last7days') {
      const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      p.postedAfter = date.toISOString();
    }

    return p;
  }, [debouncedSearch, statusFilter, dateFilter]);

  const { data: response, isLoading, isError } = useJobs(params);
  const updateJobStatus = useUpdateJobStatus();

  const jobs = response?.data ?? [];
  const total = response?.total ?? 0;

  // Count new jobs posted today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const newTodayCount = jobs.filter(
    (j) => j.status === 'NEW' && j.createdAt && new Date(j.createdAt) >= todayStart,
  ).length;

  // Virtualizer setup
  const parentRef = useState<HTMLDivElement | null>(null)[0];
  const [, setParentEl] = useState<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => parentRef,
    estimateSize: () => 160,
    overscan: 5,
  });

  const handleStatusChange = (jobId: string, status: string) => {
    updateJobStatus.mutate(
      { id: jobId, status },
      {
        onSuccess: () => {
          toast.success(`Job marked as ${status}`);
        },
        onError: () => {
          toast.error('Failed to update job status');
        },
      },
    );
  };

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title, company, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="all">All Statuses</option>
          <option value="NEW">New</option>
          <option value="SAVED">Saved</option>
          <option value="INTERESTED">Interested</option>
          <option value="APPLIED">Applied</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="all">All Time</option>
          <option value="last24h">Last 24 Hours</option>
          <option value="last7days">Last 7 Days</option>
        </select>
      </div>

      {/* Stats Banner */}
      {newTodayCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 dark:bg-blue-950">
          <Badge variant="new">{newTodayCount}</Badge>
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {newTodayCount === 1 ? 'new job' : 'new jobs'} today
          </span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/3" />
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <p className="text-sm text-destructive">Failed to load jobs. Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium">No jobs found</p>
            <p className="text-sm text-muted-foreground">
              Add a site to start scraping job listings
            </p>
          </div>
        </div>
      )}

      {/* Virtualized Jobs List */}
      {!isLoading && !isError && jobs.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {total} {total === 1 ? 'job' : 'jobs'} found
        </div>
      )}
      {!isLoading && !isError && jobs.length > 0 && (
        <div
          ref={(el) => {
            setParentEl(el);
          }}
          className="flex-1 overflow-y-auto"
          style={{ contain: 'strict' }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const job = jobs[virtualRow.index];
              return (
                <div
                  key={job.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <JobCard
                    job={job}
                    onStatusChange={handleStatusChange}
                    formatRelativeDate={formatRelativeDate}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
