'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { SearchInput } from '@/components/common/SearchInput';

type LocaleFilter = '' | 'he' | 'en';

interface Subscriber {
  id: string;
  email: string;
  locale: string;
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export default function NewsletterPage() {
  const t = useTranslations('common.mobileNav');
  const tAdmin = useTranslations('admin');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [localeFilter]);

  const fetchSubscribers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(pagination.currentPage),
        limit: String(pagination.limit),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(localeFilter && { locale: localeFilter }),
      });
      const res = await fetch(`/api/admin/newsletter?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch subscribers');
      }
      const data = await res.json();
      setSubscribers(data.subscribers || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
      console.error('Newsletter fetch error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [pagination.currentPage, pagination.limit, debouncedSearch, localeFilter]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const escapeCsvCell = (value: string) => {
    if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const limit = 100;
      let page = 1;
      let totalPages = 1;
      const all: Subscriber[] = [];
      do {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(localeFilter && { locale: localeFilter }),
        });
        const res = await fetch(`/api/admin/newsletter?${params}`);
        if (!res.ok) throw new Error('Failed to fetch subscribers');
        const data = await res.json();
        const list = data.subscribers || [];
        all.push(...list);
        totalPages = data.pagination?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);

      const header = 'Email,Locale,Subscribed';
      const rows = all.map((s) =>
        [
          escapeCsvCell(s.email),
          escapeCsvCell(s.locale || 'en'),
          escapeCsvCell(formatDate(s.createdAt)),
        ].join(',')
      );
      const csv = [header, ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this subscriber from the list?')) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/admin/newsletter/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      setPagination((prev) => ({ ...prev, totalCount: Math.max(0, prev.totalCount - 1) }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Newsletter</h1>
        <div className="text-red-600 dark:text-red-400">{error}</div>
        <Button onClick={handleRefresh}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('newsletter')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Subscribers: {pagination.totalCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={exportingCsv || loading}>
            {exportingCsv ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Exporting...
              </span>
            ) : (
              'Export to CSV'
            )}
          </Button>
          <Button
            variant="ghost"
            className="flex items-center gap-1"
            onClick={handleRefresh}
            title="Refresh"
            disabled={isRefreshing}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {tAdmin('metrics.refresh') || 'Refresh'}
          </Button>
        </div>
      </div>

      <Card className="!p-0 bg-card dark:bg-card-dark">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64 max-w-xs">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search by email..."
              className="!max-w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Locale:</span>
            <select
              value={localeFilter}
              onChange={(e) => setLocaleFilter(e.target.value as LocaleFilter)}
              className="rounded-md border border-border dark:border-border-dark bg-background dark:bg-background-dark px-3 py-2 text-sm text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-brand-main"
            >
              <option value="">All</option>
              <option value="he">Hebrew (he)</option>
              <option value="en">English (en)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscribers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Locale</TableHead>
                    <TableHead className="hidden sm:table-cell">Subscribed</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-gray-500 dark:text-gray-400 py-8"
                      >
                        No subscribers yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscribers.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {sub.email}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-gray-500 dark:text-gray-400">
                          {sub.locale || 'en'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-gray-500 dark:text-gray-400">
                          {formatDate(sub.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            onClick={() => handleDelete(sub.id)}
                            disabled={deletingId === sub.id}
                          >
                            {deletingId === sub.id ? 'Removing...' : 'Remove'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border dark:border-border-dark">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {pagination.currentPage} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => setPagination((p) => ({ ...p, currentPage: p.currentPage - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, currentPage: p.currentPage + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
