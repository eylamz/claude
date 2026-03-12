'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Card, CardContent, Skeleton, Toaster, Input, Textarea } from '@/components/ui';
import { SearchInput } from '@/components/common/SearchInput';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { MoreVertical, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/icons';
import { formatConfirmationNumber } from '@/lib/utils/formatConfirmationNumber';

const FETCH_LIMIT = 5000;
const PAGE_SIZE = 20;

const DEFAULT_COLUMN_IDS = [
  'confirmationNumber',
  'event',
  'userName',
  'userEmail',
  'submittedAt',
  'status',
] as const;

const COLUMNS_STORAGE_KEY = 'event-signups-column-order';

function getDefaultColumnOrder(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_COLUMN_IDS];
  try {
    const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_COLUMN_IDS];
}

interface EventOption {
  id: string;
  slug: string;
  /** Localized titles for display by locale */
  title?: { en?: string; he?: string };
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

/** Full signup from GET /api/admin/event-signups/[id] (includes ipAddress, userAgent) */
interface SignupDetail extends Signup {
  ipAddress?: string;
  userAgent?: string;
}

function matchesSearch(s: Signup, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.trim().toLowerCase();
  if (s.confirmationNumber?.toLowerCase().includes(lower)) return true;
  if (s.userEmail?.toLowerCase().includes(lower)) return true;
  if (s.userName?.toLowerCase().includes(lower)) return true;
  if (s.eventTitle?.toLowerCase().includes(lower)) return true;
  if (s.eventSlug?.toLowerCase().includes(lower)) return true;
  if (s.formData?.some((f) => String(f.value).toLowerCase().includes(lower))) return true;
  return false;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border dark:border-border-dark pt-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
      <span className="text-text-secondary dark:text-text-secondary-dark shrink-0">{label}</span>
      <span className={`break-all ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</span>
    </div>
  );
}

export default function EventSignupsPage() {
  const locale = useLocale();
  const t = useTranslations('admin');
  const router = useRouter();
  const { toast } = useToast();

  const BUILT_IN_COLUMNS = useMemo(
    (): { id: string; label: string }[] => [
      { id: 'confirmationNumber', label: t('eventSignups.colConfirmationNumber') },
      { id: 'event', label: t('eventSignups.colEvent') },
      { id: 'userName', label: t('eventSignups.colName') },
      { id: 'userEmail', label: t('eventSignups.colEmail') },
      { id: 'submittedAt', label: t('eventSignups.colSubmitted') },
      { id: 'status', label: t('eventSignups.colStatus') },
    ],
    [t]
  );

  const [allSignups, setAllSignups] = useState<Signup[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [viewModalSignupId, setViewModalSignupId] = useState<string | null>(null);
  const [viewDetails, setViewDetails] = useState<SignupDetail | null>(null);
  const [viewDetailsLoading, setViewDetailsLoading] = useState(false);
  const [editModalSignupId, setEditModalSignupId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<SignupDetail | null>(null);
  const [editDetailsLoading, setEditDetailsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [orderedColumnIds, setOrderedColumnIds] = useState<string[]>(DEFAULT_COLUMN_IDS as unknown as string[]);
  const draggedColumnIdRef = useRef<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [eventId, setEventId] = useState('all');
  const [sortBy, setSortBy] = useState<'submittedAt' | 'confirmationNumber' | 'userEmail'>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const formFieldColumns = useMemo(() => {
    const seen = new Map<string, string>();
    allSignups.forEach((s) => {
      s.formData?.forEach((f) => {
        if (f.name && !seen.has(f.name)) {
          seen.set(f.name, f.label || f.name);
        }
      });
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [allSignups]);

  const allColumnDefs = useMemo(
    () => [...BUILT_IN_COLUMNS, ...formFieldColumns],
    [formFieldColumns]
  );

  const persistColumnOrder = useCallback((ids: string[]) => {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(ids));
    } catch {}
  }, []);

  const toggleColumn = useCallback(
    (columnId: string) => {
      setOrderedColumnIds((prev) => {
        const next = prev.includes(columnId)
          ? prev.filter((id) => id !== columnId)
          : [...prev, columnId];
        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder]
  );

  const handleColumnDragStart = useCallback((columnId: string) => {
    draggedColumnIdRef.current = columnId;
    setDraggedColumnId(columnId);
  }, []);

  const handleColumnDragEnd = useCallback(() => {
    draggedColumnIdRef.current = null;
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumnIdRef.current && draggedColumnIdRef.current !== columnId) {
      setDragOverColumnId(columnId);
    }
  }, []);

  const handleColumnDragLeave = useCallback(() => {
    setDragOverColumnId(null);
  }, []);

  const handleColumnDrop = useCallback(
    (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault();
      const draggedId = draggedColumnIdRef.current;
      if (!draggedId || draggedId === targetColumnId) {
        draggedColumnIdRef.current = null;
        setDraggedColumnId(null);
        setDragOverColumnId(null);
        return;
      }
      setOrderedColumnIds((prev) => {
        const fromIndex = prev.indexOf(draggedId);
        const toIndex = prev.indexOf(targetColumnId);
        if (fromIndex === -1 || toIndex === -1) return prev;
        const next = [...prev];
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, draggedId);
        persistColumnOrder(next);
        return next;
      });
      draggedColumnIdRef.current = null;
      setDraggedColumnId(null);
      setDragOverColumnId(null);
    },
    [persistColumnOrder]
  );

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/events?limit=500');
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.events || []).map((e: any) => ({
        id: e.id,
        slug: e.slug,
        title: {
          en: e.title?.en || e.slug,
          he: e.title?.he || e.title?.en || e.slug,
        },
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
        page: '1',
        limit: FETCH_LIMIT.toString(),
        sortBy: 'submittedAt',
        sortOrder: 'desc',
      });
      const res = await fetch(`/api/admin/event-signups?${params}`);
      if (!res.ok) throw new Error('Failed to fetch signups');
      const data = await res.json();
      setAllSignups(data.signups || []);
    } catch (error) {
      toast({
        title: t('eventSignups.toastError'),
        description: error instanceof Error ? error.message : t('eventSignups.toastFailedLoad'),
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchSignups();
  }, [fetchSignups]);

  useEffect(() => {
    setOrderedColumnIds(getDefaultColumnOrder());
  }, []);

  const tStatus = (s: string) => {
    if (s === 'confirmed') return t('eventSignups.confirmed');
    if (s === 'pending') return t('eventSignups.pending');
    if (s === 'cancelled') return t('eventSignups.cancelled');
    return s;
  };

  const filteredAndSorted = useMemo(() => {
    let list = allSignups;
    if (eventId && eventId !== 'all') {
      list = list.filter((s) => s.eventId === eventId);
    }
    if (status && status !== 'all') {
      list = list.filter((s) => s.status === status);
    }
    if (search.trim()) {
      list = list.filter((s) => matchesSearch(s, search));
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'submittedAt') {
        cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      } else if (sortBy === 'confirmationNumber') {
        cmp = (a.confirmationNumber || '').localeCompare(b.confirmationNumber || '');
      } else {
        cmp = (a.userEmail || '').localeCompare(b.userEmail || '');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [allSignups, eventId, status, search, sortBy, sortOrder]);

  const totalFiltered = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pageIndex = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedSignups = useMemo(
    () => filteredAndSorted.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE),
    [filteredAndSorted, pageIndex]
  );

  useEffect(() => {
    if (totalPages >= 1 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleFilterChange = useCallback((updates: { eventId?: string; status?: string; sortBy?: typeof sortBy; sortOrder?: typeof sortOrder }) => {
    if (updates.eventId !== undefined) setEventId(updates.eventId);
    if (updates.status !== undefined) setStatus(updates.status);
    if (updates.sortBy !== undefined) setSortBy(updates.sortBy);
    if (updates.sortOrder !== undefined) setSortOrder(updates.sortOrder);
    setCurrentPage(1);
  }, []);

  const fetchSignupDetails = useCallback(
    async (signupId: string) => {
      setViewDetailsLoading(true);
      setViewDetails(null);
      try {
        const res = await fetch(`/api/admin/event-signups/${signupId}`);
        if (!res.ok) throw new Error('Failed to load details');
        const data = await res.json();
        setViewDetails(data.signup || null);
      } catch {
        toast({
          title: 'Error',
          description: 'Could not load signup details',
          variant: 'error',
        });
      } finally {
        setViewDetailsLoading(false);
      }
    },
    [toast, t]
  );

  const handleViewOpen = useCallback(
    (signupId: string | null) => {
      setViewModalSignupId(signupId);
      if (signupId) {
        fetchSignupDetails(signupId);
      } else {
        setViewDetails(null);
      }
    },
    [fetchSignupDetails]
  );

  const handleEditOpen = useCallback(
    async (signup: Signup) => {
      setEditModalSignupId(signup.id);
      setEditDetailsLoading(true);
      setEditFormData(null);
      try {
        const res = await fetch(`/api/admin/event-signups/${signup.id}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setEditFormData(data.signup || null);
      } catch {
        toast({ title: t('eventSignups.toastError'), description: t('eventSignups.toastFailedLoad'), variant: 'error' });
        setEditModalSignupId(null);
      } finally {
        setEditDetailsLoading(false);
      }
    },
    [toast, t]
  );

  const handleEditClose = useCallback(() => {
    setEditModalSignupId(null);
    setEditFormData(null);
  }, []);

  const updateEditForm = useCallback((updates: Partial<SignupDetail> | ((prev: SignupDetail | null) => SignupDetail | null)) => {
    setEditFormData((prev) => {
      if (!prev) return prev;
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      return next ?? prev;
    });
  }, []);

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    try {
      setUpdatingStatus(editFormData.id);
      const res = await fetch(`/api/admin/event-signups/${editFormData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editFormData.status,
          userEmail: editFormData.userEmail ?? '',
          userName: editFormData.userName ?? '',
          formData: editFormData.formData ?? [],
          notes: editFormData.notes ?? '',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      const data = await res.json();
      const updated = data.signup as Signup;
      setAllSignups((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      setViewDetails((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
      handleEditClose();
      toast({ title: t('eventSignups.toastSuccess'), description: t('eventSignups.toastSignupUpdated'), variant: 'success' });
    } catch (error) {
      toast({ title: t('eventSignups.toastError'), description: error instanceof Error ? error.message : 'Failed to update', variant: 'error' });
    } finally {
      setUpdatingStatus(null);
    }
  };

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
      setAllSignups((prev) =>
        prev.map((s) => (s.id === signupId ? { ...s, status: newStatus } : s))
      );
      setViewDetails((prev) => (prev?.id === signupId ? { ...prev, status: newStatus } : prev));
      if (viewModalSignupId === signupId) setViewModalSignupId(null);
      handleEditClose();
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

  const handleRemove = async (signup: Signup) => {
    if (!confirm(t('eventSignups.removeConfirm'))) return;
    try {
      setDeletingId(signup.id);
      const res = await fetch(`/api/admin/event-signups/${signup.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setAllSignups((prev) => prev.filter((s) => s.id !== signup.id));
      setViewDetails((prev) => (prev?.id === signup.id ? null : prev));
      if (viewModalSignupId === signup.id) setViewModalSignupId(null);
      handleEditClose();
      toast({
        title: t('eventSignups.toastSuccess'),
        description: t('eventSignups.toastSignupRemoved'),
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: t('eventSignups.toastError'),
        description: error instanceof Error ? error.message : t('eventSignups.toastFailedRemove'),
        variant: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return '—';
      const localeTag = locale === 'he' ? 'he-IL' : 'en-US';
      return new Intl.DateTimeFormat(localeTag, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: localeTag.startsWith('en'),
      }).format(date);
    } catch {
      return '—';
    }
  };

  const getStatusColor = (s: string) => {
    const map: Record<string, string> = {
      confirmed: 'bg-green dark:bg-green-dark text-green-bg dark:text-green-bg-dark',
      pending: 'bg-orange dark:bg-orange-dark text-orange-bg dark:text-orange-bg-dark',
      cancelled: 'bg-red dark:bg-red-dark text-red-bg dark:text-red-bg-dark',
    };
    return map[s] || 'bg-gray dark:bg-gray-dark text-gray-bg dark:text-gray-bg-dark';
  };

  const getEventTitleForSignup = useCallback(
    (signup: Signup): string => {
      const event = events.find((e) => e.id === signup.eventId);
      const loc = locale === 'he' ? 'he' : 'en';
      return event?.title?.[loc] || event?.title?.en || event?.title?.he || signup.eventTitle || signup.eventSlug || '—';
    },
    [events, locale]
  );

  const getSignupCellValue = (signup: Signup, columnId: string): string => {
    switch (columnId) {
      case 'confirmationNumber':
        return formatConfirmationNumber(signup.confirmationNumber) || '—';
      case 'event':
        return getEventTitleForSignup(signup);
      case 'userName':
        return signup.userName || '—';
      case 'userEmail':
        return signup.userEmail || '—';
      case 'submittedAt':
        return formatDate(signup.submittedAt);
      case 'status':
        return tStatus(signup.status);
      default: {
        const fd = signup.formData?.find((f) => f.name === columnId);
        if (fd == null) return '—';
        const v = fd.value;
        if (v === null || v === undefined) return '—';
        if (typeof v === 'boolean') return v ? t('eventSignups.yes') : t('eventSignups.no');
        return String(v);
      }
    }
  };

  const sortValue = `${sortBy}-${sortOrder}`;
  const tableColumns = useMemo(
    () =>
      orderedColumnIds
        .map((id) => allColumnDefs.find((c) => c.id === id))
        .filter((c): c is { id: string; label: string } => Boolean(c)),
    [allColumnDefs, orderedColumnIds]
  );

  return (
    <div className="pt-16 space-y-6 max-w-6xl mx-auto px-4">
      <Toaster />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">
            {t('eventSignups.title')}
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {t('eventSignups.signupsShown', { count: totalFiltered })}
            {(search || status !== 'all' || eventId !== 'all') && ` ${t('eventSignups.filteredFrom', { total: allSignups.length })}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="gray"
            onClick={() => {
              fetchSignups();
              toast({ title: t('eventSignups.toastRefreshed'), description: t('eventSignups.toastListUpdated'), variant: 'info' });
            }}
            disabled={loading}
          >
            {t('eventSignups.refresh')}
          </Button>
          <Button
            variant="purple"
            onClick={() => router.push(`/${locale}/admin/events`)}
          >
            {t('events')}
          </Button>
        </div>
      </div>

      <Card className="!p-0 bg-card dark:bg-card-dark overflow-visible">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-wrap gap-4">
            <div className="flex-1 min-w-10">
              <SearchInput
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                onClear={() => {
                  setSearch('');
                  setCurrentPage(1);
                }}
                placeholder={t('eventSignups.searchPlaceholder')}
                className="!max-w-full"
              />
            </div>
            <div className="flex gap-2 flex-row flex-wrap">
              <Select
                value={eventId}
                onValueChange={(v) => handleFilterChange({ eventId: v })}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder={t('eventSignups.allEvents')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('eventSignups.allEvents')}</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title?.[locale === 'he' ? 'he' : 'en'] || e.title?.en || e.title?.he || e.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(v) => handleFilterChange({ status: v })}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder={t('eventSignups.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('eventSignups.allStatuses')}</SelectItem>
                  <SelectItem value="confirmed">{t('eventSignups.confirmed')}</SelectItem>
                  <SelectItem value="pending">{t('eventSignups.pending')}</SelectItem>
                  <SelectItem value="cancelled">{t('eventSignups.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortValue}
                onValueChange={(v) => {
                  const [by, order] = v.split('-') as [typeof sortBy, 'asc' | 'desc'];
                  handleFilterChange({ sortBy: by, sortOrder: order });
                }}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder={t('eventSignups.sort')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submittedAt-desc">{t('eventSignups.newestFirst')}</SelectItem>
                  <SelectItem value="submittedAt-asc">{t('eventSignups.oldestFirst')}</SelectItem>
                  <SelectItem value="confirmationNumber-asc">{t('eventSignups.confirmationAZ')}</SelectItem>
                  <SelectItem value="confirmationNumber-desc">{t('eventSignups.confirmationZA')}</SelectItem>
                  <SelectItem value="userEmail-asc">{t('eventSignups.emailAZ')}</SelectItem>
                  <SelectItem value="userEmail-desc">{t('eventSignups.emailZA')}</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="blue" className="!rounded-xl">
                    {t('eventSignups.columns')}                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-72 p-0"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="p-2 border-b border-border dark:border-border-dark">
                    <p className="text-xs font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wide">
                      {t('eventSignups.columnsHint')}
                    </p>
                  </div>
                  <div
                    className="max-h-[60vh] overflow-y-auto p-1"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {orderedColumnIds.map((id) => {
                      const col = allColumnDefs.find((c) => c.id === id);
                      if (!col) return null;
                      const isDragging = draggedColumnId === col.id;
                      const isDragOver = dragOverColumnId === col.id;
                      return (
                        <div
                          key={col.id}
                          draggable
                          onDragStart={(e) => {
                            handleColumnDragStart(col.id);
                            e.dataTransfer.setData('text/plain', col.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={handleColumnDragEnd}
                          onDragOver={(e) => handleColumnDragOver(e, col.id)}
                          onDragLeave={handleColumnDragLeave}
                          onDrop={(e) => handleColumnDrop(e, col.id)}
                          className={`flex items-center gap-1 rounded-md px-2 py-1.5 cursor-grab active:cursor-grabbing select-none ${
                            isDragOver ? 'bg-brand-main/15 dark:bg-brand-dark/15 ring-1 ring-brand-main/30 dark:ring-brand-dark/30' : 'hover:bg-black/5 dark:hover:bg-white/5'
                          } ${isDragging ? 'opacity-50' : ''}`}
                        >
                          <div
                            className="shrink-0 text-text-secondary dark:text-text-secondary-dark touch-none"
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-4 h-4" aria-hidden />
                          </div>
                          <Checkbox
                            id={`col-visible-${col.id}`}
                            variant="default"
                            checked
                            onChange={(checked) => { if (!checked) toggleColumn(col.id); }}
                            label=""
                          />
                          <span className="text-sm truncate flex-1">{col.label}</span>
                        </div>
                      );
                    })}
                    {allColumnDefs
                      .filter((c) => !orderedColumnIds.includes(c.id))
                      .map((col) => (
                        <div
                          key={col.id}
                          className="flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <div className="w-[52px] shrink-0" />
                          <Checkbox
                            id={`col-hidden-${col.id}`}
                            variant="brand"
                            checked={false}
                            onChange={(checked) => { if (checked) toggleColumn(col.id); }}
                            label=""
                          />
                          <span className="text-sm text-text-secondary dark:text-text-secondary-dark truncate flex-1">
                            {col.label}
                          </span>
                        </div>
                      ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            {tableColumns.map((col) => (
              <TableHead key={col.id} className={col.id === 'submittedAt' ? 'whitespace-nowrap' : ''}>
                {col.label}
              </TableHead>
            ))}
            <TableHead>{t('eventSignups.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {tableColumns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
                <TableCell><Skeleton className="h-4 w-14" /></TableCell>
              </TableRow>
            ))
          ) : allSignups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={tableColumns.length + 1} className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                {t('eventSignups.noSignupsFound')}
              </TableCell>
            </TableRow>
          ) : totalFiltered === 0 ? (
            <TableRow>
              <TableCell colSpan={tableColumns.length + 1} className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                {t('eventSignups.noSignupsMatchFilters')}
              </TableCell>
            </TableRow>
          ) : (
            paginatedSignups.map((signup) => (
              <TableRow key={signup.id}>
                {tableColumns.map((col) => (
                  <TableCell
                    key={col.id}
                    className={
                      col.id === 'event'
                        ? ''
                        : col.id === 'confirmationNumber'
                          ? 'font-mono text-sm'
                          : col.id === 'submittedAt'
                            ? 'whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark'
                            : col.id === 'status'
                              ? ''
                              : 'max-w-xs'
                    }
                  >
                    {col.id === 'event' ? (
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => router.push(`/${locale}/admin/events/${signup.eventSlug}/edit`)}
                          className="text-start text-sm font-medium text-brand-main dark:text-brand-dark hover:underline"
                        >
                          {getEventTitleForSignup(signup)}
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/${locale}/admin/events/${signup.eventSlug}/signup-form`)}
                          className="text-start text-xs text-gray dark:text-gray-dark hover:underline"
                        >
                          {t('eventSignups.editSignupForm')}
                        </button>
                      </div>
                    ) : col.id === 'status' ? (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(signup.status)}`}>
                        {tStatus(signup.status)}
                      </span>
                    ) : (
                      <div className="text-sm truncate max-w-[200px]" title={getSignupCellValue(signup, col.id)}>
                        {getSignupCellValue(signup, col.id)}
                      </div>
                    )}
                  </TableCell>
                ))}
                <TableCell className="whitespace-nowrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="gray" size="sm" aria-label={t('eventSignups.actions')}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewOpen(signup.id)}>
                        <Icon name="eyeBold" className="w-4 h-4 me-2 shrink-0" />
                        {t('eventSignups.view')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditOpen(signup)}>
                        <Icon name="editBold" className="w-4 h-4 me-2 shrink-0" />
                        {t('eventSignups.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRemove(signup)}
                        disabled={deletingId === signup.id}
                        className="text-red dark:text-red-dark focus:bg-red-hover-bg dark:focus:bg-red-hover-bg-dark"
                      >
                        <Icon name="trashBold" className="w-4 h-4 me-2 shrink-0" />
                        {deletingId === signup.id ? t('eventSignups.removing') : t('eventSignups.remove')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Edit submission modal */}
      {editModalSignupId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
          onClick={handleEditClose}
          role="dialog"
          aria-modal="true"
          aria-label={t('eventSignups.editSubmissionAria') ?? 'Edit submission'}
        >
          <div
            className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark shrink-0">
              <h2 className="text-lg font-semibold text-text dark:text-text-dark">
                {t('eventSignups.editSubmissionTitle') ?? 'Edit submission'}
              </h2>
              <Button variant="gray" size="sm" onClick={handleEditClose} aria-label={t('eventSignups.close')}>
                ×
              </Button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {editDetailsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : editFormData ? (
                <div className="space-y-4">
                  <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                    {t('eventSignups.confirmationNumber')} <span className="font-mono">{formatConfirmationNumber(editFormData.confirmationNumber)}</span>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">{t('eventSignups.status')}</label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(v) => updateEditForm({ status: v })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">{t('eventSignups.confirmed')}</SelectItem>
                        <SelectItem value="pending">{t('eventSignups.pending')}</SelectItem>
                        <SelectItem value="cancelled">{t('eventSignups.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">{t('eventSignups.colName')}</label>
                    <Input
                      value={editFormData.userName ?? ''}
                      onChange={(e) => updateEditForm({ userName: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">{t('eventSignups.colEmail')}</label>
                    <Input
                      type="email"
                      value={editFormData.userEmail ?? ''}
                      onChange={(e) => updateEditForm({ userEmail: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  {editFormData.formData && editFormData.formData.length > 0 && (
                    <div className="border-t border-border dark:border-border-dark pt-3">
                      <p className="text-xs font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wide mb-2">
                        {t('eventSignups.formData') ?? 'Form data'}
                      </p>
                      <div className="space-y-3">
                        {editFormData.formData.map((field, index) => (
                          <div key={field.name}>
                            <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                              {field.label || field.name}
                            </label>
                            {field.type === 'textarea' ? (
                              <Textarea
                                value={String(field.value ?? '')}
                                onChange={(e) => {
                                  const next = [...(editFormData!.formData ?? [])];
                                  next[index] = { ...next[index], value: e.target.value };
                                  updateEditForm({ formData: next });
                                }}
                                rows={3}
                                className="w-full"
                              />
                            ) : field.type === 'checkbox' ? (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`edit-${editFormData.id}-${field.name}`}
                                  variant="brand"
                                  checked={Boolean(field.value)}
                                  onChange={(checked) => {
                                    const next = [...(editFormData!.formData ?? [])];
                                    next[index] = { ...next[index], value: checked };
                                    updateEditForm({ formData: next });
                                  }}
                                  label=""
                                />
                                <span className="text-sm text-text-secondary dark:text-text-secondary-dark">
                                  {field.value ? (locale === 'he' ? 'כן' : 'Yes') : (locale === 'he' ? 'לא' : 'No')}
                                </span>
                              </div>
                            ) : (
                              <Input
                                type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                                value={String(field.value ?? '')}
                                onChange={(e) => {
                                  const next = [...(editFormData!.formData ?? [])];
                                  const val = field.type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value;
                                  next[index] = { ...next[index], value: val };
                                  updateEditForm({ formData: next });
                                }}
                                className="w-full"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">{t('eventSignups.notes') ?? 'Notes'}</label>
                    <Textarea
                      value={editFormData.notes ?? ''}
                      onChange={(e) => updateEditForm({ notes: e.target.value })}
                      rows={3}
                      className="w-full"
                      placeholder={t('eventSignups.notesPlaceholder') ?? 'Optional admin notes'}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2 border-t border-border dark:border-border-dark">
                    <Button variant="gray" onClick={handleEditClose}>
                      {t('eventSignups.cancel')}
                    </Button>
                    <Button
                      variant="brand"
                      onClick={handleSaveEdit}
                      disabled={updatingStatus === editFormData.id}
                    >
                      {updatingStatus === editFormData.id ? t('eventSignups.saving') : t('eventSignups.save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark">{t('eventSignups.toastFailedLoad')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submission details modal */}
      {viewModalSignupId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60"
          onClick={() => handleViewOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('eventSignups.signupDetailsAria')}
        >
          <div
            className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark shrink-0">
              <h2 className="text-lg font-semibold text-text dark:text-text-dark">
                {t('eventSignups.signupDetails')}
              </h2>
              <Button
                variant="gray"
                size="sm"
                onClick={() => handleViewOpen(null)}
                aria-label={t('eventSignups.close')}
              >
                ×
              </Button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {viewDetailsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : viewDetails && viewDetails.id === viewModalSignupId ? (
                <>
                  <Section title="Submission">
                    <DetailRow label="Confirmation #" value={formatConfirmationNumber(viewDetails.confirmationNumber)} mono />
                    <DetailRow label="Event" value={viewDetails ? getEventTitleForSignup(viewDetails) : '—'} />
                    <DetailRow label="Submitted" value={formatDate(viewDetails.submittedAt)} />
                    <DetailRow label="Status" value={viewDetails.status} />
                  </Section>
                  <Section title="Contact">
                    <DetailRow label="Name" value={viewDetails.userName || '—'} />
                    <DetailRow label="Email" value={viewDetails.userEmail || '—'} />
                  </Section>
                  {viewDetails.formData && viewDetails.formData.length > 0 && (
                    <Section title="Form data">
                      {viewDetails.formData.map((f) => (
                        <DetailRow
                          key={f.name}
                          label={f.label || f.name}
                          value={
                            typeof f.value === 'boolean'
                              ? f.value ? (locale === 'he' ? 'כן' : 'Yes') : (locale === 'he' ? 'לא' : 'No')
                              : String(f.value)
                          }
                        />
                      ))}
                    </Section>
                  )}
                  {viewDetails.notes != null && String(viewDetails.notes).trim() !== '' && (
                    <Section title="Notes">
                      <p className="text-sm text-text dark:text-text-dark whitespace-pre-wrap break-words">
                        {viewDetails.notes}
                      </p>
                    </Section>
                  )}
                  {(viewDetails.ipAddress || viewDetails.userAgent) && (
                    <Section title={t('eventSignups.metadata')}>
                      {viewDetails.ipAddress && (
                        <DetailRow label={t('eventSignups.ipAddress')} value={viewDetails.ipAddress} mono />
                      )}
                      {viewDetails.userAgent && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark block">
                            {t('eventSignups.userAgent')}
                          </span>
                          <p className="text-xs text-text dark:text-text-dark break-all">
                            {viewDetails.userAgent}
                          </p>
                        </div>
                      )}
                    </Section>
                  )}
                  {viewDetails.status !== 'cancelled' && (
                    <div className="pt-2 border-t border-border dark:border-border-dark">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleStatusChange(viewDetails.id, 'cancelled')}
                        disabled={updatingStatus === viewDetails.id}
                      >
                        {updatingStatus === viewDetails.id ? 'Updating...' : 'Cancel signup'}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  {t('eventSignups.couldNotLoadDetails')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {totalFiltered > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-text-secondary dark:text-text-secondary-dark">
          <span>
            Page {pageIndex} of {totalPages} ({totalFiltered} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="gray"
              size="sm"
              disabled={pageIndex <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="gray"
              size="sm"
              disabled={pageIndex >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
