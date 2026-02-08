'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, Skeleton, Toaster } from '@/components/ui';
import { SearchInput } from '@/components/common/SearchInput';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface EventOption {
  id: string;
  slug: string;
  title?: string;
}

interface Signup {
  id: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  formData: Array<{ name: string; type: string; value: string | number | boolean; label?: string }>;
  userEmail?: string;
  userName?: string;
  submittedAt: string;
  confirmationNumber: string;
  status: string;
  notes?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export default function EventSignupsPage() {
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();

  const [signups, setSignups] = useState<Signup[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [viewPopoverOpen, setViewPopoverOpen] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [eventId, setEventId] = useState('all');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((p) => ({ ...p, currentPage: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPagination((p) => ({ ...p, currentPage: 1 }));
  }, [status, eventId, sortBy, sortOrder]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/events?limit=500');
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.events || []).map((e: any) => ({
        id: e.id,
        slug: e.slug,
        title: e.title?.en || e.title?.he || e.slug,
      }));
      setEvents(list);
    } catch (e) {
      console.warn('Failed to fetch events for filter', e);
    }
  }, []);

  const fetchSignups = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(status && status !== 'all' && { status }),
        ...(eventId && eventId !== 'all' && { eventId }),
      });
      const res = await fetch(`/api/admin/event-signups?${params}`);
      if (!res.ok) throw new Error('Failed to fetch signups');
      const data = await res.json();
      setSignups(data.signups || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load signups',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, debouncedSearch, status, eventId, sortBy, sortOrder, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchSignups();
  }, [fetchSignups]);

  const handleStatusChange = async (signupId: string, newStatus: string) => {
    try {
      setUpdatingStatus(signupId);
      const res = await fetch(`/api/admin/event-signups/${signupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      setSignups((prev) =>
        prev.map((s) => (s.id === signupId ? { ...s, status: newStatus } : s))
      );
      if (viewPopoverOpen === signupId) setViewPopoverOpen(null);
      toast({
        title: 'Success',
        description: 'Signup status updated',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'error',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (s: string) => {
    const map: Record<string, string> = {
      confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400',
      cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400',
    };
    return map[s] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
  };

  return (
    <div className="pt-16 space-y-6">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">
            Event Signups
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            View and manage event registration submissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="gray"
            onClick={() => {
              setLoading(true);
              fetchSignups();
              toast({ title: 'Refreshed', description: 'List updated', variant: 'info' });
            }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="gray"
            onClick={() => router.push(`/${locale}/admin/events`)}
          >
            Events
          </Button>
        </div>
      </div>

      <Card className="!p-0 bg-card dark:bg-card-dark">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder="Search by confirmation #, email, or name..."
                className="!max-w-full"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title || e.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(v) => {
                  const [by, order] = v.split('-');
                  setSortBy(by);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submittedAt-desc">Newest first</SelectItem>
                  <SelectItem value="submittedAt-asc">Oldest first</SelectItem>
                  <SelectItem value="confirmationNumber-asc">Confirmation # A–Z</SelectItem>
                  <SelectItem value="userEmail-asc">Email A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Confirmation #</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : signups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                No signups found
              </TableCell>
            </TableRow>
          ) : (
            signups.map((signup) => (
              <TableRow key={signup.id}>
                <TableCell className="font-mono text-sm">
                  {signup.confirmationNumber}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => router.push(`/${locale}/admin/events/${signup.eventId}/edit`)}
                      className="text-left text-sm font-medium text-brand-main dark:text-brand-dark hover:underline"
                    >
                      {signup.eventTitle || signup.eventSlug}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/${locale}/admin/events/${signup.eventId}/signup-form`)}
                      className="text-left text-xs text-text-secondary dark:text-text-secondary-dark hover:underline"
                    >
                      Edit signup form
                    </button>
                  </div>
                </TableCell>
                <TableCell>{signup.userName || '—'}</TableCell>
                <TableCell className="hidden md:table-cell">{signup.userEmail || '—'}</TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  {formatDate(signup.submittedAt)}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(signup.status)}`}>
                    {signup.status}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Popover
                    open={viewPopoverOpen === signup.id}
                    onOpenChange={(open) => setViewPopoverOpen(open ? signup.id : null)}
                  >
                    <PopoverContent className="w-[400px] max-h-[80vh] overflow-y-auto p-0" align="end">
                      <div className="p-4 space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-text dark:text-text-dark">
                            Signup details
                          </h3>
                          <p className="text-sm text-text-secondary dark:text-text-secondary-dark font-mono">
                            {signup.confirmationNumber}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-text-secondary dark:text-text-secondary-dark">Event</span>
                          <span>{signup.eventTitle || signup.eventSlug}</span>
                          <span className="text-text-secondary dark:text-text-secondary-dark">Submitted</span>
                          <span>{formatDate(signup.submittedAt)}</span>
                          <span className="text-text-secondary dark:text-text-secondary-dark">Status</span>
                          <span>{signup.status}</span>
                        </div>
                        {signup.formData && signup.formData.length > 0 && (
                          <div className="border-t border-border dark:border-border-dark pt-3">
                            <p className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                              Form data
                            </p>
                            <dl className="space-y-1 text-sm">
                              {signup.formData.map((f) => (
                                <div key={f.name} className="flex gap-2">
                                  <dt className="text-text-secondary dark:text-text-secondary-dark shrink-0">
                                    {f.label || f.name}:
                                  </dt>
                                  <dd className="break-all">
                                    {String(f.value)}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}
                        {signup.status !== 'cancelled' && (
                          <div className="pt-2 border-t border-border dark:border-border-dark">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleStatusChange(signup.id, 'cancelled')}
                              disabled={updatingStatus === signup.id}
                            >
                              {updatingStatus === signup.id ? 'Updating...' : 'Cancel signup'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                    <Button
                      variant="gray"
                      size="sm"
                      onClick={() => setViewPopoverOpen(viewPopoverOpen === signup.id ? null : signup.id)}
                    >
                      View
                    </Button>
                  </Popover>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-text-secondary dark:text-text-secondary-dark">
          <span>
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="gray"
              size="sm"
              disabled={pagination.currentPage <= 1 || loading}
              onClick={() => setPagination((p) => ({ ...p, currentPage: p.currentPage - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="gray"
              size="sm"
              disabled={pagination.currentPage >= pagination.totalPages || loading}
              onClick={() => setPagination((p) => ({ ...p, currentPage: p.currentPage + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
